import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // CloudFront distributions for recipe images
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
    ],
  },
};

export default nextConfig;
