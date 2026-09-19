"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import Share03Icon from "@hugeicons/core-free-icons/Share03Icon";
import GithubIcon from "@hugeicons/core-free-icons/GithubIcon";
import { HeroTitle, HeroStars } from "@/components/particle-text";
import { AsciiEarth } from "@/components/ascii-earth";
import { StoryInfo, Sources } from "@/components/news-details";

import { Button } from "@/components/ui/button";

type Article = {title:string;url:string;date:string;dateLabel:string;publisher:string;provider:string;category:string;kind:string;note?:string;summary?:string;originalTitle?:string};
type News = {editorial?:string;articles:Article[];checkedAt:number;unavailable:string[];stale:string[];sourceStatus?:{name:string;status:string;count:number;reason?:string}[]};
const shareUrl = 'https://twitter.com/intent/tweet?' + new URLSearchParams({text:"Earth has patch notes. Discoveries, good news and small upgrades, written like game updates.",url:'https://www.changelog.earth'}).toString();
const patchSymbols:Record<string,string>={Added:'+',Removed:'-',Changed:'~',Improved:'~',Fixed:'*',Patched:'*'};
const dayFormat = new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
export default function Home({news}:{news:News}) {
 const reducedMotion = useReducedMotion();
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
 const [visibleCount,setVisibleCount] = useState(30);
 const groups = Object.groupBy((news?.articles ?? []).slice(0,visibleCount), article => article.date.slice(0,10));
 return <div className="site-shell">
  <header className="topbar"><Link className="brand" href="/" aria-label="changelog.earth home"><AsciiEarth compact/><span>changelog<span className="mint">.earth</span></span></Link><a className="github-pill" href="https://github.com/byalex33/changelog.earth" target="_blank" rel="noreferrer" aria-label={`GitHub repository${stars === null ? '' : `, ${stars} stars`}`}><HugeiconsIcon icon={GithubIcon} size={18} aria-hidden="true"/><span className="github-label">GitHub</span><span className="github-stars"><span aria-hidden="true">☆</span> {stars === null ? '—' : stars.toLocaleString('en-GB')}</span></a></header>
  <main><section className="intro"><HeroStars/><div className="planet-panel"><AsciiEarth/></div><div className="intro-copy"><HeroTitle/><a className="github-pill hero-share" href={shareUrl} target="_blank" rel="noopener noreferrer" aria-label="Share changelog.earth on X (opens a new tab)"><HugeiconsIcon icon={Share03Icon} size={16} aria-hidden="true"/>Share on X</a></div></section>
  <section aria-label="Patch notes" id="releases">
  <div>{Object.entries(groups).sort(([a],[b])=>b.localeCompare(a)).map(([day,articles],index)=><motion.section initial={false} whileInView={reducedMotion === false ? {opacity:[.65,1],y:[24,0],scale:[.98,1],filter:["blur(4px)","blur(0px)"]} : {opacity:1,y:0,scale:1,filter:"none"}} viewport={{once:true,amount:.12}} transition={{duration:.55,delay:Math.min(index * .08,.24),ease:[.16,1,.3,1]}} className="terminal-window news-day" key={day} aria-labelledby={`date-${day}`}><div className="terminal-titlebar"><div className="terminal-dots" aria-hidden="true"><i/><i/><i/></div><h3 id={`date-${day}`}><time dateTime={day}>{dayFormat.format(new Date(day+'T12:00:00Z'))}</time></h3><span className="terminal-shell">v{day.replaceAll('-','.')}</span></div><div className="terminal-body"><div className="release">{articles?.map(article=><article className="news-entry patch-entry" key={article.url}><p className="patch-line" data-kind={article.kind}><a href={article.url} target="_blank" rel="noreferrer" title={`Source: ${article.publisher}${news?.stale.includes(article.provider) ? ' (cached)' : ''}`}><span aria-hidden="true">{patchSymbols[article.kind] ?? '~'}{' '}</span><span className="sr-only">{article.kind}: </span>{article.title.replace(/[.!?]$/, '')}</a><StoryInfo article={article} cached={news?.stale.includes(article.provider) ?? false}/></p></article>)}</div><Sources statuses={news?.sourceStatus}/></div></motion.section>)}</div>
  {news && visibleCount < news.articles.length && <div className="show-more"><Button variant="outline" onClick={()=>setVisibleCount(count=>count+30)}>Show more stories ({news.articles.length-visibleCount} remaining)</Button></div>}
  </section>
  </main><footer className="site-footer">Created with <span aria-label="love">{'<3'}</span> by <a href="https://alex.codes">alex.codes</a></footer></div>;
}
