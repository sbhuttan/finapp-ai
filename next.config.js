/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: false
  },
  async rewrites() {
    return [
      {
        source: '/api/analysis/:path*',
        destination: 'http://localhost:8000/api/analysis/:path*',
      },
      {
        source: '/api/stock/news/:path*',
        destination: 'http://localhost:8000/api/stock/news/:path*',
      },
      // Add other API routes that should proxy to Python backend
      {
        source: '/api/market/:path*',
        destination: 'http://localhost:8000/api/market/:path*',
      }
    ]
  }
}

module.exports = nextConfig
