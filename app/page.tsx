"use client";
import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import EarthIcon from "@hugeicons/core-free-icons/EarthIcon";
import GitBranchIcon from "@hugeicons/core-free-icons/GitBranchIcon";
import GithubIcon from "@hugeicons/core-free-icons/GithubIcon";
import { AsciiEarth } from "@/components/ascii-earth";
import { StoryInfo, Sources } from "@/components/news-details";

import { Button } from "@/components/ui/button";

type Article = {title:string;url:string;date:string;dateLabel:string;publisher:string;provider:string;category:string;kind:string;note?:string;summary?:string;originalTitle?:string};
type News = {editorial?:string;articles:Article[];checkedAt:number;unavailable:string[];stale:string[];sourceStatus?:{name:string;status:string;count:number;reason?:string}[]};
const patchSymbols:Record<string,string>={Added:'+',Removed:'-',Changed:'~',Improved:'~',Fixed:'*',Patched:'*'};
const dayFormat = new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
export default function Home() {
 const [stars,setStars] = useState<number | null>(null);
 useEffect(() => {
  const controller = new AbortController();
  fetch('https://api.github.com/repos/byalex33/changelog.earth',{signal:controller.signal})
   .then(response => response.ok ? response.json() : null)
   .then(repo => {
    const count = repo && typeof repo === 'object' && 'stargazers_count' in repo ? repo.stargazers_count : null;
    if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0) setStars(count);
   })
   .catch(() => {}); // The repository link still works if GitHub is unavailable.
  return () => controller.abort();
 },[]);
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
  <header className="topbar"><a className="brand" href="/" aria-label="changelog.earth home"><HugeiconsIcon icon={EarthIcon} size={25}/><span>changelog<span className="mint">.earth</span></span></a><a className="github-pill" href="https://github.com/byalex33/changelog.earth" target="_blank" rel="noreferrer" aria-label={`GitHub repository${stars === null ? '' : `, ${stars} stars`}`}><HugeiconsIcon icon={GithubIcon} size={18} aria-hidden="true"/><span className="github-label">GitHub</span><span className="github-stars"><span aria-hidden="true">☆</span> {stars === null ? '—' : stars.toLocaleString('en-GB')}</span></a></header>
  <main><section className="intro"><div className="intro-copy"><div className="eyebrow"><HugeiconsIcon icon={GitBranchIcon} size={15}/> EARTH / LIVE PATCHES</div><h1>Same planet.<br/>New patch.</h1><p>New spawns. World upgrades. The occasional bug fix.<br/>Real news, written like game updates.</p><div className="intro-meta"><span className="mint">●</span> 4.54 billion years online. Still in beta.</div></div><div className="planet-panel"><AsciiEarth/></div></section>
  <section aria-label="Patch notes" id="releases">
  {(error || (loading && !news) || news?.articles.length === 0) && <div className="feed-status" aria-live="polite">{error ? <p role="alert">{error}{news && ' Showing the last loaded feed.'}</p> : loading && !news ? <div className="ascii-loader">
    <pre className="ascii-loader-dish" aria-hidden="true">{`   .---.
 --( o )--
   '---'`}</pre>
    <div><p className="ascii-loader-title">Receiving planetary updates<span className="ascii-loader-cursor" aria-hidden="true">_</span></p><div className="ascii-loader-scan" aria-hidden="true"><span>[........................]</span><i>&gt;&gt;&gt;</i></div><p>Gathering stories from Earth. The first edition can take a moment.</p></div>
   </div> : news?.articles.length === 0 ? <p>{news.editorial === 'unavailable' || news.editorial === 'unconfigured' ? 'The patch-note editor is temporarily offline. Please try again later.' : 'No new patches made the cut yet. Check back later.'}</p> : null}</div>}
  <div aria-busy={loading}>{Object.entries(groups).sort(([a],[b])=>b.localeCompare(a)).map(([day,articles])=><section className="terminal-window news-day" key={day} aria-labelledby={`date-${day}`}><div className="terminal-titlebar"><div className="terminal-dots" aria-hidden="true"><i/><i/><i/></div><h3 id={`date-${day}`}><time dateTime={day}>{dayFormat.format(new Date(day+'T12:00:00Z'))}</time></h3><span className="terminal-shell">v{day.replaceAll('-','.')}</span></div><div className="terminal-body"><div className="release">{articles?.map(article=><article className="news-entry patch-entry" key={article.url}><p className="patch-line" data-kind={article.kind}><a href={article.url} target="_blank" rel="noreferrer" title={`Source: ${article.publisher}${news?.stale.includes(article.provider) ? ' (cached)' : ''}`}><span aria-hidden="true">{patchSymbols[article.kind] ?? '~'}{' '}</span><span className="sr-only">{article.kind}: </span>{article.title.replace(/[.!?]$/, '')}</a><StoryInfo article={article} cached={news?.stale.includes(article.provider) ?? false}/></p></article>)}</div><Sources statuses={news?.sourceStatus}/></div></section>)}</div>
  {news && visibleCount < news.articles.length && <div className="show-more"><Button variant="outline" onClick={()=>setVisibleCount(count=>count+30)}>Show more stories ({news.articles.length-visibleCount} remaining)</Button></div>}
  </section>
  </main></div>;
}
