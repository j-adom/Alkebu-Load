# Launch and Operations Board

**Updated:** July 3, 2026  
**Storefront:** https://alkebulanimages.com  
**Payload/Admin:** https://payload.alkebulanimages.com  
**Health:** https://payload.alkebulanimages.com/api/health

Online ordering is live. The current work is production confidence: catalog quality, staff workflow verification, webhook confidence, and speed/security polish.

## July 3, 2026 — P0 Revenue & SEO Fixes (deployed and verified against production)

Branch `fix/p0-revenue-seo` merged to main. Business context: current goals are $5-10k/month
online sales, B2B inquiry capture (schools/nonprofits), community-driven repeat purchase,
and long-term data ownership independent of Square.

- [x] **Stripe webhook order loss fixed** — `checkout.session.completed` now throws on
  cart-not-found so Stripe retries delivery (was: silent 200 acknowledgment that
  permanently dropped a paid order with no alert). `src/app/utils/stripeHelpers.ts`.
- [x] **Hourly Stripe reconciliation cron** — new `recover-stripe-orders` job (hourly at :15)
  recreates any order the webhook missed and emails staff a "Missed Orders Recovered"
  alert (recovery deliberately skips customer emails — a human follows up). Skips sessions
  <30 min old; dismissed sessions stay excluded via their stub orders.
- [x] **Quote-request emails wired** — the customer-confirmation, staff-notification, and
  follow-up senders in `quoteRequestSystem.ts` were `console.log` stubs; B2B/quote
  inquiries created rows but notified no one. Now send via `emailService.sendRawEmail`.
- [x] **Sitemap restored (1 URL → ~5,032)** — Payload's REST API ignores comma select
  syntax (`select=slug,updatedAt` returns id-only docs); the missing `updatedAt` threw and
  the route served its 1-URL fallback. Now uses bracket syntax (`select[slug]=true`),
  tolerates missing dates, and the static list drops the 404ing `/returns`, `/terms`,
  `/shipping` in favor of real routes.
- [x] **robots.txt unshadowed** — removed `static/robots.txt`, which overrode the dynamic
  route on Cloudflare; live robots now has the sitemap pointer and cart/checkout/api disallows.
- [x] **JSON-LD structured data renders** — Product/Breadcrumb (and event/business) schema
  was computed server-side but never injected into the HTML. `Meta.svelte` now renders it;
  verified live on book pages (Product with price/availability/ISBN + BreadcrumbList).
- [x] **/login 500 removed** — orphan route (form action, no page component) deleted;
  now 404s. A route-integrity test fails if any route exports actions without a page.
- [x] **Homepage images optimized** — 7 R2 objects overwritten in place at their original
  keys (16.3 MB → 1.34 MB total; hero 3.2 MB → 305 KB) with 1-year Cache-Control headers.
  Originals backed up at `~/Coding/optimized-homepage-images/originals-backup/`. Media
  cache rule active on `media.alkebulanimages.com` (verified MISS → HIT). Note: the Media
  collection has no `imageSizes` — new uploads store raw originals; pre-optimize until
  responsive sizes/edge transforms land (P1).
- [x] **Search Console** — domain property was already verified (~3 months of data:
  2.83K clicks / 164K impressions / avg position 9.8; non-brand traffic is book-title
  queries). Sitemap submitted July 3; "Couldn't fetch" placeholder expected to flip to
  Success within ~48h.

**Monitoring cadence:** Sitemaps status (next day) → Pages indexed count weekly (baseline
11.4K indexed / 20.5K not; was ~14K before a June dip) → Search Appearance → Product
results (2-3 weeks, rich-results payoff) → staff inbox for recovery alerts.

**Known unmerged work:** `feat/staff-agent-mcp-foundation` holds email XSS hardening
(`a9c6074`, `d68b8f0`), web vitals for Rybbit (`9d366a9`), a docs refresh (`f12d364`,
`e023280`), and the dormant staff-agent MCP server. Merge soon — the email escaping fixes
belong in production.

## Source of Truth

Use this file for launch readiness, smoke tests, and near-term operational priorities. Historical Phase 1 setup notes have been folded into the development, deployment, cart/checkout, book operations, and staff workflow docs.

## P0 - Launch Blockers

- [x] **Deploy the latest backend hardening**
  - The local patch redacts /api/health, verifies Square catalog webhook signatures, and removes sensitive token-prefix logging.
  - May 29 public check: https://payload.alkebulanimages.com/api/health returns only status, timestamp, and database state.
  - Square webhook behavior still needs the dashboard-level sync verification below.

- [X] **Verify production environment values**
  - May 29 note: public checks confirm the Payload database is connected; private secrets remain operator-verified.
  - PAYLOAD_SECRET is set and non-empty.
  - PAYLOAD_PUBLIC_SERVER_URL=https://payload.alkebulanimages.com.
  - PAYLOAD_PUBLIC_SITE_URL=https://alkebulanimages.com.
  - DATABASE_URI points to production PostgreSQL, not local SQLite.
  - Stripe live keys and webhook secret are configured.
  - SQUARE_ACCESS_TOKEN and SQUARE_WEBHOOK_SIGNATURE_KEY are configured.
  - The Square catalog webhook notification URL exactly matches https://payload.alkebulanimages.com/api/webhooks/square-catalog.
  - SES SMTP credentials are valid.
  - Shippo credentials are present if live carrier rates are expected.

- [X] **Run a controlled production checkout smoke test**
  - Recorded complete. Rerun after payment, shipping, tax, or checkout deploy changes.
  - Add a known in-stock book to cart.
  - Preview shipping and Tennessee tax.
  - Complete Stripe checkout with a real controlled payment path.
  - Confirm success page, cart clearing, order record, payment status, line items, tax, shipping, customer email, and staff notification.
  - Process that order in /admin/order-dashboard, add tracking, mark shipped, and verify shipping email.

- [X] **Verify production catalog data**
  - Recorded complete. Recheck after bulk imports, enrichment runs, or Square sync changes.
  - Books have covers, authors, descriptions, prices, ISBNs, weights, and stock.
  - Apparel and other product categories have correct variants, images, prices, and stock.
  - Product statuses are published.
  - Out-of-stock and unavailable book behavior matches staff expectations.

- [X] **Verify staff workflow**
  - Recorded complete. Recheck after admin role, order dashboard, or fulfillment-email changes.
  - Staff accounts exist with the correct roles.
  - Staff can access https://payload.alkebulanimages.com/admin/order-dashboard.
  - Staff can move paid orders through processing, shipped, and delivered states.
  - Staff cannot access admin-only refund actions unless intended.

- [ ] **Verify Square inventory sync**
  - Blocked on Square Developer Dashboard/log access plus a controlled test item change.
  - Local webhook signature tests pass, but production sync still needs end-to-end confirmation.
  - Change one test item in Square.
  - Confirm webhook delivery succeeds in the Square Developer Dashboard.
  - Confirm Payload logs show the signed catalog webhook was received and processed.
  - Confirm Payload catalog/stock changes match the Square change.

## P1 - Speed, Security, Reliability

- [x] Backend production builds fail on type/lint errors.
  - May 28 local verification: `pnpm run build` exits 0 and runs Next compile, lint, and type checks; warnings remain non-blocking.
  - Local verification: `pnpm run check:scripts`, `pnpm test`, and `pnpm run lint` exit 0 (re-run `pnpm test` for the current pass count rather than trusting a snapshot).
- [x] Frontend production builds now run svelte-check before vite build.
  - May 28 local verification: `npm run build` exits 0 after `svelte-check` reports 0 errors and 9 warnings.
  - May 28 local verification: `npm run lint` exits 0.
- [x] Public health response removes email configuration details.
  - May 29 live check: `/api/health` returns only liveness-safe fields.
- [x] Square catalog webhook has a local patch for HMAC signature verification.
  - May 28 local verification: webhook signature unit tests cover valid, missing, mismatched, and configured URL cases.
- [x] Cart and checkout routes use private/no-store caching.
  - May 29 verification: code sets `Cache-Control: private, no-store`; live `/cart` and `/checkout` headers match.
- [x] Baseline security headers are present.
  - May 29 verification: storefront and Payload send HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- [x] Run Lighthouse/PageSpeed on the homepage.
  - July 3 PageSpeed (pre-image-fix): mobile Performance 70 / Accessibility 96 / Best
    Practices 100 / SEO 92; desktop Performance 80. Mobile LCP was 19.9s, caused entirely
    by unoptimized images (3.2 MB hero, ~16 MB homepage total) — fixed same day via R2
    overwrite + media cache rule. Rerun after a few days to capture the improved score;
    /shop/books, book detail, /cart, /checkout still unmeasured.
- [x] Continue legacy CSS/asset cleanup until global template CSS can be removed safely.
  - May 29 local development: removed the unused Agrikol icon-font load from `alkebu-web/src/app.html`; pruned unreferenced legacy vendor CSS/JS and retired icon fonts from `alkebu-web/static/assets`; added `npm test` guard coverage for the app shell and retired assets.
  - May 29 local verification: `npm test`, `npm run lint`, `npm run check:svelte`, and `npm run build` exit 0. `svelte-check` still reports the existing 9 warnings.
  - The remaining global CSS is intentional for now: current routes still use Font Awesome plus template selectors such as `.page-header`, `.product`, and `.single-sidebar`.
- [ ] Audit all transactional emails: checkout confirmation, staff notification, shipping update, refund notification, daily digest, contact form.
  - Still requires controlled checkout/admin/contact-form coverage plus inbox verification; no local-only code check can confirm delivery.
- [ ] Confirm SPF, DKIM, and DMARC for production sending domains.
  - Still requires DNS/sender access, especially the active DKIM selector for the production mail provider.

## P1.5 - Growth Engine (queued from the July 3 holistic review)

- [x] Crawlable pagination on /shop/books (July 3, `feat/p1.5-seo-growth`) — paginated
  pages are indexable with self-referencing `?p=N` canonicals and per-page titles; the
  real blocker was `noindex, nofollow` on pages ≥ 2, now `noindex, follow` where noIndex
  remains (genre/tag/author listings).
- [x] Canonical URL consolidation (July 3) — `/shop/books/<slug>` is canonical (matches
  the sitemap). Cards, related-books, and search results link slug-only;
  `/<slug>/<isbn>` pages still resolve but canonicalize to the slug URL. Note: the
  FlexSearch index stores book slugs as `slug/isbn`; the storefront normalizes on
  render — fix the index shape whenever search is next touched.
- [x] Book covers as og:image + Product JSON-LD image (July 3) — JSON-LD now reads the
  populated `images[0].image.url` Media shape; hosted covers preferred over scraped URLs.
- [x] Meta descriptions from synopsis (July 3) — the rich Lexical `description` object
  no longer shadows `synopsis` in the fallback chain; Lexical text is extracted as a
  last resort before the "Title by Author" fallback.
- [x] Fix blog post detail page (July 3) — `/blog/[slug]` loader added (published-only,
  404s drafts), template moved off Sanity-era fields (`body`→`content`,
  `mainImage`→`featuredImage`, `publishedAt`→`publishDate`), Article JSON-LD + meta head
  wired. NB: production has zero published posts — verified against a synthetic post.
- [ ] Media collection `imageSizes` (or Cloudflare edge transforms) + real responsive
  srcset so future uploads don't ship raw originals.
- [ ] B2B front door: /schools + /wholesale landing pages (June design work), link the
  homepage business-services cards (currently no hrefs), add inquiry-type selector to the
  contact form so B2B leads are tagged. ~~schedule `processQuoteFollowups`~~ — done
  July 3: `quote-followups` cron, daily 15:00 UTC.
- [x] Check Search Console → Pages → "Excluded by noindex" (3,591 pages) — checked July 7:
  they are storefront `/search?q=` internal-search URLs (legacy subject-heading queries,
  first detected 8/16/22), not payload.* URLs. Noindex on internal search is correct;
  no action. Sitemap status flipped to Success. Watch instead: "Duplicate, Google chose
  different canonical" (1,635 — should shrink from the July 7 canonical consolidation)
  and "Server error (5xx)" (734 — example URLs not yet investigated).
- [ ] Explore Google Merchant Center free listings once Product structured data is picked up.

## P2 - UX and Content Polish

- [ ] Activate FlexSearch as a real cache tier, with bootstrap timing, index freshness, and memory footprint handled together.
- [x] Implement real newsletter signup.
  - Footer form POSTs to `/api/newsletter`, which proxies to the listmonk instance with
    server-only credentials; 409 (already subscribed) treated as success. Working in production.
- [ ] Add related-product rendering for health-and-beauty and home-goods once those collections contain enough real products to verify the UI.
- [ ] Clean up home-goods taxonomy: decide whether oils/incense remains the backend home-goods collection or split art/imports/home decor into dedicated collections.
- [ ] Replace the placeholder return-policy banner.

## P3 - Post-Launch Enhancements

- [ ] Keep Square hosted checkout behind a feature flag until sandbox and production checkout are verified.
- [ ] Add Shippo label creation, tracking webhooks, and fulfillment automation when order volume justifies it.
- [ ] Improve search UI: filters, analytics display, typo-handling, barcode/voice search, author cards, and author bibliography pages.
- [ ] Finish blog/reviews/comments editorial workflows and moderation screens.
- [ ] Build the business directory growth workflow for collecting, verifying, and updating listings.

## Production Smoke Test

Run after every meaningful backend/frontend deploy:

1. Open https://alkebulanimages.com.
2. Search for a known in-stock book.
3. Open the book detail page and add it to cart.
4. Confirm cart drawer count and totals.
5. Enter a Tennessee shipping address and confirm tax/shipping preview.
6. Complete Stripe checkout.
7. Confirm redirect to success page.
8. Confirm cart is cleared.
9. In Payload admin, confirm order record, payment status, line items, tax, shipping, and customer email.
10. Confirm customer and staff emails arrived.
11. Process order in /admin/order-dashboard.
12. Add tracking and confirm shipping email.
13. Issue a per-item refund from the Order Dashboard RefundPanel; confirm the Stripe refund, the per-line refund records on the order, and the customer refund email.

## Public Smoke Test

For a safe unauthenticated check:

~~~bash
curl -I https://alkebulanimages.com/
curl -I https://alkebulanimages.com/shop
curl -I https://alkebulanimages.com/cart
curl -I https://alkebulanimages.com/checkout
curl -s https://payload.alkebulanimages.com/api/health
curl -I https://payload.alkebulanimages.com/admin
~~~

Public smoke verifies availability only. It does not replace a real checkout, admin, email, or webhook test.

## Related Docs

- [Development Guide](development-guide.md)
- [Deployment Guide](deployment.md)
- [Cart and Checkout](cart-checkout.md)
- [Book Operations](book-operations.md)
- [Staff Workflows](staff-workflows.md)
- [Architecture](architecture.md)
