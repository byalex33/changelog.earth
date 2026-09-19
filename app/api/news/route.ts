import { getNews } from "@/lib/news.mjs";
import { getPublishedChangelog } from "@/lib/published-changelog.mjs";
import { editionCacheControl } from "@/lib/changelog.mjs";
export const dynamic = "force-dynamic";
export async function GET() {
 const news = await getNews();
 const edition = await getPublishedChangelog(news);
 return Response.json(edition, {
  status: edition.articles.length ? 200 : 503,
  headers: {
   "Cache-Control": "public, max-age=0, must-revalidate",
   "Vercel-CDN-Cache-Control": editionCacheControl(edition),
  },
 });
}
