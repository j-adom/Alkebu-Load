# Launch Checklist - Alkebulanimages 2.0

**Target:** Go live with online ordering  
**Updated:** April 28, 2026  
**Current backend:** `https://payload.alkebulanimages.com`  
**Current storefront:** `https://alkebulanimages.com`  
**Status:** Core commerce build is close; remaining work is production verification, data quality, email/webhook confidence, and final speed/security checks.

---

## Current Priority Board

### P0 - Launch Blockers

- [ ] **Verify production environment variables on `payload.alkebulanimages.com`**
  - `PAYLOAD_SECRET` is set and non-empty.
  - `PAYLOAD_PUBLIC_SERVER_URL=https://payload.alkebulanimages.com`
  - `PAYLOAD_PUBLIC_SITE_URL=https://alkebulanimages.com`
  - `DATABASE_URI` points to production PostgreSQL, not local SQLite.
  - Stripe live keys and webhook secret are configured.
  - Square production token and webhook signature key are configured.
  - SES SMTP credentials are valid.
  - Shippo/live shipping credentials are present if live carrier rates are expected.

- [ ] **Fix/verify email credentials**
  - Local backend build currently logs `535 Authentication Credentials Invalid` while verifying Nodemailer.
  - Confirm production SES SMTP username/password work.
  - Verify SPF, DKIM, and DMARC records for `alkebulanimages.com`.
  - Send controlled production test emails for contact, customer order confirmation, staff notification, shipping update, and daily digest.

- [ ] **Register and verify Stripe production webhook**
  - Endpoint: `https://payload.alkebulanimages.com/api/stripe-webhook`
  - Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
  - Confirm webhook signature validation succeeds.
  - Confirm paid orders are created once and carts are cleared after success.

- [ ] **Run end-to-end production checkout smoke test**
  - Add book to cart.
  - Preview shipping/tax.
  - Complete Stripe checkout with a real controlled payment path.
  - Confirm success page, order record, inventory adjustment, customer email, staff email, and dashboard visibility.
  - Refund the test order in Stripe and confirm order/refund state.

- [ ] **Verify production catalog data**
  - Books have cover images, authors, descriptions, prices, ISBNs, weights, and stock.
  - Apparel/other product categories have correct variants, images, prices, and stock.
  - Product statuses are `published`.
  - Out-of-stock and unavailable book behavior matches staff expectations.

- [ ] **Verify staff order workflow**
  - Staff accounts exist with correct roles.
  - Staff can access `/admin/order-dashboard`.
  - Staff can process: start processing -> add tracking -> mark shipped -> mark delivered.
  - Staff cannot access admin-only refund actions unless intended.

- [ ] **Verify Square inventory sync**
  - Endpoint: `https://payload.alkebulanimages.com/api/webhooks/square-catalog`
  - Events: `inventory.count.updated`, `catalog.item.updated`
  - Change a test item in Square and confirm Payload stock/catalog updates.

### P1 - Speed, Security, and Reliability

- [x] **Remove globally loaded legacy JavaScript**
  - Removed jQuery, TweenMax, theme scripts, and old popup markup from the Svelte app shell.

- [x] **Make Payload images SSR-friendly**
  - `PayloadImage` now renders server-side and does not hide images until hydration.

- [x] **Add baseline security headers**
  - Storefront and backend now set HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.

- [x] **Disable backend powered-by disclosure**
  - Next `poweredByHeader` is disabled for the backend.

- [x] **Protect against missing production Payload secret**
  - Production now fails fast if `PAYLOAD_SECRET` is missing.

- [x] **Harden contact form basics**
  - Added honeypot, field length caps, and simple per-IP rate limiting.

- [ ] **Run Lighthouse/PageSpeed after deploy**
  - Test mobile and desktop for `/`, `/shop/books`, one book detail page, `/cart`, and `/checkout`.
  - Track Performance, Accessibility, Best Practices, SEO, LCP, CLS, TBT/INP, and transfer size.
  - PageSpeed API was quota-blocked during local review; run via browser/CLI/API key after deploy.

- [ ] **Continue CSS/asset cleanup**
  - Legacy CSS is still globally loaded because live pages depend on classes from it.
  - Next step: identify pages still using old template classes and move needed styles into component-scoped or app CSS.
  - Goal: remove `/assets/css/style.css`, `/assets/css/responsive.css`, and unused Font Awesome where lucide icons already replaced it.

- [ ] **Review cache policy**
  - Static pages: 24h edge cache is fine.
  - Homepage and catalog pages: confirm cache freshness matches inventory needs.
  - Cart, checkout, auth, and admin paths must stay no-store/private.

- [ ] **Add stronger contact abuse protection**
  - Simple in-memory rate limiting is useful but not enough for multi-instance production.
  - Add Cloudflare Turnstile or Cloudflare WAF/rate limiting for `/contact` and `/api/contact`.

- [ ] **Make production build fail on backend type/lint errors**
  - `next.config.mjs` still has `ignoreDuringBuilds` and `ignoreBuildErrors`.
  - Keep them only if CI separately blocks bad builds.

### P2 - UX and Content Polish

- [ ] **Replace old homepage demo/blog sections**
  - Homepage still contains legacy static/demo-looking content and old template classes.
  - Use real Payload content, featured books, events, directory highlights, and store calls to action.

- [ ] **Implement real newsletter signup**
  - Source TODO: `alkebu-web/src/lib/components/Footer.svelte`
  - Decide provider: Listmonk, Mailchimp, or simple staff notification capture.

- [ ] **Render rich event content**
  - Source TODO: `alkebu-web/src/routes/events/[slug]/+page.svelte`
  - Use existing `LexicalRenderer` if event content comes from Payload Lexical rich text.

- [ ] **Add related products where server data exists**
  - Source TODOs: health-and-beauty and home-goods detail pages.
  - Reuse the existing related grid pattern from books/apparel.

- [ ] **Clean up home goods taxonomy**
  - Source TODOs note that art, imports, and home decor need dedicated collections or a clear mapping.
  - Decide whether `OilsIncense` remains the backend home-goods collection or whether separate Payload collections are needed.

- [ ] **Replace placeholder return-policy banner**
  - Source TODO: `alkebu-web/src/routes/return-policy/+page.svelte`
  - Pull a global/settings media image or remove the placeholder expectation.

- [ ] **Review old header component**
  - Source TODO: `alkebu-web/src/lib/header/Header.svelte`
  - Confirm whether this component is still used. Delete if obsolete.

### P3 - Post-Launch Enhancements

- [ ] **Square hosted checkout validation**
  - Stripe is the launch path. Keep Square hosted checkout behind a feature flag until sandbox and production checkout are verified.

- [ ] **Shippo operational automation**
  - Checkout rating can launch if verified.
  - Label creation, tracking webhooks, and fulfillment routing can wait until order volume justifies it.

- [ ] **Advanced search UI**
  - Backend search plumbing exists. Improve filters, analytics display, typo handling UI, barcode/voice search, and external discovery flows after launch.

- [ ] **Blog/reviews/comments workflows**
  - Backend collections exist. Finish editor workflow, moderation screens, spam controls, and frontend display after commerce launch.

- [ ] **Business directory growth workflow**
  - Add staff process for collecting, verifying, and updating listings.

### Production Smoke Test Script

Run this once the latest frontend and backend are deployed:

1. Open `https://alkebulanimages.com`.
2. Search for a known in-stock book.
3. Open the book detail page and add it to cart.
4. Confirm cart drawer count/totals.
5. Enter a Tennessee shipping address and confirm tax/shipping preview.
6. Complete Stripe checkout.
7. Confirm redirect to success page.
8. Confirm cart is cleared.
9. In Payload admin, confirm order record, payment status, line items, tax, shipping, and customer email.
10. Confirm customer and staff emails arrived.
11. Process order in `/admin/order-dashboard`.
12. Add tracking and confirm shipping email.
13. Refund the test payment and confirm records remain auditable.

---

## Historical Launch Checklist

The older checklist below is kept for reference. Prefer the priority board above when deciding what to do next.

---

## Phase A: Data Preparation (You)

- [ ] **Export product catalog from Square Dashboard**
  - Export books as CSV (square-books.csv)
  - Export apparel as CSV (square-apparel.csv)
  - Save to `alkebu-load/data/`

- [ ] **Run book import**
  ```bash
  cd alkebu-load
  pnpm tsx scripts/import-books.ts
  ```

- [ ] **Run book enrichment** (auto-populates authors, descriptions, cover images)
  ```bash
  ISBNDB_API_KEY=your-key pnpm tsx scripts/enrich-books-batch-fast.ts
  ```

- [ ] **Run apparel import**
  ```bash
  pnpm tsx scripts/import-apparel.ts
  ```

- [ ] **Verify in Payload admin** (localhost:3000/admin)
  - Books have images, descriptions, authors
  - Prices are correct
  - Stock quantities are accurate
  - Product statuses are "published"

---

## Phase B: Local End-to-End Testing (You + Claude)

- [ ] **Set up Stripe test mode**
  - Get test keys from dashboard.stripe.com (Developers > API keys)
  - Set `STRIPE_SECRET_KEY=sk_test_...` in `.env`
  - Set `STRIPE_WEBHOOK_SECRET` from Stripe CLI

- [ ] **Run Stripe webhook listener locally**
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe-webhook
  ```

- [ ] **Test full checkout flow** (see [STAFF-WORKFLOWS.md](STAFF-WORKFLOWS.md#6-end-to-end-test-checklist) for full checklist)
  - Add to cart -> checkout -> Stripe test card (4242...) -> success page
  - Verify: order in admin, staff email sent, dashboard shows order

- [ ] **Test Order Dashboard workflow**
  - Start Processing -> Add tracking -> Mark Shipped -> Mark Delivered
  - Verify customer email notifications at each step

- [ ] **Test mobile responsive** on phone/tablet
  - Cart drawer, checkout form, order dashboard all functional

---

## Phase C: Production Environment Setup (You)

### Server (historical VPS notes)

- [ ] **SSH into VPS** and verify Docker is running
- [ ] **Set up Docker container** for Payload CMS
  - PostgreSQL database container
  - Payload/Next.js application container
  - Nginx reverse proxy with SSL

- [ ] **Configure production environment variables**
  ```env
  # Core
  DATABASE_URI=postgresql://user:pass@localhost:5432/alkebulanimages
  PAYLOAD_SECRET=<generate-32-char-secret>
  PAYLOAD_PUBLIC_SERVER_URL=https://payload.alkebulanimages.com
  PAYLOAD_PUBLIC_SITE_URL=https://alkebulanimages.com
  NODE_ENV=production

  # Stripe (LIVE keys - switch from test!)
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_PUBLISHABLE_KEY=pk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_live_...

  # Square
  SQUARE_ACCESS_TOKEN=<production-token>
  SQUARE_WEBHOOK_SIGNATURE_KEY=<production-key>

  # Email
  FROM_EMAIL=orders@alkebulanimages.com
  FROM_NAME=Alkebu-Lan Images
  SES_SMTP_USER=<production-ses-smtp-user>
  SES_SMTP_PASSWORD=<production-ses-smtp-password>
  SMTP_HOST=email-smtp.us-east-2.amazonaws.com
  SMTP_PORT=587
  STAFF_NOTIFICATION_EMAIL=info@alkebulanimages.com
  ORDER_ADMIN_BASE_URL=https://payload.alkebulanimages.com

  # Book APIs
  ISBNDB_API_KEY=<your-key>

  # Tax
  TENNESSEE_STATE_TAX_RATE=0.07
  NASHVILLE_LOCAL_TAX_RATE=0.025
  FREE_SHIPPING_THRESHOLD=7500
  ```

- [ ] **Register Stripe webhook endpoint**
  - Go to dashboard.stripe.com > Developers > Webhooks
  - Add endpoint: `https://payload.alkebulanimages.com/api/stripe-webhook`
  - Events to subscribe:
    - `checkout.session.completed`
    - `payment_intent.succeeded`
    - `payment_intent.payment_failed`
  - Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

- [ ] **Register Square webhook endpoint**
  - Go to Square Developer Dashboard > Webhooks
  - Add endpoint: `https://payload.alkebulanimages.com/api/webhooks/square-catalog`
  - Events: `inventory.count.updated`, `catalog.item.updated`

- [ ] **Set up automated backups**
  - Daily PostgreSQL dump
  - Media files backup to Cloudflare R2 or similar

### Frontend (Cloudflare Pages)

- [ ] **Connect repo to Cloudflare Pages**
  - Build command: `cd alkebu-web && npm run build`
  - Output directory: `alkebu-web/build`
  - Environment: `PUBLIC_SITE_URL=https://alkebulanimages.com`
  - Environment: `PAYLOAD_API_URL=https://payload.alkebulanimages.com`

- [ ] **Configure custom domain**
  - Point `alkebulanimages.com` to Cloudflare Pages
  - Point `payload.alkebulanimages.com` to the backend host

- [ ] **Verify SSL** on both domains

### DNS

- [ ] **Backend DNS**: `payload.alkebulanimages.com` -> backend host
- [ ] **CNAME**: `alkebulanimages.com` -> Cloudflare Pages URL
- [ ] **MX records**: Email delivery for `@alkebulanimages.com`

---

## Phase D: Production Smoke Test (You)

- [ ] **Create admin user** at `payload.alkebulanimages.com/admin`
- [ ] **Create staff user** with role "staff"
- [ ] **Import production data** (books, apparel) into production database
- [ ] **Place test order** with Stripe live test card
  - Use a real email you control
  - Verify order confirmation email arrives
  - Verify staff notification email arrives
  - Process order through dashboard
  - Verify shipping notification email
- [ ] **Refund test order** via Stripe Dashboard
- [ ] **Check daily digest** (wait for 7 AM CT or trigger manually)
- [ ] **Verify Square inventory sync** (update stock in Square POS, check Payload)

---

## Phase E: Email Configuration (You)

- [ ] **Verify SMTP sender configuration**
  - Confirm SES SMTP credentials are valid in production
  - SPF, DKIM, and DMARC records for deliverability
  - Verify sending works from `orders@alkebulanimages.com`

- [ ] **Test all email templates**
  - Order confirmation (customer)
  - Staff notification
  - Shipping status update (customer)
  - Daily digest

---

## Phase F: Staff Training (You)

- [ ] **Print/share [STAFF-WORKFLOWS.md](STAFF-WORKFLOWS.md)** with staff

- [ ] **Demo session (30 min)** covering:
  1. How to access Order Dashboard (`/admin/order-dashboard`)
  2. What the daily digest email looks like
  3. Walk through processing an order end-to-end:
     - See notification -> Open dashboard -> Start Processing
     - Open Pirate Ship -> Create label -> Copy tracking number
     - Back to dashboard -> Enter tracking -> Mark Shipped
     - Mark Delivered when tracking confirms
  4. How to add new books via admin (manual or bulk ISBN import)
  5. How to update business directory listings
  6. When to escalate (refunds go to senior management)

- [ ] **Create staff Payload accounts** (role: staff)
  - Each staff member gets their own login
  - Verify they can access Order Dashboard
  - Verify they CANNOT access refund API

- [ ] **Set up Pirate Ship accounts** for staff who will ship orders
  - Bookmark pirateship.com on store tablet
  - Test creating a label with a dummy address

---

## Phase G: Go Live

- [ ] **Switch Stripe from test to live keys**
- [ ] **Deploy production frontend to Cloudflare Pages**
- [ ] **Announce on social media / email list**
- [ ] **Monitor for first 48 hours**
  - Watch daily digest for stuck orders
  - Check Stripe Dashboard for payment issues
  - Watch error logs: `docker logs <container> --follow`

---

## Post-Launch Monitoring

### Daily (first 2 weeks)
- [ ] Check daily digest email - any stale orders?
- [ ] Check Stripe Dashboard - any failed payments?
- [ ] Monitor error logs for API failures

### Weekly
- [ ] Review order volume and revenue in Stripe
- [ ] Check Square inventory sync is working
- [ ] Review search analytics (what are customers searching for?)

### Monthly
- [ ] Review shipping costs vs revenue
- [ ] Evaluate Shippo label automation (if order volume > 20/week)
- [ ] Add new books to catalog
- [ ] Update business directory listings
