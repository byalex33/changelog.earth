import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";

// Self-hosted at build time as hashed WOFF2 files, exposed as the CSS variables globals.css reads.
export const mono = JetBrains_Mono({subsets:["latin"],weight:["400","500"],variable:"--theme-font-mono",display:"swap"});
export const sans = Plus_Jakarta_Sans({subsets:["latin"],weight:["400","500","600","700"],variable:"--theme-font-sans",display:"swap"});

// Nothing's Ndot 57 dot-matrix face, used for the About and 404 headings.
export const nothing = localFont({src:"../public/fonts/nothing/Ndot57-Regular.otf",display:"swap",weight:"400"});
