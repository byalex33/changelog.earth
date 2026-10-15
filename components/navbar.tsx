import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import GithubIcon from "@hugeicons/core-free-icons/GithubIcon";
import { AsciiEarth } from "@/components/ascii-earth";
import { getStars } from "@/lib/github-stars";

export async function Navbar() {
 const stars = await getStars();
 return (<header className="topbar"><Link className="brand" href="/" aria-label="changelog.earth home"><AsciiEarth compact/><span>changelog<span className="mint">.earth</span></span></Link><nav aria-label="Main navigation"><Link href="/about">About us</Link><a href="/feed.xml" type="application/rss+xml">Follow via RSS</a></nav><a className="github-pill" href="https://github.com/byalex33/changelog.earth" target="_blank" rel="noreferrer" aria-label={`GitHub repository${stars === null ? '' : `, ${stars} stars`}`}><HugeiconsIcon icon={GithubIcon} size={18} aria-hidden="true"/><span className="github-label">GitHub</span><span className="github-stars"><span aria-hidden="true">☆</span> {stars === null ? '—' : stars.toLocaleString('en-GB')}</span></a></header>);
}
