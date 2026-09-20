import saved from '../data/editions.json' with { type:'json' };
import { getChangelog } from './changelog.mjs';
import { writePatchTitles } from './patch-titles.mjs';
import { getNews } from './news.mjs';
import { mergeEditions, validateArchive } from './edition-archive.mjs';
import { TITLE_STYLE_VERSION, isPublishedWorldwide } from './editorial-policy.mjs';

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
 const options = {
  apiKey:process.env.GROQ_API_KEY,model:process.env.GROQ_MODEL,
 archive,strict:true,
 };
 const pending = archive.filter(a=>a.titleStyleVersion!==TITLE_STYLE_VERSION || typeof a.worldwide!=='boolean');
 if (pending.length) {
  const written = await writePatchTitles(pending,options);
  return {articles:mergeEditions(archive,written),editorial:'generated',checkedAt:Date.now(),unavailable:[],stale:[],sourceStatus:[]};
 }
 const edition = await getChangelog(await getNews(),options);
 const urls = new Set(archive.map(a=>a.url));
 const additions = edition.articles.filter(a=>!urls.has(a.url));
 const written = await writePatchTitles(additions,options);
 return {...edition,articles:mergeEditions(archive,written)};
}
