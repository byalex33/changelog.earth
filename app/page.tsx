import Home from "@/components/home";
import { getNews } from "@/lib/news.mjs";
import { getPublishedChangelog } from "@/lib/published-changelog.mjs";

// Generate before deployment, then serve the saved HTML while refreshing in the background.
export const dynamic = "force-static";
export const revalidate = 900;
export const maxDuration = 120;

export default async function Page() {
 const news = await getNews();
 const edition = await getPublishedChangelog(news);
 // Failed regeneration leaves Next's last successful page intact, including across cold starts.
 if (!edition.articles.length) throw new Error('No curated edition available; keep the previously published page.');
 return <Home news={edition}/>;
}
