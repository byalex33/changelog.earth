import { getNews, sourceCount } from "@/lib/news.mjs";
import { getChangelog, editionCacheControl } from "@/lib/changelog.mjs";
export const dynamic = "force-dynamic";
export async function GET() {
 const news = await getNews();
 const edition = await getChangelog(news, {apiKey:process.env.GEMINI_API_KEY, model:process.env.GEMINI_MODEL});
 return Response.json(edition, {
  status: news.articles.length === 0 && news.unavailable.length === sourceCount ? 503 : 200,
  headers: {
   "Cache-Control": "public, max-age=0, must-revalidate",
   "Vercel-CDN-Cache-Control": editionCacheControl(edition),
  },
 });
}
