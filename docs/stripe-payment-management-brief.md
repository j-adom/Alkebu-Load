# Stripe Payment Management Brief

**Date:** July 17, 2026
**Context:** Deciding how to handle large ("bulk") book orders so we stop risking eaten Stripe fees on refunds for orders we can't fulfill, and understanding the full menu of Stripe payment-timing options before committing to a design.
**Status:** Educational brief — no decisions locked. Decisions so far in the companion design conversation: bulk gate = cap in cart + server backstop, per cart line, N=10 (env-configurable), intake reuses `bookQuotes`.

---

## 1. The problem in one paragraph

Today every checkout charges the card instantly (Stripe hosted Checkout, automatic capture). If a customer orders 30 copies of a title that turns out to be out of print, our only undo is a refund — and **Stripe keeps its processing fee on refunds** (~2.9% + 30¢ on card payments). On a $600 order that's roughly **$17.70 lost**, plus we held a customer's money for a purchase we couldn't complete, and a charged-then-refunded payment can still be disputed ($15 dispute fee each, win or lose). The question is which of Stripe's tools — quantity gating, authorization holds, card vaulting, or invoicing — best prevents this.

---

## 2. How a card payment actually works

Every card payment is **two separate bank operations**, always:

1. **Authorization ("auth")** — Stripe asks the customer's issuing bank: is the card real, are the funds there, do you approve? The bank says yes and *earmarks* the amount. **No money has moved.** The customer sees a "pending" transaction; on a debit card, their spendable balance drops immediately.
2. **Capture** — the instruction to actually move the earmarked funds. This is when Stripe's fee applies and settlement begins.

"Automatic capture" (our current setup) runs both steps in the same instant. "Pre-auth" / "manual capture" simply un-bundles them (`capture_method: 'manual'` on the PaymentIntent, settable through hosted Checkout via `payment_intent_data`). All fraud screening (Radar), CVC/AVS checks, and funds verification happen at the **auth** step — which is why a capture within the window essentially never fails: the money is already reserved.

---

## 3. The five payment-timing models Stripe offers

| # | Model | Money moves | Cost to undo | Time limit | Best for |
|---|-------|-------------|--------------|------------|----------|
| 1 | **Charge now** (today's setup) | at checkout | ~3% eaten on refund | — | in-stock retail |
| 2 | **Auth now, capture later** | at capture | **$0** (cancel the auth) | **~7 days**, hard | short stock checks; capture-on-ship |
| 3 | **Vault card, charge later** (SetupIntent) | when we charge | $0 (never charge) | none — but the later charge can decline | known buyer, final price unknown |
| 4 | **Stripe Invoice** | when customer pays | $0 (never send) | we set the terms | quoted/negotiated orders, B2B |
| 5 | **Payment Link** | when customer pays | $0 | we set expiry | one-off quoted amounts, lighter than invoicing |

Models 4 and 5 have a property the others don't: **money only ever moves after we've committed to fulfill.** The refund-fee scenario cannot occur.

---

## 4. Authorization holds in depth (model 2)

### What we get as a standard e-commerce merchant

- **Hold window: ~7 days for online card payments.** After that the auth expires automatically — the hold drops off the customer's card, Stripe fires a `charge.expired` webhook, and the sale is simply gone. No grace period.
- **Cancel any time before capture — free.** The pending transaction disappears from the customer's statement within a day or two (issuer-dependent). A canceled auth **cannot be disputed** — there's no charge to dispute.
- **Partial capture** — capture less than authorized (e.g., authorized $540 for 10 copies, only 8 sourceable → capture $432; the $108 remainder releases automatically). Fee applies only to the captured amount. **One capture per auth** — you cannot capture twice against the same hold.
- **Customer experience at checkout is identical** to today. The difference is on their statement: a pending hold instead of a posted charge (most customers can't tell the difference; debit-card users feel the balance reduction either way).

### What we do NOT get

The card networks gate the fancier auth features by merchant category, and a bookstore's MCC does not qualify:

- **Extended authorizations** (up to 30 days) — hotels, car rental, cruise lines only.
- **Incremental authorization** (raise the hold amount later) — same restricted categories.
- **Overcapture** (capture more than authorized) — same.

The 7-day ceiling is a card-network rule, not a Stripe setting. No flag removes it.

### The operational failure mode, and its fix

Manual capture's real risk isn't financial — it's **forgetting to capture**. An untouched auth silently expires at day 7 and the revenue is lost. The clean mitigation is a **backstop cron: auto-capture anything still uncaptured at day 5–6 unless staff explicitly canceled it.** That flips the failure mode from "forgot to capture → lost sale" to "forgot to review → same behavior as today." With the backstop, holds are operationally safe for a small team.

### What adopting holds would touch in our codebase

This is why "just add one parameter" undersells it:

- `checkout.session.completed` currently means *paid*; with manual capture it means *authorized* — the Stripe webhook handler and order creation need a new `pending-confirmation` order status.
- Order confirmation email needs honest wording: "your card will be charged when we ship."
- Order Dashboard needs **Capture** / **Cancel** actions (natural fit for the "Needs Attention" tab).
- The hourly `recover-stripe-orders` cron assumes paid sessions and must learn about uncaptured ones.
- New backstop cron (above).

Estimate: this roughly doubles the bulk-gate project.

---

## 5. Card vaulting (model 3) — the "auth without a deadline"

A **SetupIntent** runs a $0 validation against the card (real card? passes CVC/AVS and Radar?) and saves it for charging later — days or weeks later, for **any amount** (a negotiated bulk price, real freight instead of Media Mail math). The mirror-image trade against a true auth:

| | True auth (manual capture) | Vault ($0 validation + SetupIntent) |
|---|---|---|
| Funds guaranteed | ✅ for 7 days | ❌ later charge can decline |
| Customer's balance held | ✅ visible, esp. debit | ❌ invisible |
| Time limit | 7 days, hard | none |
| Amount flexibility | capture ≤ authorized only | any amount |
| Dispute exposure if canceled | none | n/a (nothing charged) |

**Rule of thumb:** if the open question is *"can I fulfill this within a few days?"* → auth. If it's *"what will the final price be, and when?"* → vault or invoice, because both the 7-day clock and the capture-≤-authorized rule fight you.

---

## 6. Invoicing & Payment Links (models 4–5) — the B2B tools

- **Stripe Invoicing:** staff send a Stripe-hosted invoice by email; customer clicks and pays. Stripe adds a small per-paid-invoice fee (~0.4–0.5% depending on plan) on top of processing. Supports net terms, reminders, and partial payments. Can be sent entirely **from the Stripe Dashboard — zero code required.**
- **Payment Links:** a one-off payment page for a fixed amount ("30 × Title X @ $13.50 + freight = $445"). No invoicing fee, less formal, also zero code.
- **The ACH lever — the biggest fee fact in this brief:** invoices and payment links can accept **ACH bank debit at 0.8% capped at $5.** On a $600 bulk order: **$5 instead of ~$17.70** of card fees. Schools, libraries, and nonprofits often *prefer* paying invoices by bank transfer anyway. (ACH settles in ~4 business days and can fail/return, so ship after settlement for new customers.)
- Stripe also has a **Quotes API** (quote → customer accepts → auto-converts to invoice) — more machinery than we need at current volume; noted for the future.

---

## 7. The fee math, honestly

- Card processing: ~2.9% + 30¢. **Kept by Stripe on refunds** (policy since 2019).
- Canceled (uncaptured) authorization: **$0**.
- Dispute: $15 per dispute regardless of outcome. Canceled auths can't be disputed.
- ACH debit: 0.8% **capped at $5**.
- Expected-value framing for holds: the saving materializes **only on orders we decline**. If 1 in 10 gated orders proves unfulfillable, expected saving ≈ $1.50–$1.80 per gated $500–600 order — real, but it pays for a staff workflow step, not a vacation. The dispute-avoidance and customer-trust benefits are secondary but nonzero.
- Verify current rates against [stripe.com/pricing](https://stripe.com/pricing) before relying on exact numbers; the ones above are the standard US online rates as of mid-2026.

---

## 8. How this maps onto Alkebulan Images

**The >10-copies problem is not an auth problem.** A 30-copy order's real uncertainties are *price* (wholesale-ish pricing, real freight vs Media Mail math) and *sourcing time* (Ingram availability, possibly weeks) — both incompatible with a 7-day hold at retail price. The right shape:

```
Cart line > N (10)
   → gate: stepper caps at N; "Ordering more? Request bulk pricing →"
   → bookQuotes intake (pre-filled title/ISBN/quantity; requestSource: 'bulk-order')
   → staff confirm sourcing + price (Square stock, Ingram once live)
   → staff send Stripe Invoice or Payment Link from the Dashboard (card + ACH)
   → money moves once, after certainty; ACH caps the fee at $5
```

The paid leg requires **no new payment code** — Dashboard-driven, like Phase 1 refunds.

**Authorization holds are a tool for the sub-threshold orders we still charge at checkout.** Three viable recipes, in rough order of fit:

- **A. Capture-on-ship (all orders):** every order auths at checkout; staff capture when the package ships; backstop cron auto-captures at day 5–6. Honest messaging, zero fees on any canceled order, works because we ship well within 7 days. The strongest version of "hold everything" — the trigger is shipment, not an arbitrary timer.
- **B. Threshold holds:** same, but only for carts above ~$300. Protection where fees are material; smaller blast radius; two checkout behaviors to reason about.
- **C. Auth-then-fallback-to-invoice:** auth at checkout, cancel and invoice if sourcing exceeds ~6 days. Most moving parts; not a launch shape.

**The structural fix is neither gating nor holds — it's availability data.** Square stock sync already works; the Ingram availability engine (designed, waiting on the contract) will let the storefront gate *at add-to-cart time* for titles we can't source. Once that lands, unfulfillable orders shrink at every size, and holds become insurance on a shrinking risk. This argues for keeping any holds build small or deferred.

---

## 9. Recommendation

1. **Now:** ship the bulk-order quote gate (cart cap at N=10 + server backstop → `bookQuotes` intake). Document the Dashboard invoice/Payment Link workflow (with ACH enabled) in staff docs as the paid leg.
2. **Defer, pre-designed:** capture-on-ship holds (recipe A or B with the auto-capture backstop). Adopt only if unfulfillable-order refunds recur in practice.
3. **Keep pushing:** the Ingram availability engine — it retires the root cause.

## 10. Open decisions

- Auth-holds scope: none now (recommended) / capture-on-ship for all / threshold-only.
- Whether the `bookQuotes` API's current quantity ceiling (100) is the right cap for bulk requests.
- Exact wording + placement of the "Request bulk pricing" prompt in the cart UI.
