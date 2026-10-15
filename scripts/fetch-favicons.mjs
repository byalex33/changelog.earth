// Download publisher favicons once so readers' browsers never ask a third party for them.
// Run after adding feeds or publishers: node scripts/fetch-favicons.mjs. Existing files are kept.
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { rssFeeds } from '../lib/rss-feeds.mjs';
import { isPublishedWorldwide } from '../lib/editorial-policy.mjs';

const dir = new URL('../public/favicons/',import.meta.url);
const archive = JSON.parse(await readFile(new URL('../data/editions.json',import.meta.url),'utf8'));
const hosts = new Set([
 ...rssFeeds.map(feed=>new URL(feed.url).hostname),
 // Site links the Sources modal uses instead of feed hosts, plus Spaceflight News.
 'bbc.com','www.bbc.com','news.sky.com','thespacedevs.com',
 ...archive.filter(isPublishedWorldwide).map(story=>new URL(story.url).hostname),
]);
await mkdir(dir,{recursive:true});
let saved = 0;
const missing = [];
for (const host of [...hosts].sort()) {
 const file = new URL(`${host}.png`,dir);
 if (await access(file).then(()=>true,()=>false)) continue;
 // Both services answer unknown hosts with a 404 and a generic globe; skip those so the letter fallback shows.
 const sources = [`https://www.google.com/s2/favicons?${new URLSearchParams({domain:host,sz:'64'})}`,`https://icons.duckduckgo.com/ip3/${host}.ico`];
 const errors = [];
 for (const source of sources) {
  try {
   const response = await fetch(source,{signal:AbortSignal.timeout(10000)});
   const type = response.headers.get('content-type') ?? '';
   if (!response.ok || type !== 'image/png') throw new Error(`HTTP ${response.status} ${type}`);
   await writeFile(file,Buffer.from(await response.arrayBuffer()));
   saved++;
   break;
  } catch (error) {
   errors.push(error.message);
  }
 }
 if (errors.length === sources.length) missing.push(`${host} (${errors.join(', ')})`);
}
console.log(`Saved ${saved} favicons to public/favicons/ (${hosts.size} hosts).`);
if (missing.length) console.log(`No favicon for:\n ${missing.join('\n ')}`);
