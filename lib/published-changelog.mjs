import saved from '../data/editions.json' with { type:'json' };
import { getChangelog } from './changelog.mjs';
import { writePatchTitles } from './patch-titles.mjs';
import { getNews } from './news.mjs';
import { mergeEditions, validateArchive } from './edition-archive.mjs';
import { TITLE_STYLE_VERSION, isPublishedWorldwide } from './editorial-policy.mjs';

// One Groq call's output cap fits about this many stories; a whole-archive migration would fail every run.
export const MIGRATION_BATCH = 24;
let knownArchive = validateArchive(saved);
export async function loadArchive(fetcher = fetch, requireRemote = Boolean(process.env.VERCEL)) {
 try {
  const response = await fetcher('https://raw.githubusercontent.com/byalex33/changelog.earth/main/data/editions.json',{next:{revalidate:900},signal:AbortSignal.timeout(5000)});
  if (!response.ok) throw new Error('Saved archive unavailable');
  knownArchive = mergeEditions(knownArchive,validateArchive(await response.json()));
 } catch (error) {
  // On Vercel, fail regeneration rather than replace a newer published page with an older bundle.
  if (requireRemote) throw error;
 }
 return knownArchive;
}

export async function getPublishedChangelog({draft = false} = {}) {
 const archive = await loadArchive();
 if (!draft) return {articles:archive.filter(isPublishedWorldwide),editorial:'archived',checkedAt:Date.now(),unavailable:[],stale:[],sourceStatus:[]};
 // Only the archive collector requests drafts. Visitors never see an unsaved AI selection.
 const options = {apiKey:process.env.GROQ_API_KEY,model:process.env.GROQ_MODEL,archive};
 const pending = archive.filter(a=>a.titleStyleVersion!==TITLE_STYLE_VERSION || typeof a.worldwide!=='boolean');
 // Style migrations advance one bounded batch per run, newest first; the collector saves it and the next run continues.
 if (pending.length) return {articles:mergeEditions(archive,await writePatchTitles(pending.slice(0,MIGRATION_BATCH),options)),editorial:'generated'};
 return getChangelog(await getNews(),options);
}
