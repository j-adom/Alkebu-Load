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

import { HomePage } from './globals/HomePage'
import { AboutPage } from './globals/AboutPage'
import { ContactPage } from './globals/ContactPage'
import { ShopPage } from './globals/ShopPage'
import { SiteSettings } from './globals/SiteSettings'

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


const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const publicSiteURL = process.env.PAYLOAD_PUBLIC_SITE_URL || 'https://alkebulanimages.com'
const databaseURI = process.env.DATABASE_URI

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
  ],
  email: nodemailerAdapter({
    defaultFromAddress: process.env.SMTP_FROM || 'noreply@alkebulanimages.com',
    defaultFromName: 'Alkebu-Lan Images',
    transportOptions: {
      host: 'email-smtp.us-east-2.amazonaws.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SES_SMTP_USER,
        pass: process.env.SES_SMTP_PASSWORD,
      },
    },
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
    ],
  },
})
