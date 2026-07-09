# Ingram Availability & Discovery Engine — Design

**Date:** 2026-07-09
**Status:** Approved design; implementation gated on Ingram contract/credentials
**Branch:** `feat/ingram-availability-engine`

## Context

Alkebu-Lan Images is a curated, Nashville-based Black-owned bookstore (~5,000-title
catalog in Payload). Online availability is currently driven by Square physical on-hand
only. The store has been offered **free access to Ingram Data Services** (Ingram is the
country's primary book wholesaler; its La Vergne, TN flagship DC is ~20 min away). The
package Ingram is contracting:

- **Titles Basic w/ Full Publisher Marketing and Inventory** — daily/weekly FTP data files.
- **Web Service with Images, Publisher Marketing, and Inventory** — real-time SOAP/REST API.

This design uses Ingram to make the store the **primary book source for loyal buyers** and
to **capture long-tail sales in-house** (instead of losing them to Amazon or a Bookshop.org
affiliate link), while staying deliberately curated — *not* trying to be a general-catalog
store competing on SEO breadth.

### Strategic rationale
**Bookshop.org's fulfillment *is* Ingram** — it's a thin, low-margin Ingram storefront skin.
Building our own Ingram-backed store means offering the same catalog Bookshop does while
keeping the customer relationship and the margin. This also means an affiliate fallback is
pointless: a title Ingram can't fulfill, Bookshop can't either.

## Goals

- Unified **"In Stock"** for customers — no visible distinction between physically-in-store
  and Ingram-fulfillable stock (both ship within the existing 3–8 day promise; Ingram
  Direct-to-Home orders placed within 24h ship next business day).
- **Capture long-tail** demand in-house via an on-demand Ingram search.
- **Profitable:** Ingram wholesale margin; minimal infrastructure/ops.
- **High maintainability:** no heavy ETL; the smallest amount of machinery that works.
- Keep the curated store the **only** thing indexed/SEO'd.

## Non-goals (explicitly deferred or rejected)

- **FTP feed ingestion for availability** — rejected as the backbone (heavy 15GB/day ETL over
  Ingram's full ~18.9M-title universe to answer a question a single cached API call answers).
  The FTP feed is retained *only* as an optional future **metadata/cover enrichment** phase.
- **12-month Square sales-history engine** — replaced by a simple manual "available to order" flag.
- **Affiliate (Bookshop.org) fallback** — redundant (Bookshop = Ingram).
- **Automated Ingram order placement** — Phase 1 fulfillment is manual via iPage.
- **Indexing long-tail / special-order results** — always `noindex`, never in the sitemap.

## Architecture: two stages

- **Stage 1 — Store Inventory:** the curated Payload catalog. The only content indexed/SEO'd.
  Availability computed per the resolution model below.
- **Stage 2 — Long-tail Discovery:** a deliberate, bot-gated "look wider" search that queries
  the Ingram Web Service live and presents buyable, `noindex` results.

## Availability resolution model (Stage 1)

A pure resolver `resolveAvailability(book)` → `{ state, source, shipEstimate }` is the single
source of truth; the whole storefront reads only this (extends existing
`alkebu-web/src/lib/utils/bookAvailability.ts`).

A book is **In Stock** if **any** edition satisfies **any** of:
1. **Square on-hand > 0** — physical, from the existing Square `inventory.count.updated` webhook.
2. **Ingram available** — cached `ingramOnHand > threshold` (default **10**, config
   `INGRAM_STOCK_THRESHOLD`), keyed on **LaVergne** `OnHand` (primary) with other DCs as fallback.
3. **Available to order** — manual owner-set checkbox (for non-Ingram vendor titles, e.g.
   Afrikan World Books).

Otherwise → **Request** (existing quote-request flow). Customer-facing states:

| State | Signal | CTA | Source coverage |
|---|---|---|---|
| `in_stock` | ● `In stock · Ships in 3–8 days` | Add to Cart | Square on-hand / Ingram>threshold / available-to-order (indistinguishable) |
| `special_order` | ● `We'll bring it in for you · Ships in 3–8 days` | Add to Cart | long-tail (Stage 2, not in catalog) |
| `request` | ○ `Request this title` | Request | out-of-print / unfulfillable |

No red "Out of stock" state — with Ingram behind the catalog, the honest floor is "Request".

## Ingram Web Service integration

The single required integration. Built behind an **`AvailabilityProvider` interface** so it is
mockable (from the sample XML responses on hand) and swappable to the FTP feed later.

- **Transport:** REST + Basic Auth (base64 `user:password`). Endpoints in env:
  test `https://idswebtest.ingramcontent.com/cws/companion.asmx`, production URL on approval.
- **`checkStock(isbns[])`** → **Query Type 9**, `liveUpdate=Y`, `dataRequest=STK`, **batched ≤25
  ISBNs per call** (`query=BN="isbn" or "isbn" …`). Parses `Product > Ingram > Stock > <DC> >
  OnHand` per DC → `ingramOnHand` (LaVergne primary), `ingramAvailable`.
- **`searchLongTail(query, scope)`** → Query Type 1 (book bibliographic) + stock, using mnemonics
  `TI=` (title), contributor (author), `KW=`/BISAC (topic) per the guided scope.
- **`findFamily(isbn)`** → Query Type 6 (Family) — used by the Edition Consolidation companion phase.
- **Graceful degradation:** timeouts/errors never break a page render; fall back to cached value
  or Square on-hand, log, and continue.

### Compliance guardrails
Web Service terms prohibit **mirroring data into a database** and require **caching with a limited
refresh interval**. Therefore: the `ingram*` fields on editions are a **TTL cache**, refreshed on a
schedule — not an authoritative mirror. Long-tail results are **never persisted or indexed**.
Confirm the nightly catalog-refresh volume is within subscription limits with the Ingram rep.

## Stage 1 — scheduled availability refresh

Payload cron `refresh-ingram-availability`:
- Iterate catalog editions with ISBNs → batch 25 → `checkStock` → write cache fields.
- **Cadence configurable** (default nightly; dial back if volume limits require — Ingram trade
  stock is stable, so daily is likely more than enough).
- ~5,000 titles ≈ ~200 API calls per run. Log counts for volume monitoring.

## Stage 1 — checkout-time live confirm

In the quote-locked `/api/checkout/preview` path, run a live `checkStock` on the cart's
Ingram-sourced ISBNs. If a line dropped below threshold and isn't physically on-hand, surface a
gentle notice (it usually stays fulfillable as a special order; only if Ingram also can't fulfill
→ Request/Remove). This is the real overselling guard, independent of cache age.

## Stage 2 — long-tail discovery flow (deliberate, bot-gated)

1. Customer searches → **Store results** (FlexSearch, instant), ranked first, always.
2. Zero **or thin** (0–2 weak) results → **invitation panel** with warm brand copy:
   *"We don't have that on our shelves yet. Want us to look across the wider world of books —
   and bring it in for you?"* + **[ Search all books ]** button.
3. The button is the **bot gate** — no deliberate human click, no Ingram call. Protected by
   **Cloudflare Turnstile** (already in the stack, invisible/managed mode) + per-session/IP
   **rate limit**. Bots crawling `/search?q=` never trigger it.
4. Optional **guided refine**, pre-filled with the original query (never re-type): scope chips
   `Title / Author / Topic` → map to Ingram mnemonics (`TI=`, contributor, `KW=`/BISAC) for
   precise matches. One click to results; refine is optional/auto-suggested when the first pass
   looks noisy.
5. Live `searchLongTail` → results render as buyable `special_order` cards (skeletons while
   loading), same `BookDetailPage` layout, `<meta robots="noindex">`, absent from sitemap.
6. **Log the query** (query + `matched:false` only — not Ingram data) to `SearchAnalytics` →
   a "most-wanted, not-carried" report driving what to promote into curated inventory.
   **Forward-compat:** design this logging to **accumulate frequency over time** (counts per
   normalized query/ISBN), not log-and-forget — so the "search frequency" signal is ready for
   the Merchandising Intelligence phase. Cheap now, expensive to retrofit.

## Data model changes

`Books` → `editions[].inventory` group gains:
- `ingramOnHand` (number) — cached from Web Service; **system-set, read-only in admin**.
- `ingramAvailable` (boolean) — **system-computed** at refresh time (`ingramOnHand > threshold`); read-only.
- `ingramCheckedAt` (date) — cache timestamp / TTL basis; system-set.
- `availableToOrder` (checkbox) — **manual, owner-editable** vendor flag (non-Ingram titles). Distinct from the system fields above.

Existing `inventory.stockLevel` stays as the Square physical-on-hand signal. Run
`pnpm generate:types` after the schema change.

## UX / UI

Principle: **availability as a calm, ship-time-forward, unified promise** — not a warehouse
readout. Extend `bookAvailability.ts` so cards, PDP, cart, and checkout all speak one language.
Editorial/warm brand voice (Kente Gold / Forest Green, Lora headings), matching the partnership-page
redesign — *not* a sterile stock table.

- **Collapse the current leaky copy** (`"In store & ships in 3-8 days"` vs `"Ships in 3-8 days"`)
  into a single unified message per the resolution states above.
- **Product card:** compact `● In stock` dot + label; reads cached availability, never a live call.
- **PDP:** availability line between price and CTA.
- **Cart:** per-line ship promise (`Ships in 3–8 days`), no sourcing detail.
- **Checkout:** live-confirm is silent 99% of the time; only surfaces on the rare lapse, reassuringly.
- **Micro-interactions:** optimistic browse (cached availability, instant pages) + confirm at
  checkout (the one live call); skeleton loaders for the async long-tail; typeahead over the
  curated index.
- **Anti-patterns to avoid:** warehouse jargon / "ships from Ingram" / DC names; red scarcity
  "Out of stock"; making special-order results look second-class (they're a premium "we'll bring
  it in *for you*" moment).

## Fulfillment (Phase 1: manual)

Orders with Ingram-fulfilled lines are flagged in the Order Dashboard ("Order from Ingram —
Direct-to-Home"); staff place the order in iPage. Reuses the Direct-to-Home carrier already added
to Orders. Ingram Order-API automation is explicitly deferred until volume justifies it.

## Coexistence with Square + small hygiene

- Keep the Square `inventory.count.updated` webhook — physical on-hand is Stage-1 input #1.
- Fold in the **negative-stock clamp** in `applyInventoryCountToEditions`
  (`squareInventory.ts`) — `Math.max(0, quantity)` — a cheap safety fix (Square can send
  negative counts when oversold at POS).
- The `squareVariationId` backfill (~20% of books unlinked) stays available but adjacent/optional.

## Companion phase — Edition Consolidation (one-off, gated on Ingram access)

A separate one-off enrichment to **combine editions across publishings and bindings** (paperback /
hardcover / audiobook of the same work), using Ingram **Family data** (Query Type 6 / FTP Family
file) as the grouping authority. Shares the Ingram client built here; gated on the same access.

**Deserves its own detailed spec before building** — merging live catalog records is
data-integrity-sensitive:
- Pick the canonical `Book`; fold scattered records' editions into its `editions[]`.
- **301-redirect** retired slugs (preserve SEO/link equity).
- Migrate `Orders` / `Carts` / `Reviews` / `Comments` references off deleted records.
- Resolve metadata/cover conflicts: **preserve curated data**, use Ingram only to *group* and fill gaps.

**Secondary benefit:** likely shrinks the GSC *"Duplicate, Google chose different canonical"*
bucket (multiple records per work is a classic cause) — an SEO win alongside better UX (one page
per work, choose your binding).

## Future phase — Merchandising Intelligence & Inventory Tiering (later; enabled by this build)

Turn the signals this engine collects into curation decisions: promote high-demand long-tail
titles **up** into curated store inventory (indexed, and potentially stocked **direct from
publisher at higher margin** where velocity justifies it), and demote stale titles **out**
(de-index / request-only).

**Signals:**
- **Long-tail search frequency** of not-carried titles (from Stage-2 demand logging — made
  forward-compatible above).
- **Ingram demand / velocity** — *change* in Ingram on-hand over time (a title's stock dropping
  fast = selling well industry-wide → a direct-from-publisher candidate).
- Store sales velocity (Square).

**Tiering action** = promote a long-tail `Book` into the curated, indexed catalog (buy direct
where margin justifies) or demote a curated title to request-only + `noindex`.

**Compliance / sourcing:** retaining a *time-series of Ingram inventory* is precisely what the
**FTP Inventory feed** (load-into-DB, permitted) is for — the **Web Service prohibits DB
mirroring**. So this is the phase where the deferred FTP feed earns its keep: source Ingram
inventory history from the FTP file, not the API. (Alternatively, store only *derived* signals —
velocity buckets / deltas — rather than raw quantities.)

Own spec when pursued.

## Build sequencing

**Blocked on Ingram contract → credentials:** all live Ingram calls. Build against the
`AvailabilityProvider` **mock** (from sample XML) now; wire real creds when they land.

**Unblocked now (build against the mock):**
- `resolveAvailability` resolver + `bookAvailability.ts` unification.
- `editions[].inventory` schema fields + `generate:types`.
- Manual `availableToOrder` flag + admin UI.
- Stage-2 demand logging (`SearchAnalytics`).
- Square coexistence + negative-stock clamp.
- Order Dashboard "Order from Ingram" flag.
- Checkout-confirm hook points.
- Turnstile-gated "look wider" UI shell.

## Testing

- **Unit:** `resolveAvailability` (pure); Web Service XML parsing (against sample responses);
  25-ISBN batching; negative-stock clamp.
- **Integration:** mock `AvailabilityProvider` → Ingram **test server** once creds arrive.
- **E2E:** long-tail search → invitation → Turnstile → buyable result → order → staff fulfillment flag.

## Open items / dependencies (Ingram rep)

- Production Web Service URL + credentials (post-contract).
- Confirm nightly catalog-refresh volume is within subscription limits.
- Inventory FTP file spec + cadence (only needed if/when the FTP enrichment phase is pursued).
- Confirm permission to display Ingram availability + real-time search results publicly.

## Related docs

- `docs/launch.md` — production readiness board (GSC duplicate-canonical item relates to consolidation).
- Ingram Web Service Implementation Guide (Version 16, Release 9) + Titles Basic FTP spec — vendor docs on file.
