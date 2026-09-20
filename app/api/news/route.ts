import { getPublishedChangelog } from "@/lib/published-changelog.mjs";
import { editionCacheControl } from "@/lib/changelog.mjs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
 const draft = new URL(request.url).searchParams.has("archive");
 const edition = await getPublishedChangelog({draft});
 return Response.json(edition, {
  status: edition.articles.length ? 200 : 503,
  headers: {
   "Cache-Control": "public, max-age=0, must-revalidate",
   "Vercel-CDN-Cache-Control": draft ? "no-store" : editionCacheControl(edition),
  },
 });
}
