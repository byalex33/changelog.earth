import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
 return [
  {url:"https://www.changelog.earth",changeFrequency:"daily",priority:1},
  {url:"https://www.changelog.earth/about",changeFrequency:"yearly",priority:.5},
 ];
}
