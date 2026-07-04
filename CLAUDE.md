# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Claude Code Configuration

- **MCP config**: `.claude/mcp.json` (Filesystem MCP for project-wide file access). See [docs/mcp-setup.md](docs/mcp-setup.md).
- **Permissions**: `.claude/settings.local.json`.
- **Note**: The root `.env.example` is intentionally empty. Real env files live in `alkebu-load/.env` and `alkebu-web/.env.local`.

## Project Overview

Alkebulanimages 2.0 is the digital platform for a Nashville-based Black-owned bookstore. **The site is live in production** at [alkebulanimages.com](https://alkebulanimages.com) (storefront, Cloudflare) and [payload.alkebulanimages.com](https://payload.alkebulanimages.com) (Payload backend). Online ordering, Stripe checkout, and email confirmations are functioning as of April 30, 2026.

The architecture is **Payload-only**: a single Payload CMS backend handles content, e-commerce, inventory, orders, and operations. Stripe is the primary payment processor; Square POS is used for inventory sync (and a Square hosted-checkout adapter exists but is still being validated). Shippo provides live shipping rates with USPS Media Mail defaults for book-only carts.

### Repositories
- **alkebu-load/**: Payload CMS 3.x backend (Next.js 15) with integrated e-commerce, search, order management, email, and POS sync.
- **alkebu-web/**: SvelteKit (Svelte 5) storefront, deployed to Cloudflare.
- **alkebu-shared/**: Empty placeholder. Shared TypeScript types are *planned* but not implemented — do not assume this exists.

## Development Commands

### Backend (`alkebu-load/`) — `pnpm` required
- `pnpm dev` — dev server on `:3000`
- `pnpm devsafe` — clean restart (removes `.next`)
- `pnpm build` / `pnpm start` — production build / serve
- `pnpm lint` — ESLint
- `pnpm test` — Node test runner against `tests/**/*.test.ts`. **Always run with a dummy Stripe key**; the `test` script already prefixes `STRIPE_SECRET_KEY=sk_test_dummy`.
- `pnpm check:scripts` — type-check the standalone `scripts/` directory via `tsconfig.scripts.json` (separate from the Next build).
- `pnpm generate:types` — regenerate Payload TypeScript types from collections (run after schema changes).
- `pnpm generate:importmap` — regenerate admin UI import map.

### Frontend (`alkebu-web/`) — `npm`
- `npm run dev` — dev server on `:5173`
- `npm run build` / `npm run preview`
- `npm run check` — `svelte-kit sync` + `tsc --noEmit` (type check via `jsconfig.json`)
- `npm run check:svelte` — `svelte-check`
- `npm run lint` — ESLint
- `npm run sync:payment-provider` — fetch payment provider config from backend

### Operational scripts (`alkebu-load/scripts/`, run with `tsx`)
Grouped by purpose; the directory has ~25 scripts in total.

- **Catalog import**: `import-books.ts`, `import-square-csv.ts`, `import-square-to-payload.ts`, `import-reconciled-books.ts`, `bulk-isbn-import.ts`, `reconcile-book-data.ts`
- **Enrichment**: `enrich-books-isbndb.ts`, `enrich-books-batch-fast.ts`, `enrich-books-metadata.ts`, `backfill-book-images.ts`, `backfill-book-shipping-weights.ts`, `set-books-stock-by-isbn.ts`
- **Square sync**: `square-integration.ts`, `square-payload-sync.ts`, `update-square-inventory.ts`
- **Search**: `initialize-search.ts` (add `--sample-data` for seeded content)
- **Ops/QA**: `test-checkout-flow.ts`, `send-manual-order-notifications.ts`, `check-image-stats.ts`, `check-import-stats.ts`, `check-apparel-variants.ts`

## Architecture

### Data Flow
```
Square POS  ──webhooks──>  Payload CMS  ──Local API──>  Carts / Orders / Customers
                                │
                                ├──> Stripe (hosted Checkout, primary)
                                ├──> Square (hosted checkout adapter, under validation)
                                ├──> Shippo (live shipping rates)
                                └──> SES SMTP (transactional email)
                                          │
                              SvelteKit Storefront (Cloudflare) consumes Payload REST/GraphQL
```

### Payment & Checkout
- **Adapter pattern**: Pluggable Stripe + Square adapters with shared webhook handling. Stripe is the verified launch path; Square hosted checkout still needs sandbox/production verification.
- **Quote-locked checkout**: `POST /api/checkout/preview` calculates and persists tax + shipping. Stripe session creation reuses the persisted quote rather than recalculating, so the price the customer saw is the price they pay.
- **Tennessee tax**: Destination-based — TN shipments are taxed (default rate via `TENNESSEE_STATE_TAX_RATE`), out-of-state shipments are not.
- **Shipping**: Shippo for live rates (USPS, UPS, FedEx). Book-only carts default to USPS Media Mail. Free shipping above `FREE_SHIPPING_THRESHOLD` (cents). Falls back to internal rates if Shippo is unavailable.

### Collections (alkebu-load)
**Commerce**: `Carts`, `CartItems`, `Orders`, `Customers`, `InstitutionalAccounts` (B2B / tax-exempt, Phase 2).
**Products**: `Books` (with edition management + auto-categorization), `WellnessLifestyle`, `FashionJewelry`, `OilsIncense`, `ExternalBooks` (cached external API results).
**Content**: `BlogPosts`, `Events`, `Businesses` (directory with `businessType` and `directoryCategory` distinctions), `Comments`, `Reviews`.
**System**: `Authors`, `Publishers`, `Vendors`, `Media`, `Users` (roles: admin / staff / editor / customer), `BookQuotes`, `SearchAnalytics`.

### Search (three tiers)
1. **Client-side** — FlexSearch pre-indexed catalog (0–50 ms)
2. **Server-side** — PostgreSQL FTS via `/api/search` (50–200 ms)
3. **External** — ISBNdb → Google Books → Open Library (500 ms–3 s), with quote-request fallback

Search bootstrap is fragile — see "Gotchas" below before touching it.

### Order Operations
- **Order Dashboard**: tablet-friendly UI at `/admin/order-dashboard` (tabs: "Needs Attention" / "Shipped" / "All Orders").
- **Email**: SES SMTP (Nodemailer). Afrocentric branded templates for order confirmation, staff notification, status updates, daily digest, abandoned cart.
- **Scheduled jobs** (Payload cron):
  - `cleanup-abandoned-carts` — every 2 hours
  - `daily-order-digest` — 12:00 UTC (7 AM CT)
  - `recover-stripe-orders` — hourly at :15; reconciles paid Stripe sessions with no matching order and emails staff on recovery
- **Refund API**: admin-only POST, admin+staff GET. Phase 1 staff use the Stripe Dashboard for actual refunds.

## Key Files

### Configuration
- `alkebu-load/src/payload.config.ts` — main Payload config, all collections, jobs, plugins
- `alkebu-load/.env` — backend env (see "Environment Variables" below)
- `alkebu-web/.env.local` — frontend env (`PAYLOAD_API_URL`, `PUBLIC_SITE_URL`)

### Checkout / Payments / Shipping
- `alkebu-load/src/app/utils/cartOperations.ts` — cart CRUD via Local API (<50 ms)
- `alkebu-load/src/app/utils/stripeHelpers.ts` — Stripe session + webhook
- `alkebu-load/src/app/utils/taxShippingCalculations.ts` — TN tax + shipping math
- `alkebu-load/src/app/utils/shippingQuotes.ts` — Shippo normalization + quote locking
- `alkebu-load/src/app/utils/taxExemptValidation.ts` — institutional / tax-exempt logic
- `alkebu-load/src/app/api/checkout/route.ts` — Stripe session creation
- `alkebu-load/src/app/api/checkout/preview/route.ts` — quote preview + persistence
- `alkebu-load/src/app/api/stripe-webhook/route.ts` — Stripe webhooks
- `alkebu-load/src/app/api/payment-webhook/route.ts` — adapter-routed webhook
- `alkebu-load/src/app/api/refund/route.ts` — refund API

### Order Management / Email
- `alkebu-load/src/app/utils/emailService.ts` — Nodemailer/SES wrapper
- `alkebu-load/src/app/utils/emailTemplates.ts` — branded HTML templates
- `alkebu-load/src/app/utils/orderDigest.ts` — daily digest builder
- `alkebu-load/src/app/components/OrderDashboard.tsx` — staff dashboard

### Search & Enrichment
- `alkebu-load/src/app/utils/searchEngine.ts` — FlexSearch + bootstrap
- `alkebu-load/src/app/utils/externalBookAPI.ts` — ISBNdb / Google Books / Open Library
- `alkebu-load/src/app/utils/quoteRequestSystem.ts` — quote-request workflow
- `alkebu-load/src/app/utils/productEnrichment.ts`, `autoEnrichBook.ts`, `imageManager.ts`
- `alkebu-load/src/app/api/search/route.ts`, `alkebu-load/src/app/api/external-books/route.ts`

### Square Integration (inventory)
- `alkebu-load/src/app/utils/squareSync.ts`, `squareVendorExtractor.ts`
- `alkebu-load/src/app/api/webhooks/square-catalog/route.ts`

## API Endpoints

- **Checkout**: `POST /api/checkout`, `POST /api/checkout/preview`, `POST /api/refund`, `POST /api/payment-webhook`, `POST /api/stripe-webhook`
- **Cart**: `POST /api/cart`, `POST /api/cart-recovery`
- **Search**: `GET|POST /api/search`, `GET /api/external-books`, `POST /api/quote-request`
- **Health & contact**: `GET /api/health`, `POST /api/contact`
- **Webhooks**: `POST /api/webhooks/square-catalog`, others under `/api/webhooks/*`
- **Payload**: `/api/graphql`, REST under `/api/<collection-slug>` (note: collection slug for `BlogPosts` is `blogPosts`, not `blog-posts`)
- **Admin**: `/admin`, `/admin/order-dashboard`

## Infrastructure & Environment

### Production
- **Backend**: Payload-hosted on `payload.alkebulanimages.com` (PostgreSQL, Coolify-deployed via auto-deploy webhook)
- **Frontend**: Cloudflare Pages on `alkebulanimages.com`, `@sveltejs/adapter-cloudflare`
- **Image storage**: Cloudflare R2 via `@payloadcms/storage-s3` (older docs may say Cloudinary — code and recent commits use R2)
- **Email**: Amazon SES SMTP via Nodemailer
- **Analytics**: self-hosted Rybbit
- **Bot protection**: Cloudflare Turnstile on contact form

### Local Development
- **Database**: SQLite by default (`alkebu-load/alkebulanimages.db`). PostgreSQL for production via `DATABASE_URI`.
- **Setup**: `cd alkebu-load && pnpm install && cp .env.example .env && pnpm dev` → create admin at `/admin` → `tsx scripts/initialize-search.ts`. Then `cd alkebu-web && npm install && cp .env.example .env.local && npm run dev`.
- See [docs/development-guide.md](docs/development-guide.md) for the full walkthrough.

### Environment Variables (alkebu-load/.env)
**Required**: `DATABASE_URI`, `PAYLOAD_SECRET`, `PAYLOAD_PUBLIC_SERVER_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SQUARE_ACCESS_TOKEN`, `SQUARE_WEBHOOK_SIGNATURE_KEY`, `SES_SMTP_USER`, `SES_SMTP_PASSWORD`, `FROM_EMAIL`, `STAFF_NOTIFICATION_EMAIL`.
**Optional**: `ISBNDB_API_KEY`, `GOOGLE_BOOKS_API_KEY`, Shippo creds, R2/S3 bucket creds, `TENNESSEE_STATE_TAX_RATE`, `FREE_SHIPPING_THRESHOLD`, `ORDER_ADMIN_BASE_URL`.

## Gotchas

- **`alkebu-shared/` is empty.** Don't assume shared types exist — duplicate or import directly from `alkebu-load/src/payload-types.ts` if needed.
- **Search bootstrap is brittle.** Many recent commits fix this surface: use `authorsText.name` (not nested `authors[]`) in PostgreSQL fallbacks, query `synopsis`/`shortDescription` (plain text) not the rich `description`, use the `blogPosts` slug (camelCase, not kebab), and avoid nested-array fields in `OR` queries — they fail silently.
- **Lexical rich text** must be rendered with the appropriate Lexical renderer; passing the raw object as a string yields garbage. See `fix(web): render event description as Lexical rich text` for the pattern.
- **Cart/Order schema drift**: when changing those collections, run `pnpm generate:types` and check `scripts/fix-carts-schema.sql` / `fix-orders-schema.sql` for any pending Postgres-side patches.
- **Tests need `STRIPE_SECRET_KEY`** even for unrelated tests (module-load init). The `pnpm test` script already injects `sk_test_dummy`.
- **Homepage is SSR, not prerendered** — adding `export const prerender = true` to it will break dynamic content. Cache TTL is intentionally short (~5 min).
- **`docker-compose.yml` is aspirational.** Only the `payload` service builds against current code; `medusa` and `frontend` services reference paths/builds that don't exist or aren't current. The `postgres` service works for local Postgres if needed.
- **Backend must be running before frontend** — the SvelteKit build/dev expects Payload at `PAYLOAD_API_URL` (default `http://localhost:3000`).
- **Production checkout email is verified; other transactional emails are not** (see [docs/launch.md](docs/launch.md)). Don't claim end-to-end SES coverage without spot-checking.
- **Payload REST `select` uses bracket syntax** — `select[slug]=true&select[updatedAt]=true`. The comma form (`select=slug,updatedAt`) is silently ignored and returns id-only docs; this broke the production sitemap for months (fixed July 3, 2026).
- **Media collection has no `imageSizes`** — uploads store the raw original in R2, nothing auto-resizes (the "Cloudflare Images" fields in the Media schema are unwired). Pre-optimize images before upload until responsive sizes land. The homepage set was overwritten in R2 directly on July 3, 2026 (originals backed up outside the repo).
- **JSON-LD flows through `Meta.svelte`** — server loads build `seo.jsonLd`/`seo.breadcrumbsJsonLd` strings (via `ldScript` in `alkebu-web/src/lib/seo.ts`) and `Meta.svelte` injects them with `{@html}`. If a component rebuilds its own `metadata` object (like `BookDetailPage` does), it must forward those fields or the schema silently disappears.

## Reference Docs

- [docs/PRD.md](docs/PRD.md) — authoritative product spec with current status and phases
- [docs/architecture.md](docs/architecture.md) — system architecture (note: storage section says Cloudinary; reality is R2)
- [docs/launch.md](docs/launch.md) — current production readiness board
- [docs/development-guide.md](docs/development-guide.md) — full local setup walkthrough
- [docs/staff-workflows.md](docs/staff-workflows.md) — staff order processing reference
- [docs/cart-checkout.md](docs/cart-checkout.md), [docs/book-operations.md](docs/book-operations.md) — feature-specific
- [alkebu-load/SYSTEM_GUIDE.md](alkebu-load/SYSTEM_GUIDE.md) — backend deep-dive

## Svelte MCP Server

You have access to a Svelte MCP server with comprehensive Svelte 5 / SvelteKit documentation. Use it whenever you touch frontend code in `alkebu-web/`.

**Tools** (use in this order):
1. **`list-sections`** — call FIRST when working on Svelte topics. Returns titles, use_cases, paths.
2. **`get-documentation`** — fetch full content for sections identified above. Pull ALL relevant sections based on `use_cases`.
3. **`svelte-autofixer`** — MUST run on any Svelte code before sending to user. Loop until no issues remain.
4. **`playground-link`** — only after user confirmation, and NEVER if the code was written to project files.

## Technical Notes

- **DB**: SQLite locally, PostgreSQL in production
- **E-commerce performance**: Local API for cart ops (<50 ms), session-based guest carts
- **External book APIs**: graceful degradation when unavailable; quote-request fallback
- **Voice search / barcode**: browser-only (Web Speech API + camera)
- **Multi-location inventory**: supported via Square location sync (Main Store vs Warehouse)
- **Auto-categorization**: Books are auto-assigned to curated collections (Civil Rights, Pan-Africanism, etc.) based on metadata
