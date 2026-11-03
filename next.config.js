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

  // Lets one public address (e.g. an ngrok tunnel to this app) reach the API too: set NEXT_PUBLIC_API_URL=/backend and the
  // browser calls this app, which forwards to the API on this machine. Unused while NEXT_PUBLIC_API_URL is an absolute URL.
  async rewrites() {
    const api = process.env.BACKEND_PROXY_TARGET || 'http://localhost:3001'
    return [{ source: '/backend/:path*', destination: `${api}/api/:path*` }]
  },
}

module.exports = nextConfig

