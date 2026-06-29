/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable to prevent double renders during development
  images: {
    domains: [],
  },
  // Performance optimizations
  swcMinify: true, // Use SWC for faster minification
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Remove console logs in production
  },
  // Optimize bundle size - removed recharts from optimizePackageImports to avoid chunk loading issues
  experimental: {
    optimizePackageImports: ['@/design-system', '@/components'],
  },
  // No custom webpack splitChunks/output - Next.js defaults avoid ChunkLoadError
}

module.exports = nextConfig

