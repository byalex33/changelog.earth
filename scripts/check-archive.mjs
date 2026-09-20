import assert from 'node:assert/strict';
import { mergeEditions, validateArchive } from '../lib/edition-archive.mjs';


const story = (id,day='2026-09-19') => ({title:`Forest restored ${id}`,originalTitle:`Community restores forest ${id}`,note:'A community restored a forest.',url:`https://example.org/${id}`,date:day,provider:'Example',publisher:'Example',category:'Positive news',kind:'Changed'});
const previous=[story(1,'2026-08-01'),story(2)];
const added=[story(2),{...story(3),originalTitle:story(2).originalTitle},...Array.from({length:8},(_,i)=>story(i+4))];
const merged=mergeEditions(previous,added);
assert.equal(merged.filter(a=>a.date==='2026-09-19').length,6);
assert.deepEqual(merged.find(a=>a.url===previous[0].url),previous[0]);
assert.deepEqual(mergeEditions(merged,added),merged,'Repeated harvesting must be idempotent');
assert.deepEqual(mergeEditions(previous,[]),mergeEditions(previous,previous));
assert.equal(merged.length,7);
assert.throws(()=>validateArchive([{...story(1),url:'javascript:alert(1)'}]));
assert.throws(()=>validateArchive([{...story(1),date:'invalid'}]));
assert.deepEqual(validateArchive(merged),merged);
const candidates=Array.from({length:12},(_,i)=>story(i,i<6?'2026-09-19':'2026-09-18'));
const {getChangelog}=await import('../lib/changelog.mjs?archive-test');
const news={articles:candidates,checkedAt:1,unavailable:[],stale:[]};
const result=await getChangelog(news,{archive:previous,apiKey:'test',fetcher:async()=>new Response('',{status:429})});
assert.deepEqual(result.articles,mergeEditions(previous,[]),'A cold outage must retain archived dates');
assert.equal(result.editorial,'cached');
const {getChangelog:generate}=await import('../lib/changelog.mjs?archive-additions');
const fuller=await generate(news,{archive:previous,apiKey:'test',fetcher:async(_,options)=>{
 const input=JSON.parse(JSON.parse(options.body).messages[1].content);
 assert.ok(input.every(a=>a.headline!==previous[1].originalTitle));
 const entries=input.map(a=>({sourceId:a.sourceId,title:a.headline,kind:'Updated',worldwide:true,scopeReason:'A global discovery'}));
 return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({entries})}}]});
}});
assert.equal(fuller.articles.filter(a=>a.date==='2026-09-19').length,5);
assert.equal(fuller.articles.filter(a=>a.date==='2026-09-18').length,6);
assert.deepEqual(fuller.articles.find(a=>a.url===previous[1].url),previous[1]);
assert.equal(fuller.articles.length,12);
console.log('Daily limits, multi-day selection, duplicate prevention, idempotent archives and cold-outage retention pass.');
const excludedDay=Array.from({length:6},(_,i)=>({...story(100+i),worldwide:false}));
assert.equal(mergeEditions(excludedDay,[story(200)]).length,7,'Excluded local stories must not consume worldwide daily slots');
assert.throws(()=>validateArchive([{...story(300),worldwide:'yes'}]));
