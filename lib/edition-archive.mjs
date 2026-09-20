// Existing selections win. Never remove a published story when feeds or models change.
export function mergeEditions(previous, additions) {
 const result = [...previous], urls = new Set(), titles = new Set(), days = new Map();
 const titleKey = article => (article.originalTitle ?? article.title).toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 for (const article of previous) {
  urls.add(article.url); titles.add(titleKey(article));
  const day = article.date.slice(0,10); days.set(day,(days.get(day) ?? 0)+1);
 }
 for (const article of additions) {
  const day = article.date.slice(0,10), title = titleKey(article);
  if (urls.has(article.url)) {
   const index=result.findIndex(saved=>saved.url===article.url);
   if ((article.titleRevision ?? 0)>(result[index].titleRevision ?? 0)) result[index]={...result[index],title:article.title,kind:article.kind,titleRevision:article.titleRevision,titleProvider:article.titleProvider,titleModel:article.titleModel,titleStyleVersion:article.titleStyleVersion};
   continue;
  }
  if (urls.has(article.url) || titles.has(title) || (days.get(day) ?? 0)>=6) continue;
  result.push(article); urls.add(article.url); titles.add(title); days.set(day,(days.get(day) ?? 0)+1);
 }
 return result.sort((a,b)=>b.date.localeCompare(a.date));
}

export function validateArchive(articles) {
 if (!Array.isArray(articles)) throw new Error('Invalid edition archive');
 for (const article of articles) {
  if (!article || !['title','note','url','date','provider','publisher','category','kind'].every(key=>typeof article[key]==='string' && article[key].length>0 && article[key].length<=2000)) throw new Error('Invalid archived story');
  const url = new URL(article.url);
  if (!['https:','http:'].includes(url.protocol) || url.username || url.password || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(article.date) || !Number.isFinite(Date.parse(article.date)) || !['Added','Removed','Changed','Patched','Improved','Fixed','Updated','Buffed','Nerfed','Unlocked'].includes(article.kind)) throw new Error('Invalid archived source');
  if (article.originalTitle !== undefined && typeof article.originalTitle !== 'string') throw new Error('Invalid original headline');
  if (article.titleRevision !== undefined && (!Number.isSafeInteger(article.titleRevision) || article.titleRevision<0)) throw new Error('Invalid title revision');
  if (article.titleProvider !== undefined && !['gemini','huggingface','groq'].includes(article.titleProvider)) throw new Error('Invalid title provider');
  if (article.titleModel !== undefined && (typeof article.titleModel!=='string' || !article.titleModel || article.titleModel.length>200)) throw new Error('Invalid title model');
  if (article.titleStyleVersion !== undefined && (!Number.isSafeInteger(article.titleStyleVersion) || article.titleStyleVersion<1)) throw new Error('Invalid title style version');
 }
 return articles;
}
