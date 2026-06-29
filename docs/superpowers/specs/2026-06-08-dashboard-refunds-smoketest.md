# Dashboard Refunds — Production Smoke-Test Checklist

**Companion to:** [2026-06-08-dashboard-refunds-design.md](2026-06-08-dashboard-refunds-design.md)
**Why a prod smoke test:** there is no staging/local backend. The risky money math
is exhaustively unit-tested (`tests/payments/refund*.test.ts`,
`tests/payments/taxShippingCalculations.test.ts`); this checklist covers the
parts unit tests cannot — the real Stripe charge, persistence, and email.

## Before deploy

- [ ] `pnpm test` green (refund calc, refund plan, refund email suites included).
- [ ] `pnpm build` exits 0.
- [ ] Apply the Postgres patch on production **before** the first refund:
      `scripts/fix-orders-schema.sql` (adds `partially_refunded`, per-line
      `refunded_quantity`/`do_not_ship`, refund `note`/`items`/`restock`, and the
      `refundNotification` email columns). All statements are idempotent.
- [ ] Confirm the new columns exist (`\d orders_items`, `\d orders_refunds`,
      `\d orders`) so the first persist won't fail.

## First real refund (pick a genuinely low-risk, low-value real order)

1. [ ] Open `/admin/order-dashboard`, expand a recent **Stripe-paid** order.
2. [ ] Confirm the **Refund** panel renders (and is hidden / read-only for any
       Square-paid order).
3. [ ] Select **one** line, quantity 1, reason **Out of print**, leave amount
       blank (auto), leave restock off, leave "mark out of print" on.
4. [ ] Click **Issue refund**, confirm the dialog.
5. [ ] Verify in **Stripe Dashboard**: a refund of the expected amount (item
       price + prorated tax + incremental shipping) against the right PaymentIntent.
6. [ ] Verify the **order record**: new `refunds[]` entry (amount, reason, note,
       items, `processedBy`, `processedAt`, `stripeRefundId`); the line's
       `refundedQuantity` incremented and `doNotShip` set if fully refunded;
       `payment.paymentStatus` = `partially_refunded` (or `refunded` if it was the
       whole order); `status` = `returned` only on a full refund.
7. [ ] Verify the **customer inbox**: branded refund email with the amount, reason,
       item(s), and the "rest of your order will ship as normal" line (partial).
8. [ ] Verify the refunded **book** now shows `availabilityStatus = discontinued`
       and no longer sells on the storefront.

## Guardrail spot-checks

- [ ] Double-click **Issue refund** → only **one** Stripe refund (idempotency key).
- [ ] Attempt to over-refund (type an amount above remaining) → server caps it.
- [ ] Second partial refund on the same order → remaining derives from prior
      refunds; cannot exceed the order total in aggregate.
- [ ] Email send failure does **not** reverse the refund (it is recorded as
      `refundNotification.status = failed` and is retryable).

## Rollback note

The refund itself is a real Stripe charge and cannot be code-rolled-back. If the
UI/route misbehaves after the first refund, hide the panel by reverting the
frontend commit; the Stripe Dashboard remains the manual fallback.
