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
assert.equal(written[0].titleProvider,'huggingface');
assert.equal(mergeEditions([article],written)[0].titleStyleVersion,2);
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
 const oldKey=process.env.GEMINI_API_KEY;
 process.env.GEMINI_API_KEY='test';
 try {
  let submitted=[];
  globalThis.fetch=async (url,options)=>{
   if (String(url).startsWith('https://raw.githubusercontent.com/')) return Response.json([article]);
   assert.ok(String(url).includes('googleapis'),'Successful Gemini rewriting must not call feeds or Hugging Face');
   submitted=JSON.parse(JSON.parse(options.body).contents[0].parts[0].text);
   return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({entries:submitted.map(a=>({sourceId:a.sourceId,title:'Test patch title'}))})}]}}]});
  };
  const draft=await getPublishedChangelog({draft:true});
  assert.equal(submitted.length,edition.articles.length,'Every existing story must go through the writer');
  assert.ok(draft.articles.every(a=>a.titleProvider==='gemini' && a.titleStyleVersion===2));
  assert.equal((await getPublishedChangelog()).articles.find(a=>a.url===article.url).title,'New cat spawned','Uncommitted rewrites must not reach visitors');
  globalThis.fetch=async url=>String(url).startsWith('https://raw.githubusercontent.com/')?Response.json([article]):new Response('',{status:429});
  await assert.rejects(getPublishedChangelog({draft:true}),'Provider failure must not publish a partial migration');
 } finally {
  if (oldKey===undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY=oldKey;
 }
} finally {globalThis.fetch=oldFetch;}
console.log('Saved-only reads, outage retention, versioned titles and title-writer failure safety pass.');
