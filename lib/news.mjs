import { rssFeeds } from './rss-feeds.mjs';
import { parseRss, readFeed } from './rss.mjs';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const REFRESH_MS = 15 * 60 * 1000;
export const sourceCount = 2 + rssFeeds.length;
let cache;
let pending;
const previous = new Map();

export function normalizeArticles(payload, provider, now = Date.now()) {
 const records = provider === 'GDELT' ? payload?.articles : payload?.results;
 if (!Array.isArray(records)) throw new Error('Invalid news response');
 return records.flatMap(record => {
  if (!record || typeof record.title !== 'string' || typeof record.url !== 'string') return [];
  let url;
  try { url = new URL(record.url); } catch { return []; }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return [];
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  const rawDate = provider === 'GDELT' ? record.seendate : record.published_at;
  if (typeof rawDate !== 'string') return [];
  const date = Date.parse(rawDate.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'));
  if (!Number.isFinite(date) || date > now || date < now - MAX_AGE) return [];
  const title = record.title.replace(/\s+/g, ' ').trim().slice(0, 400);
  if (title.length < 8) return [];
  // ponytail: lightweight relevance filter; add editorial review if headline matching gets too noisy.
  if (provider === 'GDELT' && !/\b(species|discover\w*|wildlife|biodiversity|endangered|extinct\w*|scientist\w*|renewable|solar|ocean|reef|island|forest|bat|bird|turtle|whale)\b/i.test(title)) return [];
  if (provider === 'Spaceflight News' && (/\/(ESA_Multimedia|image-article)\//i.test(url.pathname) || /\b(promotes|appoints|invites media|week in images|APOD)\b/i.test(title))) return [];
  // ponytail: headline-only labels; preserve original wording instead of inventing an AI summary.
  const added = /\b(discover(?:ed|s|y|ies)?|new species|unveil(?:s|ed)?|reveal(?:s|ed)?)\b/i.test(title);
  return [{
   title, summary:typeof record.summary === 'string' ? record.summary.replace(/<[^>]*>/g,'').trim().slice(0,1800) : '', url: url.href, date: new Date(date).toISOString(),
   dateLabel: provider === 'GDELT' ? 'Indexed' : 'Published',
   publisher: provider === 'GDELT' ? url.hostname.replace(/^www\./, '') : (typeof record.news_site === 'string' ? record.news_site.slice(0, 80) : url.hostname),
   provider, category: rssFeeds.find(feed => feed.id === provider)?.category ?? (provider === 'Spaceflight News' ? 'Space' : 'Science & nature'),
   kind: added ? 'Added' : 'Changed',
  }];
 });
}

export function mergeArticles(lists) {
 const seenUrls = new Set(), seenTitles = new Set();
 return lists.flat().sort((a, b) => b.date.localeCompare(a.date)).filter(article => {
  const key = article.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  if (seenUrls.has(article.url) || seenTitles.has(key)) return false;
  seenUrls.add(article.url); seenTitles.add(key); return true;
 });
}

export async function getNews(fetcher = fetch, now = Date.now()) {
 if (cache && now - cache.checkedAt < (cache.unavailable.length ? 60_000 : REFRESH_MS)) return cache;
 if (pending) return pending;
 pending = (async () => {
  const urls = [
   'https://api.gdeltproject.org/api/v2/doc/doc?' + new URLSearchParams({query:'("new species" OR "newly discovered" OR "scientists discover" OR biodiversity OR conservation) sourcelang:english',mode:'artlist',format:'json',sort:'datedesc',maxrecords:'75',timespan:'7d'}),
   'https://api.spaceflightnewsapi.net/v4/articles/?' + new URLSearchParams({limit:'16',published_at_lte:new Date(now).toISOString()}),
  ];
  const sources = [{id:'GDELT',url:urls[0]},{id:'Spaceflight News',url:urls[1]},...rssFeeds];
  const results = await Promise.allSettled(sources.map(async source => {
   const saved = previous.get(source.id);
   if (saved && now - saved.fetchedAt < REFRESH_MS) return saved.articles;
   const rss = rssFeeds.find(feed => feed.id === source.id);
   const response = await fetcher(source.url, {signal:AbortSignal.timeout(rss ? 12_000 : 30_000),headers:{Accept:rss ? 'application/rss+xml, application/atom+xml, application/xml, text/xml' : 'application/json'}});
   if (!response.ok) { await response.body?.cancel(); throw new Error('HTTP '+response.status); }
   const payload = rss ? {results:parseRss(await readFeed(response),rss)} : await response.json();
   const articles = normalizeArticles(payload, source.id, now);
   previous.set(source.id, {articles, fetchedAt:now});
   return articles;
  }));
  const unavailable = [], stale = [], sourceStatus = [];
  const lists = results.map((result, index) => {
   const id=sources[index].id;
   if (result.status === 'fulfilled') { sourceStatus.push({name:id,status:'available',count:result.value.length}); return result.value; }
   unavailable.push(id);
   const saved = previous.get(id);
   const articles = saved && now - saved.fetchedAt < 24 * 60 * 60 * 1000 ? saved.articles.filter(article => Date.parse(article.date) >= now - MAX_AGE) : [];
   if (articles.length) stale.push(id);
   sourceStatus.push({name:id,status:articles.length ? 'cached' : 'unavailable',count:articles.length,reason:result.reason instanceof Error ? result.reason.message : 'Feed request failed'});
   return articles;
  });
  cache = {articles:mergeArticles(lists),checkedAt:now,unavailable,stale,sourceStatus};
  return cache;
 })();
 try { return await pending; } finally { pending = undefined; }
}



