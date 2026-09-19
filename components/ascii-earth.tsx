"use client";
import { useEffect, useRef, useState } from "react";
import { earthFrame } from "@/lib/ascii-earth.mjs";

export function AsciiEarth({compact = false}:{compact?:boolean}) {
 const [frame, setFrame] = useState(() => earthFrame(-25, compact ? 20 : 60, compact ? 10 : 30));
 const angle = useRef(-25);

 useEffect(() => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer: ReturnType<typeof setInterval> | undefined;
  function sync() {
   clearInterval(timer);
   if (motion.matches || document.hidden) return;
   timer = setInterval(() => { angle.current = (angle.current + .7) % 360; setFrame(earthFrame(angle.current, compact ? 20 : 60, compact ? 10 : 30)); }, 90);
  }
  sync();
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  return () => { clearInterval(timer); motion.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); };
 }, [compact]);
 return <div className={compact ? "ascii-earth ascii-earth-compact" : "ascii-earth"} aria-hidden={compact || undefined}><pre role="img" aria-label="ASCII Earth with character-rendered continents">{frame}</pre></div>;
}


