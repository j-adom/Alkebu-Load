# Per-Item Refunds from the Order Dashboard + Customer Email

**Date:** 2026-06-08
**Status:** Implemented (2026-06-09) — pending the prod smoke test in
[2026-06-08-dashboard-refunds-smoketest.md](2026-06-08-dashboard-refunds-smoketest.md).
Note: `refunds[].items` shipped as a `json` column (not a nested array) to avoid a
child-table migration with no staging net.
**Scope:** `alkebu-load` (Payload backend) + Order Dashboard UI

## Problem

When a customer places an online order and staff later discover one of the books
is **out of print** (cannot be sourced), staff must: refund the customer for that
book, tell them why by email, still ship the rest of the order, stop selling the
out-of-print title, and keep the order's records honest. Today none of this is
possible from the Order Dashboard:

- A refund API exists (`POST /api/refund`, admin-only) but is **orphaned** — no UI
  calls it, and it sends the customer **no email**.
- Refunds are only doable from the Stripe Dashboard, which neither emails the
  customer nor records anything book-specific.
- This is a **recurring** problem: titles fall out of print over time.

## Goals

1. Refund **specific line items** of an order from the Order Dashboard (per-item,
   with selectable quantity), not just the whole order.
2. Auto-compute a **fair** refund amount (item price + prorated tax + the
   incremental shipping that item actually cost), always **editable** before
   confirming.
3. **Email the customer** a branded explanation: what was refunded, how much, the
   reason, and an optional note.
4. **Close the loop** so the problem stops recurring:
   - Mark the refunded line item(s) **do-not-ship** so packing is honest.
   - Optionally flag the **title out of print** in the catalog so it stops selling.
5. Do this **safely** despite no local backend / no staging — heavy unit tests on
   the money math; first real refund on prod is the smoke test.

## Non-Goals (this spec)

- In-store pickup at checkout — **separate spec** (next).
- Refunds for **Square-paid** orders — **Stripe-only** in v1 (online orders are
  Stripe; Square POS sales are refunded at the register). Orders not paid via
  Stripe show **no** refund action.
- Automatic restock by default (out-of-print items must not return to stock).
- Returns/RMA workflow, store credit, reship.

## Decisions (locked during brainstorming)

| Decision | Choice |
| --- | --- |
| Granularity | Per-item, with selectable quantity per line |
| Amount authority | **Server-authoritative**; UI shows a suggestion, server recomputes |
| Reason | Preset dropdown (Out of print / Damaged / Customer request / Pricing error / Other) + optional free-text note |
| Tax | Prorated by selected-subtotal share of order subtotal |
| Shipping | Recompute remaining order, refund the difference (deterministic) |
| Restock | Checkbox, default **off** |
| Auth | **Admin-only** (matches current API) |
| Payment provider | **Stripe-only** v1 |
| Close-the-loop | Per-line do-not-ship flag + optional "mark title out of print" |
| Verification | Unit tests for math; small **real** refund on prod as smoke test |

## Data Model (today, confirmed)

- `Orders.items[]`: `{ product (poly rel), productType, productTitle, identifiers,
  quantity, unitPrice (cents), totalPrice (cents) }`; addressable by array `id`.
- Order totals: `taxAmount`, `shippingAmount`, `totalAmount` (cents). **No** stored
  subtotal → derive `orderSubtotal = Σ items.totalPrice`. **No** per-item tax →
  prorate.
- `Orders.refunds[]`: `{ amount, reason, stripeRefundId, processedAt }` (note:
  `processedBy` is set in the API but **not persisted** — schema gap).
- `Orders.payment.paymentStatus` enum includes `refunded` (no `partially_refunded`).
- `Orders.status` enum includes `returned`.
- `Books.availabilityStatus`: `available | discontinued | …` (search already
  filters `discontinued`). "Out of print" maps to **`discontinued`**.

## Architecture

### A. UI — Refund panel in `OrderDashboardV2.tsx`

A **Refund** action per order opens a panel (modal/drawer) showing:

- Header: customer, order #, paid total, already-refunded, **remaining refundable**.
- **Line items**: each row has a checkbox + quantity input (default = full line
  qty, max = `quantity − alreadyRefundedQty`). Rows already fully refunded are
  shown disabled with a "Refunded" badge.
- **Suggested breakdown** (display only): items subtotal + prorated tax +
  incremental shipping = suggested refund.
- **Editable final amount** (cents), pre-filled with the suggestion; client-side
  capped at remaining-refundable (server re-caps).
- **Reason** dropdown + optional **note** textarea.
- **Restock these items** checkbox (default off).
- **Mark "<title>" out of print** checkbox — shown/defaulted **on** when reason =
  Out of print; applies to the book(s) in the selected items.
- Confirm button (disabled while processing) → `POST /api/refund`.

The panel is display/UX only; it never determines the authoritative amount.

### B. Endpoint — extend `POST /api/refund` (admin-only)

Request:

```
{
  orderId: string,
  items: [{ itemId: string, quantity: number }],
  reason: 'out_of_print' | 'damaged' | 'customer_request' | 'pricing_error' | 'other',
  note?: string,
  amountOverride?: number,   // cents; optional staff edit
  restock?: boolean,         // default false
  markOutOfPrint?: boolean   // default false
}
```

Server flow (all integer cents):

1. Load order; verify Stripe-paid and has a `paymentIntentId`/charge.
2. `alreadyRefunded = Σ refunds.amount`; `remaining = totalAmount − alreadyRefunded`.
3. Validate `items` against `order.items` (ids exist, qty ≤ remaining-per-line).
4. **Compute suggested** via pure helpers (see C).
5. `amount = clamp(amountOverride ?? suggested, 0, remaining)`.
   Reject if `amount <= 0`.
6. **Record-before-charge safety:** create the Stripe refund with an
   **idempotency key** derived from `orderId + sorted(items) + amount` so a retry
   can't double-charge.
7. On Stripe success: append `refunds[]` entry
   `{ amount, reason, note, items:[{itemId, productTitle, quantity, amount}],
      restock, stripeRefundId, processedBy, processedAt }`.
8. Mark refunded line items: set per-item `refundedQuantity` (+= qty) and
   `doNotShip` when fully refunded.
9. Update `payment.paymentStatus`: `refunded` if `alreadyRefunded + amount ==
   totalAmount`, else `partially_refunded` (**new enum value**). Set `status =
   returned` **only** on full refund (preserve current behavior); partial leaves
   `status` untouched.
10. If `restock`: restore inventory for refunded items (reuse the existing
    inventory-restore logic from the afterChange hook).
11. If `markOutOfPrint`: for each refunded **book** item, set
    `Books.availabilityStatus = 'discontinued'` via Local API.
12. **Then** send the customer email (see D); record send status. Email failure
    does **not** roll back the refund — it is retryable.
13. Return `{ success, amount, breakdown, refundId, paymentStatus }`.

### C. Pure calc helpers — `src/app/utils/refundCalculations.ts` (unit-tested)

```
itemsSubtotal(order, selected): Σ unitPrice × qty for selected
proratedTax(order, selected):  round(order.taxAmount × itemsSubtotal/orderSubtotal)
incrementalShipping(order, selected):
   remaining = order.items minus selected (by qty)
   if remaining is empty → return order.shippingAmount   // full shipping back
   newCost = shippingCost(remaining)                      // our deterministic calc
   return clamp(order.shippingAmount − newCost, 0, order.shippingAmount)
suggestedRefund = itemsSubtotal + proratedTax + incrementalShipping
```

`shippingCost(items)` reuses `calculateTotalWeight` + the Media-Mail tier table
(book-only) or `calculateShipping` fallback (mixed) from
`taxShippingCalculations.ts`. Weights resolve exactly as checkout does
(`resolveItemWeight`). These functions are **pure** (order + selection in, cents
out) → fully covered by `pnpm test`.

### D. Customer email

- `generateRefundNotificationTemplate(order, refund)` in `emailTemplates.ts` —
  branded (Kente gold / forest green): "We've refunded **$X** to your original
  payment method," a list of refunded item(s) + amounts, the human reason label,
  the optional note, and — when partial — "The rest of your order will ship as
  normal." Plus support contact.
- `sendRefundNotification(order, refund)` in `emailService.ts`, called by the
  refund route after Stripe success. Record send status on the order
  (`emailNotifications.refundNotification` slot, mirroring existing pattern).

## Data Model Changes

- `Orders.items[]`: add `refundedQuantity` (number, default 0) and `doNotShip`
  (checkbox, default false).
- `Orders.refunds[]`: add `note` (text), `items` (array of
  `{ itemId, productTitle, quantity, amount }`), `restock` (checkbox); **persist**
  `processedBy` (relationship → users, or text).
- `Orders.payment.paymentStatus`: add `partially_refunded`.
- `Orders.emailNotifications`: add `refundNotification` slot.
- After changes: `pnpm generate:types`; check `scripts/fix-orders-schema.sql` for a
  Postgres patch (prod is Postgres; Drizzle migrations have drifted before).

## Money-Safety Guardrails

- Integer cents end-to-end; no floats for currency.
- Server caps at `remaining` refundable; rejects `<= 0` and over-refund.
- Stripe **idempotency key** prevents double-refund on retry/double-click.
- Confirm step shows the exact amount before submit; button locked while pending.
- Audit trail: `processedBy` + `processedAt` persisted on every refund.
- Ordering: Stripe refund → persist order changes → email. Email is best-effort
  and retryable; it never gates or reverses the refund.

## Verification Plan (no staging / no local backend here)

1. **Unit tests** (`pnpm test`, `tests/refund/…`) — the risky math, exhaustively:
   - itemsSubtotal, proratedTax (rounding), incrementalShipping (Media Mail tiers,
     fallback, full-order = all shipping, free-shipping/$0 case, remaining-cost ≥
     paid → $0), clamp/over-refund, partial-vs-full status transition.
2. **Manual smoke test on prod** (chosen): deploy, then run **one small real
   refund** on a low-risk real order with eyes on Stripe + the customer inbox +
   the order record. A written checklist will accompany the PR.
3. I will **not** treat this as done until that smoke test passes.

## Risks / Open Items

- **No staging net** — the prod smoke test is the only end-to-end check; hence the
  heavy unit tests + guardrails. Pick a genuinely small first refund.
- **Weight data quality** — many books carry a placeholder 16oz top-level weight
  (`resolveItemWeight` already compensates); incremental shipping inherits that
  approximation. Acceptable because the amount is editable and usually cents.
- **Square-paid orders** — out of scope; the UI must detect provider and hide the
  refund action for non-Stripe orders rather than fail at submit.
- **Partial-then-full** — multiple partial refunds must sum correctly via
  `refunds[]`; `remaining` always derives from the sum.

## Out of Scope / Follow-ups

- In-store pickup at checkout (next spec).
- Reship / store-credit alternatives to refund.
- Bulk "mark out of print" tooling beyond the per-refund checkbox.
