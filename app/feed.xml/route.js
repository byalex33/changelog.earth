import { XMLBuilder } from 'fast-xml-parser';
import { getPublishedChangelog } from '../../lib/published-changelog.mjs';

export const dynamic = 'force-static';
export const revalidate = 900;

const site = 'https://www.changelog.earth';
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export async function GET() {
 const { articles } = await getPublishedChangelog();
 if (!articles.length) throw new Error('No published stories available; keep the previous feed.');
 const xml = new XMLBuilder({ignoreAttributes:false,suppressBooleanAttributes:false}).build({
  rss: {
   '@_version':'2.0', '@_xmlns:atom':'http://www.w3.org/2005/Atom',
   channel: {
    title:"changelog.earth | Earth's patch notes",
    link:site,
    description:'Discoveries, good news and small upgrades, written like game updates.',
    language:'en',
    'atom:link':{'@_href':`${site}/feed.xml`,'@_rel':'self','@_type':'application/rss+xml'},
    item:articles.slice(0,100).map(article => ({
     title:`[${article.kind}] ${article.title}`,
     link:article.url,
     guid:{'@_isPermaLink':'true','#text':article.url},
     pubDate:new Date(article.date).toUTCString(),
     category:article.category,
     description:`<p>${escapeHtml(article.originalTitle || article.title)}</p><p>${escapeHtml(article.summary || article.note)}</p><p>Source: ${escapeHtml(article.publisher)}</p>`,
    })),
   },
  },
 });
 return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`, {
  headers:{'Content-Type':'application/rss+xml; charset=utf-8'},
 });
}
