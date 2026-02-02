# Phase 1: MVP Launch - Complete Implementation Guide

**Status:** ✅ Ready to start Phase 1  
**Target:** 2-3 weeks to MVP launch  
**Updated:** January 25, 2026

## What's Done ✅
- ✅ Cart drawer modal (Snipcart-style)
- ✅ Checkout form with address collection
- ✅ Stripe integration skeleton
- ✅ Tax calculation logic
- ✅ Square inventory sync ready

## What's Next 🚀
- 🔲 Import books from Square
- 🔲 Import apparel from Square
- 🔲 Upload product images
- 🔲 End-to-end checkout testing
- 🔲 Mobile responsiveness verification
- 🔲 Production deployment

---

## 1. Environment Configuration

### Backend Setup (alkebu-load/)

Create or update `.env` file with:

```env
# Database (use SQLite for local dev, PostgreSQL for production)
DATABASE_URI=file:./alkebulanimages.db
PAYLOAD_SECRET=your-secret-key-here-32-characters-minimum
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Square Integration (for inventory sync)
SQUARE_ACCESS_TOKEN=your-square-access-token
SQUARE_APPLICATION_ID=your-square-application-id
SQUARE_WEBHOOK_SIGNATURE_KEY=your-square-webhook-signature-key

# Email
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=orders@alkebulanimages.com
FROM_NAME=Alkebu-Lan Images

# External Book APIs
ISBNDB_API_KEY=your-isbndb-api-key
GOOGLE_BOOKS_API_KEY=your-google-books-api-key

# Tax Configuration
TENNESSEE_STATE_TAX_RATE=0.07
NASHVILLE_LOCAL_TAX_RATE=0.025
DEFAULT_LOCAL_TAX_RATE=0.02

# Shipping
SHIPPING_ORIGIN_ZIP=37203
SHIPPING_ORIGIN_STATE=TN
FREE_SHIPPING_THRESHOLD=7500
```

### Frontend Setup (alkebu-web/)

Create or update `.env.local`:

```env
PUBLIC_SITE_URL=http://localhost:5173
PUBLIC_ASSET_BASE=/
PUBLIC_SITE_NAME=Alkebulan Images

PAYLOAD_API_URL=http://localhost:3000
PAYLOAD_API_KEY=your-payload-api-key-here
```

---

## 2. Getting Stripe Test Keys

### Step 1: Create Stripe Account
1. Go to https://dashboard.stripe.com/register
2. Sign up and verify email
3. Create your account

### Step 2: Find Your Test Keys
1. Dashboard → Developers → API Keys
2. Copy **Publishable Key** (starts with `pk_test_`)
3. Copy **Secret Key** (starts with `sk_test_`)

### Step 3: Create Webhook Endpoint
1. Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `http://localhost:3000/api/stripe-webhook` (local) or production URL
4. Events to listen: `charge.succeeded`, `charge.failed`, `payment_intent.succeeded`
5. Copy Signing Secret (starts with `whsec_`)

### Step 4: Test Cards
Use these test card numbers in Stripe checkout:

| Card Type | Number | Exp | CVC |
|-----------|--------|-----|-----|
| Visa | 4242 4242 4242 4242 | 12/26 | 123 |
| Visa (declined) | 4000 0000 0000 0002 | 12/26 | 123 |
| Amex | 3782 822463 10005 | 12/26 | 1234 |

---

## 3. Local Development Testing

### Start Backend
```bash
cd alkebu-load
pnpm install
pnpm dev
# Runs on http://localhost:3000
```

### Start Frontend
```bash
cd alkebu-web
pnpm install
pnpm dev
# Runs on http://localhost:5173
```

### Test Checkout Flow
1. Navigate to http://localhost:5173
2. Add products to cart
3. Click cart icon → "Proceed to Checkout"
4. Fill in checkout form
5. Use test card: `4242 4242 4242 4242`
6. Check Stripe Dashboard for completed charges

### Verify Order in Payload
1. Navigate to http://localhost:3000/admin
2. Go to Collections → Orders
3. Verify order created with correct amount

---

## 4. Data Import (Books & Apparel)

### Option A: Manual Import via Payload Admin
1. Go to http://localhost:3000/admin
2. Collections → Products (or specific collection)
3. Click "Create"
4. Fill in product details
5. Upload images
6. Save

### Option B: Bulk Import via CSV (If available)
```bash
cd alkebu-load
# Import books
pnpm tsx scripts/import-books.ts --file=books.csv

# Import apparel
pnpm tsx scripts/import-apparel.ts --file=apparel.csv
```

### Option C: Square POS Sync
1. Configure Square webhook in `.env`
2. Add test products to Square
3. Run sync script:
```bash
pnpm tsx scripts/sync-square-inventory.ts
```

---

## 5. Testing Scenarios

### Scenario 1: Simple Order
- [ ] Add 1 book to cart
- [ ] Checkout with valid address
- [ ] Use test card 4242 4242 4242 4242
- [ ] Verify order in Payload admin
- [ ] Verify order confirmation email

### Scenario 2: Multi-Item Order
- [ ] Add 2 books + 1 apparel item
- [ ] Verify subtotal calculation
- [ ] Verify tax calculation (7% for TN)
- [ ] Complete checkout
- [ ] Verify all items in order

### Scenario 3: Failed Payment
- [ ] Add item to cart
- [ ] Checkout with test card 4000 0000 0000 0002 (declined)
- [ ] Verify error message displayed
- [ ] Cart should still have items

### Scenario 4: Mobile Responsiveness
- [ ] Test on mobile browser (DevTools)
- [ ] Verify form fields are accessible
- [ ] Verify buttons are clickable
- [ ] Verify no overflow on small screens

---

## 6. Production Deployment Checklist

Before going live:

### Environment
- [ ] Set real Stripe keys (not test keys)
- [ ] Configure production database (PostgreSQL)
- [ ] Set up SSL certificates
- [ ] Configure domain DNS

### Stripe Setup
- [ ] Enable live mode in Stripe
- [ ] Configure production webhook endpoints
- [ ] Set up payment method requirements
- [ ] Test 3D Secure (if applicable)

### Data
- [ ] Import all products (books, apparel, etc.)
- [ ] Upload all product images
- [ ] Set correct prices and inventory
- [ ] Verify tax rates are correct

### Security
- [ ] Enable HTTPS everywhere
- [ ] Configure CORS for correct domains
- [ ] Set up rate limiting
- [ ] Test admin access controls

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring
- [ ] Set up email alerts
- [ ] Configure logging

### Communication
- [ ] Prepare launch email
- [ ] Test email templates
- [ ] Brief staff on new system
- [ ] Prepare help documentation

---

## 7. Troubleshooting

### Checkout Not Loading
- [ ] Verify Stripe keys in `.env`
- [ ] Check browser console for errors
- [ ] Verify backend is running (`http://localhost:3000`)
- [ ] Check CORS settings

### Payment Declined
- [ ] Use test cards listed above
- [ ] Check Stripe dashboard for error details
- [ ] Verify address matches test card requirements

### Order Not Appearing in Admin
- [ ] Refresh Payload admin
- [ ] Check browser console for errors
- [ ] Verify webhook is configured correctly
- [ ] Check Payload logs

### Email Not Sending
- [ ] Verify Resend API key in `.env`
- [ ] Check FROM_EMAIL is valid
- [ ] Verify email template in Payload
- [ ] Check Resend logs for bounces

---

## 8. Next Steps After Phase 1

Once checkout is working:

1. **Import Data**: Get all books and apparel into system
2. **Square Sync**: Verify real-time inventory updates
3. **Email Testing**: Send real order confirmations
4. **Mobile Testing**: Test on real devices
5. **Phase 2**: Start shipping integration

---

## Reference Links

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Documentation](https://stripe.com/docs)
- [Payload CMS Admin](http://localhost:3000/admin)
- [Local Frontend](http://localhost:5173)

---

*Questions? Check CLAUDE.md or docs/development-guide.md*
