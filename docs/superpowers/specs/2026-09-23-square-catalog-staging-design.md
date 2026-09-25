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

**Delivery is probably not the problem.** The subscription was repaired on 2026-06-03: it had
been pointing at a dead ngrok dev tunnel and was disabled. It was re-pointed at production,
enabled, the signature key was matched, and `inventory.count.updated` was added *alongside*
`catalog.version.updated`, which was the original and only event. Since the inventory path on
that same endpoint is demonstrably healthy, catalog events are reaching a reachable,
signature-valid handler. The working hypothesis is therefore **events arrive and every item
fails validation**, not non-delivery. Still confirmed at deploy — see Acceptance Gates.

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
`CMD ["node", "server.js"]`), and the repo contains no caller of `/api/payload-jobs/run`; the
endpoint itself exists and is mounted, and requires an authenticated user (Payload defaults
`jobs.access.run` to `({req}) => Boolean(req.user)` via `config/defaults.js:138-143`) — verified
against production returning 401 to an anonymous request. Registration without a runner means
the schedules are inert.

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
Books schema in a local dev database, per review requirement. **Do not assume that database is
SQLite** — confirm `DATABASE_URI` in `alkebu-load/.env` before running these tests; on at least
one developer machine as of 2026-09-23 it points at production Postgres, not a local SQLite
file. Use an explicit inline override (e.g. `DATABASE_URI=file:./scratch-test.db`) if there is
any doubt, rather than trusting whatever `.env` currently has:

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

- [ ] `catalog.version.updated` delivery attempts inspected in the Square dashboard and showing
      `200`. Expected to pass given the 2026-06-03 subscription repair; confirms the
      "arrives and fails validation" hypothesis rather than testing it. A **deployment** gate,
      not a prerequisite for writing the mapper and tests.
- [x] **Job runner confirmed executing in production (2026-09-25).** `ENABLE_JOB_AUTORUN=true`
      set in Coolify; deploy at ~23:53 UTC 2026-09-24. Coolify logs show
      `00:00:00 INFO: Running 1 jobs. new: 1 retrying: 0` (`cleanup-abandoned-carts`, cron
      `0 */2 * * *`) and `00:15:00 INFO: Running 1 jobs. new: 1 retrying: 0`
      (`recover-stripe-orders`, cron `15 * * * *`). Crons armed within ~7 minutes of container
      start. In-process `autoRun` therefore works on Coolify — this settles the open design
      question and means the durable path below can use `payload.jobs.queue()` with the existing
      runner rather than an external trigger.
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

---

# Revision 2 — 2026-09-25

Seven defects were found in the first implementation plan during review. Five were plan-text
errors and are fixed there. Four required architectural decisions that belong here, because the
original spec either left them implicit or got them wrong. All were verified against the
installed packages and production before being written down.

## R2.1 Staging state machine (was implicit, and the plan's version was unsaveable)

The original spec listed a `reviewStatus` enum but never defined its transitions, and the plan
then proposed flipping a row to `ready` "when the issue list is now empty" — impossible, because
`validationIssues` is `required` with `minRows: 1`. It also routed every *complete* mapping
straight into Books, which bypasses the human gate the staging collection exists to provide.

Transitions, exhaustively:

| From | Event | To | Writes a Book? |
|---|---|---|---|
| (none) | sync maps an item incomplete | `needs-review` | no |
| `needs-review` | sync re-observes, still incomplete | `needs-review` (refresh `rawItem`, `validationIssues`, `lastSeenAt`) | no |
| `needs-review` | sync re-observes, now complete | `ready` | **no** |
| `ready` | staff promotes | `promoted` (+ `promotedBook`) | yes, once |
| `needs-review` / `ready` | staff rejects | `rejected` | no |
| `rejected` | sync re-observes, any state | `rejected` (refresh `lastSeenAt` only) | **no** |
| `promoted` | sync re-observes | unchanged; the sync updates the linked Book instead | yes, as an update |

Rules the transitions imply:

- **A `squareItemId` that has ever been staged is owned by the staging row, not by the sync.**
  Before writing a Book, the sync looks up staging by `squareItemId`. A row in `needs-review`,
  `ready` or `rejected` means *do not create a Book* even when the mapping is complete — set
  `ready` and stop. Only `promoted` lets the sync write, and then only as an update to
  `promotedBook`.
- **`rejected` is sticky.** Re-observing a rejected item never resurrects it. Square's catalog
  carries bulk supply SKUs that staff will reject once and must not have to reject again.
- **`ready` does not auto-promote.** Confirmed decision; matches the wellness curation gate.
- `validationIssues` keeps `minRows: 1`. A row that becomes complete records the sentinel issue
  `{ field: '-', code: 'resolved', detail: 'Square now supplies all required data' }` rather
  than an empty array, so the constraint holds and the history stays readable.

## R2.2 Promotion is a first-class operation, not a side effect

Nothing in the original plan implemented promotion, though the rollout and integration tests
both assumed it. It needs:

- An authorized action — admin or staff only, same gate as the collection.
- Atomicity — the Book create and the staging row's move to `promoted` + `promotedBook` happen
  in one Payload transaction, so a crash cannot leave a Book with no staging link or a
  `promoted` row with no Book.
- Idempotency — a row with `promotedBook` already set is refused, so a double-click or a
  concurrent promotion produces one Book.

## R2.3 Identity: a database-level unique constraint on `Books.squareItemId`

"Upsert by `squareItemId`" was assumed repeat-safe. It is not: `Books.squareItemId` has no
`unique` and no `index`, so two concurrent writers can both find nothing and both create.

Verified against production 2026-09-25: **5,157 of 5,176 books carry a `squareItemId` and all
5,157 are distinct.** The constraint can therefore be added cleanly; the 19 nulls are fine
because Postgres treats NULLs as distinct for uniqueness.

Add `unique: true, index: true` to `Books.squareItemId`, and add the same to
`SquareCatalogStaging.squareItemId` (already specified there). Handle the unique-violation error
on create by re-reading and updating, so a lost race degrades to an update rather than a 500.

## R2.4 Concurrency: serialize all book writes through the job queue

**This supersedes the optimistic `updatedAt` re-read in the original architecture, which was a
narrowing of the race, not an elimination.** The re-read leaves a window between the check and
the write, and — more fundamentally — both writers replace the *entire* `editions` array
(`squareInventory` via `payload.update({ data: { editions: newEditions } })` at
`square-catalog/route.ts:588-594`, and the catalog path likewise). A pure merge that preserves
values cannot prevent a lost update when the array it merged into is already stale.

Decision (user, 2026-09-25): move the inventory webhook's write onto the same job queue as the
catalog sync and make book writes mutually exclusive.

- Set `jobs.enableConcurrencyControl: true`. **This adds an indexed `concurrencyKey` field to
  the jobs collection — a schema change that must be in the same migration as everything else.**
- Both `square-catalog-sync` and a new `square-inventory-sync` task declare
  `concurrency: { key: () => 'books-write' }`. `exclusive` defaults to `true`, so a second job
  with that key stays queued until the first completes. Interleaving becomes structurally
  impossible rather than retried.
- `square-catalog-sync` additionally sets `deleteOlderPending: true`: several
  `catalog.version.updated` events in quick succession only need the newest run.
- The inventory webhook keeps its fast ack and its existing pure helper
  (`applyInventoryCountToEditions`); only the *write* moves behind the queue. The handler's
  logic is not rewritten — this path is healthy in production and the change is limited to where
  it executes.

A single global write key costs throughput. At this catalog's size and change rate that is
irrelevant, and correctness is worth more than parallelism we do not need.

## R2.5 Failure lifecycle: an unresolved item must fail the job

The original task returned `{ failed: n }` and relied on the checkpoint not advancing. That is
not a retry: a handler that returns normally **completes successfully**, so nothing reschedules
it and the failure is invisible except in a counter.

- Items that are neither written nor staged are collected. If any remain at the end of a run,
  the handler **throws** after persisting the checkpoint and counters, so Payload's retry
  machinery takes over.
- `retries` is `{ attempts: 3, backoff: { type: 'exponential', delay: 5000 } }`. The original
  plan's `backoff.maxDelay` is not a field on this type — `delay` and `type` are the only two.
- On terminal failure (attempts exhausted) the run emails `STAFF_NOTIFICATION_EMAIL` via
  `emailService`, matching the `sendRecoveryAlert` pattern. Email supplements durability; it
  does not provide it.

## R2.6 `rawItem` must be JSON-safe before it is stored

Square SDK v43 returns `priceMoney.amount` as a **BigInt**, and catalog versions likewise.
`JSON.stringify` throws `TypeError: Do not know how to serialize a BigInt`, so storing the raw
SDK object in a `json` column fails at write time.

Normalize losslessly before storing: walk the object and convert every `bigint` to a string
tagged so it round-trips (`{ __bigint: "2299" }`), or to a plain string with the field's unit
documented. Whichever form is chosen, a persistence test must store and re-read an object built
from real SDK-shaped values including BigInt amounts.

## R2.7 Completeness is judged per edition, not per item

The mapper rule "some variation has a price and some variation has an ISBN" admits an item where
those are *different* variations. Emitting every variation as an edition then fails Books
validation on the unpriced or ISBN-less one.

- A **variation is usable** when it has both a price and a SKU/UPC that validates as an ISBN.
- An item is **complete** only when *every* variation it would emit is usable. Mixed-validity
  items go to staging with a per-variation issue list naming which failed and why.
- `isValidIsbn` gains a **checksum** test (ISBN-13 mod-10 weighted 1/3; ISBN-10 mod-11). The
  copied helper checks digit-count only, so an arbitrary 13-digit SKU passes as an ISBN today.
  For a gate deciding Book-versus-staging, a failed checksum should send the item to a human.

## R2.8 Migration procedure

The plan's `pnpm payload migrate:create` step would run against the now-corrected local
`DATABASE_URI=file:./alkebulanimages.db` and emit **SQLite** DDL. Production needs Postgres.

- Generate with an explicit Postgres URI pointing at a **local throwaway Postgres**, never at
  production. The `postgres` service in `docker-compose.yml` is usable for this.
- Register everything schema-affecting *before* generating: the staging collection, the
  sync-state global, `Books.lastSyncedAt`, `Books.squareItemId` uniqueness, **both job tasks**
  (task slugs live in the `enum_payload_jobs_task_slug` Postgres enum — see
  `src/migrations/20260705_174837_add_mcp_api_keys.ts:10-11`), and
  `jobs.enableConcurrencyControl`. One migration, generated last, covering all of it.

## R2.9 Corrections to the record

- **Lint warnings do not fail the build.** `CLAUDE.md` and the first plan both claimed
  `pnpm build` fails on warnings. It does not — the build passes with 480 warnings present.
- **Integration tests get an explicit disposable database** with enrichment disabled, never the
  developer's working database.
- **Nothing type-checked the tests.** `pnpm test` runs via `tsx` (types stripped) and
  `next build` excludes `tests/`, so four real type errors shipped in `jobRunnerConfig.test.ts`.
  Fixed in `d1ea199`, which also adds `pnpm check:types`. Every task must run it.
