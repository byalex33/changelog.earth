"use client";
// Adapted from beUI's Tooltip / TooltipSurface (MIT, see LICENSE).
// Radix supplies positioning and keyboard access for this interactive story popout.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Popover } from "radix-ui";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function Tooltip({label,children}: {label:string;children:ReactNode}) {
 const [open,setOpen]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 const trigger=useRef<HTMLButtonElement>(null);
 const content=useRef<HTMLDivElement>(null);
 const restoringFocus=useRef(false);
 const reduce=useReducedMotion();
 const cancel=()=>clearTimeout(timer.current);
 const show=()=>{cancel();setOpen(true);};
 const hide=()=>{cancel();timer.current=setTimeout(()=>setOpen(false),180);};
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 return <Popover.Root open={open} onOpenChange={setOpen}>
  <Popover.Trigger asChild><button ref={trigger} type="button" className="story-info" aria-label={label} onKeyDown={event=>{if(event.key==='Tab' && !event.shiftKey && open){event.preventDefault();content.current?.querySelector('a')?.focus();}}} onClick={event=>{event.preventDefault();show();}} onPointerEnter={e=>{if(e.pointerType==='mouse')show();}} onPointerLeave={hide} onFocus={()=>{if(!restoringFocus.current)show();}}>i</button></Popover.Trigger>
  <AnimatePresence>{open && <Popover.Portal forceMount><Popover.Content forceMount asChild side="top" sideOffset={10} collisionPadding={16} onOpenAutoFocus={event=>event.preventDefault()} onCloseAutoFocus={event=>{event.preventDefault();if(document.activeElement===document.body){restoringFocus.current=true;trigger.current?.focus();restoringFocus.current=false;}}} onPointerEnter={cancel} onPointerLeave={hide} onFocusCapture={cancel} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
   <motion.div ref={content} className="story-popout" aria-label={label} initial={{opacity:0,scale:reduce?1:.9,y:reduce?0:8,filter:reduce?'none':'blur(5px)'}} animate={{opacity:1,scale:1,y:0,filter:reduce?'none':'blur(0px)'}} exit={{opacity:0,scale:reduce?1:.94,transition:{duration:.12}}} transition={{type:'spring',stiffness:380,damping:30,mass:.7}}>
    {children}
   </motion.div>
  </Popover.Content></Popover.Portal>}</AnimatePresence>
 </Popover.Root>;
}

