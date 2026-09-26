# Contributing to changelog.earth

Bug fixes, documentation improvements, accessibility fixes and feed suggestions are welcome. Please follow our [code of conduct](CODE_OF_CONDUCT.md) when taking part.

## Before you start

Search [existing issues](https://github.com/byalex33/changelog.earth/issues) and pull requests before opening a new one. Discuss larger changes in an issue before spending time on implementation. Small fixes can go straight to a pull request.

For bugs, include steps to reproduce, what you expected, what happened, and your browser or Node.js version. Remove credentials and personal information from logs and screenshots.

For feed suggestions, include the feed URL, its publisher and examples of reporting that fits the project's worldwide focus on discoveries and useful progress.

## Run locally

1. Fork the repository and clone your fork.
2. Install Node.js 22.13 or newer, then run `npm ci`.
3. Copy `.env.example` to `.env.local`.
4. Run `npm run dev` and open http://localhost:5173.

The saved archive works without AI credentials. New story collection needs `GROQ_API_KEY`. Keep credentials server-side and out of commits. See the [README](README.md#run-locally) for configuration details.

Create a branch for your change and follow the patterns in the files you edit. Before changing Next.js code, read the relevant installed guide under `node_modules/next/dist/docs/`.

## Project expectations

- Keep pull requests focused. Explain new dependencies and avoid unrelated refactoring.
- Preserve original source links, publisher attribution, publication dates and uncertainty in reporting. Avoid jokes about suffering.
- Keep saved editions available when upstream services fail. Normal page and feed reads must not generate AI drafts.
- Make UI changes work on small screens, with keyboard navigation and with reduced motion.
- Update documentation when behaviour or setup changes.
- Avoid incidental changes to `data/editions.json`. Explain any intentional archive correction in the pull request.

## Check your changes

Run `npm run lint` for code changes and the checks relevant to your change:

| Area | Commands |
| --- | --- |
| News sources and parsing | `node scripts/check-news.mjs` |
| Story selection and editorial rules | `node scripts/check-changelog.mjs`, `node scripts/check-collection.mjs` |
| Archive and publication | `node scripts/check-archive.mjs`, `node scripts/check-publication.mjs` |
| Collection authentication | `node scripts/check-archive-auth.mjs` |
| Groq-only collection | `node scripts/check-groq-only.mjs` |
| RSS output | `node scripts/check-feed.mjs` |
| ASCII globe | `node scripts/check-earth.mjs` |
| Page caching | `node scripts/check-page-cache.mjs` |
| Security headers | `node scripts/check-security-headers.mjs` |

Add or adjust a focused check when changing behaviour. The page caching check requires a completed Next.js production build. For build or deployment changes, use the relevant build instructions in the README. Documentation-only changes need a review of commands, links and formatting.

## Open a pull request

Explain the problem, what changed and how you checked it. Link the related issue if there is one. Include screenshots for visible UI changes and say which checks you could not run.

Contribute only material you have permission to share. Contributions to project code use the repository's [MIT license](LICENSE); preserve third-party notices. That license does not cover linked news articles or publisher content.
