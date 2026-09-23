import { timingSafeEqual } from "node:crypto";
import { getPublishedChangelog } from "@/lib/published-changelog.mjs";
import { editionCacheControl } from "@/lib/changelog.mjs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
 const draft = new URL(request.url).searchParams.has("archive");
 if (draft) {
  const secret = process.env.ARCHIVE_SECRET;
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
   return Response.json({error:"Unauthorized"}, {status:401, headers:{"Cache-Control":"no-store", "Vercel-CDN-Cache-Control":"no-store", "WWW-Authenticate":"Bearer"}});
  }
 }
 const edition = await getPublishedChangelog({draft});
 return Response.json(edition, {
  status: edition.articles.length ? 200 : 503,
  headers: {
   "Cache-Control": draft ? "no-store" : "public, max-age=0, must-revalidate",
   "Vercel-CDN-Cache-Control": draft ? "no-store" : editionCacheControl(edition),
  },
 });
}
