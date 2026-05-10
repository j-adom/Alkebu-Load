# Payload Admin UX + Customer Foundation — Design

**Date:** 2026-05-10
**Status:** Approved (design phase); awaiting implementation plan
**Owners:** Backend (alkebu-load)
**Related docs:** [PRD.md](../../PRD.md), [architecture.md](../../architecture.md), [LAUNCH-CHECKLIST.md](../../LAUNCH-CHECKLIST.md), [STAFF-WORKFLOWS.md](../../STAFF-WORKFLOWS.md)

---

## 1. Summary

Six changes to the Payload admin and underlying customer data model:

1. Books list shows the populated relationship data (auto-link hook + backfill).
2. Dense, click-to-expand inline-edit row component for **Books** and **Orders**.
3. Root URL `payload.alkebulanimages.com` redirects straight to `/admin` instead of the default welcome page.
4. Three small fixes: Order Dashboard sidebar link visibility, root-page redirect, and the `<No Customer>` / "email-in-Name" display issue in the Order Dashboard.
5. Auto-upsert a `Customers` row on every paid order; rewire `Orders.customer` to point at the `Customers` collection (not `Users`); backfill historical orders; populate `totalOrders`/`totalSpent`/`lastOrderDate` rollups.
6. Reconcile the three reference docs (PRD, architecture, staff workflows) to the new canonical model.

Strategic anchor: **`Customers` is the canonical shopper entity across all channels** (ecom now; POS, imported customers, B2B later). `Users` is staff-only.

## 2. Motivation & alignment

The doc set already points in this direction; this spec accelerates work that was already on the roadmap.

- The Payload-only architecture decision ([architecture.md:18-27](../../architecture.md#L18-L27)) calls for a unified data model and single admin interface. Customers being unwritten breaks that promise.
- `Customers` exists in the schema as the "extended user profile" entity ([PRD.md:182](../../PRD.md#L182)) — it's defined, never populated.
- Customer loyalty integration and Listmonk marketing are Phase 2 ([PRD.md:238-239](../../PRD.md#L238-L239)). Both require a real customer table. Centralizing now is the prerequisite; it also reduces dependency on Square's loyalty and marketing add-ons.
- NocoDB BI is Phase 3 ([PRD.md:243-244](../../PRD.md#L243-L244)) — the rollup fields feed it.
- Backfilling `authors` from `authorsText` is already on the P3 list ([LAUNCH-CHECKLIST.md:152](../../LAUNCH-CHECKLIST.md#L152)). Author cards / author pages in search are also on P3 ([LAUNCH-CHECKLIST.md:151](../../LAUNCH-CHECKLIST.md#L151)). Both unblock once relational data exists.
- Square → Payload data centralization (currently inventory-only) is anticipated in Phase 3 via n8n ([architecture.md:397](../../architecture.md#L397)). Schema fields here (`source`, `squareCustomerId`) prepare for that without building it.

## 3. Strategic position — entity model

**Canonical:** `Customers` = every shopper, every channel. Auth-enabled. Source of truth for loyalty, marketing, BI, repeat-buyer detection.
**Staff:** `Users` = admin / staff / editor only. The `customer` role on `Users` is retired (no rows have ever used it).

Reasoning:
- Already where the actual `Customers.ts` code points (auth-enabled, standalone).
- Cleanest path to Square Customer Directory import (one Customer row per Square customer).
- In-store walk-ins and ecom shoppers coexist in one table without polluting the staff list.
- Loyalty/marketing/BI features have one place to read from.

Tradeoff accepted: a small reconciliation burden in the docs and a one-line schema rewire on `Orders.customer`. No live customer accounts exist today, so there is no user-visible migration cost.

## 4. Detailed design

### 4.1 Books data mismatch fix

**Problem:** Books list shows `<No Authors>` / `<No Publisher>` / `<No Vendor>` for every row because [defaultColumns](../../../alkebu-load/src/collections/Books.tsx#L67) references the **relationship** fields, but imported book data lives on the **text** fallback fields (`authorsText`, `publisherText`). The auto-link hook ([afterChange in Books.tsx](../../../alkebu-load/src/collections/Books.tsx#L838)) is commented out (`⚠️ TEMPORARILY DISABLED FOR BATCH ENRICHMENT SCRIPT`).

**Fix:**

1. Re-enable `autoLinkAuthors` in the `afterChange` hook. The batch enrichment it was disabled for is done.
2. Add `autoLinkPublisher` and `autoLinkVendor` helpers following the same shape (look up text → create-if-missing → attach relationship). `Publishers` and `Vendors` are flat collections; the helpers are simple.
3. Write `alkebu-load/scripts/backfill-author-publisher-vendor-links.ts`:
   - Iterates books where the relationship is empty AND the corresponding text field is populated.
   - Calls the same helpers used by the hook.
   - Idempotent. Dry-run mode (`--dry-run`). Summary at the end (scanned / linked / skipped / failed).
4. Workflow: dry-run on prod → review counts → run for real → spot-check 5 books → verify list view.

**Risk:** the hook fires on every save afterward. That's correct behavior; first save after deploy re-walks text for any book the backfill missed. Idempotent.

**Unblocked future work (not built here):** clicking an author cell navigates to that author's admin page; future storefront author pages with bio + linked blog posts have populated data to read.

### 4.2 Dense list + inline-edit rows for Books and Orders

**Approach:** replace each collection's list view via `admin.components.views.list.Component` with a thin component that queries through Payload's standard API (no schema risk), renders rows in a dense format, and expands inline using Payload's own `<Form>` primitives on click.

**Shared `<DenseRow>` shell** at `alkebu-load/src/app/components/admin/DenseRow.tsx`:
- Handles expand/collapse state.
- Keyboard nav: ↑/↓ move between rows, Enter expands, Esc collapses.
- Row chrome (chevron, hover state, focus ring).
- Books and Orders each pass in their own `summary` and `editor` render props.
- Styling uses Payload's existing CSS variables (`--theme-elevation-*`, `--theme-text`, etc.) so themes/dark mode work for free.

**Books row (collapsed summary):**

```
▸ {cover}  {title} · {authors} · {publisher} · ${price} · {status} · stock: {n}  ⋯
```

- `{authors}` cell: relationship if linked, else `authorsText`, else `—` (smart-fallback Cell component, reused as a regular column Cell too).
- Same fallback for publisher (`publisherText`) and vendor.
- `{cover}` is a 24px thumbnail.
- `⋯` opens the full edit page (escape hatch for fields not in the inline editor).

**Books inline editor:**
- Title, Authors (multi-select relationship), Publisher, Price (primary edition), Stock (primary edition), Status, isActive.
- Save uses Payload's standard update mutation so all hooks fire (including auto-link).
- Anything else (description, editions array, SEO) goes via `⋯`.

**Orders row (collapsed summary):**

```
▸ {orderNumber} · {customerName} · {status} · ${total/100} · {createdAt}  ⋯
```

- `{customerName}` cell: linked `Customers.displayName` if present, else shipping-address `firstName + lastName`, else `guestEmail`, else `—` (same fallback logic as the Order Dashboard fix in §4.4).
- Status renders as a colored pill (paid / shipped / processing / etc.).

**Orders inline editor:**
- Status (the dominant routine edit).
- Tracking number + carrier if those fields exist on the collection (verify during implementation).
- Internal notes if present.
- Refunds, item edits, customer reassignment → full page via `⋯` or the existing Order Dashboard.

**Pagination / filters / sorting** stay on Payload defaults. The custom view replaces row rendering, not page chrome.

**Risk to mitigate during implementation:** the v3.x list-view replacement API has shifted across minor versions. Pin to 3.79.x. Fallback: a custom one-wide Cell that renders the whole row (same user-visible result, simpler API surface, no view-replacement). Decide at first implementation step which is more stable.

**Build order:**

1. `<DenseRow>` shell + keyboard nav (collapsed summary only) on Books.
2. Smart-fallback Cells (authors / publisher / vendor) on Books.
3. Inline editor for Books.
4. Same shell on Orders, customer-name fallback Cell.
5. Inline editor for Orders.

Each step is independently shippable and verifiable.

**Scope explicitly excluded:** other collections (Carts, Customers, Authors, etc.) keep default Payload views. Pattern can be copied later if it proves out.

### 4.3 Root URL redirect

Replace [alkebu-load/src/app/(frontend)/page.tsx](../../../alkebu-load/src/app/(frontend)/page.tsx) with a one-line server-side redirect to `/admin`:

```tsx
import { redirect } from 'next/navigation'
export default function HomePage() { redirect('/admin') }
```

Delete `(frontend)/styles.css` if nothing else references it. Eliminates the welcome page, the new-tab anchor, and the manual click.

Justification: the storefront lives on a separate Cloudflare domain, so this subdomain has no public frontend to serve. Redirecting matches the community-standard practice for headless/backend-only Payload deploys ([Payload community Q&A](https://payloadcms.com/community-help/discord/can-we-redirect-to-non-admin-route-after-login)).

### 4.4 Three small fixes

**(a) Order Dashboard nav link visibility**
The `OrderDashboardNavLink` is wired into [payload.config.ts:111](../../../alkebu-load/src/payload.config.ts#L111) via `afterNavLinks`, but [importMap.js](../../../alkebu-load/src/app/(payload)/admin/importMap.js) was generated before the component was added. Fix: run `pnpm generate:importmap`, commit the regenerated file.

Optional polish: the current link's purple gradient styling reads as a marketing banner. Tone it down to match Payload sidebar conventions (border, slight elevation, theme variables) — small CSS tweak in the same PR.

**(b) Order Dashboard "Name" field shows email instead of name**
In [`getCustomerName()` at OrderDashboardV2.tsx:158](../../../alkebu-load/src/app/components/OrderDashboardV2.tsx#L158), the function falls back directly from no-linked-customer to `guestEmail`, skipping the shipping address. Insert a shipping-address fallback step:

```
1. Linked customer's displayName / firstName + lastName
2. Shipping address firstName + lastName   ← new
3. Guest email
4. 'Guest'
```

Centralized in the helper so every call site (table row, expanded detail at [line 1141](../../../alkebu-load/src/app/components/OrderDashboardV2.tsx#L1141), CSV export at [line 736](../../../alkebu-load/src/app/components/OrderDashboardV2.tsx#L736), packing slip at [line 438](../../../alkebu-load/src/app/components/OrderDashboardV2.tsx#L438)) picks it up.

Note: once §4.5 lands, the linked-customer branch will usually win, but this fallback stays as defense-in-depth for orders the upsert hook misses (e.g. admin-created without an email).

**(c) Root redirect** — see §4.3.

### 4.5 Customer auto-upsert + relationship rewire

**(a) Schema rewire** — [Orders.ts:34](../../../alkebu-load/src/collections/Orders.ts#L34) and [:492](../../../alkebu-load/src/collections/Orders.ts#L492): `relationTo: 'users'` → `relationTo: 'customers'`. Regenerate types and Payload migration. Pre-check existing rows for any `customer` linked to a Users ID (probably zero) and null those before applying so they get re-linked properly by the backfill.

**(b) New fields on `Customers`** (positioning the entity for future channels):

| Field | Type | Purpose |
|---|---|---|
| `source` | select: `ecom \| pos \| imported \| manual` | Track origin channel. Default `ecom`. |
| `accountStatus` | select: `ghost \| invited \| active` | Login eligibility. Default `ghost` for system-created. |
| `squareCustomerId` | text, indexed | Dedupe key for future Square Customer Directory import. |

**(c) Orders `afterChange` upsert hook**

1. If `customer` already linked → skip.
2. Resolve email: `guestEmail` first, else Stripe webhook customer email if available on the payload.
3. If no email → skip.
4. Find Customer by email (case-insensitive). Hit → link. Miss → create with `source: 'ecom'`, `accountStatus: 'ghost'`, name + address from shipping data.
5. Update Order's `customer` field with `disableHooks: true` to prevent recursion.

**(d) Customer auth handling for ghost rows**

- Generate a 32-byte cryptographically-random password (unhittable).
- Suppress verification email on create. Payload v3 supports `disableEmail: true` on auth-collection creates — confirm exact flag during implementation; if unavailable, set `verify: false` collection-wide and re-enable only when self-registration is added.
- Login is rejected for `accountStatus: 'ghost'`. Future "claim your account" flow (out of scope here) lets the customer do password-reset, which sets `accountStatus: 'active'`.

**(e) Backfill script**

`alkebu-load/scripts/backfill-customers-from-orders.ts`:

- Group existing orders by `guestEmail` (case-insensitive).
- For each unique email: create one Customer using the first occurrence's shipping name/address.
- Link every order in the group to that Customer (with `disableHooks: true`).
- Trigger rollup recompute for each Customer.
- Dry-run mode (`--dry-run`). Idempotent. Summary report.

**(f) Rollup hook**

Orders `afterChange` (runs after the customer link is set) recomputes the linked Customer's rollups:

- `totalOrders` = count of that customer's non-`cancelled`, non-`returned` orders.
- `totalSpent` = sum of `totalAmount` across the same set.
- `lastOrderDate` = max `createdAt` across the same set.

Writes back via `payload.update` with `disableHooks: true`. Triggered on order create OR status change.

### 4.6 Documentation reconciliation

Single follow-up commit updating:

- [docs/architecture.md:98-103](../../architecture.md#L98-L103) — replace the "Customers extends Users via `user` relationship" tree with the actual standalone shape (auth-enabled, `source`, `accountStatus`, `squareCustomerId`, rollups).
- [docs/PRD.md:182](../../PRD.md#L182) — clarify Customers' role (canonical shopper entity, all channels). Update the data-flow diagram if needed.
- [docs/PRD.md:202](../../PRD.md#L202) and [docs/STAFF-WORKFLOWS.md:295-302](../../STAFF-WORKFLOWS.md#L295-L302) — remove the `customer` role from Users tables; note customers live in Customers.

## 5. Out of scope (preserved as future work, foundation supports them)

- **Square Customer Directory import** → reads into `Customers` with `source: 'pos'`, dedupes by email / `squareCustomerId`. Future Phase 3 / n8n work.
- **Loyalty points** → new field/collection on `Customers`. Phase 2.
- **Listmonk segmentation** → query Customers by `source`, rollups, last-order recency. Phase 2.
- **Customer self-registration + ghost-claim flow** → password-reset converts `ghost` → `active`. Needs storefront UI; out of scope for this admin-side spec.
- **In-store POS sales attribution** → Orders gets a `channel` field (`ecom | pos`); POS orders link to Customer by phone/email/Square ID. Out of scope here.
- **Dense view for collections beyond Books and Orders.** Pattern can be copied if it proves out.
- **Storefront author pages** (bio + linked blog articles) — unblocked by §4.1 data fix, but the page itself is a separate spec.

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Payload v3.x list-view replacement API has shifted across minor versions; pinning may break on upgrade. | Fallback strategy: one-wide custom Cell rendering the whole row (no view replacement). Decide at first implementation step which is stable. Pin Payload version in `package.json`. |
| Auto-link hook will fire on every save afterward, including bulk operations. | Hook is idempotent — short-circuits if relationship is already set. Bulk imports can pass `disableHooks: true` if needed. |
| Schema change on `Orders.customer.relationTo` requires migration; could be lossy if any historical rows point at Users. | Pre-check during migration: SELECT and null any orders pointing at Users; backfill will re-link them. No live customer accounts exist on Users today, so risk is near-zero. |
| `Customers` is auth-enabled with `verify: true`; auto-creating rows might fire verification emails to people who didn't sign up. | Verify Payload's `disableEmail: true` flag works on create. If not, set `verify: false` at collection level and re-enable when self-registration is built. |
| Backfill on prod writes ~all order rows. | Dry-run first; idempotent so re-runnable; isolated from other systems (no external API calls). |
| Rollup hook adds writes on every order status change. | `disableHooks: true` on the rollup write prevents recursion. Writes are scoped to a single Customer row. |

## 7. Verification

Per change:

- **§4.1 Books data:** dry-run prints expected links; after real run, spot-check 5 books in admin — author/publisher cells show linked names; list view shows the same.
- **§4.2 Dense rows:** Books and Orders list pages render dense rows; click expands inline editor; save persists; full edit page still reachable via `⋯`.
- **§4.3 Root redirect:** `curl -I https://payload.alkebulanimages.com/` returns 307/308 to `/admin`. Browser navigates with no welcome page flash.
- **§4.4 Nav link + name fallback:** Order Dashboard appears in admin sidebar; "Name" column shows shipping-address name (not email) for guest orders.
- **§4.5 Customer upsert:**
  - New test order via Stripe → Customer row auto-created with `source: ecom`, `accountStatus: ghost`, name + address populated. Order's `customer` field links to it.
  - Customer rollup fields populated correctly.
  - Backfill against staging DB: customer count = unique guest-email count; every order linked; rollups match SUM/COUNT of source data.
- **§4.6 Doc updates:** PRs link to this spec; docs no longer contradict the canonical model.

## 8. Implementation sequencing

Customer foundation (§4.5) should land **before** dense Orders rows (§4.2 steps 4–5) so the dense Orders row's customer cell can render the linked customer directly without complex fallback. Suggested order:

1. §4.3 Root redirect (5-minute fix, ships first as confidence-builder).
2. §4.4(a) Nav link `generate:importmap` (one command).
3. §4.4(b) Name-fallback fix (one helper change, defense-in-depth).
4. §4.1 Books data fix (re-enable hook + backfill).
5. §4.2 steps 1–3 (DenseRow + smart-fallback Cells + Books inline edit).
6. §4.5 Customer foundation (schema rewire + hooks + backfill + fields).
7. §4.2 steps 4–5 (DenseRow applied to Orders + Orders inline edit).
8. §4.6 Doc reconciliation.

Plan-level dependencies and detailed task breakdown go in the implementation plan.
