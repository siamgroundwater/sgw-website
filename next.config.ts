import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A separate output directory prevents isolated CMS tests from disturbing npm run dev.
  distDir: process.env.SGW_CMS_TEST_BUILD === 'true' ? '.next-cms-test' : '.next',
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  reactCompiler: true,
  experimental: {
    globalNotFound: true,
  },
  poweredByHeader: false,
  compress: true,
  async redirects() {
    return [
      { source: '/th', destination: '/', permanent: true },
      { source: '/th/home', destination: '/', permanent: true },
      { source: '/th/:path*', destination: '/:path*', permanent: true },
      { source: '/home', destination: '/', permanent: true },
      { source: '/:locale(en|zh|ja)/home', destination: '/:locale', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
