import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Autosave sends the whole document; a long book with many elements outgrows the 1 MB default.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
