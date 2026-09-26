import assert from 'node:assert/strict';
import { writePatchTitles } from '../lib/patch-titles.mjs';
import { getChangelog } from '../lib/changelog.mjs';
import { mergeEditions, validateArchive } from '../lib/edition-archive.mjs';
import { TITLE_STYLE_VERSION } from '../lib/editorial-policy.mjs';

const story={title:'New cat joins species roster',originalTitle:'Scientists discover a new cat species',note:'A new species was identified.',url:'https://example.org/cat',date:'2026-09-25',provider:'Example',publisher:'Example',category:'Science & nature',kind:'Added',worldwide:true,scopeReason:'New species expands scientific knowledge.',titleStyleVersion:TITLE_STYLE_VERSION,titleRevision:1};
let calls=0;
const options={apiKey:'groq-test',gatewayApiKey:'legacy-key-must-be-ignored',strict:true,fetcher:async url=>{
 assert.equal(url,'https://api.groq.com/openai/v1/chat/completions','Collection must never call AI Gateway, even with a legacy key');
 calls++;
 return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({entries:[{sourceId:0,title:story.title,kind:story.kind,worldwide:true,scopeReason:story.scopeReason}]})}}]});
}};
assert.equal((await writePatchTitles([story],options))[0].worldwide,true);
const edition=await getChangelog({articles:[story],stale:[],unavailable:[]},options);
assert.equal(edition.editorial,'generated');
assert.equal(edition.articles[0].worldwide,true);
assert.equal(edition.articles[0].date,'2026-09-25');
assert.equal(calls,2,'Each collection path needs only Groq');
validateArchive(edition.articles);
// Removing the service must not discard historical review provenance.
const historical={...story,jev:{model:'typesafe-ai/jev',eligibleProbability:0.9,faithfulProbability:0.95}};
validateArchive([historical]);
assert.deepEqual(mergeEditions([historical],[{...historical,titleRevision:2}])[0].jev,historical.jev);
console.log('Groq-only writer and strict collection pass with a legacy gateway key; historical archive metadata is retained.');
