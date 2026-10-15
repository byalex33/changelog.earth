// The homepage and /api/news send only what readers see, never classifier or title-writer internals.
export const PAGE_SIZE = 30;

/** @typedef {{title:string,url:string,date:string,dateLabel:string,publisher:string,kind:string,summary?:string,originalTitle?:string}} PublicStory */

/** @param {{title:string,url:string,date:string,dateLabel:string,publisher:string,kind:string,summary?:string,note?:string,originalTitle?:string}} a @returns {PublicStory} */
export function toPublicStory(a) {
 return {title:a.title,url:a.url,date:a.date,dateLabel:a.dateLabel,publisher:a.publisher,kind:a.kind,summary:a.summary || a.note,originalTitle:a.originalTitle};
}

/** @param {Parameters<typeof toPublicStory>[0][]} articles @param {number} page 1-based */
export function publicPage(articles, page = 1) {
 return {articles:articles.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map(toPublicStory),total:articles.length};
}
