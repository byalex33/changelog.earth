import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "changelog.earth | Planetary release notes",
  description: "New species. Balance changes. Unresolved bugs. An unofficial changelog for Earth.",
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

