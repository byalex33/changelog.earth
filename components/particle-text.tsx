"use client";

// Adapted from https://github.com/seraui/seraui/blob/main/src/app/docs/text/particle.tsx
/* MIT License
Copyright (c) 2025 Sera UI
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */

import { motion, useReducedMotion } from "motion/react";

export function HeroStars() {
 return <div className="hero-stars" aria-hidden="true">
  {Array.from({length:42}, (_,i)=><span className="hero-star" key={i} style={{left:`${(i*37+11)%100}%`,top:`${(i*53+7)%100}%`,width:i%7===0?2:1,height:i%7===0?2:1,animationDelay:`-${i%9}s`,animationDuration:`${4+i%5}s`}}/>)}
  <i className="hero-meteor"/><i className="hero-meteor"/><i className="hero-meteor"/>
 </div>;
}

export function HeroTitle() {
 const reducedMotion = useReducedMotion();
 return <div className="hero-heading">
  <motion.h1 className="hero-title" aria-label="Earth's Changelog"
   initial={false}
   animate={reducedMotion === false ? {opacity:[0,1],scale:[.8,1]} : {opacity:1,scale:1}}
   transition={{duration:1,ease:'easeOut'}}
  ><span aria-hidden="true">Earth&apos;s</span><span aria-hidden="true">Changelog</span></motion.h1>
 </div>;
}
