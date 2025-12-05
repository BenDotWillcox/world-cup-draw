import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'world-cup-draw'; // This must match your GitHub repository name

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? `/${repoName}` : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
