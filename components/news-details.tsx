"use client";
import { useState } from "react";
import { Tooltip } from "@/components/motion/tooltip";
import { MorphingModal } from "@/components/motion/morphing-modal";
import { rssFeeds } from "@/lib/rss-feeds.mjs";

type Story={title:string;originalTitle?:string;summary?:string;note?:string;url:string;publisher:string;date:string;dateLabel:string};
type SourceStatus={name:string;status:string;count:number};
const sources=[
 ...Array.from(new Map(rssFeeds.map(feed=>[feed.publisher,{name:feed.publisher,url:feed.publisher==='BBC News'?'https://www.bbc.com/news':feed.publisher==='Sky News'?'https://news.sky.com':new URL(feed.url).origin,feeds:rssFeeds.filter(item=>item.publisher===feed.publisher)}])).values()),
 {name:'GDELT',url:'https://www.gdeltproject.org',feeds:[{id:'GDELT',category:'Science & nature',url:'https://www.gdeltproject.org'}]},
 {name:'Spaceflight News',url:'https://thespacedevs.com/snapi',feeds:[{id:'Spaceflight News',category:'Space',url:'https://thespacedevs.com/snapi'}]},
];

function Favicon({url,name}: {url:string;name:string}) {
 const [failed,setFailed]=useState(false);
 return <span className="source-favicon" aria-hidden="true">{failed?name[0]:<img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(url).hostname)}&sz=64`} width="24" height="24" alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>}</span>;
}

export function StoryInfo({article,cached}: {article:Story;cached:boolean}) {
 return <Tooltip label={`Story behind ${article.title}`}>
  <div className="story-publisher"><Favicon url={article.url} name={article.publisher}/><span>{article.publisher}</span>{cached&&<span>Cached</span>}</div>
  <h3>{article.originalTitle??article.title}</h3>
  <p>{article.summary||article.note||'This source shared a headline only. Open the original reporting for the full story.'}</p>
  <footer><span>{article.dateLabel} {new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(article.date))}</span><a href={article.url} target="_blank" rel="noreferrer">Read full story <span aria-hidden="true">↗</span></a></footer>
 </Tooltip>;
}

export function Sources({statuses=[]}: {statuses?:SourceStatus[]}) {
 const [view,setView]=useState<string|null>(null);
 const selected=sources.find(source=>source.name===view);
 return <div className="sources-footer"><MorphingModal viewId={view} onClose={()=>setView(null)} title={selected?.name??'Behind the patch notes'} trigger={
  <button type="button" className="sources-trigger" onClick={()=>setView('all')}><span className="favicon-stack">{sources.slice(0,5).map(source=><Favicon key={source.name} {...source}/>)}</span><span><strong>{sources.length} sources</strong></span><span className="sources-open" aria-hidden="true">↗</span></button>
 }>
  {selected?<div className="source-detail"><button className="sources-back" onClick={()=>setView('all')}>← All sources</button><div className="source-detail-heading"><Favicon {...selected}/><a href={selected.url} target="_blank" rel="noreferrer">Visit {selected.name} ↗</a></div><ul>{selected.feeds.map(feed=>{const status=statuses.find(item=>item.name===feed.id);return <li key={feed.id}><a href={feed.url} target="_blank" rel="noreferrer">{feed.category} ↗</a><span>{status?.status==='available'?`${status.count} recent stories`:status?.status==='cached'?'Cached stories':status?'Temporarily unavailable':'Not checked yet'}</span></li>;})}</ul></div>:<><p className="sources-intro">The {2+rssFeeds.length} feeds we check to put this little changelog together.</p><div className="sources-list">{sources.map(source=><button type="button" key={source.name} onClick={()=>setView(source.name)}><Favicon {...source}/><span>{source.name}<small>{source.feeds.length} {source.feeds.length===1?'feed':'feeds'}</small></span><span aria-hidden="true">›</span></button>)}</div></>}
 </MorphingModal></div>;
}

