import { getNews, sourceCount } from "@/lib/news.mjs";
import { getChangelog } from "@/lib/changelog.mjs";
import { env } from "cloudflare:workers";
export const dynamic = "force-dynamic";
export async function GET() {
 const news = await getNews();
 const edition = await getChangelog(news, {apiKey:env.GEMINI_API_KEY, model:env.GEMINI_MODEL});
 return Response.json(edition, {
  status: news.articles.length === 0 && news.unavailable.length === sourceCount ? 503 : 200,
  headers: { "Cache-Control": "no-store" },
 });
}
