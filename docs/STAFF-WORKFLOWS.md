# Staff Workflows & Training Guide

**Last Updated:** February 11, 2026

---

## 1. New Online Order Workflow

```
  CUSTOMER PLACES ORDER (alkebulanimages.com)
              |
              v
  +---------------------------+
  | Stripe processes payment  |
  +---------------------------+
              |
              v
  +---------------------------+     +---------------------------+
  | Order created in Payload  | --> | Staff notification email  |
  | Status: PAID              |     | sent to info@alkebu...    |
  +---------------------------+     +---------------------------+
              |
              v
  +----------------------------------------------+
  | Staff opens Order Dashboard                  |
  | /admin/order-dashboard                       |
  | "Needs Attention" tab shows new order        |
  +----------------------------------------------+
              |
              v
  +----------------------------------------------+
  | Staff clicks "Start Processing"              |
  | Status changes: PAID --> PROCESSING          |
  | Pull items from shelves                      |
  +----------------------------------------------+
              |
              v
  +----------------------------------------------+
  | Staff opens Pirate Ship                      |
  | (pirateship.com - separate login)            |
  |                                              |
  | 1. Enter ship-to address from dashboard      |
  | 2. Enter package weight                      |
  | 3. Select service (USPS Priority, etc.)      |
  | 4. Buy & print shipping label                |
  | 5. Copy tracking number                      |
  +----------------------------------------------+
              |
              v
  +----------------------------------------------+
  | Back in Order Dashboard:                     |
  | 1. Expand the order                          |
  | 2. Select carrier: "USPS (Pirate Ship)"     |
  | 3. Paste tracking number                     |
  | 4. Click "Mark Shipped"                      |
  |                                              |
  | Status changes: PROCESSING --> SHIPPED       |
  | Customer receives shipping email with track# |
  +----------------------------------------------+
              |
              v
  +----------------------------------------------+
  | When tracking shows delivered:               |
  | Click "Mark Delivered"                       |
  | Status changes: SHIPPED --> DELIVERED        |
  +----------------------------------------------+
```

### Quick Reference - Order Statuses

| Status | Meaning | Who sees it |
|--------|---------|-------------|
| **paid** | Payment received, needs attention | Dashboard "Needs Attention" tab |
| **processing** | Staff is pulling/packing items | Dashboard "Needs Attention" tab |
| **shipped** | Label created, package handed to carrier | Dashboard "Shipped" tab |
| **delivered** | Package confirmed delivered | Dashboard "Shipped" tab |
| **returned** | Full refund processed | Admin only |

---

## 2. Daily Digest Workflow

```
  EVERY MORNING AT 7:00 AM CT
              |
              v
  +------------------------------------------+
  | System sends Daily Digest email           |
  | To: info@alkebulanimages.com              |
  |                                           |
  | Contains:                                 |
  | - Count of outstanding orders             |
  | - Total revenue pending fulfillment       |
  | - Order list with aging (hours since paid)|
  | - STALE warnings for orders > 24 hours    |
  | - Link to Order Dashboard                 |
  +------------------------------------------+
              |
              v
  +------------------------------------------+
  | Staff reviews digest at start of day      |
  | Prioritizes stale orders first            |
  | Opens dashboard to process                |
  +------------------------------------------+
```

---

## 3. Refund Workflow (Phase 1)

```
  CUSTOMER REQUESTS REFUND
  (email/phone to info@alkebulanimages.com)
              |
              v
  +------------------------------------------+
  | Senior management (admin role) reviews    |
  | Decides: approve or deny                  |
  +------------------------------------------+
              |
        [APPROVED]
              |
              v
  +------------------------------------------+
  | Admin logs into Stripe Dashboard          |
  | (dashboard.stripe.com)                    |
  |                                           |
  | 1. Find payment by order number           |
  | 2. Click "Refund"                         |
  | 3. Enter amount (full or partial)         |
  | 4. Add reason                             |
  | 5. Confirm refund                         |
  +------------------------------------------+
              |
              v
  +------------------------------------------+
  | Stripe webhook updates Payload:           |
  | - Payment status --> refunded             |
  | - Refund recorded on order                |
  | - Customer notified by Stripe             |
  +------------------------------------------+
```

**Note:** The Payload API at `/api/refund` also supports programmatic refunds for admin users. Phase 1 recommends using Stripe Dashboard directly for simplicity and audit trail.

---

## 4. Adding New Books (Staff)

```
  NEW BOOKS ARRIVE IN STORE
              |
       +------+------+
       |             |
   [WITH ISBN]   [WITHOUT ISBN]
       |             |
       v             v
  +-----------+  +-------------------+
  | Add ISBN  |  | Create manually   |
  | to isbn-  |  | in Payload admin  |
  | list.txt  |  | /admin/books      |
  +-----------+  +-------------------+
       |
       v
  +------------------------------------------+
  | Run bulk import:                          |
  | cd alkebu-load                            |
  | ISBNDB_API_KEY=$KEY \                     |
  |   pnpm tsx scripts/bulk-isbn-import.ts \  |
  |   --category literature-fiction \         |
  |   --collection new-arrivals              |
  |                                           |
  | Auto-fetches: title, author, description, |
  | cover image, publisher, page count        |
  +------------------------------------------+
       |
       v
  +------------------------------------------+
  | Review in admin:                          |
  | - Set retail price                        |
  | - Verify cover image                      |
  | - Set stock quantity                      |
  | - Publish (status: published)             |
  +------------------------------------------+
```

### Manual Enrichment (Single Book)

```
  In Payload Admin --> Collections --> Books --> [select book]
              |
              v
  Click "Refresh from ISBNdb/Google Books" button at top
              |
              v
  Empty fields auto-populated from ISBNdb/Google Books
  (never overwrites existing data)
```

---

## 5. Business Directory Updates

```
  NEW BUSINESS TO ADD
              |
              v
  +------------------------------------------+
  | Open Payload Admin                        |
  | /admin/collections/businesses             |
  | Click "Create New"                        |
  +------------------------------------------+
              |
              v
  +------------------------------------------+
  | Fill in required fields:                  |
  | - Business name                           |
  | - Description                             |
  | - Address, phone, email                   |
  | - Hours of operation                      |
  | - Category (restaurant, retail, etc.)     |
  | - Business type: "directory-listing"      |
  | - Directory category: "black-owned", etc. |
  | - Set "In Directory" = true               |
  +------------------------------------------+
              |
              v
  +------------------------------------------+
  | Add logo/photo via Media collection       |
  | Save & publish                            |
  | Appears on website directory page         |
  +------------------------------------------+
```

---

## 6. End-to-End Test Checklist

Run this before going live:

```
TEST ENVIRONMENT SETUP:
  1. Start backend:  cd alkebu-load && pnpm dev
  2. Start frontend: cd alkebu-web && npm run dev
  3. Start Stripe listener: stripe listen --forward-to localhost:3000/api/stripe-webhook

HAPPY PATH TEST:
  [ ] Browse /shop --> products display
  [ ] Click product --> detail page loads
  [ ] Add to cart --> cart drawer opens
  [ ] Update quantity --> total updates
  [ ] Go to /checkout --> form displays
  [ ] Enter address --> tax/shipping calculate live
  [ ] Tennessee address --> tax shows (books exempt)
  [ ] Out-of-state --> $0 tax
  [ ] Click "Continue to Payment"
  [ ] Stripe checkout loads
  [ ] Use test card: 4242 4242 4242 4242, any future date, any CVC
  [ ] Payment succeeds --> /checkout/success shows order number
  [ ] Cart is empty after success
  [ ] Order appears in Payload admin (/admin/collections/orders)
  [ ] Staff notification email received at info@...
  [ ] Order appears in Order Dashboard (/admin/order-dashboard)
  [ ] Click "Start Processing" --> status updates
  [ ] Enter tracking + carrier --> "Mark Shipped" works
  [ ] Click "Mark Delivered" --> status updates

CANCEL PATH TEST:
  [ ] Start checkout --> click Stripe's back/cancel
  [ ] Redirected to /checkout/cancel
  [ ] Cart items still preserved
  [ ] Can retry checkout

EDGE CASES:
  [ ] Empty cart --> /checkout shows "Your cart is empty"
  [ ] Invalid email --> validation prevents submit
  [ ] Stripe test decline card (4000000000000002) --> error handled
```

---

## Access Points

| Tool | URL | Who |
|------|-----|-----|
| **Frontend** | alkebulanimages.com | Everyone |
| **Payload Admin** | alkebulanimages.com/admin | Admin, Staff |
| **Order Dashboard** | alkebulanimages.com/admin/order-dashboard | Admin, Staff |
| **Stripe Dashboard** | dashboard.stripe.com | Admin only |
| **Pirate Ship** | pirateship.com | Staff (shipping) |
| **Square Dashboard** | squareup.com/dashboard | Admin (inventory) |

---

## User Roles

| Role | Can do | Cannot do |
|------|--------|-----------|
| **admin** | Everything, refunds, user management | - |
| **staff** | View/process orders, update inventory, view refund status, manage directory | Process refunds, delete users |
| **customer** | Browse, buy, view own orders | Access admin |
