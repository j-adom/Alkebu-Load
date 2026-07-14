import { s3Storage } from '@payloadcms/storage-s3'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { seoPlugin } from '@payloadcms/plugin-seo'
import type { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { buildMcpPlugin } from './plugins/mcp'

import { HomePage } from './globals/HomePage'
import { AboutPage } from './globals/AboutPage'
import { ContactPage } from './globals/ContactPage'
import { ShopPage } from './globals/ShopPage'
import { SiteSettings } from './globals/SiteSettings'

import { searchEngine } from './app/utils/searchEngine'
import { checkSchemaDrift } from './app/utils/schemaDrift'
import { sendRawEmail } from './app/utils/emailService'

import Users from './collections/Users'
import Media from './collections/Media'
import Authors from './collections/Authors'
import Publishers from './collections/Publishers'
import Vendors from './collections/Vendors'
import Books from './collections/Books'
import WellnessLifestyle from './collections/WellnessLifestyle'
import FashionJewelry from './collections/FashionJewelry'
import OilsIncense from './collections/OilsIncense'
import BlogPosts from './collections/BlogPosts'
import Events from './collections/Events'
import Businesses from './collections/Businesses'
import Comments from './collections/Comments'
import Reviews from './collections/Reviews'
import SearchAnalytics from './collections/SearchAnalytics'
import BookQuotes from './collections/BookQuotes'
import ExternalBooks from './collections/ExternalBooks'
import { Carts } from './collections/Carts'
import { CartItems } from './collections/CartItems'
import { Orders } from './collections/Orders'
import { Customers } from './collections/Customers'
import { InstitutionalAccounts } from './collections/InstitutionalAccounts'
import { PartnershipInquiries } from './collections/PartnershipInquiries'
import { getEmailRuntimeConfig, getEmailTransportOptions, shouldSkipEmailTransportVerify } from './app/utils/emailConfig'
// (getEmailRuntimeConfig also backs the schema-drift boot alert below)


const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const serverURL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
const publicSiteURL = process.env.PAYLOAD_PUBLIC_SITE_URL || 'https://alkebulanimages.com'
const databaseURI = process.env.DATABASE_URI
const emailRuntime = getEmailRuntimeConfig()

if (process.env.NODE_ENV === 'production' && !process.env.PAYLOAD_SECRET) {
  throw new Error('PAYLOAD_SECRET is required in production')
}

const resolveDatabaseAdapter = async () => {
  if (databaseURI?.startsWith('postgres')) {
    const { postgresAdapter } = await import('@payloadcms/db-postgres')

    return postgresAdapter({
      pool: {
        connectionString: databaseURI,
      },
    })
  }

  const { sqliteAdapter } = await import('@payloadcms/db-sqlite')

  return sqliteAdapter({
    client: {
      url: databaseURI || 'file:./alkebulanimages.db',
    },
  })
}

const db = await resolveDatabaseAdapter()

const generateTitle: GenerateTitle<any> = ({ doc }) => {
  if (doc?.title) return `${doc.title} | Alkebu-Lan Images`
  return 'Alkebu-Lan Images'
}

const generateURL: GenerateURL<any> = ({ doc }) => {
  const slug = doc?.slug ? `/${doc.slug}` : ''
  return `${publicSiteURL}${slug}`
}

export default buildConfig({
  onInit: async (payload) => {
    // Populate FlexSearch index in the background — non-blocking
    searchEngine.initializeWithData(payload).catch((err) => {
      payload.logger.error({ err }, 'Failed to initialize search index')
    })

    // Schema drift check — catches the failure mode that took B2B lead forms
    // down for six days on July 8, 2026: a collection registered in the
    // running app whose Postgres table was never created. Loud log + staff
    // alert, but NEVER a boot crash — a hard crash here would take the whole
    // site down, which is worse than drift going briefly unnoticed.
    checkSchemaDrift(payload)
      .then(async (result) => {
        if (result.ok) return

        payload.logger.error(
          `SCHEMA DRIFT DETECTED on boot — the following collection(s) are registered in the app but their database probe failed, meaning writes to them are likely being silently lost: ${result.missing.join(', ')}`,
        )

        try {
          const staffEmail = getEmailRuntimeConfig().staffNotificationEmail
          await sendRawEmail({
            to: staffEmail,
            subject: `URGENT: schema drift detected on boot — ${result.missing.length} collection(s) broken`,
            html: `<p>The following collections are registered in the running app, but a database probe against each failed on startup:</p>
<ul>${result.missing.map((slug) => `<li>${slug}</li>`).join('')}</ul>
<p>Writes to these collections are most likely failing silently right now. Investigate immediately — check that a migration was applied to the correct database.</p>`,
            text: `Schema drift detected on boot.\n\nThe following collections are registered in the running app, but a database probe against each failed on startup:\n${result.missing.join('\n')}\n\nWrites to these collections are most likely failing silently right now. Investigate immediately — check that a migration was applied to the correct database.`,
          })
        } catch (err) {
          // Alerting must never crash boot.
          payload.logger.error({ err }, 'Failed to send schema drift alert email')
        }
      })
      .catch((err) => {
        payload.logger.error({ err }, 'Schema drift check itself failed')
      })
  },
  serverURL,
  cors: [
    'https://alkebulanimages.com',
    'https://www.alkebulanimages.com',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173'] : []),
  ],
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      afterNavLinks: ['/app/components/OrderDashboardNavLink'],
      views: {
        'order-dashboard': {
          Component: '/app/components/OrderDashboardView',
          path: '/order-dashboard',
        },
      },
    },
  },
  globals: [
    HomePage,
    AboutPage,
    ContactPage,
    ShopPage,
    SiteSettings,
  ],
  collections: [
    Users,
    Media,
    // E-Commerce Collections
    Carts,
    CartItems,
    Orders,
    Customers,
    InstitutionalAccounts,
    PartnershipInquiries,
    // Product Collections
    Authors,
    Publishers,
    Vendors,
    Books,
    WellnessLifestyle,
    FashionJewelry,
    OilsIncense,
    // Content Collections
    BlogPosts,
    Events,
    Businesses,
    Comments,
    Reviews,
    // System Collections
    SearchAnalytics,
    BookQuotes,
    ExternalBooks
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // Use PostgreSQL in production, SQLite for local development
  db,
  sharp,
  plugins: [
    // payloadCloudPlugin(), // Disabled - causes Cache-Control header conflicts in local dev
    // Cloudflare R2 storage (S3-compatible)
    ...(process.env.R2_ACCESS_KEY_ID ? [s3Storage({
      collections: { media: true },
      bucket: process.env.R2_BUCKET || 'alkebulan-online',
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      },
    })] : []),
    seoPlugin({
      collections: [
        'books',
        'externalBooks',
        'blogPosts',
        'events',
        'businesses',
        'fashion-jewelry',
        'oils-incense',
        'wellness-lifestyle',
      ],
      globals: ['siteSettings', 'homePage', 'aboutPage', 'contactPage', 'shopPage'],
      generateTitle,
      generateURL,
    }),
    // Staff-agent MCP server (dormant unless MCP_ENABLED=true). Endpoint: /api/mcp
    buildMcpPlugin(),
  ],
  email: nodemailerAdapter({
    defaultFromAddress: emailRuntime.fromEmail,
    defaultFromName: emailRuntime.fromName,
    transportOptions: getEmailTransportOptions(),
    skipVerify: shouldSkipEmailTransportVerify(),
  }),
  jobs: {
    tasks: [
      {
        slug: 'cleanup-abandoned-carts',
        handler: async ({ req }) => {
          const { cleanupAbandonedCarts } = await import('./app/utils/cartOperations');
          await cleanupAbandonedCarts(req.payload);
          return { output: {} };
        },
        schedule: [{ cron: '0 */2 * * *', queue: 'default' }], // Every 2 hours
      },
      {
        slug: 'daily-order-digest',
        handler: async ({ req }) => {
          const { generateDailyOrderDigest } = await import('./app/utils/orderDigest');
          await generateDailyOrderDigest(req.payload);
          return { output: {} };
        },
        schedule: [{ cron: '0 12 * * *', queue: 'default' }], // 12:00 UTC = 7:00 AM CDT / 6:00 AM CST
      },
      {
        slug: 'quote-followups',
        handler: async ({ req }) => {
          // Nudge customers with quotes stuck in quote-sent / awaiting-response
          // for 7+ days; each quote is re-nudged at most every 7 days.
          const { quoteRequestSystem } = await import('./app/utils/quoteRequestSystem');
          await quoteRequestSystem.processQuoteFollowups(req.payload);
          return { output: {} };
        },
        schedule: [{ cron: '0 15 * * *', queue: 'default' }], // 15:00 UTC = 10:00 AM CDT / 9:00 AM CST
      },
      {
        slug: 'recover-stripe-orders',
        handler: async ({ req }) => {
          // Backstop for missed/failed Stripe webhooks: recreate orders for
          // paid sessions with no matching order and alert staff. Sessions
          // younger than 30 minutes are left for normal webhook retries.
          const { runScheduledStripeRecovery } = await import('./app/utils/stripeRecovery');
          const summary = await runScheduledStripeRecovery(req.payload);
          return { output: { scanned: summary.scanned, recovered: summary.recovered.length } };
        },
        schedule: [{ cron: '15 * * * *', queue: 'default' }], // Hourly at :15
      },
    ],
  },
})
