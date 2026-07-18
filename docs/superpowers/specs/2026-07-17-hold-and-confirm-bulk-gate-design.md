# Hold-and-Confirm Checkout + Bulk Order Gate — Design Spec

**Date:** 2026-07-17 (v2 2026-07-18, revised after implementation-readiness review)
**Status:** Approved direction; v2 addresses payment-lifecycle, concurrency, and data-consistency review findings
**Companion reading:** [docs/stripe-payment-management-brief.md](../../stripe-payment-management-brief.md) — Stripe payment-timing options, auth mechanics, fee math

## Problem

At least 20% of orders are long-tail titles from the unverified stock database — we don't learn a book is unsourceable until after the customer has paid. Today's checkout charges instantly (Stripe hosted Checkout, automatic capture), so every unfulfillable order costs a refund on which **Stripe keeps the ~2.9% + 30¢ processing fee**, holds customer money for a failed purchase, and leaves a dispute window open. Separately, oversized orders (10+ copies of one title) carry outsized versions of the same risk and deserve quoted pricing rather than retail self-serve checkout.

## Solution overview

Two features, one goal — never pay Stripe fees for orders we can't fulfill:

1. **Hold-and-confirm pipeline (all orders):** checkout authorizes the card instead of charging (`capture_method: 'manual'`). Staff confirm stock within a 12–48h target and capture (full or partial); unfulfillable orders cancel with $0 fees. **The system never moves money on its own** — alerts escalate, humans decide. Card auths expire (default ~7 days, treated as a default, not a promise), and an expired auth is a lost sale, so alerting is load-bearing and deliberately noisy.
2. **Bulk order gate (> N copies per book line, N=10):** the cart quantity stepper caps at N for books and routes larger requests into the existing `bookQuotes` intake, pre-filled from the cart. Staff quote sourced pricing and collect via **Square Invoices** (already used in-store) — a documented workflow, zero payment code.

Both features sit behind env flags for instant rollback. The Ingram availability engine later plugs into the capture decision (auto-capture Ingram-available titles) — designed for, not built.

## Decisions log

| Decision | Choice | Rationale |
|---|---|---|
| Gate placement | Cap in cart UI + hard server backstop at checkout | Best UX + server-authoritative |
| Threshold semantics | Per cart line, **books only** (`productType === 'books'`), N=10, env-configurable | Matches "copies of a book"; merchandise quantities don't misroute into a book-quote flow |
| Bulk intake | Reuse `bookQuotes` with `requestSource: 'bulk-order'` | Quantity/budget/urgency fields, staff+customer emails, follow-up cron already exist |
| Quote paid leg | Square Invoices, Dashboard-driven, no code | Staff already use Square in-store. Accepted trade: Square ACH ~1% uncapped vs Stripe 0.8%/$5 cap |
| Auth scope | **All orders** hold-then-capture (Stripe path only) | 20% unfulfillable rate ⇒ savings ≈ 0.6% of gross volume + dispute elimination |
| Deadline backstop | **Alert-only — never auto-capture, never auto-cancel** | Principle: a human confirms every charge. Accepted risk: missed alerts can lose sales at auth expiry |
| Partial fulfillment | Per-line **unavailable quantity** (0..qty) → one-shot partial capture + notify | Supports "sourced 7 of 10"; customer pays only for what ships |
| Financial source of truth | **Stripe.** Payload records reconcile to Stripe, never the reverse | DB/email failures after a Stripe success must converge, not diverge |

## Architecture

### A. Stripe session & customer-facing wording

- `stripeHelpers.ts` session creation: add `payment_intent_data: { capture_method: 'manual' }` when `MANUAL_CAPTURE_ENABLED=true`. Flag off ⇒ byte-for-byte today's behavior.
- Hosted Checkout `custom_text.submit`: "Your card is authorized today and charged only when your order is confirmed."
- Storefront success page (`alkebu-web`): wording changes from "order confirmed/paid" to "order received — we're confirming availability" when the order is in the hold flow. The success page must not present the order as paid.

### B. Webhook event matrix

All events route through `processStripeWebhook` (`stripeHelpers.ts`). Handlers are idempotent; every handler tolerates arriving before the order exists (fall through to reconciliation rather than erroring, except `checkout.session.completed` which creates the order and keeps its existing throw-so-Stripe-retries behavior).

| Event | Manual-capture meaning | Action |
|---|---|---|
| `checkout.session.completed` | Card authorized (PI `requires_capture`) | Create order `pending-confirmation` / payment `authorized`; persist `paymentIntentId`, `authorizedAt`, `authorizationDeadline` (PI `latest_charge` auth data if available, else PI created + 7d default) |
| `payment_intent.amount_capturable_updated` | Auth amount now capturable | Reconcile: ensure order exists and shows `authorized`; if no order yet, log + rely on session.completed / recovery |
| `payment_intent.succeeded` | Capture completed (ours or Dashboard-initiated) | Transition order → `processing`/`captured`; record `amountCaptured`, `capturedAt`; if order was `capture-processing`, this is the convergence path after a mid-flight DB failure |
| `payment_intent.canceled` | **Primary expiry/cancel event.** Inspect `cancellation_reason`: staff-initiated (echo of our cancel) vs Stripe-automatic (auth expired) | Staff-initiated: confirm order already `cancelled-stock`, else reconcile to it. Automatic: order → `authorization-expired` + loud staff alert. Always fetch the live PI before final classification |
| `payment_intent.payment_failed` | Auth failed at checkout | Existing failure handling (no order) |
| `charge.expired` | Legacy/defensive alias for expiry | Route into the same reconciler as `payment_intent.canceled` (fetch PI, classify); never the sole expiry signal |

**Duplicate-creation guard:** `payment.stripeSessionId` gains a **unique DB constraint** (Payload `unique: true` + explicit DDL migration; pre-deploy check for existing duplicate rows). The find-then-create check remains as a friendly fast path, but the constraint is the guarantee.

### C. Order state machine

New order statuses: `pending-confirmation`, `capture-processing`, `cancelled-stock`, `authorization-expired`. New payment states: `authorized`, `captured`, `cancelled`. Original flow (flag off) is untouched.

| From | Operation / event | Actor | → Order status | → Payment status |
|---|---|---|---|---|
| — | `checkout.session.completed` (PI `requires_capture`) | webhook | `pending-confirmation` | `authorized` |
| `pending-confirmation` | staff clicks Confirm/Partial (CAS wins) | staff via capture API | `capture-processing` | `authorized` |
| `capture-processing` | Stripe capture succeeds + persist OK | capture API | `processing` | `captured` |
| `capture-processing` | Stripe capture succeeded, persist failed | webhook `payment_intent.succeeded` or reconciler cron | `processing` | `captured` |
| `capture-processing` | Stripe capture errored (retryable) | capture API | back to `pending-confirmation` + surfaced error | `authorized` |
| `pending-confirmation` | staff cancel succeeds | staff via cancel API | `cancelled-stock` | `cancelled` |
| `pending-confirmation` | `payment_intent.canceled` (automatic) | webhook | `authorization-expired` | `cancelled` |
| `capture-processing` | `payment_intent.canceled` (raced expiry) | webhook | `authorization-expired` + loud alert | `cancelled` |

Transitions not in this table are rejected. `processing` onward reuses today's fulfillment flow (shipped/delivered/…).

### D. Capture concurrency, idempotency, failure recovery

1. **Claim (CAS):** capture/cancel APIs first execute a guarded update — `payload.update({ where: { id, status: { equals: 'pending-confirmation' } }, data: { status: 'capture-processing', 'capture.claimedBy': user, 'capture.claimedAt': now } })` — and proceed only if a row was affected. A losing concurrent request receives **409 `{ code: 'CAPTURE_IN_PROGRESS' }`** with the current order state.
2. **Verify against Stripe:** fetch the PaymentIntent immediately before acting; if it is not `requires_capture` (already captured/canceled/expired), release the claim, reconcile the order to the PI's actual state, and return that state.
3. **Stripe idempotency key:** every capture call uses key `order:{orderId}:capture` (stable — a retry of the same intent returns the same Stripe result, never a second capture); cancel uses `order:{orderId}:cancel`.
4. **Stripe-success-then-DB-failure:** the money moved; convergence comes from (a) the `payment_intent.succeeded` webhook and (b) a reconciler sweep in the recovery cron that fetches the PI for any order stuck in `capture-processing` > 15 min and applies the table above. `capture-processing` therefore never requires human repair.
5. Same pattern for cancel (claim → verify → cancel → persist; webhook + sweep converge).

### E. Partial capture — persisted order model

Order schema additions (all new fields; **originals are never overwritten** — audit trail is a hard requirement):

- `amounts` group: `authorizedSubtotal`, `authorizedTax`, `authorizedShipping`, `authorizedTotal` (copied at creation) and `capturedSubtotal`, `capturedTax`, `capturedShipping`, `capturedTotal` (set at capture; equal to authorized on full capture). Existing `totalAmount` keeps its current meaning (authorized-time total) and is not mutated.
- Per line: `unavailableQuantity` (int, default 0, `0 ≤ unavailableQuantity ≤ quantity`). Lines are **retained** — never deleted. Fulfillable quantity = `quantity − unavailableQuantity`; packing lists, customer rollups, analytics, and any later refunds compute from fulfillable quantities and captured amounts.
- `payment` group: `paymentIntentId`, `amountAuthorized`, `amountCaptured`, `authorizedAt`, `capturedAt`, `cancelledAt`, `authorizationDeadline`.
- `paymentTimeline` array (append-only): `{ at, actor (user id | 'system' | 'stripe'), action, stripeRef, note }` — the action history alerts and expiry postmortems reference.

**Capture amount math:** captured subtotal = Σ fulfillable qty × unit price; captured tax = recomputed on that subtotal using the **persisted checkout-time tax basis** (below); captured shipping = authorized shipping, unchanged. Invariants (server-enforced before any Stripe call): `capturedTotal ≤ amountAuthorized`; free-shipping stays free even if the reduced subtotal falls under the threshold (customer's favor); a partial capture with zero fulfillable lines is rejected — that's a cancel.

**Tax basis:** checkout preview already computes tax; the order now **persists `taxRate` and the tax-exempt determination at creation time** (sourced from the cart's persisted quote). Partial-capture recomputation uses only these persisted values plus per-line taxability — never the current `TENNESSEE_STATE_TAX_RATE` env, so a config change can't silently alter an in-flight order's charge.

### F. Inventory — single idempotent adjustment mechanism

Current hook restores stock only for `cancelled`/`returned` and can double-restock on replayed updates. Replaced for the new flow by an **inventory adjustment ledger**: order field `inventoryAdjustments[]` of `{ key, lineId, delta, reason, at }` where `key` is unique per (order, line, reason) — e.g. `line:{id}:restock:unavailable`. The adjustment service applies a delta only if its key is absent, then records it; retries and hook replays become no-ops.

- Full cancel / `authorization-expired`: restock full quantities per line (keyed).
- Partial capture: restock only `unavailableQuantity` per line (keyed).
- The legacy `cancelled`/`returned` restore path is migrated onto the same service (statuses extended), eliminating the double-restock class entirely.

### G. Recovery cron (`recover-stripe-orders`)

Extended discovery criteria (currently rejects any session with `payment_status !== 'paid'`):

- Session `payment_status = 'paid'` → existing recovered-paid path (unchanged).
- Session unpaid but PI `requires_capture` and **no order exists** → reconstruct the order as `pending-confirmation` (same reconstruction rules as today: no customer emails, no inventory decrement beyond normal creation behavior, cart marked converted) + **staff alert**: an authorized session had no order — webhook delivery is broken.
- PI `canceled` with no order → record + staff alert (money never moved; customer may need outreach).
- Orders stuck in `capture-processing` > 15 min → reconciler sweep (section D).

### H. Alerts — milestone-deduplicated, deadline-derived

- Order fields: `alerts: { lastMilestone, lastAlertedAt }`. Milestones: `12h`, `24h`, `48h`, `deadline-48h`, `deadline-24h` — the first three derived from `authorizedAt`, the last two from `authorizationDeadline` (persisted at creation; 7 days is the default assumption, reconciled against Stripe data where available).
- Hourly cron sends each milestone **at most once per order** (advances `lastMilestone`), to `STAFF_NOTIFICATION_EMAIL`. Send failures do not advance the milestone (retried next run). Timestamps stored UTC, rendered Central Time in staff-facing copy.
- `deadline-*` milestones also raise the Order Dashboard banner; the daily digest gains a "holds awaiting confirmation" section with age and deadline countdown.

### I. Order Dashboard (staff UI)

"Needs Attention" lists `pending-confirmation` orders with age timer (green <12h, amber <48h, red past 48h; deadline countdown once in `deadline-*` range). Per order: **Confirm & charge**; per-line **unavailable quantity** inputs (0..qty) with live captured-total preview; **Cancel — can't source**. A `capture-processing` order renders as locked with "processing…" state. Errors from the capture API surface verbatim with the order's `paymentTimeline`.

### J. Customer emails

Existing branded template system; new/reworked templates: (1) **Order received** — "we're confirming availability; your card is charged when your order is confirmed, usually within a day"; (2) **Order confirmed** — real receipt at capture; (3) **Partially confirmed** — fulfillable vs unavailable lines, "you were only charged for what shipped" with captured amount, quote-request link for the rest; (4) **Couldn't source** — "the hold on your card has been released — no charge was made."

**Suppression rule:** the generic `sendOrderStatusUpdate` afterChange hook must not fire for transitions into/out of the new statuses (the specialized emails own those). Mechanism: the capture/cancel/webhook code paths pass `context.disableHooks` (existing, verified pattern in Orders.ts) for their own writes and send the specialized email explicitly; additionally the generic hook gains a status allowlist so replayed/manual admin edits can't duplicate hold emails.

### K. Bulk order gate

- **Cart UI** (`CartLineItem.svelte` + add-to-cart paths): for book lines, stepper max = N; at N show "Ordering more than {N}? Request bulk pricing →". Non-book products unaffected.
- **Threshold distribution:** backend exposes `{ bulkGateEnabled, bulkOrderThreshold }` on the existing storefront config endpoint (`GET /api/payment-methods` config payload); the SvelteKit server load fetches it (short TTL cache). The server backstop is authoritative on any mismatch.
- **Server backstop** (`/api/checkout` pre-adapter + `/api/checkout/preview`): reject any **book** line with quantity > N: `400 { code: 'BULK_QUANTITY_EXCEEDED', productTitle, quantity, threshold }`. Storefront catches the code and directs to the request page.
- **Bulk request page** (`/bulk-order-request`): receives **`bookId` + `quantity` only** as query params — a trust boundary, not trusted data. The backend loads the book by id and derives title/ISBN itself; missing/deleted/unpublished book id ⇒ page falls back to the generic quote form. Quantity clamped to [N+1, 500]; requests above 500 are directed to the wholesale partnership form instead.
- **Quote system changes:** for `requestSource: 'bulk-order'` — skip external-API search, store the catalog book relationship on the `bookQuotes` record, quantity ceiling 500 for this source (others keep 100). **Duplicate handling:** same email + same book within 24h updates the existing open request (and says so) rather than creating a second record. Existing staff notification, customer confirmation, and follow-up cron apply unchanged.

### L. Quote paid leg — documented workflow, no code

Addition to `docs/staff-workflows.md`: confirm sourcing → price the quote (wholesale-aware, real freight) → send a **Square Invoice** from the Square app (ACH for institutional buyers) → mark the `bookQuotes` record fulfilled. Fee footnote: Square ACH ~1% uncapped vs Stripe 0.8%/$5 cap — accepted for tool consolidation; verify current Square rates when writing the doc.

## Configuration

- `MANUAL_CAPTURE_ENABLED` (default `false`) — gates *session creation* only (see Rollback)
- `BULK_ORDER_GATE_ENABLED` (default `false`) — gates cart cap, server backstop, request page
- `BULK_ORDER_QUANTITY_THRESHOLD` (default `10`)
- Alert milestone offsets as module constants
- Schema changes (`Orders`, `bookQuotes`, unique constraint on `payment.stripeSessionId`) ⇒ `pnpm generate:types` + generated Postgres DDL reviewed **before** deploy (July 8 schema-drift incident applies); pre-deploy audit query for existing duplicate `stripeSessionId` rows

## Rollback semantics

Flipping `MANUAL_CAPTURE_ENABLED` off stops *creating* new holds; it does not end the feature: in-flight holds still require the capture endpoints, dashboard UI, webhook handlers, alert cron, and reconciler to remain deployed and operating until the last hold resolves (≤ 7 days). Alerts continue for in-flight holds regardless of flag state. Legacy automatic-capture orders and new holds coexist; all handlers branch on the order's own payment state, never on the current flag.

## Error handling summary

- Capture/cancel API: claim-CAS 409s, live-PI verification, verbatim Stripe errors to the dashboard, no silent retries.
- Webhooks: idempotent handlers; events before order existence fall through to reconciliation; `checkout.session.completed` keeps throw-on-missing-cart (Stripe retries).
- Stripe-success/DB-failure: converges via webhook + reconciler sweep (D.4); Stripe is the financial source of truth.
- Expiry on an order staff believed handled: alert includes `paymentTimeline`.

## Testing

**Unit** (existing Node runner, dummy Stripe key): gate threshold (book line at N passes, N+1 rejected; non-book over N passes); partial-capture math (per-line partial quantity, tax recompute from persisted basis, tax-exempt and mixed-taxability orders, shipping invariant, ≤-authorized invariant, free-shipping edge, zero-fulfillable rejected); state-machine transition table (legal + rejected transitions, idempotent webhook replay); capture claim CAS (two racing staff requests → one 409); capture-vs-expiry race; Stripe-success-then-persist-failure convergence; inventory ledger idempotency (replayed hook → no double restock; partial restock quantities); alert milestone dedupe; recovery classification (paid / requires_capture-no-order / canceled-no-order / stuck capture-processing); bulk quote source branch (no external search, ceiling 500, duplicate-submission update, deleted bookId fallback, >500 redirect); legacy automatic-capture orders processed correctly while flag is on.

**E2E (Stripe test mode + Stripe CLI webhook forwarding for real event ordering):** hold checkout → dashboard full capture; partial capture (including partial quantity within a line); cancel; `payment_intent.canceled` expiry simulation; webhook-before-order ordering; bulk gate stepper cap, request-page prefill from bookId → `bookQuotes` record + emails; server backstop on an over-N cart; success-page wording (and basic a11y) in hold mode.

## Rollout

1. Deploy dark (both enable flags off) — behavior unchanged; DDL applied and verified first.
2. Flip `MANUAL_CAPTURE_ENABLED` on a quiet morning; place a real small order; confirm from the dashboard; verify capture, fee, and emails in Stripe Dashboard + inbox.
3. Enable `BULK_ORDER_GATE_ENABLED` after the storefront deploy that carries the cart UI.
4. Rollback = flag off; in-flight holds drain per Rollback semantics.

## Out of scope (recorded fast-follows)

- Ingram availability → automated capture decision (auto-capture Ingram-available titles)
- Automated Square invoice creation from `bookQuotes` records
- Square hosted-checkout adapter delayed capture
- Any auto-capture/auto-cancel backstop — **explicitly rejected**: human-only capture
