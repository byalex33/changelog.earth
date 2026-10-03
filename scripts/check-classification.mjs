import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CLASSIFICATION_BATCH_SIZE, chunk, classifyBatch, needsClassification } from '../lib/classification.mjs';
import { CLASSIFICATION_PROMPT_VERSION, classificationInstruction, classificationSchema } from '../lib/classification-prompt.mjs';
import { applyClassifications, classificationInput } from '../lib/classification-records.mjs';
import { emptyStore, putRecords, readStore, STORE_PATH, storeStats, validateStore, writeStore } from '../lib/classification-store.mjs';
import { classifyArchiveRecords } from '../lib/classified-archive.mjs';
import { CALIBRATION_SAMPLES, calibrationWarnings, levelExamples, summariseClassification, taxonomyGaps } from '../lib/classification-report.mjs';
import { DOMAIN_IDS, isChangeType, isDomain, isEvidenceStatus, isScope, isSignificance, SIGNIFICANCE } from '../lib/taxonomy.mjs';
import { classifyArticle } from '../lib/taxonomy-fallback.mjs';
import { parseOptions, readFlag, readNumber } from '../lib/cli-options.mjs';
import { validateArchive } from '../lib/edition-archive.mjs';
import saved from '../data/editions.json' with { type:'json' };

const archivePath = new URL('../data/editions.json', import.meta.url);
const before = readFileSync(archivePath, 'utf8');
// Fixture story: headline, summary and the provenance fields a record has to match.
const story = (id, extra = {}) => ({
 title:`Coral reef resilience roster ${id}`, originalTitle:`Scientists report coral reef resilience finding ${id}`,
 summary:'A multi-year survey measured bleaching resistance across reef sites.',
 url:`https://example.org/coral-${id}`, date:'2026-09-19T08:00:00.000Z', dateLabel:'Published', provider:'Example', publisher:'Example',
 category:'Science & nature', kind:'Unlocked', worldwide:true, titleRevision:2, ...extra,
});
const articles = [story('a'), story('b'), story('c')];
// Fixture classification record, overridable field by field.
const entry = (sourceId, extra = {}) => ({
 sourceId, domain:'oceans', changeType:'MEASURED', scope:'regional', significance:'notable', significanceConfidence:'high',
 significanceReason:'A measured change to reef resistance across sites.', evidenceStatus:'confirmed', subject:'coral reef resilience',
 clusterKey:'coral-reef-resilience', claim:'A multi-year survey measured bleaching resistance across reef sites.', whyItMatters:'Baseline for future reef monitoring.', ...extra,
});

const records = applyClassifications(articles, {records:[entry(0),entry(1),entry(2)]}, {model:'test-model', now:1_700_000_000_000});
assert.equal(records.size, 3, 'One record per story, keyed by source URL');
const stored = records.get(articles[0].url);
assert.equal(stored.method, 'ai');
assert.equal(stored.model, 'test-model');
assert.equal(stored.promptVersion, CLASSIFICATION_PROMPT_VERSION);
assert.equal(stored.sourceTitle, articles[0].originalTitle, 'A record remembers the headline it was derived from');
assert.equal(stored.titleRevision, 2);
assert.equal(stored.classifiedAt, new Date(1_700_000_000_000).toISOString());
assert.equal(stored.worldwide, true);

for (const bad of [
 {records:[entry(0),entry(1)]},
 {records:[entry(0),entry(0),entry(2)]},
 {records:[entry(0),entry(1),entry(2,{sourceId:9})]},
 {records:[entry(0,{domain:'planets'}),entry(1),entry(2)]},
 {records:[entry(0,{changeType:'INVENTED'}),entry(1),entry(2)]},
 {records:[entry(0,{significance:'huge'}),entry(1),entry(2)]},
 {records:[entry(0,{significanceConfidence:'maybe'}),entry(1),entry(2)]},
 {records:[entry(0,{evidenceStatus:'rumoured'}),entry(1),entry(2)]},
 {records:[entry(0,{clusterKey:'Coral Reef'}),entry(1),entry(2)]},
 {records:[entry(0,{claim:''}),entry(1),entry(2)]},
 {records:[entry(0,{claim:'x'.repeat(401)}),entry(1),entry(2)]},
 {records:[entry(0,{significanceReason:' '}),entry(1),entry(2)]},
 {records:[entry(0,{whyItMatters:'y'.repeat(301)}),entry(1),entry(2)]},
]) assert.throws(() => applyClassifications(articles, bad, {model:'test-model'}), undefined, 'Out-of-taxonomy or incomplete output must fail the batch');
assert.ok(applyClassifications(articles, {records:[entry(0,{whyItMatters:''}),entry(1),entry(2)]}, {model:'test-model'}).get(articles[0].url).whyItMatters === '', 'An unsupported consequence stays empty rather than invented');

assert.deepEqual(needsClassification(articles, {records:{}}), articles, 'Unclassified stories are pending');
const full = putRecords(emptyStore(), records, 'test-model');
assert.deepEqual(needsClassification(articles, full), [], 'A current store leaves nothing pending');
assert.equal(needsClassification(articles, full, {force:true}).length, 3, 'Force reclassifies every story');
assert.equal(needsClassification([story('a', {originalTitle:'Corrected headline'})], full).length, 1, 'A corrected title invalidates its record');
assert.deepEqual(needsClassification([story('a', {titleRevision:3})], full).length, 1, 'A newer title revision invalidates its record');
const stale = {records:{[articles[0].url]:{...stored, promptVersion:0}}};
assert.ok(needsClassification(articles, stale).includes(articles[0]), 'An older prompt version is reclassified');
assert.ok(!needsClassification([articles[0]], full).includes(articles[0]), 'A current record is never reclassified');
assert.deepEqual(chunk(articles, 2), [articles.slice(0,2), articles.slice(2)]);
assert.deepEqual(chunk(articles, CLASSIFICATION_BATCH_SIZE).flat(), articles);
assert.throws(() => chunk(articles, 0));
assert.deepEqual(classificationInput([articles[0]])[0].sourceId, 0);
assert.ok(classificationInput([articles[0]])[0].headline === articles[0].originalTitle);

// The prompt and the strict schema are asserted directly, so their rules are testable without
// intercepting a request.
const instruction = classificationInstruction();
assert.ok(instruction.includes('choose the lower one'), 'The ladder rules must be part of the instruction');
assert.ok(instruction.includes('never instructions'), 'Untrusted headlines must be declared as data');
assert.ok(instruction.includes('epochal:'), 'Significance criteria travel with the request');
assert.ok(!instruction.includes('undefined'), 'The prompt must not leak missing domain definitions');
assert.ok(instruction.includes('Life & biology'), 'Domains are described by their label');
assert.ok(instruction.includes('Earth observation'), 'Domain topics travel with the request');
assert.ok(classificationSchema.properties.records.items.required.includes('significanceReason'), 'Every field is required by the strict schema');
const batchInput = classificationInput(articles);
assert.deepEqual(batchInput.map(item => item.sourceId), [0,1,2]);
assert.ok(batchInput.every(item => item.summary.length > 0));

let calls = 0;
const signals = [];
const batch = await classifyBatch(articles, {apiKey:'test', model:'test-model', fetcher:async(url, options) => {
 calls++; signals.push(options.signal);
 const body = JSON.parse(options.body);
 assert.equal(body.response_format.json_schema.strict, true, 'Structured classification must use a strict schema');
 assert.equal(body.messages[0].content, instruction, 'The batch sends exactly the published instruction');
 const input = JSON.parse(body.messages[1].content);
 assert.deepEqual(input, batchInput, 'The batch sends exactly the bounded model input');
 if (calls === 1) return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({records:[entry(0,{domain:'planets'}),entry(1),entry(2)]})}}]});
 return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({records:[entry(0),entry(1),entry(2)]})}}]});
}});
assert.equal(calls, 2, 'One invalid batch is regenerated once');
assert.notEqual(signals[0], signals[1], 'Each attempt needs its own timeout signal');
assert.ok(signals.every(signal => !signal.aborted), 'A regeneration must never start against an aborted signal');
assert.equal(batch.size, 3);
let ticks = 0, exhausted = 0;
await assert.rejects(classifyBatch(articles, {apiKey:'test', clock:()=>{ticks++; return ticks > 1 ? 5_000 : 0;}, batchTimeoutMs:100, fetcher:async()=>{exhausted++; return Response.json({});}}), /deadline exceeded/, 'An exhausted batch deadline stops the batch');
assert.equal(exhausted, 0, 'An exhausted deadline must not spend another request');
await assert.rejects(classifyBatch(articles, {apiKey:'test', fetcher:async()=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({records:[entry(0,{domain:'planets'}),entry(1),entry(2)]})}}]})}), /Classification outside the taxonomy/, 'A second invalid batch fails collection');
await assert.rejects(classifyBatch(articles, {fetcher:fetch}), /Groq not configured/);
// The provider validates the strict schema itself, so a rejected generation never reaches
// applyClassifications: it has to regenerate once like any other invalid output.
let rejected = 0;
const regenerated = await classifyBatch(articles, {apiKey:'test', fetcher:async()=>++rejected===1 ? Response.json({error:{message:'Generated JSON does not match the expected schema.', code:'json_validate_failed', type:'invalid_request_error'}}, {status:400}) : Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({records:[entry(0),entry(1),entry(2)]})}}]})});
assert.equal(rejected, 2, 'A generation the provider rejects regenerates the batch once');
assert.equal(regenerated.size, 3);
await assert.rejects(classifyBatch(articles, {apiKey:'test', fetcher:async()=>Response.json({error:{code:'json_validate_failed', message:'still invalid'}}, {status:400})}), /Groq HTTP 400 json_validate_failed/, 'A second schema rejection fails the batch');
await assert.rejects(classifyBatch(articles, {apiKey:'test', fetcher:async()=>Response.json({error:{code:'rate_limit_exceeded'}}, {status:429})}), /Groq HTTP 429 rate_limit_exceeded/, 'A provider failure that is not a rejected generation is still fatal');

const temporary = join(tmpdir(), `classifications-${process.pid}.json`);
try {
 assert.deepEqual(readStore(temporary), emptyStore(), 'A missing store reads as empty rather than failing');
 const written = writeStore(putRecords(emptyStore(), records, 'test-model'), temporary, 1_700_000_000_000);
 assert.equal(existsSync(`${temporary}.${process.pid}.tmp`), false, 'The temporary file must not survive the write');
assert.equal(existsSync(`${temporary}.lock`), false, 'The lock must not survive the write');
 assert.equal(written.records[articles[0].url].method, 'ai');
 assert.equal(written.updatedAt, new Date(1_700_000_000_000).toISOString());
 assert.equal(written.retrospective, true, 'The store records that it was produced after publication');
 assert.equal(storeStats(readStore(temporary)).records, 3);
 // Two runs can overlap: this write comes from a base read before the batch above was stored, so
 // it must keep that batch instead of overwriting a snapshot that never saw it.
 const late = new Map([['https://example.org/late', {...stored, sourceTitle:'Coral reef resilience'}]]);
 writeStore(putRecords(emptyStore(), late, 'test-model'), temporary, 1_700_000_000_001);
 const merged = readStore(temporary);
 assert.equal(Object.keys(merged.records).length, 4, 'A write from a stale base keeps what another run committed');
 assert.ok(merged.records[articles[0].url], 'The earlier batch survives the later write');
 assert.ok(merged.records['https://example.org/late'], 'The later batch is stored');
 // The default store path is a URL: writing through one must resolve to a real file instead of
 // throwing after the model call and dropping the batch.
 assert.match(fileURLToPath(STORE_PATH), /data[\\/]classifications\.json$/);
 const urlPath = pathToFileURL(`${temporary}-url.json`);
 writeStore(putRecords(emptyStore(), records, 'test-model'), urlPath, 1_700_000_000_000);
 assert.equal(existsSync(fileURLToPath(urlPath)), true, 'A URL store path writes a real file');
 rmSync(fileURLToPath(urlPath), {force:true});
 assert.throws(() => validateStore({...written, records:{...written.records, 'https://example.org/x':{...stored, domain:'planets'}}}), /outside the taxonomy/);
 assert.throws(() => validateStore({...written, records:{...written.records, 'not a url':stored}}));
assert.throws(() => validateStore({...written, records:{...written.records, [articles[0].url]:{...stored, method:'editorial'}}}), /provenance/);
for (const bad of [0, -1, 'x', undefined]) assert.throws(() => validateStore({...written, records:{...written.records, [articles[0].url]:{...stored, promptVersion:bad}}}), /prompt version/);
// A prompt upgrade must stay resumable: older records load, and staleness is decided per record.
assert.ok(validateStore({...written, records:{...written.records, [articles[0].url]:{...stored, promptVersion:CLASSIFICATION_PROMPT_VERSION + 7}}}), 'A prompt upgrade must not make the store unreadable');
assert.deepEqual(needsClassification([articles[0]], full, {promptVersion:CLASSIFICATION_PROMPT_VERSION + 1}), [articles[0]], 'A bumped prompt version invalidates its record without blocking the rest');
} finally { rmSync(temporary, {force:true}); }

const entries = classifyArchiveRecords(articles, records);
assert.equal(entries.length, 3);
assert.ok(entries.every(entry => entry.method === 'ai' && entry.significanceConfidence === 'high' && entry.stale === false));
const corrected = classifyArchiveRecords([story('a', {originalTitle:'Corrected headline'})], records);
assert.equal(corrected[0].method, 'inferred', 'A record derived from a corrected headline is not trusted');
assert.equal(corrected[0].stale, true, 'A stale record is reported as stale rather than hidden');
assert.equal(corrected[0].significanceConfidence, 'low');
const bumped = classifyArchiveRecords([story('a')], new Map([[articles[0].url, {...stored, sourceTitle:'Coral reef resilience', titleRevision:1}]]));
assert.equal(bumped[0].stale, true, 'A newer title revision invalidates the record on read as well');
assert.deepEqual(entries.map(entry => entry.url), articles.map(article => article.url), 'Ordering is deterministic: same date, then URL');
const unclassified = classifyArchiveRecords([story('d')]);
assert.equal(unclassified[0].method, 'inferred', 'Anything without a stored record is derived on read and reported as inferred');
assert.equal(unclassified[0].significance, classifyArticle(articles[0]).significance);
assert.equal(unclassified[0].significanceConfidence, 'low', 'Derived records never claim editorial confidence');
assert.equal(unclassified[0].claim, '', 'Derived records invent no claim text');

const summary = summariseClassification(entries);
assert.equal(summary.total, 3);
assert.equal(summary.published, 3);
assert.equal(summary.significance.find(level => level.id === 'notable').total, 3);
assert.equal(summary.byMethod.ai, 3);
const mixed = summariseClassification(classifyArchiveRecords([...articles, story('e', {worldwide:false})], records));
assert.equal(mixed.published, 3, 'Rejected stories stay in the archive and out of the published count');
const gaps = taxonomyGaps(entries, summary);
assert.deepEqual(gaps.clusterCandidates.map(cluster => [cluster.clusterKey, cluster.count]), [['coral-reef-resilience', 3]], 'Stories sharing a subject are cluster candidates');
assert.deepEqual(taxonomyGaps(classifyArchiveRecords([story('a')], records)).clusterCandidates, [], 'A single report of a subject is not a cluster candidate');
const clustered = taxonomyGaps(classifyArchiveRecords([story('a'), story('b', {url:'https://example.org/coral-b', publisher:'Other outlet'})], records));
assert.deepEqual(clustered.clusterCandidates.map(cluster => [cluster.clusterKey, cluster.count, cluster.publishers]), [['coral-reef-resilience', 2, ['Example', 'Other outlet']]], 'Two reports of one subject are one event candidate');
// A caller that already has the summary must not pay for the pass twice, and the gaps must be the
// ones that summary describes rather than a second, independently derived set of numbers.
const reused = taxonomyGaps(entries, summary);
assert.deepEqual(reused.levels, gaps.levels, 'Gaps computed from a passed summary match gaps computed from scratch');
assert.deepEqual(taxonomyGaps(entries).levels, reused.levels, 'The summary argument is optional and does not change the result');
const examples = levelExamples(entries, {perLevel:4});
assert.equal(examples.find(group => group.level === 'notable').examples.length, 3);
const unclassifiedSummary = summariseClassification(classifyArchiveRecords(articles));
const warnings = calibrationWarnings(unclassifiedSummary, taxonomyGaps(classifyArchiveRecords(articles)));
assert.ok(warnings.some(warning => warning.includes('low confidence')), 'A wholly unconfident archive is called out');
assert.ok(!warnings.some(warning => warning.includes('Unused change types')), 'A small archive may leave change types unused without that being a finding');
// A well-covered archive raises nothing, so a warning always means something about the vocabulary.
const ladderStories = ['epochal-a','epochal-b','major-a','major-b','notable-a','notable-b','minor-a','minor-b'].map(id => story(id, {originalTitle:`${id} event reported`, title:`${id} event patch note`}));
// A stored entry for the ladder-coverage fixture.
const ladderEntry = (sourceId, extra) => entry(sourceId, {significanceConfidence:'high', ...extra});
const ladder = applyClassifications(ladderStories, {records:ladderStories.map((article, sourceId) => ladderEntry(sourceId, [
 {significance:'epochal', domain:'life', changeType:'LOST', scope:'planetary', evidenceStatus:'confirmed', clusterKey:`${sourceId}-a`},
 {significance:'major', domain:'space', changeType:'DISCOVERED', scope:'global', evidenceStatus:'confirmed', clusterKey:`${sourceId}-b`},
 {significance:'major', domain:'energy', changeType:'DEPLOYED', scope:'global', evidenceStatus:'preliminary', clusterKey:`${sourceId}-c`},
 {significance:'notable', domain:'oceans', changeType:'MEASURED', scope:'regional', evidenceStatus:'confirmed', clusterKey:`${sourceId}-d`},
 {significance:'notable', domain:'health', changeType:'IMPROVED', scope:'regional', evidenceStatus:'preliminary', clusterKey:`${sourceId}-e`},
 {significance:'notable', domain:'atmosphere', changeType:'DECLINED', scope:'global', evidenceStatus:'confirmed', clusterKey:`${sourceId}-f`},
 {significance:'minor', domain:'technology', changeType:'OBSERVED', scope:'local', evidenceStatus:'confirmed', clusterKey:`${sourceId}-g`},
 {significance:'minor', domain:'agriculture', changeType:'CREATED', scope:'local', evidenceStatus:'preliminary', clusterKey:`${sourceId}-h`},
 ][sourceId]))}, {model:'test-model'});
const ladderEntries = classifyArchiveRecords(ladderStories, ladder);
const ladderSummary = summariseClassification(ladderEntries);
const ladderWarnings = calibrationWarnings(ladderSummary, taxonomyGaps(ladderEntries, ladderSummary));
assert.deepEqual(ladderWarnings.filter(warning => /has no records|none are published|low confidence/.test(warning)), [], 'A covered ladder with stated confidence raises no ladder warning');
assert.equal(CALIBRATION_SAMPLES.vocabulary, SIGNIFICANCE.length * 16, 'Vocabulary verdicts require at least four records per change type');
assert.equal(SIGNIFICANCE.length, 4);
assert.ok(DOMAIN_IDS.length >= 10);

assert.equal(readFileSync(archivePath, 'utf8'), before, 'Classification must never rewrite the published archive');

// Every value the fallback can produce must exist in the declared vocabulary, for the real archive.
for (const article of validateArchive(saved)) {
 const fields = classifyArticle(article);
 assert.ok(isDomain(fields.domain) && isChangeType(fields.changeType) && isScope(fields.scope) && isSignificance(fields.significance) && isEvidenceStatus(fields.evidenceStatus), `Inferred classification left the taxonomy for ${article.url}`);
}
const retracted = classifyArticle({...story('r'), originalTitle:'Study retracted after the data could not be verified', note:'', summary:''});
assert.equal(retracted.evidenceStatus, 'retracted', 'A withdrawal is an evidence status');
assert.ok(isChangeType(retracted.changeType), 'A withdrawal must not invent a change type');
// The fallback reads the publisher summary, which is the strongest text an archived story carries.
const summaryOnly = classifyArticle({...story('s'), originalTitle:'Reef resilience survey', title:'Reef resilience survey', note:'', summary:'Survey teams measured coral reef bleaching resistance across sites in the region.'});
assert.equal(summaryOnly.domain, 'oceans');
assert.equal(summaryOnly.changeType, 'MEASURED');
assert.equal(summaryOnly.evidenceStatus, 'preliminary', 'A publisher summary is reporting, not corroboration');
// Inference has no positive path to confirmed: it can spot doubt, never corroborate.
const replicated = classifyArticle({...story('p'), originalTitle:'Independently replicated result strengthens the finding', title:'Independently replicated result strengthens the finding', summary:'The finding survived an independent replication.'});
assert.equal(replicated.evidenceStatus, 'preliminary', 'Only the model can record confirmed, because only the model reads the reporting itself');
assert.equal(classifyArticle({...story('b'), note:'', summary:''}).evidenceStatus, 'preliminary', 'A headline with no publisher text stays provisional');
assert.equal(classifyArticle({...story('u'), originalTitle:'Journal article stays unpublished in the archive', note:'', summary:''}).evidenceStatus, 'preliminary', 'An unpublished headline is not a retraction');
assert.equal(classifyArticle({...story('w'), originalTitle:'Study withdrawn by the journal after review', note:'', summary:''}).evidenceStatus, 'retracted');

// A typo in a flag that spends money per batch must fail before the run starts.
assert.equal(readFlag(parseOptions(['--force'], ['force']), 'force'), true);
assert.equal(readFlag(parseOptions(['--force=false'], ['force']), 'force'), false, 'A boolean flag that ignores its own value is the same silent surprise');
assert.equal(readFlag(parseOptions([], ['force']), 'force'), false);
assert.equal(readNumber(parseOptions([], ['limit']), 'limit', Infinity), Infinity);
assert.equal(readNumber(parseOptions(['--perLevel=6'], ['perLevel']), 'perLevel', 4, {min:1, max:50}), 6);
assert.equal(parseOptions(['--limit=5'], ['limit']).get('limit'), '5');
for (const argv of [['--limt=1'], ['--limit=5'], ['-limit=1'], ['classify']]) assert.throws(() => parseOptions(argv, ['batch']), /Unknown option|Invalid option/, 'A mistyped flag must not run the script with defaults instead');
for (const [argv, key, bounds] of [[['--limit=abc'], 'limit', {}], [['--limit=-1'], 'limit', {min:1}], [['--batch=0'], 'batch', {min:1}], [['--batch=101'], 'batch', {min:1, max:100}], [['--perLevel=1.5'], 'perLevel', {min:1}]]) {
 assert.throws(() => readNumber(parseOptions(argv, [key]), key, 1, bounds), new RegExp(`Invalid --${key}`), `A bad ${key} must not silently change what runs`);
}

// End to end: the classification script refuses a mistyped flag before it reads or spends anything.
const script = fileURLToPath(new URL('../scripts/classify-archive.mjs', import.meta.url));
const typo = spawnSync(process.execPath, [script, '--limt=1'], {encoding:'utf8'});
assert.notEqual(typo.status, 0, '--limt=1 must not run the classification');
assert.match(typo.stderr, /Unknown option: --limt/);
const limited = spawnSync(process.execPath, [script, '--limit=5', '--batch=10', '--dry-run'], {encoding:'utf8'});
assert.equal(limited.status, 0, limited.stderr);
assert.match(limited.stdout, /^Archive 352 stories · stored \d+ · pending 5 ·/m, 'Valid flags still bound the run');
console.log('Taxonomy validation, strict classification, retries, provenance, resumable store, derived records and archive immutability pass.');