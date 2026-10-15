import assert from 'node:assert/strict';
import { loadArchive, getPublishedChangelog, MIGRATION_BATCH } from '../lib/published-changelog.mjs';
import { applyPatchTitles, readsLikeHeadline, writePatchTitles } from '../lib/patch-titles.mjs';
import { mergeEditions } from '../lib/edition-archive.mjs';
import { TITLE_STYLE_VERSION, WORLDWIDE_POLICY, isPublishedWorldwide } from '../lib/editorial-policy.mjs';
const article={title:'Old headline',originalTitle:'New cat species identified',summary:'Scientists identify a previously unknown wild cat species.',note:'A new cat species was identified.',url:'https://example.org/publication-test',date:'2000-01-01',provider:'Example',publisher:'Example',category:'Positive news',kind:'Added'};
const entry={sourceId:0,title:'Added: New wild cat joins species roster',kind:'Added',worldwide:true,scopeReason:'New species expands scientific knowledge.'};
const corrected=applyPatchTitles([article],{entries:[entry]},'groq','test')[0];
assert.equal(corrected.title,'New wild cat joins species roster');
const prefixed='Added: '+ 'A'.repeat(76);
assert.ok(prefixed.length>80);
assert.equal(applyPatchTitles([article],{entries:[{...entry,title:prefixed}]})[0].title.length,76,'A label prefix is removed before the length limit');
assert.equal(applyPatchTitles([article],{entries:[{...entry,title:'Bird memory skill tree expanded'.padEnd(81)}] })[0].title,'Bird memory skill tree expanded');
assert.throws(()=>applyPatchTitles([article],{entries:[{...entry,title:'B'.repeat(401)}]}),/Invalid patch title: sourceId 0 is 401 characters/);
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
 assert.ok(body.messages[0].content.includes(WORLDWIDE_POLICY),'The writer and reviewer must share research eligibility rules');
 assert.deepEqual(JSON.parse(body.messages[1].content)[0],{sourceId:0,headline:article.originalTitle});
 return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({entries:[entry]})}}]});
}});
await assert.rejects(writePatchTitles([article],{apiKey:'test',fetcher:async()=>new Response('',{status:429})}));
for (const title of ['Insomnia linked to higher stroke risk','Venus may have eaten its moon','Enceladus ocean spray chemistry unlocked','Geothermal energy efficiency buffed']) assert.ok(readsLikeHeadline(title),`${title} is a headline, not a patch note`);
for (const title of ['Stroke-risk debuff linked to insomnia','New penguin joins the known species roster','Bird memory skill tree expanded','ISS supply inventory restocked']) assert.ok(!readsLikeHeadline(title),`${title} names a game concept`);
const headlineReply=title=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({entries:[{...entry,title}]})}}]});
const rewriteReply=title=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({entries:[{sourceId:0,title}]})}}]});
let requests=[];
let [rewritten]=await writePatchTitles([article],{apiKey:'test',fetcher:async(url,options)=>{
 requests.push(JSON.parse(options.body));
 return requests.length===1 ? headlineReply('Wild cat species identified') : rewriteReply('Added: Wild cat joins the species roster');
}});
assert.equal(requests.length,2,'A headline-style title gets one rewrite pass');
assert.deepEqual(JSON.parse(requests[1].messages[1].content),[{sourceId:0,headline:article.originalTitle,kind:'Added',rejectedTitle:'Wild cat species identified'}]);
assert.equal(rewritten.title,'Wild cat joins the species roster');
assert.equal(rewritten.titleRevision,1,'The rewrite belongs to the same revision');
requests=[];
[rewritten]=await writePatchTitles([article],{apiKey:'test',fetcher:async()=>(requests.push(1),requests.length===1 ? headlineReply('Wild cat species identified') : rewriteReply('Wild cat found in Peru'))});
assert.equal(rewritten.title,'Wild cat species identified','A rewrite that is still a headline is not taken');
requests=[];
[rewritten]=await writePatchTitles([article],{apiKey:'test',fetcher:async()=>(requests.push(1),requests.length===1 ? headlineReply('Wild cat species identified') : new Response('',{status:429}))});
assert.equal(rewritten.title,'Wild cat species identified','A failed rewrite never costs the collection');
requests=[];
await writePatchTitles([article],{apiKey:'test',fetcher:async()=>(requests.push(1),headlineReply(entry.title))});
assert.equal(requests.length,1,'Titles that already name a game concept cost no extra call');
const longHeadline='Scientists identify a previously unknown wild cat species living in the high Andes foothills today';
assert.ok(longHeadline.length>80 && longHeadline.length<=400);
requests=[];
[rewritten]=await writePatchTitles([article],{apiKey:'test',fetcher:async()=>(requests.push(1),requests.length===1 ? headlineReply(longHeadline) : rewriteReply('New wild cat joins species roster'))});
assert.equal(requests.length,2,'An over-long headline is rewritten instead of failing the batch');
assert.equal(rewritten.title,'New wild cat joins species roster');
requests=[];
[rewritten]=await writePatchTitles([article],{apiKey:'test',fetcher:async()=>{
 requests.push(1);
 if (requests.length===1) return headlineReply(longHeadline);
 if (requests.length===2) return rewriteReply('y'.repeat(90));
 return headlineReply('New wild cat joins species roster');
}});
assert.equal(rewritten.title,'New wild cat joins species roster');
assert.equal(requests.length,3,'A title that stays over 80 characters gets one fresh generation');
requests=[];
await assert.rejects(writePatchTitles([article],{apiKey:'test',fetcher:async()=>{
 requests.push(1);
 return requests.length%2===1 ? headlineReply(longHeadline) : rewriteReply('y'.repeat(90));
}}),new RegExp(`Invalid patch title: sourceId 0 is ${longHeadline.length} characters`));
assert.equal(requests.length,4,'An over-long title does not retry generation indefinitely');
await loadArchive(async()=>Response.json([corrected,{...rejected,url:'https://example.org/local',originalTitle:'Local nature reserve receives a land gift'}]),true);
const oldFetch=globalThis.fetch;
try {
 globalThis.fetch=async url=>{
  assert.ok(String(url).startsWith('https://raw.githubusercontent.com/'),'Published reads never call feeds or AI');
  return Response.json([article]);
 };
 const edition=await getPublishedChangelog();
 assert.deepEqual(Object.keys(edition),['articles','editorial'],'Readers get saved stories only, not collection status');
 assert.equal(edition.editorial,'archived');
 assert.ok(edition.articles.every(isPublishedWorldwide));
 assert.equal(edition.articles.find(a=>a.url===article.url).title,corrected.title);
 assert.ok(!edition.articles.some(a=>a.url==='https://example.org/local'));
 await assert.rejects(loadArchive(async()=>new Response('',{status:503}),true));
 const offline=await loadArchive(async()=>{throw Error('offline');},false);
 assert.ok(offline.some(a=>a.url==='https://example.org/local'),'Excluded history is preserved, not deleted');
} finally {globalThis.fetch=oldFetch;}
assert.equal(corrected.titleStyleVersion,TITLE_STYLE_VERSION);
// A style change must not send the whole archive to Groq in one call: that exceeds the output cap
// and fails every collection run. 60 outdated stories over ten 2001 days (clear of the bundled archive).
const outdated=Array.from({length:60},(_,i)=>({...article,title:`Old migration title ${i}`,originalTitle:`Migration test species ${i} identified`,url:`https://example.org/migration-${i}`,date:`2001-01-${String(10-Math.floor(i/6)).padStart(2,'0')}`,titleStyleVersion:TITLE_STYLE_VERSION-1,worldwide:true,scopeReason:'Older style',titleRevision:1}));
const oldKey=process.env.GROQ_API_KEY, batches=[];
let remote=outdated;
try {
 process.env.GROQ_API_KEY='test';
 globalThis.fetch=async(url,options)=>{
  if (String(url).startsWith('https://raw.githubusercontent.com/')) return Response.json(remote);
  assert.equal(url,'https://api.groq.com/openai/v1/chat/completions','A pending migration runs before any feed request');
  const input=JSON.parse(JSON.parse(options.body).messages[1].content);
  assert.ok(input.length<=24,'Each Groq request carries at most 24 stories');
  batches.push(input.length);
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({entries:input.map(({sourceId})=>({sourceId,title:`Species ${sourceId} joins the roster`,kind:'Added',worldwide:true,scopeReason:'New species'}))})}}]});
 };
 const migrated=edition=>edition.articles.filter(a=>a.url.startsWith('https://example.org/migration-') && a.titleStyleVersion===TITLE_STYLE_VERSION).map(a=>a.url).sort();
 const first=await getPublishedChangelog({draft:true});
 assert.equal(MIGRATION_BATCH,24);
 assert.equal(first.editorial,'generated','The collector saves each migration batch');
 assert.deepEqual(batches,[24],'One bounded Groq call per run');
 assert.deepEqual(migrated(first),outdated.slice(0,24).map(a=>a.url).sort(),'Exactly 24 stories, newest first, migrate per run');
 assert.equal(first.articles.filter(a=>a.url.startsWith('https://example.org/migration-')).length,60,'Stories awaiting migration stay in the archive');
 remote=first.articles; // The collector committed the batch; the next run reads it back.
 assert.equal(migrated(await getPublishedChangelog({draft:true})).length,48,'The next run continues the migration');
} finally {
 globalThis.fetch=oldFetch;
 if (oldKey===undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY=oldKey;
}
console.log('Worldwide publication gate, source context, title normalization, headline rewrites, bounded archive migration and outage safety pass.');
