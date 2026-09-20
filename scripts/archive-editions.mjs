import { readFile, writeFile } from 'node:fs/promises';
import { mergeEditions, validateArchive } from '../lib/edition-archive.mjs';

const path = new URL('../data/editions.json',import.meta.url);
const previous = validateArchive(JSON.parse(await readFile(path,'utf8')));
const endpoint = new URL(process.env.EDITION_URL || 'https://www.changelog.earth/api/news');
endpoint.searchParams.set('archive',Date.now().toString());
const response = await fetch(endpoint,{signal:AbortSignal.timeout(175_000)});
if (!response.ok) throw new Error(`Edition HTTP ${response.status}`);
const edition = await response.json();
if (!['generated','empty'].includes(edition.editorial) || !edition.articles?.length) throw new Error('Collection did not complete; refusing a cached fallback');
const articles = mergeEditions(previous,validateArchive(edition.articles));
await writeFile(path,JSON.stringify(articles,null,2)+'\n');
const additions=articles.filter(article=>!previous.some(saved=>saved.url===article.url));
console.log(`Collection ${edition.editorial}; archive contains ${articles.length} stories; added ${additions.length}, worldwide ${additions.filter(a=>a.worldwide===true).length}. Source publication dates: ${[...new Set(additions.map(a=>a.date.slice(0,10)))].join(', ') || 'none'}.`);
