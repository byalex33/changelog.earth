import type { Metadata } from "next";
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
      <body className="antialiased">{children}</body>
    </html>
  );
}

