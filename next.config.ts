import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
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
      { source: '/', destination: '/th', permanent: true },
      { source: '/home', destination: '/th', permanent: true },
      { source: '/about', destination: '/th/about', permanent: true },
      { source: '/services', destination: '/th/services', permanent: true },
      { source: '/services/survey', destination: '/th/services/survey', permanent: true },
      { source: '/services/drilling', destination: '/th/services/drilling', permanent: true },
      { source: '/services/maintenance', destination: '/th/services/maintenance', permanent: true },
      { source: '/services/consult', destination: '/th/services/consult', permanent: true },
      { source: '/projects', destination: '/th/projects', permanent: true },
      { source: '/projects/:id', destination: '/th/projects/:id', permanent: true },
      { source: '/governance', destination: '/th/governance', permanent: true },
      { source: '/groundwater-learning', destination: '/th/groundwater-learning', permanent: true },
      { source: '/learn/:slug', destination: '/th/learn/:slug', permanent: true },
      { source: '/contact', destination: '/th/contact', permanent: true },
      { source: '/privacy', destination: '/th/privacy', permanent: true },
      { source: '/:locale(th|en|zh|ja)/home', destination: '/:locale', permanent: true },
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
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
