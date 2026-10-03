import { CONFIDENCE_IDS, isChangeType, isDomain, isEvidenceStatus, isPlainText, isScope, isSignificance, isSlug } from './taxonomy.mjs';
import { CLASSIFICATION_PROMPT_VERSION } from './classification-prompt.mjs';

export const CLASSIFICATION_FIELDS = ['domain','changeType','scope','significance','significanceConfidence','significanceReason','evidenceStatus','subject','clusterKey','claim','whyItMatters'];
const MAX = {significanceReason:300, subject:80, claim:400, whyItMatters:300};

// One pass over the batch, keyed by source URL so the caller never rescans for a record.
export function applyClassifications(articles, output, {model, promptVersion = CLASSIFICATION_PROMPT_VERSION, now = Date.now(), provider = 'groq'} = {}) {
 if (!Array.isArray(output?.records) || output.records.length !== articles.length) throw new Error('Incomplete classification batch');
 const seen = new Set(), records = new Map();
 for (const entry of output.records) {
  const article = articles[entry?.sourceId];
  if (!article || !Number.isInteger(entry.sourceId) || seen.has(entry.sourceId)) throw new Error('Invalid classification source');
  seen.add(entry.sourceId);
  if (!isDomain(entry.domain) || !isChangeType(entry.changeType) || !isScope(entry.scope) || !isSignificance(entry.significance) || !CONFIDENCE_IDS.includes(entry.significanceConfidence) || !isEvidenceStatus(entry.evidenceStatus)) throw new Error('Classification outside the taxonomy');
  for (const field of ['significanceReason','subject','claim']) if (!isPlainText(entry[field], MAX[field])) throw new Error(`Invalid classification ${field}`);
  if (!isSlug(entry.clusterKey)) throw new Error('Invalid classification cluster key');
  if (typeof entry.whyItMatters !== 'string' || entry.whyItMatters.length > MAX.whyItMatters) throw new Error('Invalid classification whyItMatters');
  records.set(article.url, {
   domain:entry.domain, changeType:entry.changeType, scope:entry.scope, significance:entry.significance,
   significanceConfidence:entry.significanceConfidence, significanceReason:entry.significanceReason.trim(),
   evidenceStatus:entry.evidenceStatus, subject:entry.subject.trim(), clusterKey:entry.clusterKey,
   claim:entry.claim.trim(), whyItMatters:entry.whyItMatters.trim(),
   method:'ai', provider, model:model ?? null, promptVersion,
   classifiedAt:new Date(now).toISOString(),
   // Provenance of the input, so a later title correction invalidates the record instead of drifting.
   sourceTitle:article.originalTitle ?? article.title, titleRevision:article.titleRevision ?? 0,
   worldwide:article.worldwide !== false,
  });
 }
 return records;
}

// The bounded model input: headline, category and a truncated publisher summary per story.
export function classificationInput(articles) {
 return articles.map((article, sourceId) => ({sourceId, headline:article.originalTitle ?? article.title, category:article.category ?? '', summary:(article.summary || article.note || '').slice(0,600)}));
}