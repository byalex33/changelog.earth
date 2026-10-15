"use client";
import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import Share03Icon from "@hugeicons/core-free-icons/Share03Icon";
import { HeroTitle, HeroStars } from "@/components/particle-text";
import { AsciiEarth } from "@/components/ascii-earth";
import { StoryInfo, Sources } from "@/components/news-details";
import { PAGE_SIZE, type PublicStory } from "@/lib/public-story.mjs";

import { Button } from "@/components/ui/button";

type Article = PublicStory;
type News = {articles:Article[]};
const shareUrl = 'https://twitter.com/intent/tweet?' + new URLSearchParams({text:"Earth has patch notes. Discoveries, good news and small upgrades, written like game updates.",url:'https://www.changelog.earth'}).toString();
const patchSymbols:Record<string,string>={Added:'+',Unlocked:'+',Updated:'~',Buffed:'↑',Nerfed:'↓',Removed:'-',Changed:'~',Improved:'~',Fixed:'*',Patched:'*'};
const dayFormat = new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
// Object.groupBy needs Safari 17.4 / Chrome 117, newer than Next's browser targets, and Next doesn't polyfill it.
function groupByDay(list:Article[]){const days=new Map<string,Article[]>();for(const a of list){const d=a.date.slice(0,10);const g=days.get(d);if(g)g.push(a);else days.set(d,[a]);}return days;}
export default function Home({news,total:initialTotal}:{news:News;total:number}) {
 const reducedMotion = useReducedMotion();
 const [articles,setArticles] = useState(news.articles);
 const [total,setTotal] = useState(initialTotal);
 const [page,setPage] = useState(1);
 const [loading,setLoading] = useState(false);
 const groups = groupByDay(articles);
 const remaining = Math.max(total-page*PAGE_SIZE,0);
 // The page ships only the newest stories; fetch the next page each time a reader asks for more.
 async function showMore() {
  setLoading(true);
  try {
   const response = await fetch(`/api/news?page=${page+1}`);
   const next = response.ok ? await response.json() as News & {total:number} : null;
   if (Array.isArray(next?.articles)) {
    // New stories may have shifted pages since this page was rendered; skip any already shown.
    setArticles(shown => { const urls = new Set(shown.map(a => a.url)); return [...shown,...next.articles.filter(a => !urls.has(a.url))]; });
    if (typeof next.total === 'number') setTotal(next.total);
    setPage(page+1);
   }
  } catch {} // Keep showing what we already have; the button stays so readers can retry.
  setLoading(false);
 }
 return <div className="site-shell">
  <Navbar/>
  <main><section className="intro"><HeroStars/><div className="planet-panel"><AsciiEarth/></div><div className="intro-copy"><HeroTitle/><a className="github-pill hero-share" href={shareUrl} target="_blank" rel="noopener noreferrer" aria-label="Share changelog.earth on X (opens a new tab)"><HugeiconsIcon icon={Share03Icon} size={16} aria-hidden="true"/>Share on X</a></div></section>
  <section aria-label="Patch notes" id="releases">
  <div>{[...groups].sort(([a],[b])=>b.localeCompare(a)).map(([day,articles],index)=><motion.section initial={false} whileInView={reducedMotion === false ? {opacity:[.65,1],y:[24,0],scale:[.98,1],filter:["blur(4px)","blur(0px)"]} : {opacity:1,y:0,scale:1,filter:"none"}} viewport={{once:true,amount:.12}} transition={{duration:.55,delay:Math.min(index * .08,.24),ease:[.16,1,.3,1]}} className="terminal-window news-day" key={day} aria-labelledby={`date-${day}`}><div className="terminal-titlebar"><div className="terminal-dots" aria-hidden="true"><i/><i/><i/></div><h2 id={`date-${day}`}><time dateTime={day}>{dayFormat.format(new Date(day+'T12:00:00Z'))}</time></h2><span className="terminal-shell">v{day.replaceAll('-','.')}</span></div><div className="terminal-body"><div className="release">{articles.map(article=><article className="news-entry patch-entry" key={article.url}><p className="patch-line" data-kind={article.kind}><a href={article.url} target="_blank" rel="noreferrer" title={`Source: ${article.publisher}`}><span>[{patchSymbols[article.kind] ?? '~'} {article.kind}] </span>{article.title.replace(/[.!?]$/, '')}</a><StoryInfo article={article}/></p></article>)}</div><Sources/></div></motion.section>)}</div>
  {remaining > 0 && <div className="show-more"><Button variant="outline" disabled={loading} onClick={showMore}>{loading ? 'Loading older stories…' : `Show more stories (${remaining} remaining)`}</Button></div>}
  </section>
  </main><footer className="site-footer">Created with <span aria-label="love">{'<3'}</span> by <a href="https://alex.codes">alex.codes</a></footer></div>;
}
