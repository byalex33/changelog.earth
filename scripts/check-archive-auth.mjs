import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
// Exercise the actual route with a stub at the collection boundary: denied requests must never reach it.
// 65 stories carrying internal fields the public response must drop; story 31 has only a note.
const publisherUrl = asModule(`export const calls=[]; export async function getPublishedChangelog(options) { calls.push(options); return {articles:Array.from({length:65},(_,i)=>({title:'T'+i,url:'https://example.org/'+i,date:'2026-10-01T00:00:00.000Z',dateLabel:'Published',publisher:'P',provider:'P',category:'Space',kind:'Added',originalTitle:'O'+i,...(i===30?{note:'N'}:{summary:'S'+i,note:'S'+i}),scopeReason:'r',titleModel:'m',titleStyleVersion:5,worldwide:true})),editorial:"archived"}; }`);
const { calls } = await import(publisherUrl);
const source = await readFile(new URL('../app/api/news/route.ts',import.meta.url),'utf8');
const { GET } = await import(asModule(stripTypeScriptTypes(source)
 .replace('@/lib/published-changelog.mjs',publisherUrl)
 .replace('@/lib/changelog.mjs',new URL('../lib/changelog.mjs',import.meta.url).href)
 .replace('@/lib/public-story.mjs',new URL('../lib/public-story.mjs',import.meta.url).href)));
const savedSecret = process.env.ARCHIVE_SECRET, savedFetch = globalThis.fetch;
const secret = 'collector-test-secret';
const publicKeys = ['date','dateLabel','kind','originalTitle','publisher','summary','title','url'];
const request = (query,authorization) => new Request(`https://example.org/api/news${query}`,{headers:authorization ? {Authorization:authorization} : {}});
try {
 for (const configured of [undefined,'',secret]) {
  if (configured === undefined) delete process.env.ARCHIVE_SECRET;
  else process.env.ARCHIVE_SECRET = configured;
  for (const query of ['?archive','?archive=anything','?%61rchive=false','?archive=&archive=1',`?archive&token=${secret}`]) {
   for (const header of [undefined,'Bearer',`Bearer ${secret}x`,`Bearer ${secret.slice(0,-1)}x`,`Basic ${secret}`,'Bearer é',...(!configured ? [`Bearer ${secret}`,'Bearer undefined'] : [])]) {
    const response = await GET(request(query,header));
    assert.equal(response.status,401);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal(response.headers.get('vercel-cdn-cache-control'),'no-store');
    assert.deepEqual(await response.json(),{error:'Unauthorized'});
   }
  }
 }
 assert.equal(calls.length,0,'Unauthorized requests must not load archives, feeds or paid AI');
 process.env.ARCHIVE_SECRET = secret;
 const allowed = await GET(request('?archive',`Bearer ${secret}`));
 assert.equal(allowed.status,200);
 assert.equal(allowed.headers.get('cache-control'),'no-store');
 assert.equal(allowed.headers.get('vercel-cdn-cache-control'),'no-store');
 const draftEdition = await allowed.json();
 assert.equal(draftEdition.editorial,'archived');
 assert.equal(draftEdition.articles.length,65,'The collector still receives the whole unpaginated edition');
 assert.equal(draftEdition.articles[0].scopeReason,'r','The collector still receives internal fields');
 assert.deepEqual(calls,[{draft:true}]);
 delete process.env.ARCHIVE_SECRET;
 const published = await GET(request(''));
 assert.equal(published.status,200);
 assert.equal(published.headers.get('cache-control'),'public, max-age=0, must-revalidate');
 assert.equal(published.headers.get('vercel-cdn-cache-control'),'public, s-maxage=900, stale-while-revalidate=3600');
 assert.deepEqual(calls,[{draft:true},{draft:false}],'Published reads must remain public without collection credentials');
 const first = await published.json();
 assert.equal(first.total,65);
 assert.deepEqual(first.articles.map(a=>a.url),Array.from({length:30},(_,i)=>'https://example.org/'+i));
 assert.deepEqual(Object.keys(first.articles[0]).sort(),publicKeys,'Public stories must carry only rendered fields');
 assert.deepEqual(Object.keys(first).sort(),['articles','total']);
 const second = await (await GET(request('?page=2'))).json();
 assert.deepEqual(second.articles.map(a=>a.title),Array.from({length:30},(_,i)=>'T'+(i+30)));
 assert.equal(second.articles[0].summary,'N','Summary falls back to the note');
 assert.equal((await (await GET(request('?page=3'))).json()).articles.length,5);
 assert.deepEqual((await (await GET(request('?page=9'))).json()),{articles:[],total:65});
 assert.equal(calls.length,5);
 // Query-string variants would each miss the CDN cache, so anything but a canonical ?page=N is refused before loading.
 for (const query of ['?foo=1','?x=1','?page=2&x=1','?page=0','?page=02','?page=-1','?page=1.5','?page=abc','?page=','?page=1&page=2','?page=99999','?Archive','?summary']) {
  const response = await GET(request(query));
  assert.equal(response.status,400,query);
  assert.equal(response.headers.get('cache-control'),'public, max-age=300');
  assert.equal(response.headers.get('vercel-cdn-cache-control'),'public, s-maxage=300');
  assert.deepEqual(await response.json(),{error:'Unknown parameter'});
 }
 assert.equal(calls.length,5,'Rejected query strings must not load the archive');

 const archive = new URL('../data/editions.json',import.meta.url);
 const before = await readFile(archive,'utf8');
 let requests = 0;
 globalThis.fetch = async (url,options) => {
  requests++;
  assert(new URL(url).searchParams.has('archive'));
  assert.equal(new Headers(options.headers).get('authorization'),`Bearer ${secret}`);
  assert.equal(options.redirect,'error','Credentials must not follow redirects');
  return new Response('Unauthorized',{status:401});
 };
 await assert.rejects(import('./archive-editions.mjs?missing-secret'),/ARCHIVE_SECRET must be configured/);
 assert.equal(requests,0,'Collector must fail before making a request when its secret is missing');
 process.env.ARCHIVE_SECRET = secret;
 await assert.rejects(import('./archive-editions.mjs?denied'),/Edition HTTP 401/);
 assert.equal(requests,1);
 assert.equal(await readFile(archive,'utf8'),before,'Authentication failures must not modify the archive');
 const failingPublisher = asModule(`export async function getPublishedChangelog() { throw new Error('Invalid patch title: sourceId 0 is 94 characters'); }`);
 const { GET: failGet } = await import(asModule(stripTypeScriptTypes(source)
  .replace('@/lib/published-changelog.mjs',failingPublisher)
  .replace('@/lib/changelog.mjs',new URL('../lib/changelog.mjs',import.meta.url).href)
  .replace('@/lib/public-story.mjs',new URL('../lib/public-story.mjs',import.meta.url).href)));
 const failedCollection = await failGet(request('?archive',`Bearer ${secret}`));
 assert.equal(failedCollection.status,500);
 assert.equal(failedCollection.headers.get('cache-control'),'no-store');
 assert.equal(failedCollection.headers.get('vercel-cdn-cache-control'),'no-store');
 assert.deepEqual(await failedCollection.json(),{error:'Invalid patch title: sourceId 0 is 94 characters'});
 let attempts=0;
 globalThis.fetch = async () => {
  attempts++;
  return Response.json({error:'Invalid patch title: sourceId 0 is 94 characters'},{status:500});
 };
 await assert.rejects(import('./archive-editions.mjs?server-error'),/Edition HTTP 500: Invalid patch title: sourceId 0 is 94 characters/);
 assert.equal(attempts,2,'A transient edition failure is retried once');
 assert.equal(await readFile(archive,'utf8'),before,'A failed collection must not modify the archive');
} finally {
 globalThis.fetch = savedFetch;
 if (savedSecret === undefined) delete process.env.ARCHIVE_SECRET;
 else process.env.ARCHIVE_SECRET = savedSecret;
}
console.log('Archive authentication, fail-closed configuration, paginated public reads, unknown-parameter rejection, collector credentials and denied-write safety pass.');
