import { Orbit } from "loading-dev";

export default function Loading() {
 return (
  <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4" role="status">
   <Orbit size={64} duration={1200} color="#85d6a1"/>
   <p className="font-mono text-sm text-muted-foreground">Loading Earth&apos;s patch notes...</p>
  </main>
 );
}
