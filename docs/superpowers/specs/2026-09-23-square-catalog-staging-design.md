# Square Catalog Import — Staging, Durable Jobs, and Reconciliation

**Date:** 2026-09-23
**Status:** Draft for review
**Supersedes:** nothing; complements `2026-07-13-wellness-activation-design.md` (inventory path)

## Problem

New books added to Square POS do not reach Payload. The catalog import path has been
non-functional since at least 2026-03-08. Inventory sync on the same endpoint is healthy.

### Evidence

Production API, 2026-09-23:

| Query | Result |
|---|---|
| books created after 2026-06-01 | 0 |
| books created after 2026-03-09 | 1 (a hand-entered admin record) |
| books updated after 2026-09-01 | 208 |
| `importSource = square-webhook` | 0 |
| `importSource` distribution | manual 1039 · csv-import 4136 · isbndb 0 · google-books 0 · missing 1 |

The 208 September updates are attributable to `processInventoryCountUpdate`, which writes
`collection: 'books'` and patches `editions` by `squareVariationId`. That path works.

**What the evidence establishes:** no catalog *create* has succeeded. For one to have
succeeded silently, enrichment would have had to overwrite `importSource` with a value both
valid for the select and already present in the data (`manual` or `csv-import`);
`enrichProductFromIdentifiers` emits only `isbndb`, `google-books`, or `open-library`.

**What it does not establish:** whether catalog *updates* have been running. On
`payload.update`, an `undefined` `importSource` from the enrichment spread leaves the prior
value intact, so a successful update is indistinguishable from no update. Updates must
therefore be treated as *possibly having run and silently replaced edition arrays*.

**What is unresolved:** whether `catalog.version.updated` is subscribed and delivering at
all. Not determinable from the database. See Acceptance Gates.

### Root causes

Nine distinct defects in `src/app/api/webhooks/square-catalog/route.ts`:

| # | Defect | Location | Effect |
|---|---|---|---|
| 1 | `pricing.retailPrice` never set; field is `required` | never | every create fails validation |
| 2 | `editions[].publisher` set to string into a relationship | :291 | create fails unless enrichment overwrites |
| 3 | `editions[].isbn` set to `''` when no SKU/UPC; field is `required` | :290 | create fails |
| 4 | `editions[].price` — no such field; schema is `editions[].pricing.retailPrice` | :294 | silently dropped |
| 5 | Price divided by 100; `retailPrice` is in cents and Square's `priceMoney.amount` already is | :294-296 | wrong unit if 4 were fixed |
| 6 | `lastSyncedAt` — no such field on Books | :279 | silently dropped; no execution audit trail exists |
| 7 | `importSource` can be overwritten with `open-library`, not a valid select option | :43, :333 | additional validation failure |
| 8 | Unvalidated SKU written into `editions[].isbn` | :290 | fabricates ISBNs |
| 9 | Per-item errors swallowed by `console.error` | :495-497 | six months of invisible failure |

Three systemic defects beyond field mapping:

- **Acknowledge-before-work.** The route returns `{received: true}` at :136 and does the work
  in `after()`. Failures after that point cannot influence the response, so Square's retry
  mechanism (up to 24h) can never be triggered by a processing failure.
- **Wall-clock change window.** `beginTime` and the per-item cutoff both derive from
  `new Date()` at processing time (:167-168, :252-257). A delayed or retried event computes a
  window that excludes the very change that triggered it.
- **Destructive edition replacement.** `payload.update` with a fresh `editions` array replaces
  it wholesale, discarding `isbn10`, the `publisher` relationship, `datePublished`, `pages`,
  `dimensions`, `pricing`, and `inventory.stockLevel` — the last of which the working
  inventory path had just written.

### Blocking dependency: no job runner

`jobs.tasks` in `src/payload.config.ts:238` registers four tasks with `schedule` entries.
There is no `autoRun` in the repo, no worker process (`Dockerfile` ends at
`CMD ["node", "server.js"]`), and nothing invokes `/api/payload-jobs/run`. Registration
without a runner means the schedules are inert.

If confirmed, this means `recover-stripe-orders`, `cleanup-abandoned-carts`,
`daily-order-digest`, and `quote-followups` have never executed in production. The first is
the documented backstop for paid Stripe sessions whose webhook failed to create an order.

**This is larger than the catalog importer and may warrant landing separately and first.**
Flagged as an open decision.

## Non-goals

- Replacing `catalog.list()` with `SearchCatalogObjects` + `begin_time`. Real, but a
  performance change; mixing it with a correctness fix makes both harder to verify. Separate
  commit after this lands. (Note: the *checkpoint* below is in scope — it is correctness, not
  performance.)
- Backfilling `isActive`. 5,174 of 5,176 books have `isActive: false` despite
  `defaultValue: true`. No query reads the field, so nothing is broken today, but it is a
  loaded gun in the admin UI. Separate cleanup.
- Any change to how existing Books records validate. This is the central constraint that
  motivated the staging approach.
- Wellness/oils activation. Parked pending photography.

## Architecture

### Overview

```
Square catalog.version.updated
        │
        ▼
  webhook route ──── verify signature ──── enqueue durable job ──── 200 OK
                                                  │        (only after enqueue commits)
                                                  ▼
                                         job runner (autoRun)
                                                  │
                                    read checkpoint, fetch changed items
                                                  │
                                         ┌────────┴────────┐
                                    mapper (pure)          │
                                         │                 │
                            ┌────────────┴───────┐         │
                       complete              incomplete    │
                            │                     │        │
                            ▼                     ▼        │
                    Books create/update   SquareCatalogStaging
                    (merge by variation)   (review queue, staff-only)
                            │                     │        │
                            └────────┬────────────┘        │
                                     ▼                     │
                        advance checkpoint ◄───────────────┘
                     (only when every item is saved or durably recorded)
```

### 1. Staging collection — `SquareCatalogStaging`

Square items that cannot form a valid Book land here instead of failing. Books' invariants are
untouched; no migration to Books; no `draft` value threading through Books consumers.

Follows the `PartnershipInquiries` house pattern: staff-gated on all four operations, own admin
group, status in `defaultColumns`.

**Tracking fields are mandatory. Bibliographic fields are optional.** "No required-field
constraints" was too loose — a staging row with no Square identity is unusable.

| Field | Type | Required | Notes |
|---|---|---|---|
| `squareItemId` | text, indexed, unique | yes | the review queue's identity |
| `squareCatalogVersion` | text | yes | source version that produced this snapshot |
| `squareUpdatedAt` | date | yes | Square's `updated_at`, for staleness comparison |
| `rawItem` | json | yes | full Square payload as received |
| `validationIssues` | array of `{ field, code, detail }` | yes, minRows 1 | why it could not become a Book |
| `reviewStatus` | select | yes, default `needs-review` | `needs-review` / `ready` / `promoted` / `rejected` |
| `promotedBook` | relationship → books | no | set on promotion; presence blocks re-promotion |
| `proposedTitle` | text | no | best-effort, for admin list legibility |
| `proposedIsbn` | text | no | only when it passes `isValidIsbn` |
| `proposedPriceCents` | number | no | cents, unconverted |
| `lastSeenAt` | date | yes | updated on every repeat event |

Access: `read`/`create`/`update` for admin+staff, `delete` admin-only. Storefront never queries
this collection; it has no public route, no search bootstrap target, and no cart product type.

**Never fabricate.** A missing ISBN stays missing and is recorded as a `validationIssue`. A
missing price is not zero. An unvalidated SKU is never written to an ISBN field.

### 2. Pure mapper — `src/app/utils/squareCatalogMapping.ts`

Follows `wellnessProductLines.ts`: pure, no I/O, exhaustively tested.

```
mapSquareItemToBook(item, existingBook?) -> 
  | { kind: 'complete',   data: BookWriteData }
  | { kind: 'incomplete', issues: ValidationIssue[], proposed: Partial<StagingData> }
```

Rules:
- `pricing.retailPrice` = `Number(variation.priceMoney.amount)` — cents, no division.
- Book-level price comes from the **lowest-priced available variation**; recorded explicitly so
  it is not an accident of array order. A multi-variation item with differing prices records an
  informational issue but still maps.
- `editions[].pricing.retailPrice` per variation, cents.
- `editions[].isbn` only from a SKU/UPC passing `isValidIsbn`. Otherwise → incomplete.
- Publisher name → `editions[].publisherText` (text). Never the relationship.
- No price on any variation → incomplete.
- `importSource: 'square-webhook'` set **after** the enrichment merge, not before, so it cannot
  be clobbered. Enrichment's `importSource` is discarded (it can be `open-library`, an invalid
  option).
- `lastSyncedAt` is dropped until the field exists on Books, or added to Books as part of this
  change — see Open Decisions.

### 3. Safe edition merge

Merge by `squareVariationId`. Square owns: variation existence, SKU, price, and the variation's
identity. Payload owns everything else: `isbn10`, `publisher`, `datePublished`, `binding`,
`pages`, `language`, `dimensions`, `stripePriceId`, and **`inventory.stockLevel`**.

An incoming edition missing a field never overwrites a populated one; it records a
`validationIssue` on a staging row for review instead. Editions present in Payload but absent
from Square are marked `isAvailable: false`, never deleted.

**Concurrency.** Merging by variation ID does not by itself prevent a stale catalog read from
clobbering a newer inventory write. Catalog writes must not touch `inventory.stockLevel` at
all — it is inventory-path-owned. For the remaining fields, the write re-reads the document
inside the job and aborts the item if `updatedAt` changed since the read, recording a retry.
This is optimistic concurrency, not a lock; the retry is cheap and the contention window is
small.

### 4. Durable job path

The webhook's only responsibilities: verify signature, parse, **enqueue**, respond. The 200 is
returned only after `payload.jobs.queue()` commits. If the enqueue throws, the route returns
500 so Square retries within its 24h window.

New task `square-catalog-sync`, registered alongside the existing four. Explicit `retries` with
backoff. Terminal failure after retries writes a staging row with a `job-failure` issue and
emails `STAFF_NOTIFICATION_EMAIL` — email supplements durability, it does not provide it.

Requires the runner (see Blocking dependency).

### 5. Checkpoint

Persisted on the `SiteSettings` global as `squareCatalogSyncedThrough` (a date) — reuses an
existing global rather than adding a collection.

- Fetch window = `checkpoint - overlap` to now, overlap 15 minutes. Wall-clock `now` is never
  the lower bound.
- Processing is repeat-safe: upsert by `squareItemId` for both Books and staging, so overlap
  re-processing is harmless.
- **The checkpoint advances only when every item in the interval is either saved successfully
  or durably recorded as a staging row.** A single item that is neither must hold the
  checkpoint. Otherwise a transient failure hides that item behind the watermark forever.
- Checkpoint advances to the **minimum** of (window end, oldest unresolved item's
  `updatedAt`) — so partial progress is kept without stranding anything.

### 6. Reconciliation backfill — `scripts/reconcile-square-catalog.ts`

Recovers the ~6.5 month backlog. Fixing forward delivery does not import what was missed.

- `--dry-run` default. Writes nothing; reports counts.
- Reports **created / updated / incomplete / failed**, with per-item reasons.
- Repeat-safe: re-running produces no duplicates (upsert by `squareItemId`).
- Same mapper, same merge rules, same staging destination as the live path. No parallel logic.
- Run dry first, review the incomplete bucket, then run for real.

## Test plan

Pure mapper unit tests are necessary but insufficient. Integration tests run against the real
Books schema (local SQLite dev DB), per review requirement:

1. **Incomplete creation** — item with no ISBN produces a staging row, not a Book, and not a
   fabricated ISBN. Item with no price likewise; price is not zero.
2. **Complete creation** — valid item produces a Book with `pricing.retailPrice` in cents,
   `publisherText` populated, `publisher` relationship untouched, `importSource` =
   `square-webhook`.
3. **Edition preservation** — updating an existing book with a thin Square payload retains
   `isbn10`, `publisher`, `datePublished`, `pages`, `dimensions`, and `inventory.stockLevel`.
4. **Stock is never clobbered** — a catalog write concurrent with an inventory write leaves the
   newer stock level intact.
5. **Repeat delivery** — the same event twice produces one Book / one staging row.
6. **Concurrent promotion** — two simultaneous promotions of one staging row produce one Book.
7. **Delayed processing** — an event processed 30 minutes late still covers its own change.
8. **Checkpoint holds on failure** — one unsaved, unrecorded item prevents advancement past it.
9. **Staged items are unreachable** — no public search result, no product route, no cart add,
   no checkout. Asserted against `/api/search`, the book detail loader, `addItemToCart`, and
   the checkout preview.
10. **Enum safety** — an enrichment result of `open-library` does not produce an invalid write.

Existing suites must stay green: `pnpm test` (alkebu-load), `npm run check` + `npm run build`
(alkebu-web).

## Acceptance gates

- [ ] `catalog.version.updated` confirmed subscribed in the Square dashboard, with recent
      delivery attempts inspected. Runs alongside implementation; a **deployment** gate, not a
      prerequisite for writing the mapper and tests.
- [ ] Job runner confirmed executing in production — a queued job demonstrably transitions to
      complete, with retry and failure reporting observed.
- [ ] Reconciliation dry run reviewed before any real run.
- [ ] DDL for the new collection generated and applied via the Coolify PG terminal before the
      deploy, per the established migration workflow.

## Open decisions

1. **Job-runner scope.** Configuring `autoRun` resurrects three unrelated crons including the
   Stripe order backstop. Split into its own change that lands and is verified first, or fold
   into this one? *Recommendation: split. It is independently valuable, independently risky,
   and should not ride on a catalog importer.*
2. **Re-import eligibility.** When Square later supplies the missing data for a staged item:
   auto-promote, or flip `reviewStatus` to `ready` and wait for a human tick?
   *Recommendation: `ready` + human tick, matching the wellness curation gate. Square's catalog
   contains bulk supply SKUs and miscategorized items; it is not trustworthy as a publish
   signal.*
3. **`lastSyncedAt`.** Add the field to Books (small schema delta, gives a real execution audit
   trail that would have made this diagnosis trivial), or drop the write? *Recommendation: add
   it. Its absence is why the update question above is unanswerable.*

## Rollout

1. Job runner change (if split) — land, verify, observe one cron cycle.
2. Staging collection + mapper + tests — DDL applied, deploy, no behavior change yet.
3. Durable job + checkpoint — catalog path switches over.
4. Reconciliation dry run → review → real run.
5. Confirm new Square books appear within one sync interval.
