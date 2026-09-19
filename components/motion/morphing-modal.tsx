"use client";
// Adapted from beUI MorphingModal (MIT, see LICENSE).
// Radix handles focus trapping, Escape, outside clicks and focus restoration.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

export function MorphingModal({viewId,onClose,trigger,title,children}: {viewId:string|null;onClose:()=>void;trigger:ReactNode;title:string;children:ReactNode}) {
 const reduce=useReducedMotion();
 return <Dialog.Root open={viewId!==null} onOpenChange={open=>{if(!open)onClose();}}>
  <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
  <AnimatePresence>{viewId!==null && <Dialog.Portal forceMount>
   <Dialog.Overlay asChild forceMount><motion.div className="sources-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}/></Dialog.Overlay>
   <Dialog.Content asChild forceMount aria-describedby={undefined}>
    <motion.div layout className="sources-modal" initial={{opacity:0,scale:reduce?1:.97,y:reduce?0:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:reduce?1:.98}} transition={{type:'spring',stiffness:420,damping:40,mass:.5}}>
     <header className="sources-modal-header"><Dialog.Title>{title}</Dialog.Title><Dialog.Close className="modal-close" aria-label="Close sources">×</Dialog.Close></header>
     <motion.div layout="position"><AnimatePresence mode="wait" initial={false}><motion.div key={viewId} initial={{opacity:0,y:reduce?0:8,filter:reduce?'none':'blur(4px)'}} animate={{opacity:1,y:0,filter:reduce?'none':'blur(0px)'}} exit={{opacity:0,y:reduce?0:-8}} transition={{duration:reduce?0:.18}}>{children}</motion.div></AnimatePresence></motion.div>
    </motion.div>
   </Dialog.Content>
  </Dialog.Portal>}</AnimatePresence>
 </Dialog.Root>;
}
