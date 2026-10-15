import Home from "@/components/home";
import { Navbar } from "@/components/navbar";
import { getPublishedChangelog } from "@/lib/published-changelog.mjs";
import { publicPage } from "@/lib/public-story.mjs";
import type { Metadata } from "next";
import { rssAlternate } from "@/lib/site-metadata";

// Generate before deployment, then serve the saved HTML while refreshing in the background.
export const dynamic = "force-static";
export const revalidate = 900;
export const maxDuration = 120;
export const metadata: Metadata = {alternates:{canonical:"/",types:rssAlternate}};

export default async function Page() {
 const edition = await getPublishedChangelog();
 // Failed regeneration leaves Next's last successful page intact, including across cold starts.
 if (!edition.articles.length) throw new Error('No curated edition available; keep the previously published page.');
 // Ship the first page of slim stories only; later pages load from /api/news?page=N on demand.
 const {articles,total} = publicPage(edition.articles);
 return <Home news={{articles}} total={total} navbar={<Navbar/>}/>;
}
