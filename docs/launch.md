# Launch and Operations Board

**Updated:** May 29, 2026  
**Storefront:** https://alkebulanimages.com  
**Payload/Admin:** https://payload.alkebulanimages.com  
**Health:** https://payload.alkebulanimages.com/api/health

Online ordering is live. The current work is production confidence: catalog quality, staff workflow verification, webhook confidence, and speed/security polish.

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
  - May 28 local verification: `pnpm run check:scripts`, `pnpm test`, and `pnpm run lint` exit 0; tests pass 74/74.
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
- [ ] Run Lighthouse/PageSpeed on /, /shop/books, one book detail page, /cart, and /checkout after the latest deploy.
  - Still needs a real Lighthouse/PageSpeed run after the next deploy. Public availability and header smoke checks passed, but those are not performance measurements.
- [x] Continue legacy CSS/asset cleanup until global template CSS can be removed safely.
  - May 29 local development: removed the unused Agrikol icon-font load from `alkebu-web/src/app.html`; pruned unreferenced legacy vendor CSS/JS and retired icon fonts from `alkebu-web/static/assets`; added `npm test` guard coverage for the app shell and retired assets.
  - May 29 local verification: `npm test`, `npm run lint`, `npm run check:svelte`, and `npm run build` exit 0. `svelte-check` still reports the existing 9 warnings.
  - The remaining global CSS is intentional for now: current routes still use Font Awesome plus template selectors such as `.page-header`, `.product`, and `.single-sidebar`.
- [ ] Audit all transactional emails: checkout confirmation, staff notification, shipping update, daily digest, contact form.
  - Still requires controlled checkout/admin/contact-form coverage plus inbox verification; no local-only code check can confirm delivery.
- [ ] Confirm SPF, DKIM, and DMARC for production sending domains.
  - Still requires DNS/sender access, especially the active DKIM selector for the production mail provider.

## P2 - UX and Content Polish

- [ ] Activate FlexSearch as a real cache tier, with bootstrap timing, index freshness, and memory footprint handled together.
- [ ] Implement real newsletter signup.
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
13. Refund the controlled payment and confirm records remain auditable.

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
