// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { seoPlugin, type GenerateTitle, type GenerateURL } from '@payloadcms/plugin-seo'

import { sqliteAdapter } from '@payloadcms/db-sqlite'

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

const generateTitle: GenerateTitle<any> = ({ doc }) => {
  if (doc?.title) return `${doc.title} | Alkebu-Lan Images`
  return 'Alkebu-Lan Images'
}

const generateURL: GenerateURL<any> = ({ doc }) => {
  const slug = doc?.slug ? `/${doc.slug}` : ''
  return `${publicSiteURL}${slug}`
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
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
  db: process.env.DATABASE_URI?.startsWith('postgres')
    ? postgresAdapter({
        pool: {
          connectionString: process.env.DATABASE_URI,
        },
      })
    : sqliteAdapter({
        client: {
          url: process.env.DATABASE_URI || 'file:./alkebulanimages.db',
        },
      }),
  sharp,
  plugins: [
    // payloadCloudPlugin(), // Disabled - causes Cache-Control header conflicts in local dev
    // storage-adapter-placeholder
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
      host: 'smtp.resend.com',
      port: 587,
      secure: false,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    },
    fromName: process.env.FROM_NAME || 'Alkebu-Lan Images',
    fromAddress: process.env.FROM_EMAIL || 'orders@alkebulanimages.com',
  }),
  jobs: {
    tasks: [
      {
        slug: 'cleanup-abandoned-carts',
        handler: async ({ payload }) => {
          const { cleanupAbandonedCarts } = await import('./app/utils/cartOperations');
          await cleanupAbandonedCarts(payload);
        },
        schedule: '0 */2 * * *', // Every 2 hours
      },
    ],
  },
})
