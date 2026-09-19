import saved from '../data/editions.json' with { type:'json' };
import { getChangelog } from './changelog.mjs';
import { mergeEditions, validateArchive } from './edition-archive.mjs';

export async function getPublishedChangelog(news) {
 let archive = validateArchive(saved);
 // Read the public archive independently of deployments, including commits made by the scheduled job.
 if (process.env.VERCEL) {
  try {
   const response = await fetch('https://raw.githubusercontent.com/byalex33/changelog.earth/main/data/editions.json',{next:{revalidate:900},signal:AbortSignal.timeout(5000)});
   if (!response.ok) throw new Error('Archive unavailable');
   archive = mergeEditions(archive,validateArchive(await response.json()));
  } catch { /* The bundled archive remains available during GitHub outages. */ }
 }
 return getChangelog(news,{
  apiKey:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL,
  hfToken:process.env.HF_TOKEN,hfModel:process.env.HF_MODEL,archive,
 });
}
