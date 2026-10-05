import Home from "@/components/home";
import { getPublishedChangelog } from "@/lib/published-changelog.mjs";

// Generate before deployment, then serve the saved HTML while refreshing in the background.
export const dynamic = "force-static";
export const revalidate = 900;
export const maxDuration = 120;

export default async function Page() {
 const edition = await getPublishedChangelog();
 // Failed regeneration leaves Next's last successful page intact, including across cold starts.
 if (!edition.articles.length) throw new Error('No curated edition available; keep the previously published page.');
 // Ship the newest stories only; the rest of the archive loads from /api/news on demand.
 return <Home news={{...edition,articles:edition.articles.slice(0,30)}} total={edition.articles.length}/>;
}
