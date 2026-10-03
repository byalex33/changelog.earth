#!/usr/bin/env node
// Retrospective classification of the saved archive. It reads data/editions.json, sends the
// headline and publisher summary of stories that lack a current record to Groq, and writes
// data/classifications.json incrementally. The archive itself is never modified.
import { CLASSIFICATION_BATCH_SIZE, classifyBatch, chunk, needsClassification } from '../lib/classification.mjs';
import { parseOptions, readFlag, readNumber } from '../lib/cli-options.mjs';
import { putRecords, readStore, storeStats, writeStore } from '../lib/classification-store.mjs';
import { validateArchive } from '../lib/edition-archive.mjs';
import saved from '../data/editions.json' with { type:'json' };

// Flags are validated before anything is read, fetched or paid for: --limit=abc used to mean
// "no limit" and quietly classified the whole archive.
const options = parseOptions(process.argv.slice(2), ['limit','batch','force','dry-run']);
const limit = readNumber(options, 'limit', Infinity, {min: 1});
const batchSize = readNumber(options, 'batch', CLASSIFICATION_BATCH_SIZE, {min: 1, max: 100});
const force = readFlag(options, 'force');
const dryRun = readFlag(options, 'dry-run');
const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

const archive = validateArchive(saved);
const store = readStore();
const pending = needsClassification(archive, store, {force}).slice(0, limit);
console.log(`Archive ${archive.length} stories · stored ${storeStats(store).records} · pending ${pending.length} · batches of ${batchSize} · model ${model}`);

if (dryRun) {
 for (const [index, article] of pending.entries()) console.log(`${index + 1}. ${article.date.slice(0,10)} ${(article.originalTitle ?? article.title).slice(0,110)}`);
 process.exit(0);
}
if (!pending.length) { console.log('Nothing to classify; the store already covers the archive.'); process.exit(0); }
if (!apiKey) {
 console.error('GROQ_API_KEY is not set. Add it to .env.local or the environment, then rerun. No AI call was made.');
 process.exit(1);
}

let current = store, done = 0;
for (const [index, batch] of chunk(pending, batchSize).entries()) {
 const records = await classifyBatch(batch, {apiKey, model});
 current = writeStore(putRecords(current, records, model));
 done += batch.length;
 console.log(`Batch ${index + 1}/${Math.ceil(pending.length / batchSize)} · classified ${done}/${pending.length} · stored ${storeStats(current).records}`);
}
console.log(`Done. ${storeStats(current).records} records, updated ${current.updatedAt}. Report with node scripts/report-classification.mjs`);