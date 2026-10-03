# Event taxonomy and provenance

This document is the draft contract for turning archived stories into structured, source-backed
events. It is a proposal under test, not settled truth: the vocabulary and the significance
ladder are validated against the archive (see [Validation](#validation)) before any of it is
wired into the live ingestion pipeline or the UI.

Nothing here changes collection. [`lib/patch-titles.mjs`](../lib/patch-titles.mjs) still selects
stories and writes patch titles exactly as before, and [`data/editions.json`](../data/editions.json)
is never rewritten by the classification work.

## Why

Today the archive's unit is an article. Its only category is a feed label (`Science & nature`,
`Energy`, `Space`), which is an editorial shortcut rather than a classification, and its
importance is implied by position. That makes the archive impossible to query, hard to dedupe
meaningfully, and gives readers no way to tell a narrow finding from a planetary one.

The target is a record shaped like:

```json
{
  "eventId": "earth-2026-a3f2c1",
  "subject": "Wild cat species",
  "domain": "life",
  "changeType": "DISCOVERED",
  "scope": "global",
  "significance": "major",
  "significanceConfidence": "high",
  "significanceReason": "Adds a species to the global record with lasting taxonomic effect.",
  "evidenceStatus": "confirmed",
  "claim": "Researchers described a previously unknown wild cat species.",
  "sources": [{ "publisher": "Example", "url": "…", "published": "2026-09-28" }]
}
```

An **event** is the subject; **sources** are the articles describing it. Several articles that
report one event become one event with several sources. That is the single structural change
everything else depends on.

## Vocabulary

[`lib/taxonomy.mjs`](../lib/taxonomy.mjs) is the machine-readable draft of this vocabulary.
[`lib/taxonomy-fallback.mjs`](../lib/taxonomy-fallback.mjs) is separate from it on purpose: it holds the
heuristics that infer a story against this vocabulary, which are retuned against the archive and fail
differently from the contract itself. Changing a label and changing a pattern are different edits.

- **Domain** (15): which part of Earth is concerned. `life`, `earth`, `oceans`, `atmosphere`,
  `ecology`, `science`, `space`, `energy`, `technology`, `health`, `transport`, `infrastructure`,
  `agriculture`, `archaeology`, `society`. Each carries editorial topics for future browsing.
- **Change type** (16): what happened. `DISCOVERED`, `CREATED`, `DEPLOYED`, `MEASURED`,
  `OBSERVED`, `UNDERSTOOD`, `CONFIRMED`, `REVISED`, `ONGOING`, `EXPANDED`, `IMPROVED`,
  `RESTORED`, `PROTECTED`, `DECLINED`, `DAMAGED`, `LOST`. Change type describes the event, never
  the tone of the reporting.
- **Scope** (4): `local`, `regional`, `global`, `planetary`. How much of Earth is affected.
- **Significance** (4): the editorial ladder, defined in the next section.
- **Evidence status** (5): `confirmed`, `preliminary`, `conflicting`, `revised`, `retracted`.

Free-text fields are bounded and never authoritative: `subject` (≤ 80 chars), `claim` (≤ 400),
`whyItMatters` (≤ 300, may be empty), `significanceReason` (≤ 300), and `clusterKey`, a lowercase
slug that groups sources describing the same event.

## Significance ladder

Significance is about the **change**, not the story about it. Newsworthiness, headline tone,
publisher reach and how many people shared the article are not criteria.

The factors a level is judged on are the ones proposed in issue #9: novelty, magnitude,
geographic scope, scientific certainty, evidence quality, real-world impact, durability, and the
number of independent sources. They are criteria to reason about, never a numeric score.

| Level | Criteria |
| --- | --- |
| `epochal` | Civilisational or planet-scale turning point. Changes what large numbers of people, or the biosphere, can rely on long-term. |
| `major` | Substantial and lasting change to a system, a population or shared scientific understanding. |
| `notable` | Meaningful change worth recording within its field, region or community. |
| `minor` | Interesting but limited change. |

Two guardrails are part of the definition, not advice:

1. A narrow finding reported worldwide is at most `notable`. Reach of reporting never raises a level.
2. When two levels are both defensible, choose the **lower** one and set
   `significanceConfidence` to `low`. Borderline records are how the ladder gets tested; a level
   whose records are mostly `low` confidence is not doing work and should be redefined or cut.

The ladder is deliberately four levels deep. It is not a score, and no numeric impact score is
displayed anywhere: the reader gets a level and one line of reasoning.

## Planned surfaces

An event record is designed to render as the entry page proposed in issue #9, in that order:
**what changed**, **why it matters**, **evidence**, **sources**, **related events**. Each section
maps to stored fields rather than to generated prose: `whatChanged` and `whyItMatters` for the
first two, `evidenceStatus` plus source count for the third, the source list with publisher and
date for the fourth, and same-domain events on nearby dates for the fifth.

Browsing follows the same order as the proposal: a chronological timeline, an explorer, one page
per domain with its editorial topics, and one page per event. The homepage stays the editorial
daily changelog, so the structured layer is a different mode rather than a replacement for it.

## Contributions

A structured submission is the record itself, so a template maps onto it field for field:

| Template field | Record field | Checkable by CI |
| --- | --- | --- |
| `title` | `title` | length, patch style |
| `source`, `source_date` | `sources[].url`, `sources[].published` | source exists, date valid |
| `domain`, `change_type`, `scope` | same | value in taxonomy |
| `what_changed`, `why_it_matters` | `whatChanged`, `whyItMatters` | present, grounded in the source |
| `evidence_level` | `evidenceStatus` | value in taxonomy |
| `primary_source`, `related_events` | `evidence`, `related` | first report claims no later one; related events resolve |

## Provenance

Classification is derived data, never editorial history, and it must be separable from it:

- Classifications live in [`data/classifications.json`](../data/classifications.json), keyed by
  source URL, with their own `promptVersion`, `model` and `classifiedAt`.
- Every record stores the headline and `titleRevision` it was derived from, so a corrected title
  is detectable and reclassifiable instead of silently mismatched.
- Records are marked `method: "ai"` or `method: "inferred"`. Anything without a stored record is
  derived on read by [`classifyArticle`](../lib/taxonomy-fallback.mjs) and reported as `inferred`.
- The store is **retrospective**: it was produced after publication from the saved headline and
  publisher summary. Nothing in it may be presented as a decision made at publication time.
- Regenerating the store must never modify `data/editions.json`.

## Scale

The model is designed for an archive far larger than today's, so:

- Records are keyed by source URL, so joining a classification to a story is one `O(1)` lookup,
  and a join over `n` stories is `O(n)` in total rather than a scan per record.
- Classification runs in fixed-size batches with incremental, atomic writes and resume, so a
  100,000-record archive costs 4,000 resumable calls instead of one unbounded job.
- Ordering is deterministic everywhere (events sort by date, then id), so page output and reports
  do not depend on collection order or filesystem order.
- Evidence, significance and revision state are stored per event, so revisions and retractions
  are additive fields rather than a migration of the archive.
- Past roughly 25,000 records the single JSON store should move to a database; the reader
  interface (`classifyArchiveRecords` in [`lib/classified-archive.mjs`](../lib/classified-archive.mjs),
  `summariseClassification` in [`lib/classification-report.mjs`](../lib/classification-report.mjs))
  does not change when it does.

## Validation

`node scripts/report-classification.mjs` reports the archive against this vocabulary: level
distribution, examples at each level, confidence mix per level, domain × change-type density, and
cluster candidates. Those numbers are the only accepted argument for changing a label.

Deliberately unanswered until the archive answers them:

- whether Earth observation is a domain of its own or a topic inside general science, which is
  how the first draft treats it;
- whether `OBSERVED` and `MEASURED` are distinguishable in practice;
- whether `UNDERSTOOD` absorbs `CONFIRMED` and `REVISED`;
- whether the domain list needs Earth observation separated from general science;
- whether `epochal` ever occurs, or whether the top of the ladder should be something else.

## Roadmap position

| Slice | Scope | State |
| --- | --- | --- |
| 1 | Vocabulary, schema, retrospective classification store, report | this change |
| 2 | Validate against the archive, revise the vocabulary | next |
| 3 | Event records with clustering and multi-source entries | not started |
| 4 | Significance in the live ingestion call | not started |
| 5 | `/timeline`, `/explore`, `/domains/[domain]`, `/event/[id]`, `/api/events` | not started |
| 6 | Structured contributions and CI validation | not started |