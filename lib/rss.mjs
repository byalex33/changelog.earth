import { XMLParser, XMLValidator } from 'fast-xml-parser';
const parser = new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false,processEntities:true,htmlEntities:true,isArray:name=>['item','entry','link'].includes(name)});
const text = value => typeof value === 'string' ? value : value?.['#text'] ?? '';
function plainTitle(value) {
 const escaped = text(value).replaceAll('<','&lt;').replaceAll('>','&gt;');
 return text(parser.parse('<title>'+escaped+'</title>').title).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
}

export function parseRss(xml, feed) {
 if (typeof xml !== 'string' || /<!\s*(DOCTYPE|ENTITY)\b/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('Invalid or unsupported feed XML');
 const doc = parser.parse(xml);
 const channel = doc.rss?.channel ?? doc.RDF ?? doc.feed;
 if (!channel) throw new Error('Response is not an RSS, RDF or Atom feed');
 const items = channel.item ?? channel.entry ?? [];
 return items.slice(0,100).map(item => {
  const links = Array.isArray(item.link) ? item.link : [item.link];
  const link = links.find(value => typeof value === 'string' || !value?.['@_rel'] || value['@_rel'] === 'alternate');
  const href = typeof link === 'string' ? link : link?.['@_href'] ?? text(link);
  let url = '';
  try { if (href) url = new URL(href, feed.url).href; } catch { /* Invalid links are discarded by normalization. */ }
  return {title:plainTitle(item.title),summary:plainTitle(item.description ?? item.summary).replace(/\s+/g,' ').trim().slice(0,1800),url,published_at:text(item.pubDate ?? item.published ?? item.date ?? item.updated),news_site:feed.publisher};
 });
}

export async function readFeed(response) {
 const maxBytes = 2 * 1024 * 1024;
 if (Number(response.headers.get('content-length')) > maxBytes) { await response.body?.cancel(); throw new Error('Feed exceeds 2 MB'); }
 if (!response.body) throw new Error('Empty feed response');
 const reader = response.body.getReader(), decoder = new TextDecoder();
 let bytes=0, xml='';
 try {
  while (true) {
   const {done,value}=await reader.read();
   if(done) break;
   bytes+=value.byteLength;
   if(bytes>maxBytes) { await reader.cancel(); throw new Error('Feed exceeds 2 MB'); }
   xml+=decoder.decode(value,{stream:true});
  }
  return xml+decoder.decode();
 } finally { reader.releaseLock(); }
}

