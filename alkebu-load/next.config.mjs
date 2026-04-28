import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker deployment
  output: 'standalone',
  poweredByHeader: false,

  // Fail builds on ESLint errors. Warnings (e.g. no-explicit-any) still pass.
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Fail builds on TypeScript errors.
  typescript: {
    ignoreBuildErrors: false,
  },

  // Exclude packages that break webpack bundling
  serverExternalPackages: ['rate-limiter-flexible', 'square', 'stripe', 'libsql', '@payloadcms/db-sqlite'],

  // Image optimization
  images: {
    domains: ['localhost', 'media.alkebulanimages.com'],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
          },
        ],
      },
    ]
  },

  // Disable telemetry in production
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: {
        exclude: ['error', 'warn'],
      },
    },
  }),
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
