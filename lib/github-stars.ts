// Fetched on the server and cached for an hour, so visitors' browsers never call GitHub.
export async function getStars(): Promise<number|null> {
 try {
  const response = await fetch('https://api.github.com/repos/byalex33/changelog.earth',{headers:{Accept:'application/vnd.github+json'},next:{revalidate:3600},signal:AbortSignal.timeout(3000)});
  if (!response.ok) return null;
  const repo: unknown = await response.json();
  const count = repo && typeof repo === 'object' && 'stargazers_count' in repo ? repo.stargazers_count : null;
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : null;
 } catch {
  return null; // The repository link still works if GitHub is unavailable.
 }
}
