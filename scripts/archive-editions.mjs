import { readFile, writeFile } from 'node:fs/promises';
import { mergeEditions, validateArchive } from '../lib/edition-archive.mjs';

const secret = process.env.ARCHIVE_SECRET;
if (!secret) throw new Error('ARCHIVE_SECRET must be configured for collection');
const path = new URL('../data/editions.json',import.meta.url);
const previous = validateArchive(JSON.parse(await readFile(path,'utf8')));
const retryable = new Set([429,500,502,504]);
let response;
for (let attempt=0;attempt<2;attempt++) {
 const endpoint = new URL(process.env.EDITION_URL || 'https://www.changelog.earth/api/news');
 endpoint.searchParams.set('archive',Date.now().toString());
 try {
  response = await fetch(endpoint,{signal:AbortSignal.timeout(175_000),headers:{Authorization:`Bearer ${secret}`},redirect:'error'});
 } catch (error) {
  if (attempt===1) throw error;
  console.warn(`Retrying edition fetch: ${error.message}`);
  await new Promise(resolve=>setTimeout(resolve,2_000));
  continue;
 }
 if (response.ok) break;
 const detail = await failureDetail(response);
 const message = `Edition HTTP ${response.status}${detail ? `: ${detail}` : ''}`;
 if (attempt===1 || !retryable.has(response.status)) throw new Error(message);
 console.warn(`Retrying edition fetch: ${message}`);
 await new Promise(resolve=>setTimeout(resolve,2_000));
}

async function failureDetail(response) {
 const text = await response.text();
 let detail = text;
 try { const body = JSON.parse(text); if (typeof body?.error === 'string') detail = body.error; } catch {}
 return detail.replace(/\s+/g,' ').trim().slice(0,300);
}
const edition = await response.json();
if (!['generated','empty'].includes(edition.editorial) || !edition.articles?.length) throw new Error('Collection did not complete; refusing a cached fallback');
const articles = mergeEditions(previous,validateArchive(edition.articles));
await writeFile(path,JSON.stringify(articles,null,2)+'\n');
const additions=articles.filter(article=>!previous.some(saved=>saved.url===article.url));
console.log(`Collection ${edition.editorial}; archive contains ${articles.length} stories; added ${additions.length}, worldwide ${additions.filter(a=>a.worldwide===true).length}. Source publication dates: ${[...new Set(additions.map(a=>a.date.slice(0,10)))].join(', ') || 'none'}.`);
