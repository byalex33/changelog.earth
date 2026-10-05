import Link from "next/link";
import localFont from "next/font/local";
import { Navbar } from "@/components/navbar";
import { AsciiEarth } from "@/components/ascii-earth";
import { HeroStars } from "@/components/particle-text";
import { NotFoundLog } from "@/components/not-found-log";

const nothing = localFont({src:"../public/fonts/nothing/Ndot57-Regular.otf",display:"swap",weight:"400"});
export const metadata = {title:"Page not found | changelog.earth",description:"This page isn't in any of Earth's patch notes."};

export default function NotFound() {
 return <div className="site-shell">
  <Navbar/>
  <main className="notfound-page">
   <section className="notfound-hero">
    <HeroStars/>
    <div className={`notfound-code ${nothing.className}`} aria-hidden="true"><span>4</span><div className="notfound-zero"><AsciiEarth/></div><span>4</span></div>
    <h1><span className="sr-only">404: </span>This page isn&apos;t in the changelog.</h1>
    <p className="notfound-lead">It may have moved, or it may never have shipped. The rest of the planet is running as expected.</p>
   </section>
   <NotFoundLog/>
   <nav className="notfound-actions" aria-label="Where to next">
    <Link className="github-pill notfound-primary" href="/">Back to the patch notes ↗</Link>
    <Link className="github-pill" href="/about">About us</Link>
    <a className="github-pill" href="/feed.xml" type="application/rss+xml">Follow via RSS</a>
   </nav>
  </main>
  <footer className="site-footer">Created with <span aria-label="love">{'<3'}</span> by <a href="https://alex.codes">alex.codes</a></footer>
 </div>;
}
