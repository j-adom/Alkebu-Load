# Staff Workflows

**Updated:** May 28, 2026  
**Payload admin:** https://payload.alkebulanimages.com/admin  
**Order dashboard:** https://payload.alkebulanimages.com/admin/order-dashboard

## Online Order Workflow

~~~text
Customer places order on alkebulanimages.com
  -> Stripe processes payment
  -> Stripe webhook updates Payload
  -> Order status becomes paid
  -> Staff notification email sends
  -> Staff opens Order Dashboard
  -> Staff starts processing
  -> Staff pulls and packs items
  -> Staff buys label/tracking externally if needed
  -> Staff adds carrier/tracking and marks shipped
  -> Customer receives shipping email
  -> Staff marks delivered when tracking confirms delivery
~~~

## Order Statuses

| Status | Meaning | Staff Action |
|---|---|---|
| paid | Payment received; order needs attention | Start processing |
| processing | Staff is pulling/packing items | Add tracking and mark shipped |
| shipped | Package handed to carrier | Monitor tracking |
| delivered | Carrier/customer confirms delivery | No action unless support issue |
| cancelled | Order cancelled | Admin review |
| returned | Return/refund workflow completed | Admin review |

## Daily Digest Workflow

A scheduled job sends a daily order digest. Staff should use it to prioritize stale orders first, then open the dashboard and process paid/processing orders.

Digest should include:

- Outstanding order count.
- Revenue pending fulfillment.
- Aging/stale order warnings.
- Links to the order dashboard.

## Shipping Workflow

1. Open the order in the order dashboard.
2. Confirm items, shipping address, and requested shipping method.
3. Purchase/print label through the current shipping tool if label automation is not active.
4. Copy tracking number.
5. In Payload, select carrier and paste tracking.
6. Mark shipped.
7. Confirm the customer shipping email was sent.

## Refund Workflow

Phase 1 operational path:

1. Customer requests refund by phone/email.
2. Admin reviews request.
3. Admin performs refund in Stripe Dashboard for strongest audit trail.
4. Stripe webhook updates Payload refund/payment state.
5. Admin verifies the order remains auditable.

The backend also has refund API support for admin users. Use direct Stripe Dashboard refunds until staff are trained on any in-admin refund tooling.

## Adding New Books

For books with ISBNs:

~~~bash
cd alkebu-load
ISBNDB_API_KEY=$ISBNDB_API_KEY pnpm tsx scripts/bulk-isbn-import.ts   --category literature-fiction   --collection new-arrivals
~~~

Then review in Payload admin:

- Title and author.
- Cover image.
- Description/synopsis.
- Retail price.
- Stock quantity.
- Weight/shipping data.
- Product status.

For books without ISBNs, create the book manually in Payload admin and fill storefront-critical fields before publishing.

See [Book Operations](book-operations.md) for the full import and enrichment workflow.

## Business Directory Updates

1. Open Payload Admin -> Businesses.
2. Create or edit the business.
3. Fill required fields: name, description, address, phone/email/website, hours, category, and directory visibility fields.
4. Add logo/photo via Media.
5. Save and verify the listing on the storefront directory page.

## End-to-End Local Test

~~~bash
cd alkebu-load && pnpm dev
cd alkebu-web && npm run dev
stripe listen --forward-to localhost:3000/api/stripe-webhook
~~~

Happy path:

- [ ] Browse /shop.
- [ ] Open product detail.
- [ ] Add to cart.
- [ ] Update quantity.
- [ ] Open /checkout.
- [ ] Enter Tennessee address and confirm tax/shipping.
- [ ] Complete Stripe test payment with 4242 4242 4242 4242.
- [ ] Confirm /checkout/success shows order number.
- [ ] Confirm cart is empty.
- [ ] Confirm order appears in Payload.
- [ ] Confirm order appears in order dashboard.
- [ ] Move order through processing, shipped, and delivered.

Cancel/error paths:

- [ ] Stripe cancel redirects to /checkout/cancel and preserves cart.
- [ ] Empty cart checkout is blocked.
- [ ] Invalid email/address is rejected.
- [ ] Stripe decline card is handled cleanly.

## Access Points

| Tool | URL | Who |
|---|---|---|
| Storefront | https://alkebulanimages.com | Everyone |
| Payload Admin | https://payload.alkebulanimages.com/admin | Admin, staff |
| Order Dashboard | https://payload.alkebulanimages.com/admin/order-dashboard | Admin, staff |
| Stripe Dashboard | https://dashboard.stripe.com | Admin |
| Square Dashboard | https://squareup.com/dashboard | Admin/inventory owner |

## Roles

| Role | Can Do | Cannot Do |
|---|---|---|
| admin | Everything, refunds, user management | N/A |
| staff | View/process orders, update inventory, view refund status, manage directory | Admin-only refunds and user deletion |
| Customer records | Stored in customers; shoppers do not receive Payload admin access | N/A |
