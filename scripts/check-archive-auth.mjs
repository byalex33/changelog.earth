import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
// Exercise the actual route with a stub at the collection boundary: denied requests must never reach it.
const publisherUrl = asModule('export const calls=[]; export async function getPublishedChangelog(options) { calls.push(options); return {articles:[{}],editorial:"archived"}; }');
const { calls } = await import(publisherUrl);
const source = await readFile(new URL('../app/api/news/route.ts',import.meta.url),'utf8');
const { GET } = await import(asModule(stripTypeScriptTypes(source)
 .replace('@/lib/published-changelog.mjs',publisherUrl)
 .replace('@/lib/changelog.mjs',new URL('../lib/changelog.mjs',import.meta.url).href)));
const savedSecret = process.env.ARCHIVE_SECRET, savedFetch = globalThis.fetch;
const secret = 'collector-test-secret';
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
 assert.deepEqual(calls,[{draft:true}]);
 delete process.env.ARCHIVE_SECRET;
 const published = await GET(request(''));
 assert.equal(published.status,200);
 assert.equal(published.headers.get('cache-control'),'public, max-age=0, must-revalidate');
 assert.deepEqual(calls,[{draft:true},{draft:false}],'Published reads must remain public without collection credentials');

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
} finally {
 globalThis.fetch = savedFetch;
 if (savedSecret === undefined) delete process.env.ARCHIVE_SECRET;
 else process.env.ARCHIVE_SECRET = savedSecret;
}
console.log('Archive authentication, fail-closed configuration, public reads, collector credentials and denied-write safety pass.');
