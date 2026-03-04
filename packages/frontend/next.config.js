/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Existing legacy stories still contain type debt.
    // Keep production deploy unblocked while quality hardening continues.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
