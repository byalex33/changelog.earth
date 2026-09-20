import assert from 'node:assert/strict';
import { loadArchive, getPublishedChangelog } from '../lib/published-changelog.mjs';
import { applyPatchTitles, writePatchTitles } from '../lib/patch-titles.mjs';
import { mergeEditions } from '../lib/edition-archive.mjs';
import { TITLE_STYLE_VERSION, isPublishedWorldwide } from '../lib/editorial-policy.mjs';
const article={title:'Old headline',originalTitle:'New cat species identified',summary:'Scientists identify a previously unknown wild cat species.',note:'A new cat species was identified.',url:'https://example.org/publication-test',date:'2026-09-20',provider:'Example',publisher:'Example',category:'Positive news',kind:'Added'};
const entry={sourceId:0,title:'Added: New wild cat joins species roster',kind:'Added',worldwide:true,scopeReason:'New species expands scientific knowledge.'};
const corrected=applyPatchTitles([article],{entries:[entry]},'groq','test')[0];
assert.equal(corrected.title,'New wild cat joins species roster');
assert.equal(corrected.url,article.url); assert.equal(corrected.summary,article.summary);
assert.ok(isPublishedWorldwide(corrected));
assert.ok(!isPublishedWorldwide({...corrected,worldwide:false}));
assert.ok(!isPublishedWorldwide({...corrected,titleStyleVersion:4}));
for(const bad of [{...entry,worldwide:undefined},{...entry,scopeReason:''},{...entry,sourceId:2},{...entry,kind:'Invented'}]) assert.throws(()=>applyPatchTitles([article],{entries:[bad]}));
assert.equal(mergeEditions([article],[corrected])[0].worldwide,true);
assert.equal(mergeEditions([corrected],[article])[0].title,corrected.title);
const rejected={...corrected,worldwide:false,titleRevision:corrected.titleRevision+1,scopeReason:'Only local interest'};
assert.equal(mergeEditions([corrected],[rejected])[0].worldwide,false,'New exclusions override old eligibility');
assert.equal(mergeEditions([rejected],[corrected])[0].worldwide,false,'Old remote metadata cannot restore a rejected story');
await writePatchTitles([article],{apiKey:'test',fetcher:async(url,options)=>{
 const body=JSON.parse(options.body);
 assert.ok(body.messages[0].content.includes('not a collection of local stories'));
 assert.equal(JSON.parse(body.messages[1].content)[0].summary,article.summary);
 return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({entries:[entry]})}}]});
}});
await assert.rejects(writePatchTitles([article],{apiKey:'test',fetcher:async()=>new Response('',{status:429})}));
await loadArchive(async()=>Response.json([corrected,{...rejected,url:'https://example.org/local',originalTitle:'Local nature reserve receives a land gift'}]),true);
const oldFetch=globalThis.fetch;
try {
 globalThis.fetch=async url=>{
  assert.ok(String(url).startsWith('https://raw.githubusercontent.com/'),'Published reads never call feeds or AI');
  return Response.json([article]);
 };
 const edition=await getPublishedChangelog();
 assert.ok(edition.articles.every(isPublishedWorldwide));
 assert.equal(edition.articles.find(a=>a.url===article.url).title,corrected.title);
 assert.ok(!edition.articles.some(a=>a.url==='https://example.org/local'));
 await assert.rejects(loadArchive(async()=>new Response('',{status:503}),true));
 const offline=await loadArchive(async()=>{throw Error('offline');},false);
 assert.ok(offline.some(a=>a.url==='https://example.org/local'),'Excluded history is preserved, not deleted');
} finally {globalThis.fetch=oldFetch;}
assert.equal(corrected.titleStyleVersion,TITLE_STYLE_VERSION);
console.log('Worldwide publication gate, source context, title normalization, archive migration and outage safety pass.');
