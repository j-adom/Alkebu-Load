# Phase 1 Launch - Next Steps Summary

**Date:** February 1, 2026
**Timeline:** 2-3 weeks to MVP
**Status:** 🔄 E-Commerce Backend Complete, Frontend Integration In Progress

---

## Recent Progress (February 2026)

### ✅ E-Commerce Backend Complete
- **Unified Tax/Shipping Calculations** - Single source of truth in `taxShippingCalculations.ts`
- **Payment Adapter Pattern** - Pluggable support for Stripe and Square
- **Square Webhooks** - Full implementation with signature verification
- **Refund API** - Full and partial refunds via `/api/refund`
- **Tax-Exempt Validation** - Verified against institutional accounts
- **Inventory Management** - Auto-decrement on order confirmation
- **Tennessee Tax Rules** - 7% state + 2-2.75% local, books are tax-exempt

---

## Immediate Action Items (This Week)

### 1. Data Preparation (2-4 hours)
```
1. Export product catalog from Square Dashboard
2. Save as CSVs:
   - square-books.csv
   - square-apparel.csv
3. Organize into: alkebu-load/data/
```

### 2. Environment Setup (1 hour)
```bash
# Get Stripe test keys from https://stripe.com
# Get Square credentials from Square Dashboard
# Update alkebu-load/.env and alkebu-web/.env

# Required environment variables:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SQUARE_ACCESS_TOKEN=...
SQUARE_LOCATION_ID=...
SQUARE_WEBHOOK_SIGNATURE_KEY=...  # For Square webhook validation
FREE_SHIPPING_THRESHOLD=7500      # $75 in cents

# Then test locally:
cd alkebu-load && pnpm dev
cd alkebu-web && pnpm dev
```

### 3. Data Import (2-3 hours)
```bash
# Import books from CSV
pnpm tsx scripts/import-books.ts

# Batch enrich from ISBNdb (auto-populate authors, descriptions, images)
# Required: Set ISBNDB_API_KEY environment variable
ISBNDB_API_KEY=your-key pnpm tsx scripts/enrich-books-batch-fast.ts

# Import apparel
pnpm tsx scripts/import-apparel.ts

# Verify in Payload admin: http://localhost:3000/admin
# Check book records have isbndbChecked: true and lastEnrichedAt timestamp
```

**New Feature:** Books are now auto-enriched with ISBNdb data (authors, descriptions, cover images). See [BOOK-ENRICHMENT-WORKFLOW.md](../docs/BOOK-ENRICHMENT-WORKFLOW.md) for manual refresh and bulk ISBN import.

---

## Testing Checklist (Next Week)

### Core Functionality
- [ ] Add book to cart → drawer opens
- [ ] Update quantity → works
- [ ] Remove item → works
- [ ] Proceed to checkout → form displays
- [ ] Fill address → validates (US only)
- [ ] Tax calculates correctly:
  - [ ] Tennessee addresses: 7% state + local tax (books exempt)
  - [ ] Out-of-state: No tax
  - [ ] Tax-exempt accounts: No tax
- [ ] Shipping calculates correctly:
  - [ ] Weight-based pricing
  - [ ] Local TN vs national rates
  - [ ] Free shipping over $75
- [ ] Use test card (4242 4242 4242 4242) → payment processes
- [ ] See order in Payload admin → payment recorded
- [ ] Inventory decremented after order
- [ ] Confirmation email sent

### Refund Testing
- [ ] Full refund via `/api/refund`
- [ ] Partial refund via `/api/refund`
- [ ] Refund history recorded on order

### Mobile Testing
- [ ] All pages responsive
- [ ] Cart drawer works on mobile
- [ ] Checkout form usable on small screen
- [ ] Touch targets adequate

### Performance
- [ ] Pages load <2 seconds
- [ ] Search responds <50ms
- [ ] Lighthouse scores >90

---

## Architecture Review

### Payment Provider Architecture (New ✅)
```
                    ┌─────────────────┐
                    │  Checkout API   │
                    │ /api/checkout   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Payment Adapter │
                    │    Registry     │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │   Stripe    │   │   Square    │   │   Future    │
    │   Adapter   │   │   Adapter   │   │  Providers  │
    └──────┬──────┘   └──────┬──────┘   └─────────────┘
           │                 │
    ┌──────▼──────┐   ┌──────▼──────┐
    │  Webhooks   │   │  Webhooks   │
    │ /api/stripe │   │ /api/square │
    └─────────────┘   └─────────────┘
```

### Tax Calculation (New ✅)
```
taxShippingCalculations.ts (Single Source of Truth)
    │
    ├── Tennessee: 7% state + 2-2.75% local (city-based)
    ├── Books: TAX EXEMPT (TN Code § 67-6-329)
    ├── Out-of-state: 0% (no nexus)
    └── Tax-exempt accounts: 0% (verified against institutional-accounts)
```

### Cart Flow (Already Built ✅)
```
Product Page
    ↓
[Add to Cart] → Item added
    ↓
[Cart Icon] in header → Opens drawer modal
    ↓
View/edit cart without leaving page
    ↓
[Proceed to Checkout] → Go to checkout form
```

### Checkout Flow (Enhanced ✅)
```
Checkout Form
    ↓
Enter shipping address (US only)
    ↓
Tax calculated (books exempt, TN rates applied)
    ↓
Shipping calculated (weight-based)
    ↓
Tax-exempt validated (if claimed)
    ↓
Payment provider selected (Stripe/Square)
    ↓
Redirect to hosted checkout
    ↓
Webhook received → Order created
    ↓
Inventory decremented
    ↓
Confirmation email sent
    ↓
/checkout/success page
```

### Key Components
- `CartDrawer` - Slide-out modal (snipcart-style)
- `CheckoutForm` - Collects shipping address
- `taxShippingCalculations.ts` - Unified tax/shipping logic
- `Payment Adapters` - Stripe, Square support
- `OrderConfirmation` - Success page

---

## API Endpoints Reference

### E-Commerce APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/checkout` | POST | Create checkout session |
| `/api/checkout?session_id=...` | GET | Check checkout status |
| `/api/refund` | POST | Process refund |
| `/api/refund?orderId=...` | GET | Get refund status |
| `/api/payment-methods` | GET | List available providers |
| `/api/stripe-webhook` | POST | Stripe webhook handler |
| `/api/payment-webhook/[provider]` | POST | Generic webhook handler |

### Cart APIs (via Payload)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/carts` | POST | Create cart |
| `/api/carts/:id` | GET | Get cart |
| `/api/cart-items` | POST | Add item to cart |
| `/api/cart-items/:id` | PATCH | Update quantity |
| `/api/cart-items/:id` | DELETE | Remove item |

---

## Quick Reference Commands

```bash
# Backend
cd alkebu-load
pnpm dev                           # Start backend
pnpm tsx scripts/import-books.ts   # Import books
pnpm tsx scripts/import-apparel.ts # Import apparel

# Frontend
cd alkebu-web
pnpm dev                           # Start frontend
pnpm build                         # Build for production

# Testing Stripe Webhooks
stripe listen --forward-to localhost:3000/api/stripe-webhook

# Access
Backend Admin:   http://localhost:3000/admin
Frontend:        http://localhost:5173
API:             http://localhost:3000/api
```

---

## Success Criteria for Phase 1

Before going live, verify:

✅ 100+ books imported with accurate data
✅ 20+ apparel items imported
✅ All product images display
✅ Add to cart works (drawer opens)
✅ Checkout form collects address
✅ Tax calculates correctly (books exempt, TN rates)
✅ Shipping calculates correctly (weight-based)
✅ Stripe test payment processes
✅ Order appears in admin
✅ Inventory decremented
✅ Confirmation email sent
✅ Mobile responsive (tested on 3+ devices)
✅ Page load <2 seconds
✅ Lighthouse scores >90
✅ No console errors

---

## Files to Review

- `docs/PHASE1-SETUP.md` - Detailed step-by-step guide
- `docs/CART-UX.md` - Cart drawer architecture
- `alkebu-load/src/app/utils/taxShippingCalculations.ts` - Tax/shipping logic
- `alkebu-load/src/app/lib/payments/` - Payment adapters
- `alkebu-load/.env.example` - Backend config template
- `alkebu-web/.env.example` - Frontend config template

---

## Estimated Effort

| Task | Hours | Status |
|------|-------|--------|
| Data export & cleanup | 2-4h | Pending |
| Environment setup | 1h | Pending |
| Data import | 2-3h | Pending |
| E-commerce backend | 8-10h | ✅ Complete |
| Frontend integration | 4-6h | In Progress |
| Testing & QA | 4-8h | Pending |
| Fixes & polish | 2-4h | Pending |
| Production deploy | 2-3h | Pending |

**Total: 25-35 hours over 2-3 weeks**

---

## Common Issues & Solutions

**Q: Books won't import**
A: Check CSV format matches script expectations. Run with `--verbose --dry-run` flag to preview.

**Q: Images not showing**
A: Upload to Media collection first, then link product to image ID.

**Q: Stripe payment fails**
A: Make sure using test cards (4242...), webhook listener running, no CORS errors.

**Q: Tax not calculating correctly**
A: Tax is now calculated in `taxShippingCalculations.ts`. Check:
- Books are automatically tax-exempt in Tennessee
- Tennessee addresses use 7% state + local rate (city-based)
- Out-of-state addresses have 0% tax (no nexus)
- Tax-exempt flag is validated against institutional accounts

**Q: Square webhooks not working**
A: Ensure `SQUARE_WEBHOOK_SIGNATURE_KEY` is set. Webhook URL must be registered in Square Dashboard.

**Q: Refund fails**
A: Check order has `payment.stripePaymentIntentId` and `payment.paymentStatus === 'succeeded'`.

---

## Next Phase (After MVP Launch)

Once Phase 1 complete & tested:

- Phase 2: Shipping integration with Shippo API
- Phase 2: Blog system & content
- Phase 2: Events calendar (linked to hi.events)
- Phase 3: Full product catalog
- Phase 3: Business directory

---

## Ready? Let's Go! 🚀

Current focus:
1. ~~E-commerce backend~~ ✅ Complete
2. **Frontend integration** ← We are here
3. Data import & testing
4. Production deploy

Next step: Connect SvelteKit frontend to checkout API

See `docs/PHASE1-SETUP.md` for detailed instructions on each step.

Questions? Check CLAUDE.md for AI assistant context or relevant docs.

---

*Last updated: February 1, 2026*
