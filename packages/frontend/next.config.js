const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../..'),
  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  // Bundle optimization
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },

  // Image optimization
  images: {
    remotePatterns: [
      { hostname: 'avatars.githubusercontent.com' },
      { hostname: 'lh3.googleusercontent.com' },
      { hostname: 'avatars.slack-edge.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  async rewrites() {
    const backendOrigin =
      process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3001';

    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${backendOrigin}/health`,
      },
    ];
  },
};

module.exports = nextConfig;