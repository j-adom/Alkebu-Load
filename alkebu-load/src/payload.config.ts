import { s3Storage } from '@payloadcms/storage-s3'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { isAdminUser } from './access/roles'
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
import { customerEmailJobSchedule, customerEmailJobsEnabled, resolveJobAutoRunConfig } from './app/utils/jobRunnerConfig'
import { shouldEnableDevSchemaPush } from './app/utils/devSchemaPush'

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
import { SquareCatalogStaging } from './collections/SquareCatalogStaging'
import { IngramEnrichmentLog } from './collections/IngramEnrichmentLog'
import { IngramEnrichmentReview } from './collections/IngramEnrichmentReview'
import { SquareSyncState } from './globals/SquareSyncState'
import { IngramEnrichmentState } from './globals/IngramEnrichmentState'
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
      // Drizzle's dev push reconciles the target database's schema against this
      // branch whenever NODE_ENV !== 'production'. Harmless for a local throwaway
      // DB, destructive for a remote one -- so it is allowed only for local hosts.
      // See app/utils/devSchemaPush.ts.
      push: shouldEnableDevSchemaPush(databaseURI),
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
        'ingram-review': {
          Component: '/app/components/IngramEnrichmentReview',
          path: '/ingram-review',
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
    SquareSyncState,
    IngramEnrichmentState,
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
    ExternalBooks,
    SquareCatalogStaging,
    IngramEnrichmentLog,
    IngramEnrichmentReview,
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
    // Payload's default lets any logged-in principal (customers included) run,
    // queue or cancel jobs via /api/payload-jobs/*.
    access: {
      run: ({ req }) => isAdminUser(req.user),
      queue: ({ req }) => isAdminUser(req.user),
      cancel: ({ req }) => isAdminUser(req.user),
    },
    // Runs the queue. Without this, the `schedule` entries on the tasks below
    // are inert -- Payload registers them but nothing ever queues or executes
    // them. Opt-in per environment; see jobRunnerConfig.ts for why.
    autoRun: resolveJobAutoRunConfig(),
    // Required for the `concurrency` key on the Square tasks. Adds an indexed
    // concurrencyKey field to the jobs collection -- schema change, covered by
    // the single migration generated in Task 8.
    enableConcurrencyControl: true,
    tasks: [
      {
        slug: 'cleanup-abandoned-carts',
        handler: async ({ req }) => {
          if (!customerEmailJobsEnabled()) {
            return { output: { skipped: 'ENABLE_CUSTOMER_EMAIL_JOBS is not true' } };
          }
          const { cleanupAbandonedCarts } = await import('./app/utils/cartOperations');
          await cleanupAbandonedCarts(req.payload);
          return { output: {} };
        },
        // Emails customers about abandoned carts: needs ENABLE_CUSTOMER_EMAIL_JOBS too.
        schedule: customerEmailJobSchedule([{ cron: '0 */2 * * *', queue: 'default' }]), // Every 2 hours
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
          if (!customerEmailJobsEnabled()) {
            return { output: { skipped: 'ENABLE_CUSTOMER_EMAIL_JOBS is not true' } };
          }
          const { quoteRequestSystem } = await import('./app/utils/quoteRequestSystem');
          await quoteRequestSystem.processQuoteFollowups(req.payload);
          return { output: {} };
        },
        // Emails customers: needs ENABLE_CUSTOMER_EMAIL_JOBS too.
        schedule: customerEmailJobSchedule([{ cron: '0 15 * * *', queue: 'default' }]), // 15:00 UTC = 10:00 AM CDT / 9:00 AM CST
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
      {
        slug: 'square-catalog-sync',
        retries: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        // Every book write -- catalog and inventory -- shares this key, and
        // exclusive defaults to true, so they cannot interleave. This is what
        // actually prevents a stale editions array clobbering a stock write;
        // the pure merge alone cannot.
        //
        // Deliberately NOT `supersedes: true`: Payload's delete-older-pending
        // filters only on concurrencyKey + processing:false + no completedAt --
        // it does not also filter on taskSlug. Since both tasks share this key,
        // enabling supersedes here would let a catalog.version.updated enqueue
        // delete an already-queued, not-yet-running square-inventory-sync job,
        // silently dropping a stock update with no retry (Square doesn't resend).
        // The sync is checkpoint-driven and idempotent, so paying for an extra
        // run instead is the correct trade.
        concurrency: { key: () => 'books-write' },
        handler: async ({ req }) => {
          const { runSquareCatalogSync } = await import('./app/utils/squareCatalogSync');
          return { output: await runSquareCatalogSync(req.payload) };
        },
      },
      {
        slug: 'square-inventory-sync',
        retries: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        concurrency: { key: () => 'books-write' },
        handler: async ({ req, input }) => {
          const { runSquareInventorySync } = await import('./app/utils/squareCatalogSync');
          return { output: await runSquareInventorySync(req.payload, (input as any).counts) };
        },
      },
      {
        // Ingram availability, half 1: download the SFTP stock file and keep only our
        // EANs. No lock, so the multi-minute download never blocks Square stock writes.
        // Off unless INGRAM_STOCK_REFRESH_ENABLED=true (on top of ENABLE_JOB_AUTORUN).
        slug: 'ingram-stock-fetch',
        retries: { attempts: 2, backoff: { type: 'exponential', delay: 60_000 } },
        handler: async ({ req }) => {
          if (process.env.INGRAM_STOCK_REFRESH_ENABLED !== 'true') {
            return { output: { skipped: 'INGRAM_STOCK_REFRESH_ENABLED is not true' } };
          }
          const { fetchStockSnapshot } = await import('./app/utils/ingram/refreshCatalogStock');
          const { stockFeedFromEnv } = await import('./app/utils/ingram/stockFeeds');
          const feed = stockFeedFromEnv();
          const { input, records, counts } = await fetchStockSnapshot(req.payload, {
            remotePath: feed.remotePath,
            format: feed.createFormat(),
            minLines: feed.minLines,
            threshold: Number(process.env.INGRAM_STOCK_THRESHOLD) || 10,
          });
          await req.payload.jobs.queue({ task: 'ingram-stock-apply', input: input as any });
          // Saved for the weekly enrichment job, so it needn't download the same file again.
          const { saveStockRecords } = await import('./app/utils/ingram/stockRecordCache');
          await saveStockRecords(records, feed.remotePath).catch((error) =>
            console.warn('Ingram stock refresh: could not save the stock cache for enrichment:', error),
          );
          return { output: { feed: feed.name, ...counts } };
        },
        schedule: [{ cron: '30 11 * * *', queue: 'default' }], // 11:30 UTC = 6:30 AM CDT, after the 5 AM CT update
      },
      {
        // Ingram availability, half 2: merge the snapshot into editions under the same
        // lock as the Square jobs, since all three rewrite the editions array.
        slug: 'ingram-stock-apply',
        retries: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        concurrency: { key: () => 'books-write' },
        handler: async ({ req, input }) => {
          const { applyStockSnapshot } = await import('./app/utils/ingram/refreshCatalogStock');
          const summary = await applyStockSnapshot(req.payload, input as any, { checkedAt: new Date().toISOString() });
          return { output: summary };
        },
      },
      {
        // Ingram catalog enrichment (plan Phase 3), weekly after the Tuesday 6 AM CT Titles
        // Basic drop. Holds the books-write lock for the whole run (download included), so
        // queued Square stock writes wait until it finishes; they are delayed, not dropped.
        // Off unless INGRAM_ENRICHMENT_ENABLED=true (on top of ENABLE_JOB_AUTORUN). Price and
        // title changes, and Author fills on empty Square variations, reach Square only with
        // INGRAM_ENRICHMENT_SQUARE_WRITEBACK=true.
        slug: 'ingram-enrich-titles',
        retries: { attempts: 1, backoff: { type: 'exponential', delay: 60_000 } },
        concurrency: { key: () => 'books-write' },
        handler: async ({ req }) => {
          if (process.env.INGRAM_ENRICHMENT_ENABLED !== 'true') {
            return { output: { skipped: 'INGRAM_ENRICHMENT_ENABLED is not true' } };
          }
          const { runScheduledEnrichment } = await import('./app/utils/ingram/scheduledEnrichment');
          return { output: (await runScheduledEnrichment(req.payload, 'titles', { dryRun: false })) as any };
        },
        schedule: [{ cron: '0 14 * * 2', queue: 'default' }], // Tue 14:00 UTC = 9 AM CDT / 8 AM CST
      },
      {
        // Monthly publisher marketing + brief descriptions. Cron can't say "first Monday",
        // so this is scheduled every Monday and skips all but the first of the month.
        slug: 'ingram-enrich-descriptions',
        retries: { attempts: 1, backoff: { type: 'exponential', delay: 60_000 } },
        concurrency: { key: () => 'books-write' },
        handler: async ({ req }) => {
          if (process.env.INGRAM_ENRICHMENT_ENABLED !== 'true') {
            return { output: { skipped: 'INGRAM_ENRICHMENT_ENABLED is not true' } };
          }
          const { isFirstMondayUtc, runScheduledEnrichment } = await import('./app/utils/ingram/scheduledEnrichment');
          if (!isFirstMondayUtc(new Date())) return { output: { skipped: 'not the first Monday of the month' } };
          return { output: (await runScheduledEnrichment(req.payload, 'descriptions', { dryRun: false })) as any };
        },
        schedule: [{ cron: '0 14 * * 1', queue: 'default' }], // Mondays 14:00 UTC; runs on the first
      },
    ],
  },
})
