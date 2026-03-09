const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
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
