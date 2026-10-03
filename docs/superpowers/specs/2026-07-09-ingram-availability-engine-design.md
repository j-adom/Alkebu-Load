# Ingram Availability & Discovery Engine — Design

**Date:** 2026-07-09
**Status:** Approved design; implementation gated on Ingram contract/credentials
**Branch:** `feat/ingram-availability-engine`
**Amended:** 2026-07-16 — Ingram FTP inventory package reviewed; folded in the On-Sale-Date
gate, Product-Availability-Code resolution, and the FTP feed as a Stage-1 fallback source
(see "FTP inventory feed (StockV2)").
**Amended:** 2026-10-02 — production access verified and catalog enrichment added
(see "Connectivity status" and "Catalog enrichment from Ingram Titles Basic").

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

- **FTP feed ingestion as the backbone** — rejected (heavy full-universe ETL over Ingram's
  ~18.9M titles to answer a question a single cached API call answers). *Amended 2026-07-16:*
  no longer enrichment-only, though — the FTP feed is an approved **Stage-1 fallback/alternative
  source** (stream-filtered against the catalog, never a universe mirror) and the licensed home
  for any *persistent* Ingram data. See "FTP inventory feed (StockV2)" below. Stage 2 long-tail
  search remains Web-Service-only (FTP cannot answer interactive queries).
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
2. **Ingram available** — cached `ingramAvailable`, computed at refresh/confirm time
   (*amended 2026-07-16* — code-first, not quantity-first):
   - **On-Sale-Date gate (hard):** requires `onSaleDate ≤ today`. Ingram's own FAQ warns
     pre-order titles can show on-hand up to **14 days before street date** — quantity alone
     would sell titles Ingram can't ship yet. (`00010101`/unset = sellable on receipt.)
   - **Product Availability Code primary** (`prodstat` codes): `20`/`21`/`22` → fulfillable
     (a stocked title below the quantity threshold is still orderable); `31`/`40` → not
     available (a stale cached quantity never overrides `40` "gone from Ingram").
   - **Quantity fallback** only when the code is absent: `ingramOnHand > threshold` (default
     **10**, config `INGRAM_STOCK_THRESHOLD`), keyed on **LaVergne** `OnHand` (primary) with
     other DCs as fallback.
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

## FTP inventory feed (StockV2) — Stage-1 alternative + enrichment *(added 2026-07-16)*

Ingram's FTP onboarding package arrived and was reviewed 2026-07-16. It lives (gitignored) in
`Ingram Inventory Info/` at the repo root: Implementation Guide PDF (v2.14, Feb 2022), a
2,099-record StockV2 sample, SQL load scripts (reference only — MS SQL, outdated layout),
and the code translation tables (`prodstat`, `pubstatus`, `disctabl`, `retrnflg`, restrictions).

**Key facts:** StockV2 is fixed-width (301-char records + CRLF) keyed on **EAN**; carries per-DC
on-hand/on-order (La Vergne TN first), list + publisher price, **our discount level (= our cost)**,
publisher status, **Product Availability Code**, publication/on-sale dates, returnability,
backorder-only, **Media Mail eligibility**, product type, and **weight**. Delivery: FTP full file
(~4 GB, regenerated 6×/day, books-only part file ~1 GB) + delta/daily/weekly variants; removals
arrive as "zero records" in deltas, with `stockv2remove*.zip` catch-up files. Supplemental files:
per-DC restock **ETA**, country exclusions, sales rights, Prop 65.

**Why it matters here:**
- **Licensing asymmetry:** the Web Service *forbids* DB mirroring (TTL cache only); the FTP feed
  is *explicitly licensed to load into your DB*. Persistent Ingram data (enrichment, inventory
  history for Merchandising Intelligence) must come from FTP, not the API.
- **Stage-1 fallback:** at our scale no ETL is needed — stream the books part file line-by-line,
  keep only the ~5,000 catalog EANs (in-memory hash join), discard the rest, and write the same
  `ingram*` cache fields the Web Service refresh would. If FTP access activates before Web
  Service certification, **Stage 1 can go live on FTP alone**; the Web Service then adds
  checkout-time live confirm and Stage 2.
- **Enrichment (one-time pass + periodic):** Media Mail eligibility and authoritative weights
  feed the Shippo/Media-Mail logic directly; discount level gives true per-title cost (the data
  the Merchandising Intelligence phase assumed it would have to derive).

**Skip:** SQL Server scripts, universe mirroring, data-slice subscriptions, international files
(country exclusions / sales rights / international prices — we ship domestically).

**Contacts:** `integrate@ingramcontent.com` (setup/dev/prod), `ids@ingramcontent.com` (data admin).

## Stage 1 — scheduled availability refresh

Payload cron `refresh-ingram-availability` — **transport-agnostic**: it consumes
`Map<ean, IngramStock>` and writes cache fields, regardless of whether the map came from the
Web Service (`checkStock`) or an FTP StockV2 stream-filter (see section above):
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

## Connectivity status *(added 2026-10-02)*

Production credentials were issued 2026-09-22 (account 20R1339). They are verified with
`alkebu-load/scripts/ingram-smoke-test.ts`, which prints only status, counts and tag names:

- **SFTP ✅** — host `ftp.ingramcontent.com` over **SFTP** (`sftp.` does not resolve). curl's
  libssh2 cannot negotiate the server's key exchange, so use OpenSSH (or `ssh2` in Node).
  Folders: `BriefDesc, DESC_BKLST, DeveloperSpecs, Inventory, Logistics, PubDescripi,
  Reference_Files, TitlesBasic`.
- **Web Service login ✅** — `https://api.ingramcontent.com/CWS/companion.asmx` is **SOAP**,
  not REST. Credentials go in a `UserInfo` SOAP header (`UserName`, `Password`), namespace
  `http://ingrambook.com/CompDataAccess/companion`. `testLogin` returns an int (1688 for us).
  The HTTP-POST binding cannot carry the header, so the form-POST approach above is wrong.
- **Web Service lookup ✅ / stock ❓** — Query Type 9 runs through
  `SearchRequestTypes12349Enhanced` (`queryType, query, startRecord, endRecord, sortField,
  liveUpdate, dataRequest`) and returns `Basic`/`Display` sections. With `dataRequest=STK`,
  **no `<Stock>` section is returned.** Either our Standard package excludes real-time stock
  (the FTP access sheet offers a separate "Stock Check Web Service") or the code is wrong.
  Until resolved, Stage 1 runs on the **FTP feed**, and checkout confirm (Task 13) and Stage-2
  availability fall back to the latest FTP data.

## Catalog enrichment from Ingram Titles Basic *(added 2026-10-02)*

Our ~5,000 books were assembled from Square, CSV imports, ISBNdb, Google Books and Open
Library, so their metadata is uneven. Ingram's publisher-supplied data is usually better for
weights, dimensions, page counts, formats, pub dates, BISAC subjects and descriptions. This
flow uses it to fill gaps and correct objective fields, while leaving staff curation intact.

### Source and licensing
- **FTP only.** The Titles Basic package is licensed for loading into our system for display on
  the licensed sites. The **Web Service is never a persistence source** (no DB mirroring), so
  live WS lookups do not write to Books.
- Files (per the 2026-09-22 access sheet): `TitlesBasic/ttlingbasic_pipe.zip` (weekly, Tue 6 AM CT,
  pipe-delimited bibliographic), `TitlesBasic/annobasic_pipe.zip` (≤100-char annotations),
  `DESC_BKLST/pmall_active.zip` + `PubDescripi/pmmthy-*.zip` (publisher marketing descriptions,
  monthly backlist + adds/changes), `DESC_BKLST/brdn_GBLFL.zip` + `BriefDesc/brdn.zip` (brief
  descriptions), `Inventory/` stock file (weight, Media Mail eligibility, on-sale date, discount),
  and `Reference_Files/` (code tables).
- **Stream-filter, never mirror:** stream each file and keep only the EANs in our catalog
  (in-memory set of normalized edition ISBN-13s). Everything else is discarded unparsed.
- **Covers are out of scope for v1.** Cover images come through the Web Service, and copying
  them into R2 may count as mirroring. Ask Ingram before storing any.
- **Termination duty (§6(c)):** if the agreement ends, all Ingram Metadata must be deleted from our
  systems and backups. Per-field provenance (below) is what makes that purge possible.
- **AI restriction (§2(c)):** Ingram-sourced fields must **never** be sent to an AI or LLM service.
  The pipeline is deterministic site code. Fixtures are synthetic, and dry runs report counts only.
  The repo has no LLM integrations today. Any future AI feature that reads Book text must
  exclude Ingram-sourced fields.

### Field policy
Precedence: **manual (staff) > Ingram > ISBNdb / Google / Open Library / CSV > empty**, with
two owner-directed exceptions, **price uplift** and **title cleanup** (below). Both are written to
**Square as well as Payload** (owner decision 2026-10-02), so the POS, receipts and website agree
and the Square catalog sync never reverts them. Square stays the source of truth for **stock**.

| Field(s) | Policy |
|---|---|
| `editions[].shippingWeight`, `dimensions`, `pages`, `binding`, `language`, `datePublished` | **Authoritative:** auto-apply when empty *or* when the current value came from a non-manual source |
| new `editions[].mediaMailEligible`, `ingramOnSaleDate` | **System:** always written by the job |
| `editions[].pricing.retailPrice` | **Uplift only:** set to Ingram list price when it is **higher** than the current price; never lowered (see "Price uplift") |
| `title`, new `subtitle`, `titleLong` | **Title cleanup:** prefer Ingram's title when Ingram has a subtitle; strip author vestiges unless needed to disambiguate (see "Title cleanup") |
| `publisherText`, `subjects` (BISAC) | **Fill-gap:** auto-apply only when empty; otherwise → review if different |
| `synopsis` (plain), `description` (Lexical), `excerpt` | **Fill-gap:** when empty; otherwise → review (never silently replace curated copy) |
| `authorsText` / `authors` | **Review-only:** differences go to review, never auto-applied (they drive author pages and links) |
| `editions[].wholesalePrice` (cost = list × (1 − discount)) | **Fill-gap**, internal only, never displayed |
| `stockLevel`, `categories`, `collections`, `images`, `slug` | **Never touched** |

### Price uplift
- Per edition, matched by EAN. If Ingram's US list price is **greater** than the current price
  (Square variation price, in cents), set the price to Ingram's. Never lower a price.
- **Skipped:** consignment items (`isConsignment`), editions with a new `pricing.lockPrice`
  checkbox (for used copies sold under the same ISBN, or deliberate promotions), and editions where
  Ingram's price is missing or zero.
- **Sanity guard:** an uplift of more than 3× the current price goes to review instead of applying,
  to catch data or unit errors.
- **Checkout impact:** none beyond the new price. Stripe checkout builds `price_data` from the cart's
  unit price, so no Stripe Price objects need updating.

### Title cleanup
Square-sourced titles often carry the subtitle and/or author in the title (an artifact of how
Square looks up ISBN data), e.g. `Title: Subtitle by Author Name`.
- **New `subtitle` field** on Books. `titleLong` becomes derived (`title: subtitle`). Storefront
  cards and PDPs render the subtitle separately.
- **Prefer Ingram's title when Ingram has a subtitle.** Set `title` = Ingram title and
  `subtitle` = Ingram subtitle, so the title no longer repeats the subtitle.
- **Strip author vestiges.** Remove a trailing or leading author segment (`by X`, ` - X`, `(X)`,
  `X:`) **only when it matches one of the book's contributors** (Ingram contributors or our
  `authorsText`, normalized, last-name match minimum).
- **Keep the author only for disambiguation.** After computing the cleaned base title for the
  *whole catalog*, any base title shared by books with **different** authors keeps its author
  segment, in its existing form. Same title with the same author is an edition-consolidation
  case, not a disambiguation case.
- **Confidence:** only exact patterns auto-apply. Anything ambiguous (the remainder doesn't match
  the subtitle or a contributor) goes to review. Staff-edited (`manual`) titles are never touched.
- **URLs stay stable:** slugs are only generated when empty, so retitling never changes a URL.
  Search picks up new titles on its next 5-minute refresh.

### Square write-back
- Price and title changes are written to **Square first**, then Payload, inside the job:
  - Square variation `price_money` for prices.
  - Square item `name` = cleaned `title` plus the edition's binding, e.g. `Wayward Lives (Paperback)`,
    because each binding is a separate Square item and staff need to tell them apart at the POS
    (see Edition Consolidation, "Square mapping"). The subtitle lives only in Payload, and the catalog
    sync's merge never writes `subtitle`.
- Use `BatchUpsertCatalogObjects` with each object's current `version` (optimistic concurrency).
  On a version conflict, re-fetch and recompute, and never blind-overwrite. Batches are ≤100 objects
  and run under the `books-write` concurrency key so they can't race the catalog or inventory syncs.
- If Payload fails after Square succeeds, the next Square catalog sync carries the Square values
  into Payload, so the two converge. The webhook echo of our own write is a no-op.
- Books with no `squareItemId` (~20% unlinked) are updated in Payload only.
- Every Square change is logged (object id, previous name/price, version) for rollback.
- Square writes are **dry-run by default**. The owner approves a bounded `--apply --limit` before
  a full run. This changes **in-store prices**, so staff should be told before the full run.

### Provenance and manual-edit protection
- New Books group `enrichment`: `fieldSources` (JSON map `fieldPath → { source, at }`),
  `ingramEnrichedAt`, `ingramRecordDate`; add `'ingram'` to `importSource` options.
- A `beforeChange` hook stamps `source: 'manual'` on any tracked field an authenticated staff or
  admin user changes in the admin. Job and script writes pass `context.ingramEnrichment = true`
  and stamp `source: 'ingram'` themselves. Manual fields are never auto-overwritten.
- `IngramEnrichmentLog` collection: one row per applied change (book, fieldPath, previous value,
  new value, Ingram record date, run id). This supports rollback and the termination purge.

### Pipeline
1. **Fetch** — job downloads the needed zips over SFTP to a temp dir. A sha256 checksum
   skips files already processed.
2. **Filter + parse** — stream-unzip, keep catalog EANs only, and parse into typed records with pure
   parsers. Column layouts come from `DeveloperSpecs/`; the owner transcribes them into code.
3. **Map** — pure `mapIngramRecord(record) → EnrichmentCandidate` (normalized values per field).
4. **Diff** — pure `diffEnrichment(book, candidate, fieldSources) → FieldChange[]`, each classified
   `fill | correct | same | conflict | protected` using the policy table.
5. **Apply** — `fill`/`correct` changes are written per book in one transaction with log rows.
   `conflict` changes go to the review queue. Runs are idempotent, so rerunning the same file
   date is a no-op.
6. **Review** — `IngramEnrichmentReview` collection (reuses the Square staging pattern: state
   `pending → accepted | rejected | superseded`). The admin view shows current vs proposed with
   accept/reject per field and bulk accept by field type. Accepting stamps `source: 'ingram'`,
   and rejecting suppresses the same proposal on later runs.
7. **Report** — run summary (counts per field × action, unmatched EANs, parse errors) in the job
   log and staff digest. No titles or values.

### Cadence
- **Backfill:** manual dry run first (counts only). The owner reviews the counts, then runs the real backfill.
- **Ongoing:** weekly after the Tuesday Titles Basic drop, and monthly after the first-Monday description
  files. Both are gated by `ENABLE_JOB_AUTORUN` like every other job. These are FTP downloads, not
  Web Service calls, so they don't count toward the WS request limit.
- New titles added between runs keep the ISBNdb/Google on-create enrichment and get upgraded on the next weekly run.

### Search and SEO side effects
Better `synopsis`/`subjects` improve FlexSearch recall and PDP content. The index refreshes itself
within 5 minutes. Edition Consolidation (below) can reuse the same fetch/filter stage.

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

**Square mapping (owner decision 2026-10-02): leave Square alone.** In Square, each binding is
its own item (one variation each), and that stays as it is: no Square restructuring, no lost
per-variation sales history, no change for staff at the POS. Payload adapts instead:
- Move `squareItemId` from the book to the **edition** (`editions[].squareItemId`), with uniqueness
  enforced per edition (a partial unique index on `books_editions.square_item_id`), not per book.
- Square catalog sync finds the book via `editions.squareItemId` (falling back to
  `editions.squareVariationId`) instead of the book-level field. Without this, a binding merged
  away from its original book would be recreated or staged on its next Square catalog change.
- Stock sync already matches by `editions.squareVariationId` and needs no change.
- Backfill: copy each book's current `squareItemId` onto its Square-linked editions before merging.
- **Prerequisite:** this ships before any books are merged.

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
- ~~Inventory FTP file spec + cadence~~ — **received & reviewed 2026-07-16** (`Ingram Inventory
  Info/`, gitignored). Remaining ask: FTP server credentials + which files our account gets
  (books part file? CSV option?), and whether FTP access activates ahead of Web Service certification.
- Confirm permission to display Ingram availability + real-time search results publicly.

### Added 2026-10-02
- Does the **Standard Web Service package include real-time stock** (`dataRequest=STK` returns no
  `<Stock>`), or is that the separate Stock Check Web Service? Which `dataRequest` codes are we entitled to?
- Written approval (§3(c)) for each query we use: Type 9 stock, Type 1 search, Type 6 family.
  Also approval for the refresh cadence and volume (§2(f)(F), §3(d)), plus the monthly hit limit.
- Does `cat_ing_stock` (CSV) carry the Product Availability Code?
- May Web Service **cover images** be stored in R2, or must they be hotlinked?
- Site terms must carry the §3(b) no-copy/no-redistribution clause before Ingram data is displayed.

## Related docs

- `docs/launch.md` — production readiness board (GSC duplicate-canonical item relates to consolidation).
- Ingram Web Service Implementation Guide (Version 16, Release 9) + Titles Basic FTP spec — vendor docs on file.
- IDS FTP Inventory package (StockV2 guide v2.14, sample file, code tables) — `Ingram Inventory Info/` at repo root (gitignored; Ingram-copyrighted, do not commit).
