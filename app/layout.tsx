import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const description = "New species. Balance changes. Unresolved bugs. An unofficial changelog for Earth.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.changelog.earth"),
  title: "changelog.earth | Planetary release notes",
  description,
  openGraph: {
    title: "Earth's Changelog",
    description,
    siteName: "changelog.earth",
    type: "website",
    locale: "en_GB",
  },
  twitter: { card: "summary_large_image", title: "Earth's Changelog", description },
  alternates: {
    types: { "application/rss+xml": "https://www.changelog.earth/feed.xml" },
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
        {process.env.NEXT_PUBLIC_TRACWELL_PROJECT_KEY && (
          <Script
            src="https://collect.tracwell.app/script.js"
            data-project-key={process.env.NEXT_PUBLIC_TRACWELL_PROJECT_KEY}
            data-collection-mode="private"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}

