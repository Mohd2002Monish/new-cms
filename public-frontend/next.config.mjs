import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Configure caching for PWA
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lock Turbopack root strictly to this package, never the user's home directory
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Cap in-memory pages buffer to avoid dev server RAM inflation
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 4,
  },
  images: {
    remotePatterns: [
      {
        // Cloudinary CDN — allow all Cloudinary-hosted images
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        // Local development — allow localhost image URLs
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        // Unsplash placeholders
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default withPWA(nextConfig);
