import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    // A mistyped link in the wild still sends lots of visitors here.
    return [{ source: "/about1", destination: "/about", permanent: true }];
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    return [{
      source: "/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // 'unsafe-inline' is here only because ISR pages are cached HTML and can't carry
            // per-request nonces for Next's inline hydration scripts. It is safe today because
            // no route renders untrusted HTML. Any dynamic route that does must get a nonce-based
            // CSP from proxy.ts instead. scripts/check-security-headers.mjs pins the allowed sources.
            `script-src 'self' 'unsafe-inline' https://collect.tracwell.app${isDev ? " 'unsafe-eval'" : ""}`,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self'",
            `connect-src 'self' https://collect.tracwell.app${isDev ? " ws: wss:" : ""}`,
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "frame-src 'none'",
          ].join("; "),
        },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    }];
  },
};

export default nextConfig;
