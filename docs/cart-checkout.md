# Cart and Checkout

This is the canonical cart, checkout, tax, shipping, and payment workflow reference.

## Architecture

The storefront owns the customer UI. Payload owns cart/order APIs, tax and shipping calculations, payment initialization, webhooks, email, and staff order management.

Customer-facing writes should go through server/API code, not direct public Payload collection writes. The lower-level commerce collections are intentionally locked down so totals, ownership, and payment state stay server-controlled.

## Customer Flow

~~~text
Product page
  -> Add to cart
  -> Cart drawer opens
  -> Customer reviews items/totals
  -> Checkout page
  -> Address entry
  -> Tax/shipping preview
  -> Stripe checkout
  -> Stripe webhook confirms payment
  -> Payload order is created/updated
  -> Customer and staff emails send
  -> Staff processes order in Payload admin
~~~

## Frontend Components

| Component | Location | Purpose |
|---|---|---|
| CartIconButton | alkebu-web/src/lib/components/cart/CartIconButton.svelte | Header cart icon and item count |
| CartDrawer | alkebu-web/src/lib/components/cart/CartDrawer.svelte | Global slide-out cart drawer |
| CartLineItem | alkebu-web/src/lib/components/cart/CartLineItem.svelte | Cart row display and item actions |
| CartTotals | alkebu-web/src/lib/components/cart/CartTotals.svelte | Subtotal, tax, shipping, and total display |
| AddToCartButton | alkebu-web/src/lib/components/cart/AddToCartButton.svelte | Product add-to-cart action |
| cart store | alkebu-web/src/lib/stores/cart.ts | Cart state and API calls |
| cartDrawer store | alkebu-web/src/lib/stores/cartDrawer.ts | Drawer open/close state |

## Backend APIs

| API | Purpose |
|---|---|
| POST /api/cart/add | Add item |
| POST /api/cart/update | Update quantity/customization |
| POST /api/cart/remove | Remove item |
| POST /api/cart/clear | Clear cart |
| GET /api/cart/summary | Fetch cart summary |
| POST /api/checkout/preview | Preview tax/shipping |
| POST /api/checkout | Initialize payment/checkout |
| POST /api/stripe-webhook | Stripe payment confirmation |
| POST /api/payment-webhook/[provider] | Provider-specific payment webhook path |

## Cart Drawer Behavior

- Opens from the right side.
- Overlay click closes it.
- Escape key closes it.
- Quantity updates happen without leaving the page.
- Checkout navigation closes the drawer.
- Mobile uses a full-width drawer.

## Checkout Details

Checkout collects email, name, shipping address, tax-exempt flag when applicable, and selected shipping rate. Previewing checkout calculates:

- Tennessee sales tax when applicable.
- Shipping estimate or carrier quote.
- Final total.
- Shipping quote expiration/fingerprint.

Cart and checkout routes must remain private/no-store. Never cache customer-specific cart, checkout, order, or payment data at the CDN layer.

## Payments

Stripe is the launch checkout path. Square hosted checkout exists conceptually but should remain behind a feature flag until sandbox and production checkout are verified.

Before frontend builds, run:

~~~bash
cd alkebu-web
npm run sync:payment-provider
~~~

That script reads the payment provider selected in Payload Site Settings and writes the generated frontend provider module.

## Shipping and Tax

- Book-only orders can use media-mail estimates.
- Shippo can provide live carrier rates when configured.
- Static/estimated rates are the fallback when Shippo fails or is not configured.
- Tennessee addresses collect tax when applicable; out-of-state addresses should not.
- Staff can still use Pirate Ship operationally for label purchase until label creation is automated.

## Testing Checklist

- [ ] Cart icon shows correct item count.
- [ ] Add-to-cart opens drawer.
- [ ] Quantity update works.
- [ ] Remove item works.
- [ ] Clear cart works.
- [ ] Checkout route handles empty cart.
- [ ] Tennessee tax preview is correct.
- [ ] Out-of-state tax preview is zero when expected.
- [ ] Shipping choices display and persist to checkout.
- [ ] Stripe checkout succeeds with test card in local/test mode.
- [ ] Cancel path preserves cart.
- [ ] Success path clears cart.
- [ ] Order appears in Payload with line items, totals, tax, shipping, and customer email.
- [ ] Staff and customer emails send.

## Related Docs

- [Launch and Operations Board](launch.md)
- [Staff Workflows](staff-workflows.md)
- [Deployment Guide](deployment.md)
