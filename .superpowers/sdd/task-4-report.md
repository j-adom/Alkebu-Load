# Task 4 Report — Square → Payload wellness importer

## Status: DONE

## Files
- Created: `alkebu-load/scripts/import-wellness-from-square.ts`

(Note: this path previously held a report for an unrelated older task — "Partnership Pages
SEO" — from a different feature branch/workstream. That content has been replaced with this
report, per the brief's explicit instruction to write here. This task's actual predecessor is
`task-3-report.md` in this same directory, which is the product-line mapping table this
importer consumes.)

## Deviations from the brief's reference script (and why)

The brief said "the reference script is a starting point, not gospel." Five deviations, all
verified against the real system before committing to them:

1. **SDK's typed `catalog.searchItems()` instead of a raw `fetch` to
   `connect.squareup.com` with a hardcoded `Square-Version` header.** Grepped the whole repo —
   no existing script uses raw REST fetch for Square; every pull-side script uses the `square`
   npm SDK (v43.2.1, already a dependency). Confirmed `catalog.searchItems({ categoryIds, limit,
   cursor })` exists and is the exact typed equivalent of the brief's REST call. Avoids
   hardcoding an API version string.

2. **Verified the 10 category IDs live** against the production Square account (`catalog.list({
   types: 'CATEGORY' })`) before trusting them. All 10 resolved to the exact names in the
   brief's comments (Health & Wellness, Nutrition, Hair & Skincare, Skincare, Shea Butter,
   Soaps, Lotions, Body Butters & Oils, Hair Products, Incense & Oils) — not placeholders.

3. **Fixed a dotenv/payload.config import-order bug the brief's snippet would have hit.**
   `payload.config.ts` reads `process.env.PAYLOAD_SECRET` at module-evaluation time. Because
   `alkebu-load` is `"type": "module"`, ES import declarations are hoisted and fully evaluated
   before any of the importing script's own top-level statements run — including a
   `dotenv.config()` call that textually appears after the imports. A static `import config
   from '../src/payload.config'` (as in the brief and in `import-square-to-payload.ts`) bakes in
   an empty secret regardless of where `dotenv.config()` is written, and fails with `missing
   secret key`. Fixed by dynamically importing `payload.config` *inside* `main()`, after
   `dotenv.config()` has actually run — this is the exact pattern already used in
   `scripts/check-import-stats.ts`, so it's an established fix, not a new invention.

4. **`Money.amount` from the SDK is a `bigint`, not a `number`.** Converted with `Number()`,
   which only changes the JS representation of the same integer — not a magnitude conversion.
   Verified with a live smoke test that Square really does return `100n` (bigint) for a $1.00
   item, confirming the conversion is necessary and safe. Cents values are still copied
   verbatim from `price_money.amount`.

5. **`squareItemId` on `variations[]` is only set for `wellness-lifestyle`.** Re-read
   `OilsIncense.ts`'s current schema (not just the brief's description): `OilsIncense.variations[]`
   has `squareVariationId` but no `squareItemId` field anywhere in that collection (top-level or
   per-variation) — Task 2 didn't add one. Rather than force an unknown key into the doc, the
   oils-incense builder omits it entirely and relies on `squareVariationId` alone for the Task 5
   stock sync. `wellness-lifestyle.variations[].squareItemId` does exist in the schema and is set.

## Local dev DB deviation (documented, not silent)

`alkebu-load/alkebulanimages.db` (the committed SQLite snapshot) is stale relative to this
branch's schema changes. On boot, Payload's Drizzle adapter detects an ambiguous table
diff (it asked interactively: is `partnership_inquiries_wholesale_details_product_interests`
a new table or a rename of `wellness_lifestyle_scent_profile_scent_family`?) and blocks on an
interactive CLI prompt that never resolves in a non-TTY script run. This is a pre-existing,
unrelated gotcha (matches this project's own session memory: "stale local SQLite snapshot
blocks on interactive schema migration").

Per that same memory's documented recovery ("cleanest: point DATABASE_URI at a brand-new
empty file... Drizzle push creates the CURRENT schema with no interactive rename prompts"),
all local `--commit` runs below were made against a disposable `file:./scratch-wellness.db`
(created fresh, verified, then deleted — never committed). `DATABASE_URI` was overridden on
the CLI, not in the script, since `dotenv.config()` doesn't override an already-set env var —
the shell value wins over `.env`'s `DATABASE_URI` (which points at production Postgres,
unreachable from this sandbox anyway). `SKIP_EMAIL_VERIFY=true` was also set to skip the SES
transport self-test (unrelated `EAUTH` from a dev-only SMTP credential, logged but non-fatal
either way). The importer script itself has zero DB-target logic — it reads whatever
`DATABASE_URI` `payload.config.ts` resolves.

## Step 2: `pnpm check:scripts`

Exit code 0.

## Step 3: Dry-run against production Square

Command: `DATABASE_URI="file:./scratch-wellness.db" SKIP_EMAIL_VERIFY=true npx tsx --loader
./css-stub-loader.mjs scripts/import-wellness-from-square.ts --dry-run`

```
Fetched 882 items from the Square wellness tree.

============================================================
Lines:      46  (created 0, updated 0)
Variations: 668
Skipped:    679
============================================================
```

**These numbers are higher than the brief's "~35 lines, ~191 variations" estimate — expected,
not a bug.** Per `task-3-report.md`, Task 3's product-line table was already expanded (18 → 46
lines, 214 → 246 matched items) after its own live-catalog dry-run found real coverage gaps
(24 more soap products, 4 more raw-butter products, a broadened Whipped Shea Butter regex).
This importer classifies against that already-expanded, already-reviewed table, so its output
reflects the *current* table, not the brief's spec-time guess. `progress.md`'s Task 3 entry
confirms: "expanded 18 -> 46 lines, 246 items matched." (My 46 lines / 668 variations vs. Task
3's 246 "items matched" are consistent: Task 3 counted matched Square *items*; this importer
counts priced *variations* across those items, which is a larger number because e.g. the single
"Scented Oil" line alone spans ~130+ Square items each carrying its own price.)

I read the full skip list (below and in the raw output). No sellable Phase 1 product appears in
it — everything skipped is either genuinely out of the four-house-line Phase 1 scope (teas,
tonics/bitters, supplements, third-party branded skincare/haircare lines, incense
sticks/burners/holders, jewelry/apparel/home goods), bulk/packaging SKUs, or a scented-oil
variation that itself carries no price (many single-brand scented oils like "Tom Ford Oud Wood
Scented Oil" have some unpriced Square variations alongside priced ones — only the unpriced
variation is skipped, not the whole item). `Shipping`, `Mali Djembe`, and `Mud Cloth Bucket Hat`
— the three miscategorized items called out by name in Task 3's own doc comments — are all
correctly excluded.

**Full skip list (679 lines):** identical across both runs; reproduced in full in the raw
command output saved during this task (not duplicated here for length — see the commit-run
output referenced below, which is the same list).

## Step 4: `--commit` against local dev DB (run #1)

```
Lines:      46  (created 46, updated 0)
Variations: 668
Skipped:    679
```

## Step 4b: idempotency proof (`--commit` run #2, no code/data changes between runs)

```
Lines:      46  (created 0, updated 46)
Variations: 668
Skipped:    679
```

Document counts before/after run #2: **unchanged**.
- `wellness-lifestyle`: 45 documents (both runs)
- `oils-incense`: 1 document (both runs)
- Total: 46 (matches "Lines: 46" both times)

Idempotency confirmed: 0 created / 46 updated on the second run, identical variation and skip
counts, identical document count. The upsert on `slug` (not `squareItemId`) is doing its job —
running the importer twice does not duplicate any line.

## Step 6: Verification of imported document content

**Whipped Shea Butter** (`wellness-lifestyle`, slug `whipped-shea-butter`):
```
name: Whipped Shea Butter
slug: whipped-shea-butter
productType: body-butter
publishOnline: false
variations.length: 67
distinct scents count: 67          (every variation has a distinct scent — no collisions)
all variations have numeric cents price: true
```
Sample variation:
```json
{
  "sku": "210000006227",
  "scent": "Almond",
  "squareVariationId": "7YZSWYTNXKTNH33HT3M2JEBN",
  "squareItemId": "HZIG3CV6ENQ3723C4QB2Q3PH",
  "price": 1399,
  "stock": 0,
  "isAvailable": true
}
```
`1399` = $13.99, copied verbatim from Square's `price_money.amount` — no scaling.

**Scented Oil** (`oils-incense`, slug `scented-oil`) — the other multi-hundred-variation line,
checked to confirm the schema-aware `squareItemId` omission behaves correctly:
```
publishOnline: false
productType: fragrance-oil
variations.length: 460
```
Sample variation:
```json
{
  "sku": "210000006555",
  "scent": "5th Ave",
  "squareVariationId": "JFFOONQ4Z3O5CJQ5L5KZ7O4K",
  "price": 800,
  "stock": 0,
  "isAvailable": true
}
```
`variations[0].squareItemId` is `undefined` — confirmed the field is correctly absent (not set
to `null` or an empty string) because `OilsIncense.variations[]` has no such field in its
schema.

Both documents have `publishOnline: false`, as required — never set by the script, always the
schema default.

## Payload validation errors encountered

**None.** Every one of the 46 lines wrote cleanly on both the create pass and the update pass —
`productType` (required on both collections) was supplied from `match.productType` in every
case, and no other required field was left unset.

## Cleanup

- Deleted the disposable `scratch-wellness.db` after verification (never staged, never
  committed — confirmed via `git status`).
- The committed `alkebulanimages.db` was never touched by this task.

## Commit

```
git add alkebu-load/scripts/import-wellness-from-square.ts
git commit -m "feat(wellness): idempotent Square -> Payload importer for Phase 1 lines"
```

---

# Task 4 Review-Fix Report — merge-on-update, per-line error handling, categorized skips

## Status: DONE

## What the four findings were

1. **CRITICAL**: the update path rebuilt `variations[]` from Square on every run with
   `stock: 0` hardcoded and no `weight` key. Payload array fields do not row-reconcile on
   update — setting `variations` in `data` replaces the entire stored array. Any re-run
   after the Task 5 stock webhook and Task 6 weight backfill had populated real data would
   silently wipe it, and would also wipe staff `isAvailable` toggles.
2. **IMPORTANT**: no per-line try/catch — one failing `payload.create`/`.update` would
   throw out of `main()`, skip the summary, and leave an unknown number of lines partially
   imported with no report.
3. **MINOR**: the skip list conflated three different situations into one flat "Skipped: N"
   count.
4. **MINOR**: unsafe `as 'body-butter' | 'soap'` / `as 'fragrance-oil'` assertions narrowing
   `ProductLineMatch.productType` (typed `string`) with no compiler check behind them.

## Files changed

- **Created** `alkebu-load/src/app/utils/wellnessVariationMerge.ts` — the pure
  `mergeVariations(existing, incoming)` function (Finding 1's fix). Keyed on
  `squareVariationId`. Square overwrites `price`, `sku`, `scent`, `squareItemId` (only
  when the incoming row carries that key, so OilsIncense — which has no such schema
  field — is untouched). Everything else on the matched existing row (`stock`, `weight`,
  `isAvailable`, `size`, `packaging`, `concentration`, `color`, `id`) survives via
  `{ ...match, ...overrides }`. Unmatched incoming rows are inserted fresh. Existing rows
  with no incoming match are **kept** in the returned `merged` array (never deleted) and
  also returned separately as `orphaned` for reporting.
- **Created** `alkebu-load/tests/import/wellnessVariationMerge.test.ts` — 6 `node:test`
  cases: stock+weight preserved across a price change; price does update; brand-new
  variation added with `stock: 0`; orphaned row preserved + reported, never deleted;
  `isAvailable: false` survives; a mixed run (one updated, one new, one orphaned) with
  nothing deleted; a defensive case where neither side has a `squareVariationId` (treated
  as new + orphaned rather than falsely matched).
- **Modified** `alkebu-load/src/app/utils/wellnessProductLines.ts` (Finding 4) —
  `ProductLineMatch` is now a discriminated union on `collection`:
  `{ collection: 'wellness-lifestyle'; productType: 'body-butter' | 'soap' } | { collection: 'oils-incense'; productType: 'fragrance-oil' }`.
  This lets the importer narrow `productType` correctly via a plain `collection === '...'`
  check — no assertion needed, and a future Task 3 addition with an invalid `productType`
  value is now a real compile error instead of silently passing through an `as` cast.
- **Modified** `alkebu-load/scripts/import-wellness-from-square.ts`:
  - Update path now fetches the existing doc, calls `mergeVariations()`, writes the
    merged array (which includes preserved orphaned rows), and collects orphaned rows
    into an `orphanedReport` for the summary. Create path is unchanged (fresh rows,
    `stock: 0`).
  - Each line's write (find + create/update) is wrapped in try/catch (Finding 2). A
    failure is recorded in a `failures` list with the line key/name/error message and the
    loop continues. The full failure list prints in the summary; the process exits 1 only
    **after** the summary prints (never suppressing it).
  - The flat skip list is now four categorized buckets — `unmatched`, `noPrice`,
    `noPricedVariation`, and a defensive `malformed` (item/variation with no id from
    Square) — each printed under its own heading, in full, never truncated (Finding 3).
    The header reads e.g. `Skipped: 679 (636 unmatched items, 43 variations with no
    price, 0 lines with no priced variation)`.
  - Deliberately does **not** import `src/payload-types.ts`. That file's `declare module
    'payload'` augmentation is ambient/global — pulling it into this file's module graph
    made `pnpm check:scripts` apply Payload's strict generated types to *every* script
    under `scripts/`, which surfaced pre-existing (unrelated) type mismatches in
    `import-square-to-payload.ts` and `test-checkout-flow.ts` that have nothing to do with
    this task. Reverted to hand-written local interfaces (`WellnessVariation`,
    `OilsIncenseVariation`) matching the two collections' `variations[]` schemas, with a
    single explicit, narrowly-scoped cast at the `payload.find()` boundary (documented
    inline) instead of a program-wide augmentation change. This kept the fix scoped to
    the file the findings were about.

## Verification

### `pnpm check:scripts`
Exit 0. (Confirmed via `git stash` that the pre-existing baseline was also exit 0, and
diffed the failure mode when `payload-types.ts` was imported directly — see note above —
before settling on the local-interface approach that keeps the whole script directory
green.)

### `pnpm test`
All 214 tests pass, including the 6 new `wellnessVariationMerge.test.ts` cases (`ok 63`
through `ok 68` in the run). Zero failures, zero regressions in the other 7 suites.

### `pnpm lint`
Exit 0. Only pre-existing warnings in files this task didn't touch (`FashionJewelry.ts`,
`InstitutionalAccounts.ts`, `Orders.ts`, `Reviews.ts`, `Users.ts`, `payload.config.ts`,
etc. — all `no-explicit-any` / unused-arg warnings that predate this change). No warnings
or errors in `import-wellness-from-square.ts`, `wellnessProductLines.ts`,
`wellnessVariationMerge.ts`, or the new test file.

### Real-DB proof that the merge preserves data (not just the unit test)

Per the brief's explicit instruction, this was proven against a real Payload document, not
just the unit test. Disposable DB per this repo's documented gotcha (the committed
`alkebulanimages.db` blocks on an interactive migration prompt for this branch's schema):

```
DATABASE_URI="file:./scratch-wellness-verify.db" SKIP_EMAIL_VERIFY=true \
  npx tsx --loader ./css-stub-loader.mjs scripts/import-wellness-from-square.ts --commit
```

Run #1 created all 46 lines fresh (including `whipped-shea-butter`, doc id 42, 67
variations — same line used in the original Task 4 report). Then, via a disposable
verification script (deleted after use, never committed — confirmed clean via `git
status`), I read the real `whipped-shea-butter` document's first variation (SKU
`210000006227`, scent "Almond", Square's real price 1399 = $13.99) and deliberately
overwrote it in Payload:

**BEFORE the deliberate mutation (real, untouched state):**
```json
{
  "sku": "210000006227",
  "scent": "Almond",
  "squareVariationId": "7YZSWYTNXKTNH33HT3M2JEBN",
  "price": 1399,
  "stock": 0,
  "weight": null,
  "isAvailable": true
}
```

**Mutated to a known wrong state** (simulating "stock synced by the Task 5 webhook,
weight backfilled by Task 6, and a price that's gone stale"):
```json
{
  "sku": "210000006227",
  "price": 1,
  "stock": 777,
  "weight": 55,
  "isAvailable": true
}
```

**Re-ran the importer with `--commit`** (`Lines: 46 (created 0, updated 46, failed 0)`,
`Orphaned: 0`, exit 0). Re-fetched the same document/variation:

**AFTER the re-import:**
```json
{
  "sku": "210000006227",
  "scent": "Almond",
  "squareVariationId": "7YZSWYTNXKTNH33HT3M2JEBN",
  "squareItemId": "HZIG3CV6ENQ3723C4QB2Q3PH",
  "price": 1399,
  "stock": 777,
  "weight": 55,
  "isAvailable": true
}
```

- `price`: **1 → 1399** — corrected back to Square's real price. Square owns this field
  and the importer must overwrite it. Confirmed working.
- `stock`: **777 → 777** — preserved, NOT clobbered back to `0`. This is the exact bug
  Finding 1 described; confirmed fixed.
- `weight`: **55 → 55** — preserved, NOT dropped. Shippo mis-rates shipping without this
  field; confirmed fixed.

As a second pass (extra scrutiny beyond what was asked), I additionally flipped
`isAvailable` to `false` on the same variation via the same disposable script, re-ran the
importer with `--commit` again (`Lines: 46 (created 0, updated 46, failed 0)`), and
re-fetched: `isAvailable` was still `false` and `price`/`stock`/`weight` were unchanged
from the prior step — the staff-toggle-survives guarantee holds against a real document,
not just the unit test.

All disposable scratch files (`scripts/_scratch_verify_before.ts`,
`scripts/_scratch_verify_after.ts`, `scripts/_scratch_toggle_off.ts`) and the scratch DB
(`scratch-wellness-verify.db`) were deleted after verification and were never staged —
confirmed via `git status --short` showing a clean tree apart from the intended four
files. The committed `alkebulanimages.db` was never touched.

## Commit

```
git add alkebu-load/scripts/import-wellness-from-square.ts \
        alkebu-load/src/app/utils/wellnessProductLines.ts \
        alkebu-load/src/app/utils/wellnessVariationMerge.ts \
        alkebu-load/tests/import/wellnessVariationMerge.test.ts \
        .superpowers/sdd/task-4-report.md
git commit -m "fix(wellness): merge Square updates onto existing variations instead of replacing them"
```
