import Link from "next/link";
import localFont from "next/font/local";
import { Navbar } from "@/components/navbar";

const nothing = localFont({src:"../../public/fonts/nothing/Ndot57-Regular.otf",display:"swap",weight:"400"});
export const metadata = {title:"About Us | changelog.earth",description:"Why we made Earth's unofficial patch notes."};

export default function AboutPage() {
 return <div className="site-shell">
  <Navbar/>
  <main className="about-page">
   <h1 className={nothing.className}>About Us</h1>
   <p className="about-lead">We made changelog.earth to keep track of the good things that are easy to miss in the news. A new species or a restored habitat deserves a moment of attention.</p>
   <p>Game patch notes felt like a fun way to tell those stories. So we gave Earth a changelog, with a few real updates each day and links to the reporting behind them.</p>
   <p>Created by <a href="https://alex.codes">Alex</a>, with AI helping select and write the updates. The code is open on <a href="https://github.com/byalex33/changelog.earth" target="_blank" rel="noreferrer">GitHub</a>.</p>
   <Link className="github-pill" href="/">Back to the patch notes ↗</Link>
  </main>
 </div>;
}
