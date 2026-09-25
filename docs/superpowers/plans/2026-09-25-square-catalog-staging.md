# Square Catalog Staging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make books added in Square POS reach Payload again — as valid Books when the Square data is complete, and as a staff review queue when it is not — without ever weakening how existing Books validate.

**Architecture:** The webhook's only job becomes verify-and-enqueue. A durable Payload job reads a persisted checkpoint, pulls changed Square items, and runs them through a pure mapper. Complete items create or update Books with a non-destructive edition merge; incomplete items become rows in a new staff-only `SquareCatalogStaging` collection. The checkpoint advances only when every item in the window is either saved or durably recorded.

**Tech Stack:** Payload CMS 3.79.0, Next.js 15.3.0, PostgreSQL (prod) / SQLite (dev), Square SDK v43, `node:test`, pnpm.

**Spec:** [`docs/superpowers/specs/2026-09-23-square-catalog-staging-design.md`](../specs/2026-09-23-square-catalog-staging-design.md) — read it before Task 1. It carries the evidence, the nine field defects, and the reasoning behind staging-over-drafts.

**Prerequisite — MET.** The spec's blocking dependency (no job runner) was closed by
[`2026-09-23-payload-job-runner.md`](2026-09-23-payload-job-runner.md) and verified in production
on 2026-09-25: Coolify logs show `cleanup-abandoned-carts` at `00:00:00` and
`recover-stripe-orders` at `00:15:00`, both `new: 1, retrying: 0`. **In-process `autoRun` works on
Coolify**, so Task 4 below uses `payload.jobs.queue()` with the existing runner rather than an
external trigger.

## Global Constraints

- Package manager is **pnpm** in `alkebu-load/`. Never `npm`.
- `pnpm test` runs `node:test` against `tests/**/*.test.ts` and injects `STRIPE_SECRET_KEY=sk_test_dummy`. Standalone `tsx` runs do not.
- Production builds enforce type and lint errors. `pnpm build` fails on warnings.
- Never `source` the `.env` file, and never print its contents.
- Pushing `main` triggers a Coolify auto-deploy. The push **is** the deploy.
- Local dev is SQLite (`DATABASE_URI=file:./alkebulanimages.db`, corrected 2026-09-24). Confirm with `cd alkebu-load && grep -o '^DATABASE_URI=[a-z]*' .env` before running anything. As of commit `534017e`, drizzle's dev schema push is refused for any non-local host, so a misconfigured URI fails safe.
- Prod DDL goes through the **Coolify Postgres terminal**, generated and reviewed before the deploy. A plugin schema change took `/admin` down on 2026-07-05.
- Shell runs as root. `chown -R jadom:jadom` every file created or modified.
- Run scripts as `tsx --loader ./css-stub-loader.mjs scripts/<name>.ts`. Local-API scripts fail on a transitive `.css` import without it.
- **Never fabricate catalog data.** A missing ISBN stays missing. A missing price is not zero. An unvalidated SKU never becomes an ISBN.

## Decisions already settled (do not re-litigate)

| Question | Decision |
|---|---|
| Where do incomplete imports live? | A new staff-only collection, not Payload drafts and not a `draft` value on `availabilityStatus`. Books' invariants stay untouched. |
| Does a staged item auto-promote once Square supplies the missing data? | No. It flips to `reviewStatus: 'ready'` and waits for a human tick, matching the wellness curation gate. Square's catalog carries bulk supply SKUs and miscategorised items. |
| Add `lastSyncedAt` to Books? | Yes. Its absence is why "have catalog updates ever run?" is currently unanswerable. |
| Checkpoint storage | **Deviation from the spec.** The spec said the `siteSettings` global. On inspection `siteSettings` is staff-editable SEO content (title, description, keywords, logo, banner) — a sync watermark there is one accidental save away from corruption, and it would show up in an editor's form. Use a dedicated admin-hidden global instead. |

## File Structure

| File | Responsibility |
|---|---|
| `src/collections/SquareCatalogStaging.ts` (create) | The review queue. Staff-gated, own admin group. |
| `src/globals/SquareSyncState.ts` (create) | Checkpoint watermark + last-run summary. `admin.hidden`. |
| `src/collections/Books.tsx` (modify) | Add `lastSyncedAt`. No other change. |
| `src/app/utils/squareCatalogMapping.ts` (create) | Pure: Square item → complete Book data or an issue list. No I/O. |
| `src/app/utils/squareEditionMerge.ts` (create) | Pure: existing editions + incoming → merged editions. Owns the non-destructive rule. |
| `src/app/utils/squareCatalogSync.ts` (create) | The job body: checkpoint read, fetch, dispatch to mapper, write, checkpoint advance. |
| `src/app/api/webhooks/square-catalog/route.ts` (modify) | Replace the inline `processCatalogVersionUpdate` with an enqueue. |
| `src/payload.config.ts` (modify) | Register the collection, the global, and the `square-catalog-sync` task. |
| `scripts/reconcile-square-catalog.ts` (create) | Backlog recovery. Dry-run by default. |
| `tests/import/squareCatalogMapping.test.ts` (create) | Mapper unit tests. |
| `tests/import/squareEditionMerge.test.ts` (create) | Merge unit tests. |
| `tests/import/squareCatalogIntegration.test.ts` (create) | The ten integration tests against the real schema. |

Two pure modules rather than one because the mapper answers "is this item usable?" and the merge answers "what survives a write?" — different questions, different test matrices, and the merge is the one with the data-loss risk.

---

### Task 1: Schema — staging collection, sync-state global, and `Books.lastSyncedAt`

All three land together because they are one Postgres DDL event. Splitting them means three prod migrations for one feature.

**Files:**
- Create: `alkebu-load/src/collections/SquareCatalogStaging.ts`
- Create: `alkebu-load/src/globals/SquareSyncState.ts`
- Modify: `alkebu-load/src/collections/Books.tsx` (add one field)
- Modify: `alkebu-load/src/payload.config.ts` (register both)

**Interfaces:**
- Produces: collection slug `square-catalog-staging`; global slug `squareSyncState`; `Books.lastSyncedAt` (date). Tasks 2, 4, 5 and 6 all depend on these names.

- [ ] **Step 1: Create the staging collection**

Follow the `PartnershipInquiries` house pattern — see `src/collections/PartnershipInquiries.ts` for the role-gate helpers and admin block. Create `alkebu-load/src/collections/SquareCatalogStaging.ts`:

```ts
import type { CollectionConfig } from 'payload';

const isCatalogStaff = (user: unknown): boolean => {
  const role = (user as { role?: string } | undefined)?.role;
  return role === 'admin' || role === 'staff';
};

const isAdmin = (user: unknown): boolean =>
  (user as { role?: string } | undefined)?.role === 'admin';

export const SquareCatalogStaging: CollectionConfig = {
  slug: 'square-catalog-staging',
  admin: {
    useAsTitle: 'proposedTitle',
    defaultColumns: ['proposedTitle', 'reviewStatus', 'squareItemId', 'lastSeenAt'],
    group: 'Inventory',
    description:
      'Square catalog items that could not form a valid Book. Complete the missing data and promote, or reject.',
  },
  // Staff-only on every operation. This collection never reaches the storefront:
  // it has no public route, no search bootstrap target, and no cart product type.
  access: {
    read: ({ req: { user } }) => isCatalogStaff(user),
    create: ({ req: { user } }) => isCatalogStaff(user),
    update: ({ req: { user } }) => isCatalogStaff(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  fields: [
    {
      name: 'squareItemId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Square catalog object id. The identity of this review row.' },
    },
    {
      name: 'squareCatalogVersion',
      type: 'text',
      required: true,
      admin: { description: 'Square catalog version that produced this snapshot.' },
    },
    {
      name: 'squareUpdatedAt',
      type: 'date',
      required: true,
      admin: { description: "Square's updated_at for the item, for staleness comparison." },
    },
    {
      name: 'rawItem',
      type: 'json',
      required: true,
      admin: { description: 'Full Square payload as received. The source of truth for a retry.' },
    },
    {
      name: 'validationIssues',
      type: 'array',
      required: true,
      minRows: 1,
      admin: { description: 'Why this could not become a Book.' },
      fields: [
        { name: 'field', type: 'text', required: true },
        { name: 'code', type: 'text', required: true },
        { name: 'detail', type: 'text' },
      ],
    },
    {
      name: 'reviewStatus',
      type: 'select',
      required: true,
      defaultValue: 'needs-review',
      index: true,
      options: [
        { label: 'Needs Review', value: 'needs-review' },
        { label: 'Ready to Promote', value: 'ready' },
        { label: 'Promoted', value: 'promoted' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    {
      name: 'promotedBook',
      type: 'relationship',
      relationTo: 'books',
      admin: { description: 'Set on promotion. Its presence blocks a second promotion.' },
    },
    { name: 'proposedTitle', type: 'text' },
    {
      name: 'proposedIsbn',
      type: 'text',
      admin: { description: 'Only set when the SKU/UPC passed isValidIsbn. Never a raw SKU.' },
    },
    {
      name: 'proposedPriceCents',
      type: 'number',
      admin: { description: 'Cents, unconverted. Absent means Square had no price.' },
    },
    {
      name: 'lastSeenAt',
      type: 'date',
      required: true,
      admin: { description: 'Updated every time a repeat event re-observes this item.' },
    },
  ],
};
```

- [ ] **Step 2: Create the sync-state global**

Create `alkebu-load/src/globals/SquareSyncState.ts`:

```ts
import type { GlobalConfig } from 'payload';

// Deliberately NOT a field on siteSettings: that global is staff-editable SEO
// content, and a sync watermark living in an editor's form is one accidental
// save away from silently re-importing or skipping months of catalog.
export const SquareSyncState: GlobalConfig = {
  slug: 'squareSyncState',
  admin: { hidden: true },
  access: {
    read: ({ req: { user } }) => {
      const role = (user as { role?: string } | undefined)?.role;
      return role === 'admin' || role === 'staff';
    },
    update: ({ req: { user } }) =>
      (user as { role?: string } | undefined)?.role === 'admin',
  },
  fields: [
    {
      name: 'catalogSyncedThrough',
      type: 'date',
      admin: {
        description:
          'High-water mark. Every Square item changed at or before this instant is either saved or recorded in staging. Empty means never synced.',
      },
    },
    { name: 'lastRunAt', type: 'date' },
    { name: 'lastRunCreated', type: 'number', defaultValue: 0 },
    { name: 'lastRunUpdated', type: 'number', defaultValue: 0 },
    { name: 'lastRunStaged', type: 'number', defaultValue: 0 },
    { name: 'lastRunFailed', type: 'number', defaultValue: 0 },
  ],
};
```

- [ ] **Step 3: Add `lastSyncedAt` to Books**

In `src/collections/Books.tsx`, next to the existing `importSource` / `importDate` fields (around line 552-570), add:

```tsx
    {
      name: 'lastSyncedAt',
      type: 'date',
      admin: {
        description: 'Last time a Square catalog sync wrote to this book',
        position: 'sidebar',
      },
    },
```

The webhook has been writing this field since before it existed, so Payload has been silently dropping it — which is precisely why nobody could tell whether catalog updates were running. Add the field; change nothing else in this file.

- [ ] **Step 4: Register both in the config**

In `src/payload.config.ts`, add the imports alongside the existing collection and global imports, then add `SquareCatalogStaging` to the `collections` array and `SquareSyncState` to the `globals` array.

```ts
import { SquareCatalogStaging } from './collections/SquareCatalogStaging'
import { SquareSyncState } from './globals/SquareSyncState'
```

Do **not** add `squareSyncState` to the `admin.globals` list at line ~225 — it is hidden on purpose.

- [ ] **Step 5: Regenerate types and build**

```bash
cd alkebu-load && pnpm generate:types && pnpm lint && pnpm build && pnpm test
```

Expected: `payload-types.ts` gains `SquareCatalogStaging`, `SquareSyncState`, and `Book.lastSyncedAt`. All four commands pass.

- [ ] **Step 6: Generate the DDL and hold it**

```bash
cd alkebu-load && pnpm payload migrate:create square_catalog_staging
```

Read the generated file in `src/migrations/`. It must create the staging table, its `validationIssues` array table, the `squareSyncState` global table, and add one `last_synced_at` column to `books`. **It must not ALTER or DROP anything else on `books`.** If it touches another books column, stop and report — that is the 2026-07-05 outage pattern.

- [ ] **Step 7: Commit**

```bash
cd /home/jadom/Coding/alkebulanimages2.0
chown -R jadom:jadom alkebu-load/src
git add alkebu-load/src
git commit -m "feat(square): staging collection, sync-state global, Books.lastSyncedAt

Schema only, no behaviour. Staging is staff-gated on all four operations
and has no storefront surface. The sync watermark gets its own hidden
global rather than a field on the staff-editable siteSettings.
lastSyncedAt has been written by the webhook to a nonexistent field since
it was added, which is why catalog-update activity was unverifiable."
```

---

### Task 2: Pure mapper — Square item to Book data or issues

**Files:**
- Create: `alkebu-load/src/app/utils/squareCatalogMapping.ts`
- Test: `alkebu-load/tests/import/squareCatalogMapping.test.ts`

**Interfaces:**
- Consumes: nothing at runtime. Mirrors the shape of `src/app/utils/wellnessProductLines.ts` — pure, no I/O, exhaustively tested.
- Produces:
```ts
export type ValidationIssue = { field: string; code: string; detail?: string };
export type MappedComplete = { kind: 'complete'; data: Record<string, unknown> };
export type MappedIncomplete = {
  kind: 'incomplete';
  issues: ValidationIssue[];
  proposed: { proposedTitle?: string; proposedIsbn?: string; proposedPriceCents?: number };
};
export function mapSquareItemToBook(item: unknown): MappedComplete | MappedIncomplete;
export function isValidIsbn(isbn: string): boolean;
```
Tasks 4, 5 and 6 all call `mapSquareItemToBook`.

- [ ] **Step 1: Write the failing tests**

Create `alkebu-load/tests/import/squareCatalogMapping.test.ts`:

```ts
import assert from 'node:assert';
import test from 'node:test';

import { mapSquareItemToBook } from '../../src/app/utils/squareCatalogMapping';

const variation = (over: Record<string, unknown> = {}) => ({
  id: 'VAR1',
  itemVariationData: { sku: '9780310180302', priceMoney: { amount: 2299n }, ...over },
});

const item = (over: Record<string, unknown> = {}) => ({
  id: 'ITEM1',
  updatedAt: '2026-09-20T10:00:00Z',
  itemData: { name: 'The Gospel and My Black Skin', variations: [variation()] },
  ...over,
});

test('maps a complete item with the price in cents, undivided', () => {
  const result = mapSquareItemToBook(item());
  assert.strictEqual(result.kind, 'complete');
  if (result.kind !== 'complete') return;
  // Square priceMoney.amount is ALREADY cents and Books.pricing.retailPrice is
  // cents. The old webhook divided by 100 -- a 100x underprice.
  assert.strictEqual((result.data.pricing as any).retailPrice, 2299);
  assert.strictEqual(result.data.title, 'The Gospel and My Black Skin');
  assert.strictEqual(result.data.squareItemId, 'ITEM1');
  assert.strictEqual(result.data.importSource, 'square-webhook');
});

test('writes the publisher name to publisherText, never to the relationship', () => {
  const result = mapSquareItemToBook(item());
  assert.strictEqual(result.kind, 'complete');
  if (result.kind !== 'complete') return;
  const [edition] = result.data.editions as any[];
  assert.strictEqual(edition.publisher, undefined,
    'editions[].publisher is a relationship to publishers and must never receive a string');
  assert.ok(!('publisher' in result.data) || typeof result.data.publisher !== 'string');
  assert.strictEqual(edition.pricing.retailPrice, 2299);
});

test('an item with no valid ISBN is incomplete and no ISBN is invented', () => {
  const result = mapSquareItemToBook(
    item({ itemData: { name: 'Mystery Item', variations: [variation({ sku: 'SHELF-TAG-7' })] } }),
  );
  assert.strictEqual(result.kind, 'incomplete');
  if (result.kind !== 'incomplete') return;
  assert.ok(result.issues.some((i) => i.field === 'editions.isbn'));
  assert.strictEqual(result.proposed.proposedIsbn, undefined,
    'an arbitrary SKU must never be surfaced as a proposed ISBN');
  assert.strictEqual(result.proposed.proposedTitle, 'Mystery Item');
});

test('an item with no price is incomplete and the price is not zero', () => {
  const result = mapSquareItemToBook(
    item({
      itemData: {
        name: 'Unpriced Book',
        variations: [variation({ priceMoney: undefined })],
      },
    }),
  );
  assert.strictEqual(result.kind, 'incomplete');
  if (result.kind !== 'incomplete') return;
  assert.ok(result.issues.some((i) => i.field === 'pricing.retailPrice'));
  assert.strictEqual(result.proposed.proposedPriceCents, undefined);
});

test('an item with no variations at all is incomplete (editions requires minRows 1)', () => {
  const result = mapSquareItemToBook(item({ itemData: { name: 'Bare Item', variations: [] } }));
  assert.strictEqual(result.kind, 'incomplete');
  if (result.kind !== 'incomplete') return;
  assert.ok(result.issues.some((i) => i.field === 'editions'));
});

test('book-level price comes from the lowest-priced variation, not array order', () => {
  const result = mapSquareItemToBook(
    item({
      itemData: {
        name: 'Two Editions',
        variations: [
          { id: 'HC', itemVariationData: { sku: '9780310180302', priceMoney: { amount: 3499n } } },
          { id: 'PB', itemVariationData: { sku: '9780310180319', priceMoney: { amount: 1899n } } },
        ],
      },
    }),
  );
  assert.strictEqual(result.kind, 'complete');
  if (result.kind !== 'complete') return;
  assert.strictEqual((result.data.pricing as any).retailPrice, 1899);
  assert.strictEqual((result.data.editions as any[]).length, 2);
});

test('never emits an importSource outside the Books select options', () => {
  const result = mapSquareItemToBook(item());
  assert.strictEqual(result.kind, 'complete');
  if (result.kind !== 'complete') return;
  // enrichProductFromIdentifiers can return 'open-library', which is NOT a valid
  // option on Books.importSource. The mapper owns this field unconditionally.
  assert.ok(
    ['manual', 'isbndb', 'google-books', 'csv-import', 'square-webhook'].includes(
      result.data.importSource as string,
    ),
  );
});

test('carries squareVariationId onto each edition so inventory sync can match', () => {
  const result = mapSquareItemToBook(item());
  assert.strictEqual(result.kind, 'complete');
  if (result.kind !== 'complete') return;
  assert.strictEqual((result.data.editions as any[])[0].squareVariationId, 'VAR1');
});

test('a malformed item is incomplete rather than throwing', () => {
  for (const bad of [null, undefined, {}, { id: 'X' }, { itemData: {} }]) {
    const result = mapSquareItemToBook(bad);
    assert.strictEqual(result.kind, 'incomplete', `expected ${JSON.stringify(bad)} to be incomplete`);
  }
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd alkebu-load && pnpm test
```

Expected: FAIL — `Cannot find module '.../squareCatalogMapping'`.

- [ ] **Step 3: Implement**

Create `alkebu-load/src/app/utils/squareCatalogMapping.ts`. Requirements the tests pin, restated so you implement rather than curve-fit:

- `isValidIsbn`: strip `-` and spaces; accept 13 digits, or 9 digits plus a final digit or `X`. Copy the existing implementation from `src/app/api/webhooks/square-catalog/route.ts:737-748` — do not invent a second rule.
- Price: `Number(variation.itemVariationData.priceMoney.amount)`. Square sends a BigInt; `Number()` it, never divide.
- Book-level `pricing.retailPrice` = the **lowest** price among variations that have one.
- Each edition: `{ isbn, squareVariationId, pricing: { retailPrice }, isAvailable: true }` — and `publisherText` when Square offers a publisher name. Never `publisher`.
- `importSource: 'square-webhook'` set unconditionally and last, so nothing can overwrite it.
- `lastSyncedAt`: set to the run timestamp (the field now exists, from Task 1).
- Incomplete when: no variations; no variation has a price; no variation has a SKU/UPC passing `isValidIsbn`. Each condition adds its own `ValidationIssue`. Report **all** issues, not the first.
- Never throw. A malformed input yields `incomplete` with an issue of code `malformed`.
- Do not call enrichment here. This module is pure; enrichment is I/O and belongs in Task 4, applied *after* mapping and forbidden from touching `importSource`.

- [ ] **Step 4: Run to verify it passes**

```bash
cd alkebu-load && pnpm test
```

Expected: PASS, pre-existing suite still green.

- [ ] **Step 5: Commit**

```bash
cd /home/jadom/Coding/alkebulanimages2.0
chown -R jadom:jadom alkebu-load/src alkebu-load/tests
git add alkebu-load/src/app/utils/squareCatalogMapping.ts alkebu-load/tests/import/squareCatalogMapping.test.ts
git commit -m "feat(square): pure Square-item to Book mapper

Closes the field-contract defects that made every catalog create fail:
retailPrice in cents undivided, publisher name to publisherText not the
relationship, ISBN only from a SKU that validates, and importSource
pinned to square-webhook. Incomplete items return an issue list instead
of a fabricated Book."
```

---

### Task 3: Non-destructive edition merge

**Files:**
- Create: `alkebu-load/src/app/utils/squareEditionMerge.ts`
- Test: `alkebu-load/tests/import/squareEditionMerge.test.ts`

**Interfaces:**
- Produces: `mergeEditions(existing: any[], incoming: any[]): any[]`. Task 4 calls it before every Book update.

- [ ] **Step 1: Write the failing tests**

Create `alkebu-load/tests/import/squareEditionMerge.test.ts`:

```ts
import assert from 'node:assert';
import test from 'node:test';

import { mergeEditions } from '../../src/app/utils/squareEditionMerge';

const curated = {
  id: 'ed1',
  squareVariationId: 'VAR1',
  isbn: '9780310180302',
  isbn10: '0310180309',
  publisher: 42,
  publisherText: 'Zondervan',
  datePublished: '2019-03-01T00:00:00Z',
  binding: 'paperback',
  pages: 224,
  dimensions: '8.5 x 5.5',
  stripePriceId: 'price_abc',
  pricing: { retailPrice: 2299, shippingWeight: 12 },
  inventory: { stockLevel: 7, allowBackorders: false },
  isAvailable: true,
};

test('a thin Square payload never erases curated edition metadata', () => {
  const [merged] = mergeEditions([curated], [
    { squareVariationId: 'VAR1', isbn: '9780310180302', pricing: { retailPrice: 2499 } },
  ]);
  assert.strictEqual(merged.isbn10, '0310180309');
  assert.strictEqual(merged.publisher, 42);
  assert.strictEqual(merged.datePublished, '2019-03-01T00:00:00Z');
  assert.strictEqual(merged.pages, 224);
  assert.strictEqual(merged.dimensions, '8.5 x 5.5');
  assert.strictEqual(merged.stripePriceId, 'price_abc');
  assert.strictEqual(merged.pricing.retailPrice, 2499, 'Square owns price and may update it');
});

test('stock level is never touched by a catalog write', () => {
  // The inventory webhook owns stockLevel and had just written it. A catalog
  // sync that carries a stale or absent count must not roll it back.
  const [merged] = mergeEditions([curated], [
    { squareVariationId: 'VAR1', isbn: '9780310180302', inventory: { stockLevel: 0 } },
  ]);
  assert.strictEqual(merged.inventory.stockLevel, 7);
  assert.strictEqual(merged.inventory.allowBackorders, false);
});

test('shippingWeight survives because Square does not carry packaging weight', () => {
  const [merged] = mergeEditions([curated], [
    { squareVariationId: 'VAR1', isbn: '9780310180302', pricing: { retailPrice: 2299 } },
  ]);
  assert.strictEqual(merged.pricing.shippingWeight, 12);
});

test('a genuinely new variation is appended', () => {
  const merged = mergeEditions([curated], [
    { squareVariationId: 'VAR1', isbn: '9780310180302' },
    { squareVariationId: 'VAR2', isbn: '9780310180319', pricing: { retailPrice: 3499 } },
  ]);
  assert.strictEqual(merged.length, 2);
  assert.strictEqual(merged[1].squareVariationId, 'VAR2');
});

test('an edition missing from Square is marked unavailable, never deleted', () => {
  const merged = mergeEditions([curated], [
    { squareVariationId: 'VAR2', isbn: '9780310180319', pricing: { retailPrice: 3499 } },
  ]);
  assert.strictEqual(merged.length, 2, 'the existing edition must survive');
  const kept = merged.find((e: any) => e.squareVariationId === 'VAR1');
  assert.strictEqual(kept.isAvailable, false);
  assert.strictEqual(kept.isbn, '9780310180302', 'its data is retained, only availability flips');
});

test('an existing edition with no squareVariationId is left completely alone', () => {
  const manual = { id: 'ed9', isbn: '9781234567897', publisherText: 'Hand entered' };
  const merged = mergeEditions([manual], [
    { squareVariationId: 'VAR1', isbn: '9780310180302', pricing: { retailPrice: 1000 } },
  ]);
  const found = merged.find((e: any) => e.id === 'ed9');
  assert.deepStrictEqual(found, manual, 'a non-Square edition is not Square\'s to modify');
});

test('an incoming field that is undefined does not overwrite a populated one', () => {
  const [merged] = mergeEditions([curated], [
    { squareVariationId: 'VAR1', isbn: undefined, pricing: { retailPrice: undefined } },
  ]);
  assert.strictEqual(merged.isbn, '9780310180302');
  assert.strictEqual(merged.pricing.retailPrice, 2299);
});

test('empty inputs are handled without throwing', () => {
  assert.deepStrictEqual(mergeEditions([], []), []);
  assert.strictEqual(mergeEditions([], [{ squareVariationId: 'V', isbn: '9780310180302' }]).length, 1);
  assert.strictEqual(mergeEditions([curated], []).length, 1);
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd alkebu-load && pnpm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `alkebu-load/src/app/utils/squareEditionMerge.ts`. The ownership rule, stated once and applied everywhere:

- **Square owns:** the existence of a variation, its `squareVariationId`, `isbn` (only when valid), and `pricing.retailPrice`.
- **Payload owns everything else:** `isbn10`, `publisher`, `publisherText`, `datePublished`, `binding`, `edition`, `pages`, `language`, `dimensions`, `stripePriceId`, `pricing.shippingWeight`, and the whole `inventory` group.
- Match on `squareVariationId`. An existing edition without one is never modified.
- An incoming `undefined` never overwrites a populated value.
- An existing Square-linked edition absent from `incoming` gets `isAvailable: false` and keeps every other field.
- Preserve the existing row's `id` so Payload updates the array row rather than replacing it.

- [ ] **Step 4: Run to verify it passes**

```bash
cd alkebu-load && pnpm test
```

- [ ] **Step 5: Commit**

```bash
cd /home/jadom/Coding/alkebulanimages2.0
chown -R jadom:jadom alkebu-load/src alkebu-load/tests
git add alkebu-load/src/app/utils/squareEditionMerge.ts alkebu-load/tests/import/squareEditionMerge.test.ts
git commit -m "feat(square): non-destructive edition merge by variation id

The old webhook replaced the whole editions array on update, discarding
curated metadata and the stock levels the inventory path had just
written. Square now owns only variation existence, sku, isbn and price;
everything else is Payload's and survives."
```

---

### Task 4: Durable job, checkpoint, and the webhook enqueue

**Files:**
- Create: `alkebu-load/src/app/utils/squareCatalogSync.ts`
- Modify: `alkebu-load/src/app/api/webhooks/square-catalog/route.ts`
- Modify: `alkebu-load/src/payload.config.ts` (register the task)

**Interfaces:**
- Consumes: `mapSquareItemToBook` (Task 2), `mergeEditions` (Task 3), the `square-catalog-staging` collection and `squareSyncState` global (Task 1).
- Produces: `runSquareCatalogSync(payload): Promise<{created:number; updated:number; staged:number; failed:number}>` and the registered task slug `square-catalog-sync`.

- [ ] **Step 1: Write the sync body**

Create `src/app/utils/squareCatalogSync.ts` implementing, in order:

1. Read `squareSyncState.catalogSyncedThrough`. Window start = that value minus a **15-minute overlap**; if unset, fall back to 24 hours ago for the live path (the backlog is Task 6's job, not the webhook's).
2. Fetch changed Square items. Keep the existing `catalog.list({ types: 'ITEM,IMAGE' })` call from the current route — replacing it with `SearchCatalogObjects` is an explicit non-goal of the spec. Filter client-side on `item.updatedAt >= windowStart`. **Never compute the window from `new Date()` alone** — that is the bug that makes a retried event skip its own change.
3. For each item: `mapSquareItemToBook`. On `complete`, upsert the Book by `squareItemId`, using `mergeEditions` for the `editions` field on update and never writing `inventory.stockLevel`. On `incomplete`, upsert a staging row by `squareItemId`, updating `lastSeenAt`, `rawItem`, `validationIssues`, and flipping `reviewStatus` from `needs-review` to `ready` when the issue list is now empty — but never to `promoted`.
4. Optimistic concurrency: re-read the Book inside the job and skip the item (counting it unresolved) if `updatedAt` changed since the read.
5. Enrichment stays optional and is applied *after* mapping, and must never set `importSource`, `editions`, or `pricing`.
6. Advance the checkpoint to **`min(window end, oldest unresolved item's updatedAt)`**. An item that is neither saved nor staged holds the watermark. Write the run counters to the global.
7. Return the counts.

- [ ] **Step 2: Register the task**

In `src/payload.config.ts`, add to `jobs.tasks` (no `schedule` — this one is queued on demand, not cron-driven):

```ts
      {
        slug: 'square-catalog-sync',
        retries: { attempts: 3, backoff: { type: 'exponential', maxDelay: 300000 } },
        handler: async ({ req }) => {
          const { runSquareCatalogSync } = await import('./app/utils/squareCatalogSync');
          const summary = await runSquareCatalogSync(req.payload);
          return { output: summary };
        },
      },
```

- [ ] **Step 3: Replace the webhook body with an enqueue**

In `src/app/api/webhooks/square-catalog/route.ts`, change the `catalog.version.updated` case so the route verifies the signature, enqueues, and only then returns 200:

```ts
      case 'catalog.version.updated': {
        // Enqueue durably and ack only once the job row is committed. The old
        // after() form returned 200 before the work started, so a later failure
        // could never trigger Square's retry (24h window).
        const payload = await getPayload({ config })
        await payload.jobs.queue({ task: 'square-catalog-sync', input: {} })
        return NextResponse.json({ received: true, queued: 'square-catalog-sync' })
      }
```

If the enqueue throws, let the route 500 so Square retries. Leave the `inventory.count.updated` case exactly as it is — that path is healthy and in production.

- [ ] **Step 4: Verify**

```bash
cd alkebu-load && pnpm generate:types && pnpm lint && pnpm build && pnpm test
```

- [ ] **Step 5: Commit**

```bash
cd /home/jadom/Coding/alkebulanimages2.0
chown -R jadom:jadom alkebu-load/src
git add alkebu-load/src
git commit -m "feat(square): durable catalog sync job with a persisted checkpoint

The webhook now verifies and enqueues, acking only after the job row
commits, so a processing failure can still trigger Square's retry. The
change window is read from a persisted watermark with 15m overlap rather
than wall-clock now, so a delayed or retried event no longer skips its
own change. The checkpoint advances only past items that are saved or
durably staged."
```

---

### Task 5: Integration tests against the real Books schema

Pure-unit coverage cannot catch the failures that matter here — every one of the nine original defects was a *schema contract* violation that unit tests on a mapper would have passed.

**Files:**
- Create: `alkebu-load/tests/import/squareCatalogIntegration.test.ts`

- [ ] **Step 1: Write all ten tests**

Against the local SQLite dev database via the Local API. Each test must assert on a document actually written and read back, not on a mapper return value.

1. **Incomplete creation** — an item with no ISBN produces a staging row, no Book, and no fabricated ISBN anywhere.
2. **No price** — produces a staging row; no Book has `pricing.retailPrice === 0`.
3. **Complete creation** — a valid item produces a Book whose `pricing.retailPrice` is cents, `editions[0].publisherText` is set, `editions[0].publisher` is unset, and `importSource === 'square-webhook'`.
4. **Edition preservation** — updating an existing book with a thin payload retains `isbn10`, `publisher`, `datePublished`, `pages`, `dimensions`.
5. **Stock is never clobbered** — a catalog write leaves a previously-written `inventory.stockLevel` intact.
6. **Repeat delivery** — the same event twice yields exactly one Book and one staging row.
7. **Concurrent promotion** — two simultaneous promotions of one staging row yield one Book.
8. **Delayed processing** — an event processed 30 minutes late still covers its own change (checkpoint + overlap).
9. **Checkpoint holds on failure** — one item neither saved nor staged prevents the watermark advancing past it.
10. **Staged items are unreachable** — assert against `/api/search`, the book detail loader path, `addItemToCart`, and checkout preview that nothing in staging is reachable.

- [ ] **Step 2: Run, fix, and re-run until green**

```bash
cd alkebu-load && pnpm test
```

If a test fails because the implementation is wrong, fix the implementation, not the test. If it fails because the test misunderstands the schema, fix the test — and say which in the report.

- [ ] **Step 3: Commit**

```bash
cd /home/jadom/Coding/alkebulanimages2.0
chown -R jadom:jadom alkebu-load/tests
git add alkebu-load/tests/import/squareCatalogIntegration.test.ts
git commit -m "test(square): integration coverage against the real Books schema

Every one of the nine original defects was a schema-contract violation
that mapper unit tests would have passed. These assert on documents
written and read back."
```

---

### Task 6: Reconciliation backfill script

**Files:**
- Create: `alkebu-load/scripts/reconcile-square-catalog.ts`

- [ ] **Step 1: Write the script**

Follow the header-comment and structure conventions in `scripts/backfill-wellness-shipping-weights.ts`.

- `--dry-run` is the **default**. Writing requires an explicit `--commit`.
- Walks the entire Square catalog, not a time window — this is the ~6.5-month backlog.
- Uses `mapSquareItemToBook` and `mergeEditions`. No parallel logic; a second implementation is how the two drift.
- Reports **created / updated / staged / failed** with per-item reasons, and prints the ten worst reasons by count so the incomplete bucket can be judged at a glance.
- Repeat-safe: upsert by `squareItemId`, so a second run creates no duplicates.
- Does not advance the checkpoint — the live path owns that watermark.

- [ ] **Step 2: Type-check**

```bash
cd alkebu-load && pnpm check:scripts
```

- [ ] **Step 3: Dry run against the local dev DB**

```bash
cd alkebu-load && tsx --loader ./css-stub-loader.mjs scripts/reconcile-square-catalog.ts --dry-run
```

The `--loader` flag is required; Local-API scripts fail on a transitive `.css` import without it.

- [ ] **Step 4: Commit**

```bash
cd /home/jadom/Coding/alkebulanimages2.0
chown -R jadom:jadom alkebu-load/scripts
git add alkebu-load/scripts/reconcile-square-catalog.ts
git commit -m "feat(square): reconciliation backfill for the catalog gap

Dry-run by default. Recovers the items missed since 2026-03-08 using the
same mapper and merge as the live path."
```

---

### Task 7: Deploy and backfill — user-owned

Requires the Coolify Postgres terminal and judgement about the review queue. Not dispatched to an agent.

- [ ] **Step 1** — Review the generated migration from Task 1 Step 6. Confirm it adds `books.last_synced_at` and creates the new tables, and **alters nothing else on `books`**.
- [ ] **Step 2** — Apply the DDL via the Coolify Postgres terminal, before the deploy.
- [ ] **Step 3** — `git push origin main`. Watch the build, then `curl -s https://payload.alkebulanimages.com/api/health`.
- [ ] **Step 4** — Dry-run the reconciliation against production and **read the output before doing anything else**. The `staged` count is the size of the review queue you are about to inherit. If it is in the hundreds, stop and reconsider the mapper's completeness bar before importing.
- [ ] **Step 5** — Run it with `--commit`.
- [ ] **Step 6** — Triage the staging queue in `/admin` → Inventory → Square Catalog Staging. Complete and promote what is real; reject bulk supply SKUs and miscategorised items.
- [ ] **Step 7** — Hit `/api/search` and wait five minutes for the FlexSearch snapshot to rebuild; new books will not appear before that. `initialize-search.ts` will **not** warm the running server.
- [ ] **Step 8** — Spot-check one newly imported book: detail page renders, price is right (cents, not 100× off), adds to cart. Then confirm one staged item 404s by direct slug.
- [ ] **Step 9** — Add a book in Square POS and confirm it reaches Payload within one sync. That is the thing that has been broken since March.

---

## Follow-ups, deliberately out of scope

- **`SearchCatalogObjects` + `begin_time`** instead of listing the whole catalog per run. Performance, not correctness.
- **`isActive` backfill** — false on 5,174 of 5,176 books. Unused by any query, but a loaded gun in the admin UI.
- **Historical Stripe sweep** — `recover-stripe-orders` has a depth-bounded lookback of 40 sessions, so it cannot catch up on the window when the runner was dormant. One read-only run with a large `limit` would show whether anything was lost.
- **Local Postgres for migration rehearsal** — see the discussion of 2026-09-23; the same root cause as the `push: false` guard.
