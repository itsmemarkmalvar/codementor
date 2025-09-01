import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Disable ESLint during build for Docker deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript checking during build for Docker deployment
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
