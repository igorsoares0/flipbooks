import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Containers run the traced standalone output instead of `next start` over a full
  // node_modules. It is opt-in because `next start` warns that it does not support standalone,
  // and that is exactly how the e2e suite serves the app — only the Dockerfile sets this.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  experimental: {
    // Autosave sends the whole document; a long book with many elements outgrows the 1 MB default.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
