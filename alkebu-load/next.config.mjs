import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker deployment
  output: 'standalone',

  // Exclude packages that break webpack bundling
  serverExternalPackages: ['rate-limiter-flexible'],

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
