import Link from "next/link";
import { Navbar } from "@/components/navbar";

export const metadata = {title:"About us | changelog.earth",description:"The idea behind Earth's unofficial patch notes."};

export default function AboutPage() {
 return <div className="site-shell">
  <Navbar/>
  <main className="about-page">
   <p className="eyebrow">ABOUT CHANGELOG.EARTH</p>
   <h1>Same planet.<br/>Always updating.</h1>
   <p className="about-lead">Earth has patch notes. We collect discoveries, conservation wins and useful progress, then write them like updates to a game we all live in.</p>
   <h2>Small updates, real stories</h2>
   <p>Each daily edition aims for three to six worthwhile stories. Quiet days can have fewer. Previous editions stay in the archive, so the good things do not disappear with the next refresh.</p>
   <h2>Playful titles. Sources attached.</h2>
   <p>AI helps select stories and write the patch notes. Every entry links to the original reporting, with more context behind its info button. The game language is for fun; the linked source is the reference for the facts.</p>
   <h2>Built in the open</h2>
   <p>Created by <a href="https://alex.codes">Alex</a>. The project is open source, and ideas, fixes and contributions are welcome on <a href="https://github.com/byalex33/changelog.earth" target="_blank" rel="noreferrer">GitHub</a>.</p>
   <Link className="github-pill" href="/">Back to the patch notes ↗</Link>
  </main>
 </div>;
}
