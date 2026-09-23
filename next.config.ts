import type { NextConfig } from "next";

// Sent with every response. The CSP only restricts framing, plugins and <base>: scripts and
// styles are left alone, since locking them down needs per-request nonces.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  // Containers run the traced standalone output instead of `next start` over a full
  // node_modules. It is opt-in because `next start` warns that it does not support standalone,
  // and that is exactly how the e2e suite serves the app — only the Dockerfile sets this.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  experimental: {
    // Autosave sends the whole document; a long book with many elements outgrows the 1 MB default.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Embeds exist to be framed by other sites; every other page refuses it (clickjacking).
      // The later rule wins for the same header key. No X-Frame-Options anywhere: it can't
      // allow every site, and browsers ignore it when frame-ancestors is present anyway.
      { source: "/embed/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *; object-src 'none'; base-uri 'self'" }] },
    ];
  },
};

export default nextConfig;
