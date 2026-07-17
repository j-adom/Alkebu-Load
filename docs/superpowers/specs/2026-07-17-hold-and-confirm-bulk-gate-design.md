# Hold-and-Confirm Checkout + Bulk Order Gate — Design Spec

**Date:** 2026-07-17
**Status:** Approved design, pre-implementation
**Companion reading:** [docs/stripe-payment-management-brief.md](../../stripe-payment-management-brief.md) — Stripe payment-timing options, auth mechanics, fee math

## Problem

At least 20% of orders are long-tail titles from the unverified stock database — we don't learn a book is unsourceable until after the customer has paid. Today's checkout charges instantly (Stripe hosted Checkout, automatic capture), so every unfulfillable order costs a refund on which **Stripe keeps the ~2.9% + 30¢ processing fee**, holds customer money for a failed purchase, and leaves a dispute window open. Separately, oversized orders (10+ copies of one title) carry outsized versions of the same risk and deserve quoted pricing rather than retail self-serve checkout.

## Solution overview

Two features, one goal — never pay Stripe fees for orders we can't fulfill:

1. **Hold-and-confirm pipeline (all orders):** checkout authorizes the card instead of charging (`capture_method: 'manual'`). Staff confirm stock within a 12–48h target and capture (full or partial); unfulfillable orders cancel with $0 fees. **The system never moves money on its own** — alerts escalate, humans decide. Card auths expire at ~7 days; an expired auth is a lost sale, so alerting is load-bearing and deliberately noisy.
2. **Bulk order gate (> N copies per line, N=10):** the cart quantity stepper caps at N and routes larger requests into the existing `bookQuotes` intake, pre-filled from the cart. Staff quote sourced pricing and collect via **Square Invoices** (already used in-store) — a documented workflow, zero payment code.

Both features sit behind env flags for instant rollback. The Ingram availability engine later plugs into the capture decision (auto-capture Ingram-available titles) — designed for, not built.

## Decisions log

| Decision | Choice | Rationale |
|---|---|---|
| Gate placement | Cap in cart UI + hard server backstop at checkout | Best UX (no late bounce) + server-authoritative |
| Threshold semantics | Per cart line, N=10, env-configurable | Matches "copies of a book"; class sets across titles unaffected |
| Bulk intake | Reuse `bookQuotes` with `requestSource: 'bulk-order'` | Quantity/budget/urgency fields, staff+customer emails, follow-up cron already exist |
| Quote paid leg | Square Invoices, Dashboard-driven, no code | Staff already use Square in-store; invoices free to send. Accepted trade: Square ACH ~1% uncapped vs Stripe 0.8%/$5 cap |
| Auth scope | **All orders** hold-then-capture | 20% unfulfillable rate ⇒ savings ≈ 0.6% of gross volume + dispute elimination |
| Deadline backstop | **Alert-only — never auto-capture, never auto-cancel** | Principle: a human confirms every charge. Accepted risk: missed alerts can lose sales at day-7 expiry |
| Partial fulfillment | Staff mark lines unavailable → one-shot partial capture + notify customer | Fits 48h window; customer pays only for what ships |

## Architecture

### A. Hold-and-confirm pipeline

**Session creation** — `alkebu-load/src/app/utils/stripeHelpers.ts` (session create ~line 239): add `payment_intent_data: { capture_method: 'manual' }` when `MANUAL_CAPTURE_ENABLED=true`. Flag off ⇒ byte-for-byte today's behavior.

**Order lifecycle** — new order status **`pending-confirmation`** (payment state `authorized`) plus terminal states `cancelled-stock` and `authorization-expired`. `checkout.session.completed` (in `alkebu-load/src/app/api/stripe-webhook/route.ts`) creates the order as `pending-confirmation` when the payment intent is `requires_capture`; capture success transitions to the existing confirmed/processing path; `charge.expired` sets `authorization-expired` + loud staff alert (this is the lost-sale case). Stock adjustments mirror today's behavior, restored on cancel.

**Capture actions** (new admin-auth'd API used by the Order Dashboard):
- **Confirm & charge** — capture full quoted total.
- **Partial** — staff mark unavailable lines; system computes: available-items subtotal + TN tax recalculated on that subtotal + **original quoted shipping unchanged**. Invariants: captured amount ≤ authorized amount, always; if the reduced order slips under the free-shipping threshold, shipping stays free (customer's favor). One capture per auth (Stripe rule) — the flow is single-shot by design.
- **Cancel** — cancel the PaymentIntent ($0 fees), status `cancelled-stock`, restore stock, email customer.

**Crons**
- `recover-stripe-orders` (hourly): updated to classify `requires_capture` sessions as unconfirmed-not-missing.
- **New alert cron:** hold-age escalation — staff email at 12h and 24h, stronger at 48h, **day-5/day-6 "auth expires in 48/24h" alarms** (staff email + dashboard banner + dedicated daily-digest section).

**Boundary:** Stripe path only. The Square hosted-checkout adapter (still under validation) is untouched.

### B. Order Dashboard (staff UI)

`alkebu-load/src/app/components/OrderDashboard.tsx`, "Needs Attention" tab: `pending-confirmation` orders listed with age timer (green <12h, amber <48h, red beyond). Per-order: Confirm & charge, per-line can't-source checkboxes with live captured-total preview, Cancel — can't source. Dashboard banner when any hold is past day 5.

### C. Customer emails

Reworked/new templates in the existing branded system (`emailTemplates.ts`):
1. **Order received** (replaces current instant confirmation): "we're confirming availability — your card will be charged when your order is confirmed, usually within a day."
2. **Order confirmed** — the real receipt, sent at capture.
3. **Partially confirmed** — items shipped vs unavailable, "you were only charged for what shipped," quote-request link for the missing title.
4. **Couldn't source** — apology, "the hold on your card has been released — no charge was made," quote-request link.

### D. Bulk order gate

**Cart UI** (`alkebu-web/src/lib/components/.../CartLineItem.svelte`): stepper `max = N`; at N, show "Ordering more than {N}? Request bulk pricing →". Add-to-cart paths that would exceed N get the same treatment.

**Bulk request page** (new SvelteKit route `/bulk-order-request`): pre-filled title/ISBN/quantity from the cart line via query params; collects contact, urgency, budget, notes; posts to `POST /api/quote-request` with `requestSource: 'bulk-order'`.

**Quote system changes** (`quoteRequestSystem.ts`, `api/quote-request/route.ts`): for `requestSource: 'bulk-order'` — skip the external-API search (title is already in catalog), store the catalog book reference on the `bookQuotes` record, raise the quantity ceiling for this source from 100 to 500. Existing staff notification, customer confirmation, and 7-day follow-up cron apply unchanged.

**Server backstop** (`api/checkout/route.ts` before adapter init ~line 188, and `api/checkout/preview/route.ts`): reject any cart line with quantity > N using a structured error `{ code: 'BULK_QUANTITY_EXCEEDED', bookTitle, quantity, threshold }`; the storefront checkout flow catches the code and directs to the bulk request page.

### E. Quote paid leg — documented workflow, no code

Addition to `docs/staff-workflows.md`: confirm sourcing → price the quote (wholesale-aware, real freight) → send a **Square Invoice** from the Square app/Dashboard (enable ACH for institutional buyers) → mark the `bookQuotes` record fulfilled. Fee footnote recorded: Square ACH ~1% uncapped vs Stripe 0.8% capped at $5 — accepted for tool consolidation; verify current Square rates when writing the doc.

## Configuration

- `MANUAL_CAPTURE_ENABLED` — default `false`
- `BULK_ORDER_QUANTITY_THRESHOLD` — default `10`
- Alert timing constants (12h / 24h / 48h / day-5 / day-6) as module constants, not env
- Schema changes to `Orders` / `bookQuotes` ⇒ `pnpm generate:types` + generate Postgres DDL before deploy (July 8 schema-drift incident applies: plugin/collection changes are a prod migration event)

## Error handling

- Capture API failures (Stripe error, already-captured, already-canceled): surface to dashboard with actionable message; never retry silently.
- Webhook idempotency: status transitions guarded so replayed events can't double-create or regress an order.
- `charge.expired` on an order staff believed handled ⇒ alert includes the order's action history.
- Partial-capture math validated server-side against the invariant `captured ≤ authorized` before any Stripe call.

## Testing

- **Unit** (existing Node runner, dummy Stripe key): gate threshold logic (line at N passes, N+1 rejected), partial-capture math (tax recompute, shipping invariant, ≤-authorized invariant, free-shipping edge), webhook status transitions incl. idempotent replay, alert age-bucketing, quote-request bulk-source branch (no external search, ceiling 500).
- **E2E (Stripe test mode):** hold-mode checkout → dashboard full capture; partial capture; cancel; simulated expiry. Bulk gate: stepper cap, request-page prefill → `bookQuotes` record + emails, server backstop on an over-N cart.

## Rollout

1. Deploy dark (both flags off) — behavior unchanged.
2. Flip `MANUAL_CAPTURE_ENABLED` on a quiet morning; place a real small order; confirm from the dashboard; verify capture + fee in Stripe Dashboard.
3. Enable bulk gate (threshold flag) after storefront deploy.
4. Rollback = flip flag off; in-flight holds remain manageable from the dashboard/Stripe.

## Out of scope (recorded fast-follows)

- Ingram availability → automated capture decision (auto-capture Ingram-available titles)
- Automated Square invoice creation from `bookQuotes` records
- Square hosted-checkout adapter delayed capture
- Any auto-capture/auto-cancel backstop — **explicitly rejected**: human-only capture
