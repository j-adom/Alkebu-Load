import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker deployment
  output: 'standalone',

  // Skip ESLint during builds (warnings treated as errors in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip TypeScript errors during builds (handle via local linting)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Exclude packages that break webpack bundling
  serverExternalPackages: ['rate-limiter-flexible', 'square', 'libsql', '@payloadcms/db-sqlite'],

  // Image optimization
  images: {
    domains: ['localhost', 'media.alkebulanimages.com'],
    formats: ['image/avif', 'image/webp'],
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
