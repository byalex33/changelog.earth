import assert from 'node:assert/strict';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { GET } from '../app/feed.xml/route.js';
import { TITLE_STYLE_VERSION } from '../lib/editorial-policy.mjs';

const article = {
 title:'New species & <friends>', originalTitle:'Discovery & "details"',
 note:'A discovery.', summary:'A <script>alert("test")</script> & a discovery.',
 url:'https://example.org/discovery?a=1&b=2', date:'2099-01-01T12:30:00Z',
 provider:'Example', publisher:'Science & Nature', category:'Science & nature', kind:'Added',
 titleStyleVersion:TITLE_STYLE_VERSION, worldwide:true, titleRevision:1,
};
const originalFetch = globalThis.fetch;
const originalVercel = process.env.VERCEL;
let archive = [article, {...article,url:'https://example.org/excluded',originalTitle:'Excluded story',worldwide:false}];
const parser = new XMLParser({ignoreAttributes:false,parseTagValue:false,isArray:name=>name==='item'});
try {
 globalThis.fetch = async url => {
  assert.equal(String(url),'https://raw.githubusercontent.com/byalex33/changelog.earth/main/data/editions.json','RSS must not call AI or upstream news feeds');
  return Response.json(archive);
 };
 const response = await GET();
 assert.equal(response.status,200);
 assert.equal(response.headers.get('content-type'),'application/rss+xml; charset=utf-8');
 const xml = await response.text();
 assert.equal(XMLValidator.validate(xml),true);
 const channel = parser.parse(xml).rss.channel;
 assert.equal(channel['atom:link']['@_href'],'https://www.changelog.earth/feed.xml');
 assert.ok(channel.item.length<=100);
 assert.ok(!channel.item.some(item=>item.link==='https://example.org/excluded'));
 const item = channel.item[0];
 assert.equal(item.title,`[Added] ${article.title}`);
 assert.equal(item.link,article.url);
 assert.equal(item.guid['#text'],article.url);
 assert.equal(item.pubDate,'Thu, 01 Jan 2099 12:30:00 GMT');
 assert.ok(item.description.includes('&lt;script&gt;'));
 assert.ok(!item.description.includes('<script>'));
 archive = [{...article,title:'Corrected title',titleRevision:2}];
 const revised = parser.parse(await (await GET()).text()).rss.channel.item[0];
 assert.equal(revised.title,'[Added] Corrected title');
 assert.deepEqual(revised.guid,item.guid,'Title edits must not create duplicate subscriptions');
 process.env.VERCEL = '1';
 globalThis.fetch = async () => new Response('',{status:503});
 await assert.rejects(GET(),/Saved archive unavailable/,'Failed regeneration must keep the previous feed');
} finally {
 globalThis.fetch = originalFetch;
 if (originalVercel === undefined) delete process.env.VERCEL;
 else process.env.VERCEL = originalVercel;
}
console.log('RSS XML, published-only stories, escaping, stable IDs and outage safety pass.');
