# CLAUDE.md — alkebu-load (Payload CMS Backend)

This file provides guidance to Claude Code (claude.ai/code) when working in `alkebu-load/`. The repo-level [../CLAUDE.md](../CLAUDE.md) covers cross-project context; this file focuses on the Payload backend.

## Project Overview

Payload CMS 3.x (on Next.js 15) backend for Alkebu-Lan Images, the Nashville-based Black-owned bookstore. **The site is in production** at [payload.alkebulanimages.com](https://payload.alkebulanimages.com), serving the SvelteKit storefront at [alkebulanimages.com](https://alkebulanimages.com).

This single Payload instance handles:
- **E-commerce** — cart, checkout (Stripe primary, Square adapter under validation), tax/shipping, refunds, abandoned-cart recovery
- **Inventory** — Square POS sync via webhooks, multi-location stock, edition management
- **Catalog** — Books with auto-categorization + auto-enrichment (ISBNdb / Google Books / Open Library)
- **Content** — blog posts, events, business directory, comments, reviews
- **Order operations** — staff dashboard, branded emails (SES SMTP), daily digest, refund API
- **Search** — three-tier: FlexSearch client-side, PostgreSQL FTS server-side, external book APIs

> **Note**: Older docs may mention "MedusaJS in a separate repository" — that plan was dropped. All commerce lives in this Payload instance.

## Development Commands

**Package manager**: `pnpm` (required; `engines: pnpm ^9 || ^10`)

### Core
- `pnpm dev` — dev server on `:3000`
- `pnpm devsafe` — clean restart (removes `.next`)
- `pnpm build` / `pnpm start` — production build / serve
- `pnpm lint` — ESLint (strict types/lint enforced in build per `985dbcb`)
- `pnpm test` — Node test runner against `tests/**/*.test.ts`. Script auto-injects `STRIPE_SECRET_KEY=sk_test_dummy` because Stripe SDK init runs at module load.
- `pnpm check:scripts` — type-check `scripts/*.ts` against `tsconfig.scripts.json` (separate from the Next build).

### Payload
- `pnpm payload` — Payload CLI passthrough
- `pnpm generate:types` — regenerate `src/payload-types.ts` after collection changes
- `pnpm generate:importmap` — regenerate admin UI import map (needed when admin custom components change)

### Operational scripts (`tsx scripts/<name>.ts`)
~25 scripts, grouped by purpose:

- **Catalog import**: `import-books.ts`, `import-square-csv.ts`, `import-square-to-payload.ts`, `import-reconciled-books.ts`, `bulk-isbn-import.ts`, `reconcile-book-data.ts`
- **Enrichment & backfill**: `enrich-books-isbndb.ts`, `enrich-books-batch-fast.ts`, `enrich-books-metadata.ts`, `backfill-book-images.ts`, `backfill-book-shipping-weights.ts`, `set-books-stock-by-isbn.ts`
- **Square sync**: `square-integration.ts` (test/debug), `square-payload-sync.ts`, `update-square-inventory.ts` (supports dry-run via CSV in `data/`)
- **Search**: `initialize-search.ts` (add `--sample-data` to seed)
- **Ops/QA**: `test-checkout-flow.ts`, `send-manual-order-notifications.ts`, `check-image-stats.ts`, `check-import-stats.ts`, `check-apparel-variants.ts`
- **Schema patches** (SQL, not TS): `scripts/fix-carts-schema.sql`, `scripts/fix-orders-schema.sql`

## Architecture

### Database
- **Local dev**: SQLite (`alkebulanimages.db` in this directory; `better-sqlite3` + `libsql`)
- **Production**: PostgreSQL via `DATABASE_URI`; Drizzle ORM under the hood (`drizzle-orm` is a direct dep — added in `a2cada5` for migrations)

### Collections (`src/collections/`)

#### Commerce
- **Carts** + **CartItems** — Local API optimized (<50 ms ops), session-based guest carts, abandoned-cart cleanup every 2h
- **Orders** — Stripe + Square integration, fulfillment tracking, internal notes, refunds, manual notification re-send
- **Customers** — extended user profiles with shipping addresses + tax status
- **InstitutionalAccounts** — B2B / tax-exempt accounts (Phase 2)

#### Products
- **Books** (`Books.tsx` — uses JSX for admin UI custom field) — main inventory with edition management, auto-categorization to curated collections, auto-enrichment, request-only availability flag
- **WellnessLifestyle**, **FashionJewelry**, **OilsIncense** — non-book inventory with variants
- **ExternalBooks** — cached external API results (separate from sellable inventory)

#### Content
- **BlogPosts** (slug: `blogPosts`, NOT `blog-posts`), **Events**, **Businesses** (with `businessType` + `directoryCategory` distinctions), **Comments** (with Perspective API moderation), **Reviews**

#### System
- **Users** (roles: admin, staff, editor, customer), **Authors**, **Publishers**, **Vendors**, **Media**, **BookQuotes**, **SearchAnalytics**

### E-Commerce Flow
1. **Browse** → SvelteKit storefront fetches from Payload REST/GraphQL
2. **Add to cart** → `/api/cart` creates/updates cart via Local API
3. **Checkout preview** → `POST /api/checkout/preview` calculates and **persists** tax + shipping quote (this is the key insight: the preview is the authoritative price source, not the Stripe session)
4. **Pay** → `POST /api/checkout` reuses persisted quote to create the Stripe hosted Checkout session — no recalculation
5. **Webhook** → `/api/stripe-webhook` (or `/api/payment-webhook` for adapter-routed events) creates the Order, clears the cart, sends confirmation + staff notification
6. **Fulfill** → staff use `/admin/order-dashboard` (tablet-friendly tabs: Needs Attention / Shipped / All Orders)

### Tax & Shipping
- **TN destination tax**: rate from `TENNESSEE_STATE_TAX_RATE`. TN ship-to is taxed; out-of-state is not.
- **Shipping**: Shippo for live carrier rates (USPS, UPS, FedEx). Book-only carts default to USPS Media Mail. Orders ≥ `FREE_SHIPPING_THRESHOLD` (cents) ship free. Falls back to internal flat rates when Shippo is unavailable.
- **Quote locking**: shipping quotes carry expiry + fingerprint; stale quotes are suppressed in cart summaries and refreshed before payment.

### Email (SES SMTP)
- Transport: `@payloadcms/email-nodemailer` → Amazon SES SMTP, with generic SMTP fallback
- Templates (`src/app/utils/emailTemplates.ts`) — Afrocentric branded (Kente Gold, Forest Green): order confirmation, staff notification, status updates, daily digest, abandoned cart
- Daily order digest cron: `daily-order-digest` at 12:00 UTC (7 AM CT)

### Search (three tiers)
1. **FlexSearch** (client-side, 0–50 ms) — pre-indexed; bootstrap is fragile, see Gotchas
2. **PostgreSQL FTS** (server-side, 50–200 ms) — `src/app/api/search/route.ts`
3. **External book APIs** (500 ms–3 s) — ISBNdb → Google Books → Open Library; quote-request workflow when no purchasable record exists

### Storage
- **Cloudflare R2** via `@payloadcms/storage-s3` (S3-compatible). Recent enrichment scripts upload covers directly to R2.
- Older docs mention Cloudinary — code currently uses R2.

## Key Files

### Configuration
- `src/payload.config.ts` — main config: collections, jobs, plugins, email, storage, admin
- `.env` — environment (see below)
- `tsconfig.json` (Next/Payload), `tsconfig.scripts.json` (standalone tsx scripts)
- `next.config.mjs`, `eslint.config.mjs`

### Checkout / Payments / Shipping
- `src/app/utils/cartOperations.ts` — Local API cart CRUD
- `src/app/utils/stripeHelpers.ts` — Stripe session + webhook handling
- `src/app/utils/taxShippingCalculations.ts` — TN tax + shipping math
- `src/app/utils/shippingQuotes.ts` — Shippo normalization + quote lock/expiry
- `src/app/utils/taxExemptValidation.ts` — institutional/tax-exempt logic
- `src/app/utils/cartProductDetails.ts`, `getTotal.ts`, `getTotalWeight.ts`
- `src/app/api/checkout/route.ts`, `src/app/api/checkout/preview/route.ts`
- `src/app/api/stripe-webhook/route.ts`, `src/app/api/payment-webhook/route.ts`
- `src/app/api/refund/route.ts`

### Order Management
- `src/app/components/OrderDashboard.tsx` — staff dashboard (tablet-friendly)
- `src/app/utils/emailService.ts`, `emailTemplates.ts`, `emailConfig.ts`
- `src/app/utils/orderDigest.ts` — daily digest builder

### Search & Enrichment
- `src/app/utils/searchEngine.ts` — FlexSearch + bootstrap
- `src/app/utils/externalBookAPI.ts`
- `src/app/utils/quoteRequestSystem.ts`
- `src/app/utils/productEnrichment.ts`, `autoEnrichBook.ts`, `imageManager.ts`
- `src/app/utils/authorManager.ts`, `authorMatching.ts`, `publisherManager.ts`, `vendorManager.ts`
- `src/app/utils/bookAvailabilityExceptions.ts` — request-only book availability
- `src/app/components/EnrichBookButton.tsx` — admin UI refresh
- `src/app/api/search/route.ts`, `src/app/api/external-books/route.ts`, `src/app/api/quote-request/route.ts`, `src/app/api/books/route.ts`

### Square (inventory only)
- `src/app/utils/squareSync.ts`, `squareVendorExtractor.ts`
- `src/app/api/webhooks/square-catalog/route.ts`

### Content moderation
- `src/app/utils/toxicityCheck.ts` (Perspective API for Comments)

## API Endpoints

- **Checkout**: `POST /api/checkout`, `POST /api/checkout/preview`, `POST /api/refund`, `POST /api/stripe-webhook`, `POST /api/payment-webhook`
- **Cart**: `POST /api/cart`, `POST /api/cart-recovery`
- **Search**: `GET|POST /api/search`, `GET /api/external-books?q=…|isbn=…`, `POST /api/quote-request`, `GET /api/quote-request?id=…&email=…`
- **Orders**: `GET /api/stripe-orders`, `GET /api/payment-methods`
- **Webhooks**: `POST /api/webhooks/square-catalog`, others under `/api/webhooks/*`
- **Health & contact**: `GET /api/health`, `POST /api/contact` (Cloudflare Turnstile-protected)
- **Payload built-ins**: `/api/graphql`, REST under `/api/<collection-slug>` (use camelCase: `/api/blogPosts` not `/api/blog-posts`)
- **Admin**: `/admin`, `/admin/order-dashboard`

## Environment Variables

### Required
- `DATABASE_URI` — `file:./alkebulanimages.db` for dev, `postgresql://…` for prod
- `PAYLOAD_SECRET` — 32+ char encryption secret
- `PAYLOAD_PUBLIC_SERVER_URL` — `http://localhost:3000` dev, `https://payload.alkebulanimages.com` prod

### Stripe (required for checkout)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- For tests, the `pnpm test` script injects `sk_test_dummy`

### Square (required for inventory sync)
- `SQUARE_ACCESS_TOKEN`, `SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_APPLICATION_ID`, `SQUARE_ENVIRONMENT` (`sandbox` | `production`)

### Email (SES SMTP)
- `FROM_EMAIL`, `FROM_NAME`, `SES_SMTP_USER`, `SES_SMTP_PASSWORD`, `SMTP_HOST` (e.g. `email-smtp.us-east-2.amazonaws.com`), `SMTP_PORT`
- `STAFF_NOTIFICATION_EMAIL`, `ORDER_ADMIN_BASE_URL`

### Storage (Cloudflare R2 via S3 SDK)
- R2/S3 access key + secret + bucket + endpoint URL

### Tax / Shipping
- `TENNESSEE_STATE_TAX_RATE` (decimal, e.g. `0.07`)
- `FREE_SHIPPING_THRESHOLD` (cents, e.g. `7500` = $75)
- Shippo API token (when live carrier rates are needed)

### Optional
- `ISBNDB_API_KEY`, `GOOGLE_BOOKS_API_KEY` — book enrichment & external search
- Perspective API key — comment moderation

## Gotchas

- **Search is brittle.** When touching search code:
  - Use `authorsText.name` in PostgreSQL fallbacks, not the nested `authors[]` relationship array (silently fails in `OR` queries — see `381e6db`)
  - Query plain-text fields like `synopsis` and `shortDescription`, NOT the rich `description` (which is Lexical JSON, not text — see `f8b8803`)
  - The collection slug is `blogPosts` (camelCase), not `blog-posts` (see `9890d0a`)
  - Use `scrapedImageUrls` for book card images and strip HTML from excerpts (`f017907`)
  - Run `tsx scripts/initialize-search.ts` after any schema change that affects searchable fields

- **Lexical rich text**: rendered correctly only via Lexical-aware renderers. Treating it as a string yields garbage — see `4cd7e3f` (`render event description as Lexical rich text`).

- **Schema sync**: when changing `Carts` or `Orders`, run `pnpm generate:types` AND check `scripts/fix-carts-schema.sql` / `fix-orders-schema.sql` — there have been cases where Drizzle-generated migrations didn't fully match the collection (commits `4cab2ac`, `effa8cf`).

- **Strict build mode**: type and lint errors are enforced in production builds (`985dbcb`). `pnpm build` will fail on warnings — fix locally before pushing.

- **Books collection is `Books.tsx`**, not `Books.ts` — it has admin UI custom JSX. Don't rename without updating Payload registration.

- **`InstitutionalAccounts`, `Reviews`** exist as collections but are Phase 2 and may not be wired into all storefront flows yet.

- **Quote-locked checkout**: the `/api/checkout/preview` route persists a quote on the cart. Don't recalculate tax/shipping in `/api/checkout` — reuse the persisted quote, otherwise the customer can be charged a different total than what they confirmed.

- **Stripe SDK init runs at module load**, so almost any test that imports a util touching Stripe needs an env var present. The test script handles this; standalone `tsx` invocations may not.

- **`add_access.sh`, `drop-users.sh`, `drop-users-table.sql`** are operational/dangerous scripts in the root of this directory — don't run without understanding what they do (they reset auth state).

- **Backup `.db` files** (`alkebulanimages.db.backup-*`) sit in the repo root for convenience; treat them as throwaway local snapshots, not source of truth.

## Production Deployment

- **Host**: Coolify-managed deployment to `payload.alkebulanimages.com`
- **Auto-deploy**: webhook-triggered on `main` push (verified `d2b6387`)
- **Health check**: `GET /api/health` → `https://payload.alkebulanimages.com/api/health`
- See [./DEPLOYMENT.md](DEPLOYMENT.md) and [../docs/Deployment-Guide.md](../docs/Deployment-Guide.md)

## Reference Docs

- [./SYSTEM_GUIDE.md](SYSTEM_GUIDE.md) — backend deep-dive
- [./DEPLOYMENT.md](DEPLOYMENT.md) — deployment specifics
- [../docs/PRD.md](../docs/PRD.md) — authoritative product spec
- [../docs/LAUNCH-CHECKLIST.md](../docs/LAUNCH-CHECKLIST.md) — production readiness board
- [../docs/STAFF-WORKFLOWS.md](../docs/STAFF-WORKFLOWS.md), [../docs/CART-UX.md](../docs/CART-UX.md), [../docs/BOOK-ENRICHMENT-WORKFLOW.md](../docs/BOOK-ENRICHMENT-WORKFLOW.md)
