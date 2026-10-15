import { timingSafeEqual } from "node:crypto";
import { getPublishedChangelog } from "@/lib/published-changelog.mjs";
import { editionCacheControl } from "@/lib/changelog.mjs";
import { publicPage } from "@/lib/public-story.mjs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
 const params = new URL(request.url).searchParams;
 const draft = params.has("archive");
 if (draft) {
  const secret = process.env.ARCHIVE_SECRET;
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
   return Response.json({error:"Unauthorized"}, {status:401, headers:{"Cache-Control":"no-store", "Vercel-CDN-Cache-Control":"no-store", "WWW-Authenticate":"Bearer"}});
  }
  const edition = await getPublishedChangelog({draft});
  return Response.json(edition, {status: edition.articles.length ? 200 : 503, headers:{"Cache-Control":"no-store", "Vercel-CDN-Cache-Control":"no-store"}});
 }
 // Every distinct query string is its own CDN cache entry, so accept only the canonical ?page=N.
 const pages = params.getAll("page");
 if ([...params.keys()].some(key => key !== "page") || pages.length > 1 || (pages.length && !/^[1-9]\d{0,3}$/.test(pages[0]))) {
  return Response.json({error:"Unknown parameter"}, {status:400, headers:{"Cache-Control":"public, max-age=300", "Vercel-CDN-Cache-Control":"public, s-maxage=300"}});
 }
 const edition = await getPublishedChangelog({draft});
 return Response.json(publicPage(edition.articles, Number(pages[0] ?? 1)), {
  status: edition.articles.length ? 200 : 503,
  headers: {"Cache-Control":"public, max-age=0, must-revalidate", "Vercel-CDN-Cache-Control":editionCacheControl(edition)},
 });
}
