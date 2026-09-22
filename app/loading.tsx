import { Orbit } from "loading-dev";

export default function Loading() {
 return (
  <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4" role="status">
   <Orbit size={40} duration={1500} color="#85d6a1"/>
   <p className="font-mono text-sm text-muted-foreground">Loading Earth&apos;s patch notes...</p>
  </main>
 );
}
