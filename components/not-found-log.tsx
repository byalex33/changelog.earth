"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Probes for admin panels, logins and leaked config are most of our 404 traffic, so answer them in kind.
const knownIssues:[RegExp,string][] = [
 [/admin|dashboard|cpanel|phpmyadmin|manage/i, "Earth has no admin panel. Nobody is in charge, which explains a lot."],
 [/log-?in|sign-?in|sign-?up|auth|register|account|session|password/i, "Earth doesn't do accounts. You were signed in at birth."],
 [/\.php|\.env|\.git|wp-|config|backup|\.sql|secret/i, "No secrets here. Only planetary release notes."],
 [/test|staging|debug|dev\b|sandbox/i, "Earth has no test environment. Every change ships straight to production."],
];

function suggestion(path:string) {
 if (/about/i.test(path)) return {href:"/about",label:"/about"};
 if (/feed|rss|xml|atom/i.test(path)) return {href:"/feed.xml",label:"/feed.xml"};
 return null;
}

export function NotFoundLog() {
 const pathname = usePathname() ?? "/";
 const path = pathname.length > 48 ? `${pathname.slice(0,47)}…` : pathname;
 const issue = knownIssues.find(([pattern]) => pattern.test(pathname))?.[1] ?? "This link went extinct before anyone could document it.";
 const match = suggestion(pathname);
 return <section className="terminal-window notfound-log" aria-label="What happened">
  <div className="terminal-titlebar"><div className="terminal-dots" aria-hidden="true"><i/><i/><i/></div><h2>404.log</h2><span className="terminal-shell">exit 404</span></div>
  <div className="terminal-body">
   <p className="notfound-prompt"><span aria-hidden="true">$</span> open <code>{path}</code></p>
   <p className="patch-line" data-kind="Removed"><span>[- Removed]</span><span><code>{path}</code> isn&apos;t in any release of Earth</span></p>
   <p className="patch-line" data-kind="Known"><span>[! Known issue]</span><span>{issue}</span></p>
   {match && <p className="patch-line" data-kind="Added"><span>[+ Added]</span><span>Did you mean <Link href={match.href}>{match.label}</Link>?</span></p>}
   <p className="patch-line" data-kind="Fixed"><span>[* Fixed]</span><span>A route home: <Link href="/">changelog.earth</Link></span></p>
   <p className="notfound-prompt notfound-cursor-line"><span aria-hidden="true">$</span> <i className="notfound-cursor" aria-hidden="true"/></p>
  </div>
 </section>;
}
