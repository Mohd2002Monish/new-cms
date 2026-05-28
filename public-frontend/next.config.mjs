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

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
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
