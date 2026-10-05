import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { earthFrame } from "@/lib/ascii-earth.mjs";

export const alt = "Earth's Changelog: planetary release notes, written like game patch notes";
export const size = {width:1200,height:630};
export const contentType = "image/png";

const lines:[string,string,string][] = [
 ["#85d6a1","[+ Added]","New species, discovered weekly"],
 ["#80b9f3","[* Fixed]","Habitats, restored one at a time"],
 ["#e8b45f","[! Known issue]","Still only one planet"],
];

export default async function OpengraphImage() {
 // Rendered at build time by `next build`; the local Workers dev runtime has no filesystem for this route.
 const font = (file:string) => readFile(join(process.cwd(),"public/fonts",file));
 const [mono,sans] = await Promise.all([font("theme-0.ttf"),font("theme-3.ttf")]);
 const earth = earthFrame(-25,60,30).split("\n");
 return new ImageResponse(
  <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",gap:56,padding:"0 72px",background:"#050505",color:"#f8fafc",fontFamily:"Jakarta"}}>
   <div style={{display:"flex",flexDirection:"column",fontFamily:"Mono",fontSize:11,lineHeight:"12px",color:"#85d6a1"}}>
    {earth.map((row,i)=><div key={i} style={{whiteSpace:"pre"}}>{row}</div>)}
   </div>
   <div style={{display:"flex",flexDirection:"column",flex:1}}>
    <div style={{fontFamily:"Mono",fontSize:22,color:"#a3a3a3"}}>changelog.earth</div>
    <div style={{display:"flex",flexDirection:"column",fontSize:92,lineHeight:.95,letterSpacing:"-0.06em",margin:"22px 0 34px"}}>
     <span>Earth&apos;s</span><span style={{color:"#a3a3a3"}}>Changelog</span>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10,fontFamily:"Mono",fontSize:21}}>
     {lines.map(([color,tag,text])=><div key={tag} style={{display:"flex",gap:14,color}}><span>{tag}</span><span>{text}</span></div>)}
    </div>
   </div>
  </div>,
  {...size,fonts:[{name:"Mono",data:mono,weight:400},{name:"Jakarta",data:sans,weight:500}]},
 );
}
