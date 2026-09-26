import { writePatchTitles } from './patch-titles.mjs';
import { mergeEditions } from './edition-archive.mjs';
// ponytail: cache/coalescing is per Worker isolate; use shared storage if traffic needs a global API budget.
let cached, pending, retryAt = 0;

export function selectCandidates(articles) {
 const counts = new Map();
 // Keep newest days first, but take each publisher's first story before its second.
 return [...articles].sort((a,b)=>b.date.localeCompare(a.date)).map(article=>{
  const day=article.date.slice(0,10), key=JSON.stringify([day,article.publisher ?? article.provider]);
  const rank=counts.get(key) ?? 0;
  counts.set(key,rank+1);
  return {article,day,rank};
 }).sort((a,b)=>b.day.localeCompare(a.day) || a.rank-b.rank || b.article.date.localeCompare(a.article.date)).slice(0,24).map(({article})=>article);
}

export async function getChangelog(news, {apiKey = '', model = 'openai/gpt-oss-120b', fetcher = fetch, now = Date.now(), archive = [], strict = false} = {}) {
 // Only send relevant feed categories to the editor; never fill an outage with raw headlines.
 news = {...news,articles:news.articles.filter(article=>['Positive news','Science & nature','Space','Technology','Aviation','Health','Environment','Energy'].includes(article.category) || article.provider==='UN News')};
 const saved = mergeEditions(archive, cached && now - cached.at < 24 * 60 * 60_000 ? cached.edition.articles : []);
 const counts = new Map();
 for (const article of saved.filter(a=>a.worldwide!==false)) counts.set(article.date.slice(0,10),(counts.get(article.date.slice(0,10)) ?? 0)+1);
 const urls = new Set(saved.map(article=>article.url));
 const titleKey = article => (article.originalTitle ?? article.title).toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const titles = new Set(saved.map(titleKey));
 news = {...news,articles:selectCandidates(news.articles.filter(article=>!urls.has(article.url) && !titles.has(titleKey(article)) && (counts.get(article.date.slice(0,10)) ?? 0)<6))};
 const fallback = {...news, articles:saved, editorial:saved.length ? 'cached' : 'unavailable',stale:[...new Set([...news.stale,...saved.map(article=>article.provider).filter(Boolean)])]};
 if (strict && !apiKey) throw new Error('Groq not configured');
 if (!apiKey || !news.articles.length) return {...fallback, editorial:strict ? 'empty' : saved.length ? 'cached' : apiKey ? 'empty' : 'unconfigured'};
 const fingerprint = JSON.stringify([news.articles.map(({url,title,date,summary}) => [url,title,date,summary]),archive.map(article=>article.url)]);
 if (cached?.fingerprint === fingerprint && now - cached.at < 60 * 60_000) return {...news, ...cached.edition};
 if (pending) { await pending; return getChangelog(news, {apiKey,model,fetcher,now,archive,strict}); }
 if (now < retryAt) { if (strict) throw new Error('Collection temporarily backed off; retry later'); return fallback; }
 if (cached && now - cached.at < 15 * 60_000) return {...cached.news, ...cached.edition};
 pending = (async () => {
  try {
   const articles = await writePatchTitles(news.articles.map(a=>({...a,originalTitle:a.originalTitle ?? a.title,note:(a.summary || a.originalTitle || a.title).slice(0,600)})),{apiKey,model,fetcher});
   // An empty selection must not erase the last useful edition.
   if (!articles.length) { return {...fallback,editorial:strict ? 'empty' : saved.length ? 'cached' : 'empty'}; }
   const edition = {articles:mergeEditions(saved,articles),editorial:'generated'};
   cached = {fingerprint,edition,at:now,news};
   return {...news,...edition};
  } catch (error) {
   retryAt = now + 15 * 60_000;
   if (strict) throw error;
   return fallback;
  }
 })();
 try { return await pending; } finally { pending = undefined; }
}


// Keep cold starts off the common path; empty editions must not replace cached news.
export function editionCacheControl(edition) {
 if (!edition.articles.length) return 'no-store';
 return ['generated','archived'].includes(edition.editorial)
  ? 'public, s-maxage=900, stale-while-revalidate=3600'
  : 'public, s-maxage=60, stale-while-revalidate=60';
}
