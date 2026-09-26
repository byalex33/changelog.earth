# Collection and publication

The site serves saved editions from [`data/editions.json`](../data/editions.json). Collection and publication happen separately from normal page, API and RSS requests.

## Collecting stories

The [archive workflow](../.github/workflows/archive-editions.yml) runs at 00:23 and 12:23 UTC and can also run manually. It calls the live API with the `archive` query parameter and an `Authorization: Bearer` header, validates the response and commits additions. Configure the same random `ARCHIVE_SECRET` in the hosting environment and GitHub Actions repository secrets before enabling collection. Missing or incorrect credentials return HTTP 401 before archive loading, feed requests or AI calls. GitHub can delay scheduled runs; failures appear in Actions. AI credentials remain on the deployed server.

The collector combines [RSS feeds](../lib/rss-feeds.mjs), GDELT and Spaceflight News. It considers stories from the last seven days. In-memory source caches refresh after 15 minutes and can reuse fetched stories for up to 24 hours during outages. Individual feed requests time out after eight seconds. These caches and request coalescing are per server instance, not global rate or spending limits.

Energy, environment and health coverage includes pv magazine, CleanTechnica, Yale Environment 360, Carbon Brief and a dedicated UN News health feed. These join the existing science, space, technology and positive-news sources under the same editorial policy.

The collector also checks Science News, Medical Xpress, MIT research, the Guardian's science and environment feeds, and ScienceDaily's health and earth/climate feeds. There are 40 inputs in total. Topic feeds share their publisher's candidate-selection turn, and overlapping stories are deduplicated before review.

For a local collection run, set `EDITION_URL=http://localhost:5173/api/news` and put `ARCHIVE_SECRET` in `.env.local`, then run `node --env-file=.env.local scripts/archive-editions.mjs`. The script adds the archive query parameter and bearer header, refuses to run without the secret, and rejects redirects. This command can use AI credits and writes to the local archive.

## Editorial rules

[`lib/editorial-policy.mjs`](../lib/editorial-policy.mjs) defines the shared policy. Stories need significance beyond a local audience, regardless of publisher or country. The policy excludes politics, war, crime, lawsuits, sports disputes and outrage stories. Plans, prototypes and preliminary research must retain their uncertainty.

Groq receives explicit guidance that research can qualify before global deployment or a finished product exists. A study's location or experimental limits alone do not make it local-interest news. The headline must still establish broader relevance, and titles must retain those limits. Saved editorial decisions are retained; this guidance applies to newly reviewed stories.

Each collection run sends up to 24 new headlines to Groq in one pass for eligibility and patch titles. Requests omit article summaries and archive history, use low reasoning effort and cap output at 3,000 tokens. Validated feed data supplies source URLs and dates; publisher text supplies story details. Groq retries once when `Retry-After` is at most 60 seconds, within a shared 70-second deadline. Successful responses log token usage.

Candidate selection keeps the newest days first and alternates publishers within each day, taking each publisher's newest story before its next. Multiple feeds from one publisher share a turn. This prevents a busy feed from taking the entire candidate budget. Accepted candidates fill daily slots in that order; labels have no quota. Observational discoveries use Unlocked, while demonstrated reductions in harm or resource costs can use Nerfed, including research with its experimental limits stated. Proposals and projections must not become achieved reductions.

Groq is the only AI provider used during collection. Legacy AI Gateway environment variables have no effect.

Malformed responses, rate limits and timeouts fail collection. A completed run with no eligible new stories is reported separately. Existing editorial decisions are retained.

## Saved editions

The archive retains stories by their source date, with up to six eligible stories per day. New selections fill open places without replacing earlier entries. Exact source URLs and normalised original headlines are deduplicated before generation. A collection date does not change a story's source date. GDELT dates represent indexing time.

Accepted and rejected decisions remain in the archive to avoid repeat reviews. Excluded stories do not consume daily publication slots or appear in the public feed. There is no automatic expiry of archived days.

Only stories with the current title-style version and an eligible `worldwide` assessment appear publicly. Style changes require an archive review before publication. Title corrections carry revision numbers so an older cached copy cannot undo them. Historical Jev scores remain in the archive for provenance; collection no longer calls Jev.

## Serving readers

[`lib/published-changelog.mjs`](../lib/published-changelog.mjs) reads the public GitHub archive with a 15-minute cache. Local development can fall back to the bundled archive. On Vercel, a failed remote read fails regeneration so Next.js keeps the previously published page.

The homepage uses 15-minute incremental static regeneration. It contains patch notes before JavaScript loads. An empty initial edition fails the build; empty or failed regeneration preserves the previous page. Builds and normal regeneration never generate AI drafts.

The public news API caches nonempty saved editions in Vercel's CDN for one minute. Draft responses and empty editions are not cached there. RSS includes the latest 100 published entries, with stable IDs and source links, and uses a 15-minute refresh interval.

See the [contribution guide](../CONTRIBUTING.md#check-your-changes) for checks covering these behaviours.
