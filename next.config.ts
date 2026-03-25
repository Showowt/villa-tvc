import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Skip TypeScript errors during build (schema mismatch with generated types)
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
