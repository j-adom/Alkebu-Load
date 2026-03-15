# Launch Checklist - Alkebulanimages 2.0

**Target:** Go live with online ordering
**Status:** Core build complete, checkout hardening + data import + deployment remaining

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

### Server (Hostinger VPS)

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
  PAYLOAD_PUBLIC_SERVER_URL=https://api.alkebulanimages.com
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
  ORDER_ADMIN_BASE_URL=https://api.alkebulanimages.com

  # Book APIs
  ISBNDB_API_KEY=<your-key>

  # Tax
  TENNESSEE_STATE_TAX_RATE=0.07
  NASHVILLE_LOCAL_TAX_RATE=0.025
  FREE_SHIPPING_THRESHOLD=7500
  ```

- [ ] **Register Stripe webhook endpoint**
  - Go to dashboard.stripe.com > Developers > Webhooks
  - Add endpoint: `https://api.alkebulanimages.com/api/stripe-webhook`
  - Events to subscribe:
    - `checkout.session.completed`
    - `payment_intent.succeeded`
    - `payment_intent.payment_failed`
  - Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

- [ ] **Register Square webhook endpoint**
  - Go to Square Developer Dashboard > Webhooks
  - Add endpoint: `https://api.alkebulanimages.com/api/webhooks/square-catalog`
  - Events: `inventory.count.updated`, `catalog.item.updated`

- [ ] **Set up automated backups**
  - Daily PostgreSQL dump
  - Media files backup to Cloudflare R2 or similar

### Frontend (Cloudflare Pages)

- [ ] **Connect repo to Cloudflare Pages**
  - Build command: `cd alkebu-web && npm run build`
  - Output directory: `alkebu-web/build`
  - Environment: `PUBLIC_SITE_URL=https://alkebulanimages.com`
  - Environment: `PAYLOAD_API_URL=https://api.alkebulanimages.com`

- [ ] **Configure custom domain**
  - Point `alkebulanimages.com` to Cloudflare Pages
  - Point `api.alkebulanimages.com` to Hostinger VPS

- [ ] **Verify SSL** on both domains

### DNS

- [ ] **A record**: `api.alkebulanimages.com` -> VPS IP
- [ ] **CNAME**: `alkebulanimages.com` -> Cloudflare Pages URL
- [ ] **MX records**: Email delivery for `@alkebulanimages.com`

---

## Phase D: Production Smoke Test (You)

- [ ] **Create admin user** at `api.alkebulanimages.com/admin`
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
