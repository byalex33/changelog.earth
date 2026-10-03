#!/usr/bin/env node
// Validates the draft taxonomy against the saved archive: level distribution, examples at each
// level, confidence mix, vocabulary density and cluster candidates. No network, no AI.
import { classifyArchiveRecords } from '../lib/classified-archive.mjs';
import { calibrationWarnings, levelExamples, summariseClassification, taxonomyGaps } from '../lib/classification-report.mjs';
import { readStore } from '../lib/classification-store.mjs';
import { parseOptions, readNumber } from '../lib/cli-options.mjs';
import { validateArchive } from '../lib/edition-archive.mjs';
import saved from '../data/editions.json' with { type:'json' };

const perLevel = readNumber(parseOptions(process.argv.slice(2), ['perLevel']), 'perLevel', 4, {min: 1, max: 50});
const archive = validateArchive(saved);
const store = readStore();
const entries = classifyArchiveRecords(archive, store.records);
const summary = summariseClassification(entries);
// The summary is handed on rather than rebuilt, so one run walks the archive once for the counts.
const gaps = taxonomyGaps(entries, summary);
// Share as a percentage string.
const pct = share => `${(share * 100).toFixed(1)}%`;
// A fixed-width bar, scaled to the largest row in its block.
const bar = (total, max) => '█'.repeat(Math.max(1, Math.round((total / Math.max(1, max)) * 24)));

// Prints one labelled block of vocabulary rows.
const rows = (label, list) => {
 const max = Math.max(...list.map(row => row.total), 1);
 console.log(`\n${label}`);
 for (const row of list) console.log(`  ${bar(row.total, max)} ${String(row.total).padStart(4)}  ${pct(row.share).padStart(6)}  ${row.id}${row.published !== undefined ? ` (${row.published} published)` : ''}${row.lowConfidence !== undefined && row.total ? `  low-confidence ${row.lowConfidence}` : ''}`);
};

console.log(`Archive ${summary.total} stories · ${summary.published} published · stored classifications ${store.records ? Object.keys(store.records).length : 0} · method ${JSON.stringify(summary.byMethod)}`);
console.log(`Prompt version ${store.promptVersion ?? 1} · model ${store.model ?? 'none'} · updated ${store.updatedAt ?? 'never'}`);

rows('SIGNIFICANCE', summary.significance);
console.log(`\nConfidence ${JSON.stringify(summary.confidence)}`);
rows('DOMAIN', summary.domains);
rows('CHANGE TYPE', summary.changeTypes);
rows('SCOPE', summary.scopes);
rows('EVIDENCE', summary.evidence);

console.log('\nEXAMPLES BY LEVEL');
for (const group of levelExamples(entries, {perLevel})) {
 console.log(`\n  ${group.label.toUpperCase()} — ${group.total} published · ${group.criteria}`);
 for (const example of group.examples) {
  console.log(`    [${example.domain}/${example.changeType}/${example.scope}/${example.evidenceStatus}] ${example.published ? '' : '(not published) '}${example.title}`);
  if (example.whyItMatters) console.log(`      matters: ${example.whyItMatters}`);
  if (example.significanceReason) console.log(`      reason: ${example.significanceReason}`);
  console.log(`      ${example.day} ${example.publisher} · ${example.method} · ${example.url}`);
 }
}

console.log('\nCALIBRATION WARNINGS');
for (const warning of calibrationWarnings(summary, gaps)) console.log(`  ! ${warning}`);
if (!calibrationWarnings(summary, gaps).length) console.log('  none');

console.log('\nLADDER HEALTH');
for (const level of gaps.levels) console.log(`  ${level.id.padEnd(9)} ${String(level.total).padStart(4)} records · ${pct(level.lowShare)} low confidence${level.empty ? ' · EMPTY' : ''}`);
console.log(`  empty levels: ${gaps.emptyLevels.join(', ') || 'none'}`);
console.log(`  unused domains: ${gaps.unusedDomains.join(', ') || 'none'}`);
console.log(`  entries without whyItMatters: ${gaps.withoutWhyItMatters} · without claim: ${gaps.withoutClaim}`);

console.log('\nDOMAIN × CHANGE TYPE DENSITY (top 25 of ' + gaps.domainChangeCells.length + ', single-record cells: ' + gaps.sparseCells + ')');
for (const cell of gaps.domainChangeCells.slice(0, 25)) console.log(`  ${String(cell.total).padStart(4)}  ${cell.domain}/${cell.changeType}`);

console.log(`\nCLUSTER CANDIDATES (${gaps.clusterCandidates.length} subjects reported by more than one story)`);
for (const cluster of gaps.clusterCandidates.slice(0, 25)) console.log(`  ${String(cluster.count).padStart(3)}× ${cluster.clusterKey} — ${cluster.subject} — ${cluster.publishers.slice(0, 4).join(', ')}${cluster.publishers.length > 4 ? `, +${cluster.publishers.length - 4}` : ''} [${cluster.changeTypes.join(', ')}]`);
console.log('\nUse these numbers to change labels in lib/taxonomy.mjs and docs/event-schema.md, not the other way round.');
console.log('These counts include stories the fallback inferred, so a number that looks wrong may be the');
console.log('heuristics in lib/taxonomy-fallback.mjs misreading a story rather than the vocabulary being wrong.');