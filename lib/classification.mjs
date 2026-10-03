import { groqJSON } from './groq.mjs';
import { CLASSIFICATION_PROMPT_VERSION, classificationInstruction, classificationSchema } from './classification-prompt.mjs';
import { applyClassifications, classificationInput } from './classification-records.mjs';

// Fixed batch size keeps per-call cost, output length and resume granularity predictable.
export const CLASSIFICATION_BATCH_SIZE = 25;

// One schema-constrained call per batch, regenerated once on rejected or invalid output.
export async function classifyBatch(articles, options = {}) {
 if (!articles.length) return new Map();
 const {model = 'openai/gpt-oss-120b', now = Date.now()} = options;
 const input = JSON.stringify(classificationInput(articles));
 const at = options.clock ?? Date.now;
 const deadline = at() + (options.batchTimeoutMs ?? 110_000);
 let written;
 for (let attempt = 0; attempt < 2; attempt++) {
  // Each attempt gets its own signal, bounded by what is left of the batch deadline, so a slow
  // first response cannot leave the regeneration running against an already aborted signal.
  const remaining = deadline - at();
  if (remaining <= 0) throw new Error('Classification batch deadline exceeded');
  let output;
  try {
   output = await groqJSON(classificationInstruction(), input, {...options, signal:AbortSignal.timeout(Math.min(remaining, options.attemptTimeoutMs ?? 90_000)), model, schema:classificationSchema, reasoningEffort:'low', maxOutputTokens:options.maxOutputTokens ?? 6000});
  } catch (error) {
   // The provider validates a strict schema itself, so a generation it rejects never reaches
   // applyClassifications. That is a bad batch rather than a dead provider, and it regenerates
   // once like any other invalid output; credentials, limits and network failures stay fatal.
   if (error.providerCode !== 'json_validate_failed' || attempt === 1) throw error;
   console.warn(`Retrying schema-rejected classification output: ${error.message}`);
   continue;
  }
  try {
   written = applyClassifications(articles, output, {model, now});
   break;
  } catch (error) {
   if (attempt === 1) throw error;
   console.warn(`Retrying invalid classification output: ${error.message}`);
  }
 }
 return written;
}

// Resume-friendly: only articles whose stored record is absent or stale are sent to the model.
export function needsClassification(articles, store = {records:{}}, {promptVersion = CLASSIFICATION_PROMPT_VERSION, force = false} = {}) {
 return articles.filter(article => {
  if (force) return true;
  const record = store.records?.[article.url];
  if (!record) return true;
  return record.promptVersion !== promptVersion || record.sourceTitle !== (article.originalTitle ?? article.title) || record.titleRevision !== (article.titleRevision ?? 0);
 });
}

// Fixed-size batches, so a large archive resumes in place instead of restarting.
export function chunk(items, size = CLASSIFICATION_BATCH_SIZE) {
 if (!Number.isInteger(size) || size < 1 || size > 100) throw new Error('Invalid classification batch size');
 const batches = [];
 for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
 return batches;
}