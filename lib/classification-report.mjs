// How a classified archive is measured and judged: distributions, representative records per
// level, and the warnings that state where the vocabulary is struggling. Nothing here joins a
// record to an article or decides what a story is; it only reads the joined entries that
// classifyArchiveRecords produced, so a report can be reasoned about without the derivation.
import { CHANGE_TYPES, DOMAINS, EVIDENCE_STATUS, SCOPES, SIGNIFICANCE } from './taxonomy.mjs';
// Tallies entries by one field, for the report's distribution tables.
const count = (entries, field) => entries.reduce((totals, entry) => (totals[entry[field]] = (totals[entry[field]] ?? 0) + 1, totals), {});

// One report row per vocabulary level: totals, published count and low confidence.
function levelRows(levels, entries, field, published = entries) {
 const totals = count(entries, field), live = count(published, field);
 return levels.map(level => {
  const bucket = entries.filter(entry => entry[field] === level.id);
  return {id:level.id, label:level.label, definition:level.definition, total:totals[level.id] ?? 0, published:live[level.id] ?? 0,
   lowConfidence:bucket.filter(entry => entry.significanceConfidence === 'low').length, share:entries.length ? (totals[level.id] ?? 0) / entries.length : 0};
 });
}

// A level whose records are mostly low confidence is not doing work; the report surfaces exactly that.
export function summariseClassification(entries) {
 const published = entries.filter(entry => entry.published);
 return {
  total:entries.length, published:published.length, byMethod:count(entries, 'method'),
  significance:levelRows(SIGNIFICANCE, entries, 'significance', published),
  confidence:count(entries, 'significanceConfidence'),
  domains:levelRows(DOMAINS, entries, 'domain', published),
  changeTypes:levelRows(CHANGE_TYPES, entries, 'changeType', published),
  scopes:levelRows(SCOPES, entries, 'scope', published),
  evidence:levelRows(EVIDENCE_STATUS, entries, 'evidenceStatus', published),
 };
}

// Representative records per level: most confident first, then domain spread, then newest.
export function levelExamples(entries, {perLevel = 4} = {}) {
 return SIGNIFICANCE.map(level => {
  const confidence = {high:0, medium:1, low:2};
  const candidates = entries.filter(entry => entry.significance === level.id && entry.published)
   .sort((a,b) => confidence[a.significanceConfidence] - confidence[b.significanceConfidence] || a.domain.localeCompare(b.domain) || b.date.localeCompare(a.date) || a.url.localeCompare(b.url));
  const picked = [], domains = new Set();
  for (const candidate of candidates) { if (picked.length >= perLevel) break; if (domains.has(candidate.domain)) continue; domains.add(candidate.domain); picked.push(candidate); }
  for (const candidate of candidates) { if (picked.length >= perLevel) break; if (picked.includes(candidate)) continue; picked.push(candidate); }
  return {level:level.id, label:level.label, criteria:level.criteria, total:candidates.length, examples:picked};
 });
}

// Where the vocabulary is struggling, stated as counts rather than opinion.
// Minimum samples before a distribution claim is worth anything. A taxonomy verdict must never
// come from a handful of records, and these floors are the same at 300 records and at 100,000.
export const CALIBRATION_SAMPLES = {distribution:20, vocabulary:64, grid:50};

// Threshold-based warnings, stated for any archive size. They exist so that a vocabulary change
// is argued from measurements instead of from the impression of one hand-read screen.
export function calibrationWarnings(summary, gaps) {
 const warnings = [];
 for (const level of summary.significance) {
  if (level.total === 0) warnings.push(`${level.id} has no records: the vocabulary cannot express this archive, or collection never produces one.`);
  else if (level.published === 0) warnings.push(`${level.id} holds ${level.total} records but none are published: the ladder and the publication gate are currently measuring the same thing.`);
 }
 if (summary.total > 0 && (summary.confidence.low ?? 0) === summary.total) warnings.push('Every record is low confidence, so the distribution carries no editorial signal and should not be used to justify a level.');
 if (summary.total >= CALIBRATION_SAMPLES.vocabulary) {
  const unused = summary.changeTypes.filter(row => row.total === 0).map(row => row.id);
  if (unused.length) warnings.push(`Unused change types: ${unused.join(', ')}. Either they are unreachable, or neighbouring types are absorbing them.`);
 }
 if (summary.total >= CALIBRATION_SAMPLES.distribution) {
  for (const [dimension, rows] of [['Domain', summary.domains], ['Scope', summary.scopes], ['Evidence status', summary.evidence]]) {
   const used = rows.filter(row => row.total > 0).sort((a,b) => b.total - a.total);
   if (used.length > 1 && used[0].share > 0.6) warnings.push(`${dimension} collapses into ${used[0].id} (${(used[0].share * 100).toFixed(1)}% of the archive).`);
  }
 }
 if (summary.total >= CALIBRATION_SAMPLES.grid && gaps.domainChangeCells.length && gaps.sparseCells / gaps.domainChangeCells.length > 0.3) warnings.push(`${gaps.sparseCells} of ${gaps.domainChangeCells.length} domain × change-type cells hold a single record: the grid is wider than the archive.`);
 return warnings;
}

// Where the vocabulary strains, as counts: empty levels, sparse cells, cluster candidates.
// The summary is taken rather than recomputed: a report that already has it must not pay for the
// same pass over every story twice, and both views of one run must come from the same numbers.
export function taxonomyGaps(entries, summary = summariseClassification(entries)) {
 const levels = summary;
 const confidenceRatio = level => ({id:level.id, label:level.label, total:level.total, lowConfidence:level.lowConfidence, lowShare:level.total ? level.lowConfidence / level.total : 0, empty:level.total === 0});
 const cellCounts = new Map();
 for (const entry of entries) {
  const key = `${entry.domain}/${entry.changeType}`;
  cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
 }
 const cells = [...cellCounts].map(([key, total]) => { const [domain, changeType] = key.split('/'); return {domain, changeType, total}; })
  .sort((a,b) => b.total - a.total || a.domain.localeCompare(b.domain) || a.changeType.localeCompare(b.changeType));
 const clusters = new Map();
 for (const entry of entries) {
  if (!entry.clusterKey) continue;
  const cluster = clusters.get(entry.clusterKey) ?? {clusterKey:entry.clusterKey, subject:entry.subject, count:0, publishers:new Set(), changeTypes:new Set()};
  cluster.count++; cluster.publishers.add(entry.publisher); cluster.changeTypes.add(entry.changeType);
  clusters.set(entry.clusterKey, cluster);
 }
 return {
  levels:levels.significance.map(confidenceRatio),
  domainChangeCells:cells,
  sparseCells:cells.filter(cell => cell.total === 1).length,
  emptyLevels:levels.significance.filter(level => level.total === 0).map(level => level.id),
  unusedDomains:DOMAINS.filter(domain => !levels.domains.some(row => row.id === domain.id && row.total)).map(domain => domain.id),
  clusterCandidates:[...clusters.values()].filter(cluster => cluster.count > 1).map(cluster => ({clusterKey:cluster.clusterKey, subject:cluster.subject, count:cluster.count, publishers:[...cluster.publishers].sort(), changeTypes:[...cluster.changeTypes].sort()})).sort((a,b) => b.count - a.count || a.clusterKey.localeCompare(b.clusterKey)),
  withoutWhyItMatters:entries.filter(entry => !entry.whyItMatters).length,
  withoutClaim:entries.filter(entry => !entry.claim).length,
 };
}