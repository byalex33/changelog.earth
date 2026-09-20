import assert from 'node:assert/strict';
import { loadArchive, getPublishedChangelog } from '../lib/published-changelog.mjs';
import { applyPatchTitles, writePatchTitles } from '../lib/patch-titles.mjs';
import { mergeEditions } from '../lib/edition-archive.mjs';

const article={title:'Old headline',originalTitle:'New cat species identified',note:'A new cat species was identified.',url:'https://example.org/publication-test',date:'2026-09-20',provider:'Example',publisher:'Example',category:'Positive news',kind:'Added'};
const corrected=applyPatchTitles([article],{entries:[{sourceId:0,title:'New cat spawned'}]})[0];
assert.deepEqual({...corrected,title:article.title,titleRevision:undefined},{...article,titleRevision:undefined});
assert.throws(()=>applyPatchTitles([article],{entries:[]}));
assert.throws(()=>applyPatchTitles([article],{entries:[{sourceId:1,title:'Wrong story'}]}));
assert.equal(mergeEditions([article],[corrected])[0].title,'New cat spawned');
assert.equal(mergeEditions([corrected],[article])[0].title,'New cat spawned');
let calls=0;
const written=await writePatchTitles([article],{apiKey:'test',hfToken:'test',fetcher:async url=>{
 calls++;
 return url.includes('googleapis')?new Response('',{status:429}):Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({entries:[{sourceId:0,title:'New cat spawned'}]})}}]});
}});
assert.equal(calls,2); assert.equal(written[0].url,article.url);
await assert.rejects(writePatchTitles([article],{apiKey:'test',fetcher:async()=>new Response('',{status:429})}));
await loadArchive(async()=>Response.json([corrected]),true);
const oldFetch=globalThis.fetch;
try {
 globalThis.fetch=async url=>{
  assert.ok(String(url).startsWith('https://raw.githubusercontent.com/'),'Reading the page must never call feeds or AI');
  return Response.json([article]);
 };
 const edition=await getPublishedChangelog();
 assert.equal(edition.editorial,'archived');
 assert.equal(edition.articles.find(a=>a.url===article.url).title,'New cat spawned');
 await assert.rejects(loadArchive(async()=>new Response('',{status:503}),true),'Production archive failure must fail regeneration');
 const offline=await loadArchive(async()=>{throw Error('offline');},false);
 assert.ok(offline.some(a=>a.url===article.url),'Offline local fallback must not lose a loaded story');
} finally {globalThis.fetch=oldFetch;}
console.log('Saved-only reads, outage retention, versioned titles and title-writer failure safety pass.');
