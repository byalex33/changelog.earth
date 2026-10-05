#!/usr/bin/env node
// Rewrites published patch notes that read like shortened news headlines. Only the title changes:
// kind, worldwide assessment and style version are kept, and each rewrite bumps titleRevision so
// the live site's archive merge prefers it over older copies. Writes data/editions.json after each
// batch, so an interrupted run keeps what it finished.
import { readFile, writeFile } from 'node:fs/promises';
import { parseOptions, readFlag, readNumber } from '../lib/cli-options.mjs';
import { validateArchive } from '../lib/edition-archive.mjs';
import { isPublishedWorldwide } from '../lib/editorial-policy.mjs';
import { readsLikeHeadline, rewriteHeadlineTitles } from '../lib/patch-titles.mjs';

const options = parseOptions(process.argv.slice(2), ['limit','batch','dry-run']);
const limit = readNumber(options, 'limit', Infinity, {min: 1});
const batchSize = readNumber(options, 'batch', 24, {min: 1, max: 40});
const dryRun = readFlag(options, 'dry-run');
const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

const path = new URL('../data/editions.json', import.meta.url);
const archive = validateArchive(JSON.parse(await readFile(path, 'utf8')));
const pending = archive.filter(article => isPublishedWorldwide(article) && readsLikeHeadline(article.title)).slice(0, limit);
console.log(`Archive ${archive.length} stories · published headline-style titles ${pending.length} · batches of ${batchSize} · model ${model}`);

if (dryRun) {
 for (const [index, article] of pending.entries()) console.log(`${index + 1}. [${article.kind}] ${article.title}`);
 process.exit(0);
}
if (!pending.length) { console.log('Every published title already names a game concept.'); process.exit(0); }
if (!apiKey) {
 console.error('GROQ_API_KEY is not set. Add it to .env.local or the environment, then rerun. No AI call was made.');
 process.exit(1);
}

let done = 0, rewritten = 0;
for (let start = 0; start < pending.length; start += batchSize) {
 const batch = pending.slice(start, start + batchSize);
 const rewrites = await rewriteHeadlineTitles(batch, {apiKey, model, signal: AbortSignal.timeout(70_000)});
 for (const [id, title] of rewrites) {
  const article = batch[id];
  console.log(`  ${article.title}\n→ ${title}`);
  Object.assign(article, {title, titleRevision: (article.titleRevision ?? 0) + 1, titleProvider: 'groq', titleModel: model});
 }
 await writeFile(path, JSON.stringify(validateArchive(archive), null, 2) + '\n');
 done += batch.length; rewritten += rewrites.size;
 console.log(`Batch ${start / batchSize + 1}/${Math.ceil(pending.length / batchSize)} · rewrote ${rewritten}/${done}`);
}
console.log(`Done. Rewrote ${rewritten} of ${pending.length}; rerun to retry the rest.`);
