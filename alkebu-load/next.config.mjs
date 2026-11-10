import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker deployment
  output: 'standalone',
  poweredByHeader: false,

  // Fail builds on TypeScript errors.
  typescript: {
    ignoreBuildErrors: false,
  },

  // Exclude packages that break webpack bundling
  serverExternalPackages: ['rate-limiter-flexible', 'square', 'stripe', 'libsql', '@payloadcms/db-sqlite', '@payloadcms/db-postgres', 'ssh2', 'ssh2-sftp-client', 'yauzl'],

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'media.alkebulanimages.com' },
    ],
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

  // Production builds strip console.log/console.debug (per-item enrichment,
  // Square skip lines, retry chatter: noisy, and some carry customer emails).
  // console.info is kept: it is the channel for operational lines that must
  // reach the Coolify container log (job summaries, order/email outcomes,
  // webhook receipts, search index ready). Use console.info for those, and
  // keep customer email addresses out of them.
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: {
        exclude: ['error', 'warn', 'info'],
      },
    },
  }),
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
