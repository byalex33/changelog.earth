"use client";
import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import EarthIcon from "@hugeicons/core-free-icons/EarthIcon";
import GitBranchIcon from "@hugeicons/core-free-icons/GitBranchIcon";
import { AsciiEarth } from "@/components/ascii-earth";
import { StoryInfo, Sources } from "@/components/news-details";

import { Button } from "@/components/ui/button";

type Article = {title:string;url:string;date:string;dateLabel:string;publisher:string;provider:string;category:string;kind:string;note?:string;summary?:string;originalTitle?:string};
type News = {editorial?:string;articles:Article[];checkedAt:number;unavailable:string[];stale:string[];sourceStatus?:{name:string;status:string;count:number;reason?:string}[]};
const patchSymbols:Record<string,string>={Added:'+',Removed:'-',Changed:'~',Improved:'~',Fixed:'*',Patched:'*'};
const dayFormat = new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
export default function Home() {
 const [news, setNews] = useState<News | null>(null);
 const [visibleCount,setVisibleCount] = useState(30);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const refresh = useCallback(async (signal?:AbortSignal) => {
  setLoading(true); setError('');
  try {
   const response = await fetch('/api/news',{signal});
   if (!response.ok) throw new Error('The news sources are unavailable. Please try again shortly.');
   const result = await response.json() as News;
   if (!Array.isArray(result.articles)) throw new Error('The news feed could not be read. Please try again.');
   setNews(result); setVisibleCount(30);
  } catch (failure) {
   if (!signal?.aborted) setError(failure instanceof Error ? failure.message : 'Could not load the news.');
  } finally { if (!signal?.aborted) setLoading(false); }
 },[]);
 useEffect(() => { const controller=new AbortController(); void refresh(controller.signal); return () => controller.abort(); },[refresh]);
 const groups = Object.groupBy((news?.articles ?? []).slice(0,visibleCount), article => article.date.slice(0,10));
 return <div className="site-shell">
  <header className="topbar"><a className="brand" href="/" aria-label="changelog.earth home"><HugeiconsIcon icon={EarthIcon} size={25}/><span>changelog<span className="mint">.earth</span></span></a></header>
  <main><section className="intro"><div className="intro-copy"><div className="eyebrow"><HugeiconsIcon icon={GitBranchIcon} size={15}/> MAIN / EARTH</div><h1>Your planet.<br/>The release notes.</h1><p>New species. Balance changes. Unresolved bugs.<br/>A few good things on Earth, one patch at a time.</p><div className="intro-meta"><span className="mint">●</span> Continuously deployed since 4.54 billion years ago</div></div><div className="planet-panel"><AsciiEarth/></div></section>
  <section aria-labelledby="updates-title" id="releases">
  <div className="release-heading"><h2 id="updates-title">Planetary updates <span>{news?.articles.length ?? '—'}</span></h2><Button variant="outline" size="sm" disabled={loading} onClick={()=>void refresh()}>{loading ? 'Checking…' : 'Refresh news'}</Button></div>
  <div className="feed-status" aria-live="polite">{error ? <p role="alert">{error}{news && ' Showing the last loaded feed.'}</p> : loading && !news ? <p>Checking the latest changes to Earth…</p> : news ? <><p>{news.editorial === 'generated' ? 'Selected patch notes, written by Gemini.' : 'The patch-note editor is unavailable. Showing a few original headlines.'} Last checked {new Date(news.checkedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}.</p>{news.unavailable.length > 0 && <p>{news.unavailable.length} {news.unavailable.length === 1 ? 'source is' : 'sources are'} temporarily unavailable. See feed sources below.{news.stale.length > 0 ? ' Previously fetched stories are marked below.' : ' Showing available sources.'}</p>}{news.articles.length === 0 && <p>{news.editorial === 'generated' ? 'No stories made this edition. Check back later.' : 'No recent stories found. Try again later.'}</p>}</> : null}</div>
  <div aria-busy={loading}>{Object.entries(groups).sort(([a],[b])=>b.localeCompare(a)).map(([day,articles])=><section className="terminal-window news-day" key={day} aria-labelledby={`date-${day}`}><div className="terminal-titlebar"><div className="terminal-dots" aria-hidden="true"><i/><i/><i/></div><h3 id={`date-${day}`}><time dateTime={day}>{dayFormat.format(new Date(day+'T12:00:00Z'))}</time></h3><span className="terminal-shell">v{day.replaceAll('-','.')}</span></div><div className="terminal-body"><div className="release">{articles?.map(article=><article className="news-entry patch-entry" key={article.url}><p className="patch-line" data-kind={article.kind}><a href={article.url} target="_blank" rel="noreferrer" title={`Source: ${article.publisher}${news?.stale.includes(article.provider) ? ' (cached)' : ''}`}><span aria-hidden="true">{patchSymbols[article.kind] ?? '~'}{' '}</span><span className="sr-only">{article.kind}: </span>{article.title.replace(/[.!?]$/, '')}</a><StoryInfo article={article} cached={news?.stale.includes(article.provider) ?? false}/></p></article>)}</div><Sources statuses={news?.sourceStatus}/></div></section>)}</div>
  {news && visibleCount < news.articles.length && <div className="show-more"><Button variant="outline" onClick={()=>setVisibleCount(count=>count+30)}>Show more stories ({news.articles.length-visibleCount} remaining)</Button></div>}
  </section>
  </main></div>;
}








