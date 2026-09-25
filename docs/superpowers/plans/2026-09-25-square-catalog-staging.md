# Square Catalog Staging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make books added in Square POS reach Payload again — as valid Books when Square's data is complete and a human has approved them, and as a staff review queue when it is not — without weakening how existing Books validate and without losing inventory writes.

**Architecture:** The webhook verifies and enqueues. A durable job reads a persisted checkpoint, pulls changed Square items, and runs each through a pure mapper. Items that map cleanly *and* have no staging history update existing Books; everything else becomes or refreshes a row in a staff-only `SquareCatalogStaging` collection, from which a human promotes. All book writes — catalog and inventory alike — run through the job queue under one exclusive concurrency key, so they cannot interleave.

**Tech Stack:** Payload CMS 3.79.0, Next.js 15.3.0, PostgreSQL (prod) / SQLite (dev), Square SDK v43, `node:test`, pnpm.

**Spec:** [`docs/superpowers/specs/2026-09-23-square-catalog-staging-design.md`](../specs/2026-09-23-square-catalog-staging-design.md). **Read Revision 2 at the end of that file before Task 1** — it supersedes several decisions in the original body, and this plan implements Revision 2.

**Supersedes:** the first version of this plan (commit `9a1b1ba`), which review found had seven defects. Do not work from it.

**Prerequisite — MET.** The job runner was verified running in production 2026-09-25 (Coolify logs: `cleanup-abandoned-carts` at `00:00:00`, `recover-stripe-orders` at `00:15:00`, both `new: 1, retrying: 0`). In-process `autoRun` works on Coolify.

## Global Constraints

- **pnpm** in `alkebu-load/`. Never `npm`.
- Every task ends by running **`pnpm test` and `pnpm check:types`**. The second is new (`d1ea199`) and exists because `pnpm test` strips types via `tsx` and `next build` excludes `tests/` — four real type errors shipped through that gap.
- `pnpm lint` **does not** fail the build; it currently emits ~480 warnings. Do not treat a warning as a blocker, and do not "fix" pre-existing ones. (Both `CLAUDE.md` and the superseded plan claimed otherwise. They were wrong.)
- Never `source` or print `.env`.
- Pushing `main` triggers a Coolify auto-deploy. The push **is** the deploy. No task pushes.
- Local dev is SQLite (`DATABASE_URI=file:./alkebulanimages.db`). Confirm with `grep -o '^DATABASE_URI=[a-z]*' .env`. Since `534017e`, drizzle's dev push is refused for non-local hosts.
- Prod DDL goes through the **Coolify Postgres terminal**, generated against a local throwaway Postgres — never production.
- Shell runs as root. `chown -R jadom:jadom` everything touched.
- Scripts run as `tsx --loader ./css-stub-loader.mjs scripts/<name>.ts`.
- **Never fabricate catalog data.** Missing ISBN stays missing. Missing price is not zero. An unvalidated SKU never becomes an ISBN.

## Ordering note — why the migration is generated last

Everything schema-affecting must be in **one** migration: the staging collection, the sync-state global, `Books.lastSyncedAt`, `Books.squareItemId` uniqueness, `jobs.enableConcurrencyControl` (which adds an indexed `concurrencyKey` to the jobs collection), and **both new task slugs** (task slugs live in the `enum_payload_jobs_task_slug` Postgres enum — see `src/migrations/20260705_174837_add_mcp_api_keys.ts:10-11`).

The task handlers do not exist until Tasks 5 and 6. So Task 1 writes the schema *code*, and **Task 8 generates the migration** once both tasks are registered. Generating earlier produces an incomplete migration — that is defect 4 from the review.

## File Structure

| File | Responsibility |
|---|---|
| `src/collections/SquareCatalogStaging.ts` (create) | Review queue. Staff-gated. |
| `src/globals/SquareSyncState.ts` (create) | Checkpoint + last-run counters. `admin.hidden`. |
| `src/collections/Books.tsx` (modify) | Add `lastSyncedAt`; make `squareItemId` unique + indexed. |
| `src/app/utils/jsonSafe.ts` (create) | BigInt-safe normalization for `rawItem`. |
| `src/app/utils/squareCatalogMapping.ts` (create) | Pure: Square item → complete Book data or per-variation issues. |
| `src/app/utils/squareEditionMerge.ts` (create) | Pure: field ownership between Square and Payload. |
| `src/app/utils/squareStagingWorkflow.ts` (create) | State machine + transactional promotion. |
| `src/app/utils/squareCatalogSync.ts` (create) | Job body: checkpoint, fetch, dispatch, write, advance, throw-on-unresolved. |
| `src/app/api/webhooks/square-catalog/route.ts` (modify) | Both events become enqueues. |
| `src/payload.config.ts` (modify) | Register collection, global, both tasks, concurrency control. |
| `scripts/reconcile-square-catalog.ts` (create) | Backlog recovery. Dry-run default. |
| `tests/import/*.test.ts` (create) | Unit + integration. |

---

### Task 1: Schema code — staging, sync state, Books fields

No migration is generated here. Code only.

**Files:** create `src/collections/SquareCatalogStaging.ts`, create `src/globals/SquareSyncState.ts`, modify `src/collections/Books.tsx`, modify `src/payload.config.ts`.

**Interfaces produced:** collection slug `square-catalog-staging`; global slug `squareSyncState`; `Books.lastSyncedAt`; `Books.squareItemId` unique+indexed. Tasks 4-9 depend on these names.

- [ ] **Step 1: Staging collection**

Create `src/collections/SquareCatalogStaging.ts`, following the `PartnershipInquiries` role-gate pattern:

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
      'Square catalog items awaiting review. Complete the missing data and promote, or reject. Rejection is permanent: a rejected item is never re-imported.',
  },
  // Staff-only on every operation. No storefront surface: no public route, no
  // search bootstrap target, no cart product type.
  access: {
    read: ({ req: { user } }) => isCatalogStaff(user),
    create: ({ req: { user } }) => isCatalogStaff(user),
    update: ({ req: { user } }) => isCatalogStaff(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  fields: [
    { name: 'squareItemId', type: 'text', required: true, unique: true, index: true },
    { name: 'squareCatalogVersion', type: 'text', required: true },
    { name: 'squareUpdatedAt', type: 'date', required: true },
    {
      name: 'rawItem',
      type: 'json',
      required: true,
      admin: {
        description:
          'Square payload, BigInt-normalised by jsonSafe.ts. Storing the raw SDK object throws: JSON.stringify cannot serialise BigInt, and priceMoney.amount is one.',
      },
    },
    {
      name: 'validationIssues',
      type: 'array',
      required: true,
      minRows: 1,
      admin: {
        description:
          'Why this is not a Book. A row that becomes complete records the sentinel {field:"-", code:"resolved"} rather than an empty array, because minRows is 1.',
      },
      fields: [
        { name: 'field', type: 'text', required: true },
        { name: 'code', type: 'text', required: true },
        { name: 'detail', type: 'text' },
        { name: 'variationId', type: 'text', admin: { description: 'Set when the issue is per-variation.' } },
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
      admin: { description: 'Set on promotion. Its presence refuses a second promotion.' },
    },
    { name: 'proposedTitle', type: 'text' },
    { name: 'proposedIsbn', type: 'text', admin: { description: 'Only when the SKU passed the ISBN checksum. Never a raw SKU.' } },
    { name: 'proposedPriceCents', type: 'number', admin: { description: 'Cents, unconverted.' } },
    { name: 'lastSeenAt', type: 'date', required: true },
  ],
};
```

- [ ] **Step 2: Sync-state global**

Create `src/globals/SquareSyncState.ts`:

```ts
import type { GlobalConfig } from 'payload';

// Deliberately not a field on siteSettings: that global is staff-editable SEO
// content, and a sync watermark sitting in an editor's form is one accidental
// save away from re-importing or skipping months of catalog.
export const SquareSyncState: GlobalConfig = {
  slug: 'squareSyncState',
  admin: { hidden: true },
  access: {
    read: ({ req: { user } }) => {
      const role = (user as { role?: string } | undefined)?.role;
      return role === 'admin' || role === 'staff';
    },
    update: ({ req: { user } }) => (user as { role?: string } | undefined)?.role === 'admin',
  },
  fields: [
    {
      name: 'catalogSyncedThrough',
      type: 'date',
      admin: {
        description:
          'High-water mark: every Square item changed at or before this instant is written or staged. Empty means never synced.',
      },
    },
    { name: 'lastRunAt', type: 'date' },
    { name: 'lastRunCreated', type: 'number', defaultValue: 0 },
    { name: 'lastRunUpdated', type: 'number', defaultValue: 0 },
    { name: 'lastRunStaged', type: 'number', defaultValue: 0 },
    { name: 'lastRunUnresolved', type: 'number', defaultValue: 0 },
  ],
};
```

- [ ] **Step 3: Books — add `lastSyncedAt`, make `squareItemId` unique**

In `src/collections/Books.tsx`, replace the existing `squareItemId` field (around line 544) with:

```tsx
    {
      name: 'squareItemId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'Square POS item ID. Unique: upsert-by-square-id is only repeat-safe with a DB constraint.'
      }
    },
    {
      name: 'lastSyncedAt',
      type: 'date',
      admin: {
        description: 'Last time a Square catalog sync wrote to this book',
        position: 'sidebar',
      },
    },
```

Verified safe: production has 5,157 books with a `squareItemId`, **all distinct**, and 19 with none. Postgres treats NULLs as distinct, so the constraint applies cleanly.

- [ ] **Step 4: Register, and enable concurrency control**

In `src/payload.config.ts`: import and add `SquareCatalogStaging` to `collections` and `SquareSyncState` to `globals`. Do **not** add `squareSyncState` to the `admin.globals` list — it is hidden.

In the `jobs` block, alongside the existing `autoRun` and `tasks`:

```ts
    // Required for the `concurrency` key on the Square tasks. Adds an indexed
    // concurrencyKey field to the jobs collection -- schema change, covered by
    // the single migration generated in Task 8.
    enableConcurrencyControl: true,
```

- [ ] **Step 5: Verify**

```bash
cd alkebu-load && pnpm generate:types && pnpm check:types && pnpm test
```

Expected: types gain `SquareCatalogStaging`, `SquareSyncState`, `Book.lastSyncedAt`. All pass. **Do not run `pnpm payload migrate:create` — Task 8 owns that.**

- [ ] **Step 6: Commit**

```bash
cd /home/jadom/Coding/alkebulanimages2.0
chown -R jadom:jadom alkebu-load/src
git add alkebu-load/src
git commit -m "feat(square): staging collection, sync-state global, Books schema

Schema code only; the migration is generated in one pass once both jobs
are registered. squareItemId becomes unique+indexed (verified 5157/5157
distinct in production) so upsert-by-square-id is actually repeat-safe.
Concurrency control is enabled for the exclusive book-write key."
```

---

### Task 2: JSON-safe normalization

Small, but Task 3 and Task 5 both depend on it, and getting it wrong means every staging write throws.

**Files:** create `src/app/utils/jsonSafe.ts`, create `tests/import/jsonSafe.test.ts`.

**Interfaces produced:** `toJsonSafe(value: unknown): unknown` and `fromJsonSafe(value: unknown): unknown`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert';
import test from 'node:test';

import { toJsonSafe, fromJsonSafe } from '../../src/app/utils/jsonSafe';

test('a raw Square object with BigInt amounts cannot be stringified', () => {
  assert.throws(() => JSON.stringify({ priceMoney: { amount: 2299n } }), TypeError);
});

test('toJsonSafe makes it stringifiable', () => {
  const safe = toJsonSafe({ priceMoney: { amount: 2299n, currency: 'USD' } });
  assert.doesNotThrow(() => JSON.stringify(safe));
});

test('BigInt round-trips losslessly, including values beyond Number.MAX_SAFE_INTEGER', () => {
  const big = 9007199254740993n; // MAX_SAFE_INTEGER + 2
  const back = fromJsonSafe(JSON.parse(JSON.stringify(toJsonSafe({ v: big }))));
  assert.strictEqual((back as any).v, big);
});

test('walks nested arrays and objects', () => {
  const safe = toJsonSafe({
    itemData: { variations: [{ itemVariationData: { priceMoney: { amount: 1899n } } }] },
  });
  const json = JSON.stringify(safe);
  const back: any = fromJsonSafe(JSON.parse(json));
  assert.strictEqual(back.itemData.variations[0].itemVariationData.priceMoney.amount, 1899n);
});

test('leaves ordinary values untouched', () => {
  const input = { a: 1, b: 'x', c: true, d: null, e: [1, 2] };
  assert.deepStrictEqual(fromJsonSafe(JSON.parse(JSON.stringify(toJsonSafe(input)))), input);
});

test('does not mistake a user string for an encoded bigint', () => {
  // A Square field could legitimately contain an object shaped like our marker.
  const tricky = { note: { __bigint: 'not a number' } };
  const back: any = fromJsonSafe(JSON.parse(JSON.stringify(toJsonSafe(tricky))));
  assert.strictEqual(typeof back.note.__bigint, 'string');
});

test('handles undefined and Date without throwing', () => {
  assert.doesNotThrow(() => JSON.stringify(toJsonSafe({ d: new Date(0), u: undefined })));
});
```

- [ ] **Step 2: Run to verify it fails** — `cd alkebu-load && pnpm test`

- [ ] **Step 3: Implement**

`toJsonSafe` recursively replaces every `bigint` with `{ __bigint: value.toString() }`; `fromJsonSafe` reverses it, decoding only when the object has exactly one key `__bigint` whose string value matches `/^-?\d+$/`. That guard is what the "tricky" test pins — a decode that accepts any `__bigint` key would corrupt legitimate data.

- [ ] **Step 4: Verify** — `pnpm test && pnpm check:types`

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/app/utils/jsonSafe.ts alkebu-load/tests/import/jsonSafe.test.ts
git commit -m "feat(square): BigInt-safe JSON normalisation for staged raw items

Square SDK v43 returns priceMoney.amount as BigInt and JSON.stringify
throws on it, so storing a raw SDK object in a json column fails at
write time. Round-trips losslessly past Number.MAX_SAFE_INTEGER."
```

---

### Task 3: Pure mapper with per-edition validity

**Files:** create `src/app/utils/squareCatalogMapping.ts`, create `tests/import/squareCatalogMapping.test.ts`.

**Interfaces produced:**
```ts
export type ValidationIssue = { field: string; code: string; detail?: string; variationId?: string };
export type MappedComplete = { kind: 'complete'; data: Record<string, unknown> };
export type MappedIncomplete = {
  kind: 'incomplete';
  issues: ValidationIssue[];
  proposed: { proposedTitle?: string; proposedIsbn?: string; proposedPriceCents?: number };
};
export function mapSquareItemToBook(item: unknown, now?: Date): MappedComplete | MappedIncomplete;
export function isValidIsbn(isbn: string): boolean;
```

- [ ] **Step 1: Write the failing tests**

```ts
import assert from 'node:assert';
import test from 'node:test';

import { mapSquareItemToBook, isValidIsbn } from '../../src/app/utils/squareCatalogMapping';

// 9780310180302 and 9780062457714 are checksum-valid ISBN-13s.
const VALID_A = '9780310180302';
const VALID_B = '9780062457714';

const varn = (id: string, sku: string | undefined, amount: bigint | undefined) => ({
  id,
  itemVariationData: {
    ...(sku === undefined ? {} : { sku }),
    ...(amount === undefined ? {} : { priceMoney: { amount } }),
  },
});

const item = (variations: unknown[], name = 'A Book') => ({
  id: 'ITEM1',
  updatedAt: '2026-09-20T10:00:00Z',
  itemData: { name, variations },
});

test('isValidIsbn enforces the checksum, not just the digit count', () => {
  assert.strictEqual(isValidIsbn(VALID_A), true);
  assert.strictEqual(isValidIsbn('9780310180303'), false, 'wrong check digit must fail');
  assert.strictEqual(isValidIsbn('1234567890123'), false, 'an arbitrary 13-digit SKU is not an ISBN');
  assert.strictEqual(isValidIsbn('0310180309'), true, 'valid ISBN-10');
  assert.strictEqual(isValidIsbn('043942089X'), true, 'ISBN-10 with X check digit');
  assert.strictEqual(isValidIsbn('0310180308'), false);
});

test('maps a complete item with the price in cents, undivided', () => {
  const r = mapSquareItemToBook(item([varn('V1', VALID_A, 2299n)]));
  assert.strictEqual(r.kind, 'complete');
  if (r.kind !== 'complete') return;
  // priceMoney.amount is ALREADY cents; Books.pricing.retailPrice is cents.
  // The old webhook divided by 100 -- a 100x underprice.
  assert.strictEqual((r.data.pricing as any).retailPrice, 2299);
  assert.strictEqual(r.data.squareItemId, 'ITEM1');
  assert.strictEqual(r.data.importSource, 'square-webhook');
});

test('publisher name goes to publisherText, never to the relationship', () => {
  const r = mapSquareItemToBook(item([varn('V1', VALID_A, 2299n)]));
  assert.strictEqual(r.kind, 'complete');
  if (r.kind !== 'complete') return;
  const [ed] = r.data.editions as any[];
  assert.strictEqual(ed.publisher, undefined);
  assert.strictEqual(ed.pricing.retailPrice, 2299);
  assert.strictEqual(ed.squareVariationId, 'V1');
});

test('MIXED validity is incomplete: one variation priced, a DIFFERENT one with an ISBN', () => {
  // The bug this pins: "some variation has a price AND some variation has an
  // ISBN" would call this complete, then emit an edition that fails the
  // required-isbn constraint on Books.
  const r = mapSquareItemToBook(item([
    varn('PRICED', undefined, 1899n),
    varn('IDENTIFIED', VALID_A, undefined),
  ]));
  assert.strictEqual(r.kind, 'incomplete');
  if (r.kind !== 'incomplete') return;
  assert.ok(r.issues.some((i) => i.variationId === 'PRICED' && i.field === 'editions.isbn'));
  assert.ok(r.issues.some((i) => i.variationId === 'IDENTIFIED' && i.field === 'editions.pricing.retailPrice'));
});

test('every variation must be usable for the item to be complete', () => {
  const r = mapSquareItemToBook(item([
    varn('GOOD', VALID_A, 2299n),
    varn('BAD', 'SHELF-TAG-7', 1500n),
  ]));
  assert.strictEqual(r.kind, 'incomplete');
  if (r.kind !== 'incomplete') return;
  assert.ok(r.issues.some((i) => i.variationId === 'BAD'));
});

test('two usable variations map to two editions', () => {
  const r = mapSquareItemToBook(item([varn('V1', VALID_A, 3499n), varn('V2', VALID_B, 1899n)]));
  assert.strictEqual(r.kind, 'complete');
  if (r.kind !== 'complete') return;
  assert.strictEqual((r.data.editions as any[]).length, 2);
  // Book-level price is the LOWEST, not array order.
  assert.strictEqual((r.data.pricing as any).retailPrice, 1899);
});

test('no ISBN anywhere: incomplete, and no ISBN is invented', () => {
  const r = mapSquareItemToBook(item([varn('V1', 'SHELF-TAG-7', 2299n)], 'Mystery Item'));
  assert.strictEqual(r.kind, 'incomplete');
  if (r.kind !== 'incomplete') return;
  assert.strictEqual(r.proposed.proposedIsbn, undefined);
  assert.strictEqual(r.proposed.proposedTitle, 'Mystery Item');
  assert.strictEqual(r.proposed.proposedPriceCents, 2299);
});

test('no price: incomplete, and the price is not zero', () => {
  const r = mapSquareItemToBook(item([varn('V1', VALID_A, undefined)]));
  assert.strictEqual(r.kind, 'incomplete');
  if (r.kind !== 'incomplete') return;
  assert.strictEqual(r.proposed.proposedPriceCents, undefined);
  assert.strictEqual(r.proposed.proposedIsbn, VALID_A);
});

test('no variations at all is incomplete (editions has minRows 1)', () => {
  const r = mapSquareItemToBook(item([], 'Bare'));
  assert.strictEqual(r.kind, 'incomplete');
  if (r.kind !== 'incomplete') return;
  assert.ok(r.issues.some((i) => i.field === 'editions'));
});

test('importSource is always a valid Books select option', () => {
  const r = mapSquareItemToBook(item([varn('V1', VALID_A, 2299n)]));
  assert.strictEqual(r.kind, 'complete');
  if (r.kind !== 'complete') return;
  // enrichProductFromIdentifiers can emit 'open-library', which is NOT a valid
  // option. The mapper owns this field unconditionally.
  assert.ok(['manual', 'isbndb', 'google-books', 'csv-import', 'square-webhook']
    .includes(r.data.importSource as string));
});

test('malformed input is incomplete, never a throw', () => {
  for (const bad of [null, undefined, {}, { id: 'X' }, { itemData: {} }, { itemData: { variations: 'nope' } }]) {
    assert.strictEqual(mapSquareItemToBook(bad).kind, 'incomplete');
  }
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm test`

- [ ] **Step 3: Implement**

- `isValidIsbn`: strip `-`/spaces. ISBN-13 → sum of digits weighted 1,3,1,3… mod 10 must be 0. ISBN-10 → sum of digit×(10..1) mod 11 must be 0, final `X` = 10. **Do not** copy the existing shape-only helper from `square-catalog/route.ts:737-748`; it is what lets arbitrary 13-digit SKUs through.
- A variation is **usable** iff it has a `priceMoney.amount` *and* a `sku`/`upc` passing `isValidIsbn`.
- Item is **complete** iff it has ≥1 variation and **every** variation is usable.
- Price: `Number(amount)`. Never divide. Book-level = lowest across variations.
- Editions: `{ isbn, squareVariationId, pricing: { retailPrice }, isAvailable: true }`, plus `publisherText` when Square offers a name. Never `publisher`.
- `importSource: 'square-webhook'` and `lastSyncedAt: now` set last so nothing overwrites them.
- Report **all** issues with `variationId` set for per-variation ones. Never throw.
- No enrichment here — this module is pure.

- [ ] **Step 4: Verify** — `pnpm test && pnpm check:types`

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/app/utils/squareCatalogMapping.ts alkebu-load/tests/import/squareCatalogMapping.test.ts
git commit -m "feat(square): pure mapper with per-edition validity and ISBN checksums

Completeness is judged per variation, not across the item: a priced
variation and a DIFFERENT identified variation no longer read as
complete and then fail Books validation. isValidIsbn now checks the
checksum, so an arbitrary 13-digit SKU is not mistaken for an ISBN."
```

---

### Task 4: Non-destructive edition merge

**Files:** create `src/app/utils/squareEditionMerge.ts`, create `tests/import/squareEditionMerge.test.ts`.

**Interfaces produced:** `mergeEditions(existing: any[], incoming: any[]): any[]`.

Note the scope limit: this function makes a *correct merged array*. It does **not** make concurrent writes safe — that is Task 6's exclusive queue key. Reviewing this as if it solved the race was the original plan's error.

- [ ] **Step 1: Write the failing tests**

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

test('a thin Square payload never erases curated metadata', () => {
  const [m] = mergeEditions([curated], [
    { squareVariationId: 'VAR1', isbn: '9780310180302', pricing: { retailPrice: 2499 } },
  ]);
  assert.strictEqual(m.isbn10, '0310180309');
  assert.strictEqual(m.publisher, 42);
  assert.strictEqual(m.datePublished, '2019-03-01T00:00:00Z');
  assert.strictEqual(m.pages, 224);
  assert.strictEqual(m.dimensions, '8.5 x 5.5');
  assert.strictEqual(m.stripePriceId, 'price_abc');
  assert.strictEqual(m.pricing.retailPrice, 2499, 'Square owns price');
});

test('stock level is never touched by a catalog merge', () => {
  const [m] = mergeEditions([curated], [
    { squareVariationId: 'VAR1', isbn: '9780310180302', inventory: { stockLevel: 0 } },
  ]);
  assert.strictEqual(m.inventory.stockLevel, 7);
  assert.strictEqual(m.inventory.allowBackorders, false);
});

test('shippingWeight survives -- Square has no packaging weight', () => {
  const [m] = mergeEditions([curated], [{ squareVariationId: 'VAR1', isbn: '9780310180302' }]);
  assert.strictEqual(m.pricing.shippingWeight, 12);
});

test('a new variation is appended', () => {
  const m = mergeEditions([curated], [
    { squareVariationId: 'VAR1', isbn: '9780310180302' },
    { squareVariationId: 'VAR2', isbn: '9780062457714', pricing: { retailPrice: 3499 } },
  ]);
  assert.strictEqual(m.length, 2);
});

test('an edition missing from Square is marked unavailable, never deleted', () => {
  const m = mergeEditions([curated], [
    { squareVariationId: 'VAR2', isbn: '9780062457714', pricing: { retailPrice: 3499 } },
  ]);
  assert.strictEqual(m.length, 2);
  const kept = m.find((e: any) => e.squareVariationId === 'VAR1');
  assert.strictEqual(kept.isAvailable, false);
  assert.strictEqual(kept.isbn, '9780310180302');
});

test('an existing edition with no squareVariationId is left byte-identical', () => {
  const manual = { id: 'ed9', isbn: '9780062457714', publisherText: 'Hand entered' };
  const m = mergeEditions([manual], [{ squareVariationId: 'VAR1', isbn: '9780310180302' }]);
  assert.deepStrictEqual(m.find((e: any) => e.id === 'ed9'), manual);
});

test('an incoming undefined never overwrites a populated value', () => {
  const [m] = mergeEditions([curated], [
    { squareVariationId: 'VAR1', isbn: undefined, pricing: { retailPrice: undefined } },
  ]);
  assert.strictEqual(m.isbn, '9780310180302');
  assert.strictEqual(m.pricing.retailPrice, 2299);
});

test('the existing row id is preserved so Payload updates rather than replaces', () => {
  const [m] = mergeEditions([curated], [{ squareVariationId: 'VAR1', isbn: '9780310180302' }]);
  assert.strictEqual(m.id, 'ed1');
});

test('empty inputs do not throw', () => {
  assert.deepStrictEqual(mergeEditions([], []), []);
  assert.strictEqual(mergeEditions([], [{ squareVariationId: 'V', isbn: '9780310180302' }]).length, 1);
  assert.strictEqual(mergeEditions([curated], []).length, 1);
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm test`

- [ ] **Step 3: Implement**

Ownership, stated once:
- **Square owns:** variation existence, `squareVariationId`, `isbn`, `pricing.retailPrice`.
- **Payload owns:** `isbn10`, `publisher`, `publisherText`, `datePublished`, `binding`, `edition`, `pages`, `language`, `dimensions`, `stripePriceId`, `pricing.shippingWeight`, the entire `inventory` group.
- Match on `squareVariationId`; an existing edition without one is untouched.
- Incoming `undefined` never overwrites.
- Square-linked editions absent from `incoming` get `isAvailable: false`, keeping all other fields.
- Preserve the existing row `id`.

- [ ] **Step 4: Verify** — `pnpm test && pnpm check:types`

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/app/utils/squareEditionMerge.ts alkebu-load/tests/import/squareEditionMerge.test.ts
git commit -m "feat(square): non-destructive edition merge by variation id

Square owns variation existence, sku, isbn and price; everything else is
Payload's and survives a thin catalog payload -- including the stock
levels the inventory path writes."
```

---

### Task 5: Staging state machine and transactional promotion

This is the human gate. Nothing in the old plan implemented it.

**Files:** create `src/app/utils/squareStagingWorkflow.ts`, create `tests/import/squareStagingWorkflow.test.ts`.

**Interfaces produced:**
```ts
export type StagingDecision =
  | { action: 'write-book' }                         // promoted row, or no staging history
  | { action: 'stage'; status: 'needs-review' | 'ready' }
  | { action: 'skip'; reason: 'rejected' };
export function decideStagingAction(
  existing: { reviewStatus: string; promotedBook?: unknown } | null,
  mapped: { kind: 'complete' | 'incomplete' },
): StagingDecision;
export async function promoteStagedItem(payload: any, stagingId: string | number, user: unknown): Promise<{ bookId: string | number }>;
```

- [ ] **Step 1: Write the failing tests for the pure decision function**

```ts
import assert from 'node:assert';
import test from 'node:test';

import { decideStagingAction } from '../../src/app/utils/squareStagingWorkflow';

const complete = { kind: 'complete' as const };
const incomplete = { kind: 'incomplete' as const };

test('no staging history + complete mapping writes the Book directly', () => {
  assert.deepStrictEqual(decideStagingAction(null, complete), { action: 'write-book' });
});

test('no staging history + incomplete mapping stages for review', () => {
  assert.deepStrictEqual(decideStagingAction(null, incomplete), { action: 'stage', status: 'needs-review' });
});

test('a needs-review row that is now complete becomes ready and does NOT write a Book', () => {
  // The human gate. Square supplying the data is not approval.
  assert.deepStrictEqual(
    decideStagingAction({ reviewStatus: 'needs-review' }, complete),
    { action: 'stage', status: 'ready' },
  );
});

test('a needs-review row still incomplete stays needs-review', () => {
  assert.deepStrictEqual(
    decideStagingAction({ reviewStatus: 'needs-review' }, incomplete),
    { action: 'stage', status: 'needs-review' },
  );
});

test('a ready row is not auto-promoted by a later sync', () => {
  assert.deepStrictEqual(
    decideStagingAction({ reviewStatus: 'ready' }, complete),
    { action: 'stage', status: 'ready' },
  );
});

test('rejected is sticky in both directions', () => {
  assert.deepStrictEqual(decideStagingAction({ reviewStatus: 'rejected' }, complete), { action: 'skip', reason: 'rejected' });
  assert.deepStrictEqual(decideStagingAction({ reviewStatus: 'rejected' }, incomplete), { action: 'skip', reason: 'rejected' });
});

test('a promoted row lets the sync update its linked Book', () => {
  assert.deepStrictEqual(
    decideStagingAction({ reviewStatus: 'promoted', promotedBook: 7 }, complete),
    { action: 'write-book' },
  );
});

test('a promoted row whose mapping regressed stages rather than writing a broken Book', () => {
  assert.deepStrictEqual(
    decideStagingAction({ reviewStatus: 'promoted', promotedBook: 7 }, incomplete),
    { action: 'stage', status: 'needs-review' },
  );
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm test`

- [ ] **Step 3: Implement `decideStagingAction` plus `promoteStagedItem`**

`decideStagingAction` is a pure lookup over the Revision 2 transition table.

`promoteStagedItem` is the transactional half. **This repo uses no Payload transactions anywhere yet** (`grep -rn "beginTransaction" src/` returns nothing), so this introduces the pattern:

```ts
const transactionID = await payload.db.beginTransaction();
try {
  // 1. re-read the staging row INSIDE the transaction
  // 2. refuse if promotedBook is already set, or reviewStatus !== 'ready'
  // 3. map rawItem (via fromJsonSafe) -> must be complete, else refuse
  // 4. create the Book
  // 5. update the staging row: reviewStatus 'promoted', promotedBook = new id
  await payload.db.commitTransaction(transactionID);
} catch (err) {
  await payload.db.rollbackTransaction(transactionID);
  throw err;
}
```

Pass `req: { transactionID, user }` to every `payload.*` call inside. Authorization: refuse unless the user's role is `admin` or `staff`. Idempotency comes from step 2 — a second concurrent promotion re-reads inside the transaction, sees `promotedBook` set, and refuses.

`beginTransaction` returns `null` on adapters without transaction support. Handle that by proceeding without one and say so in the report, since dev is SQLite and prod is Postgres — the two must both be exercised before this ships.

- [ ] **Step 4: Verify** — `pnpm test && pnpm check:types`

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/app/utils/squareStagingWorkflow.ts alkebu-load/tests/import/squareStagingWorkflow.test.ts
git commit -m "feat(square): staging state machine and transactional promotion

Square supplying complete data is not approval: a staged item becomes
'ready' and waits for a human. Rejection is sticky, so a bulk supply SKU
rejected once is never re-imported. Promotion is transactional and
refuses a row that already has a promotedBook, so concurrent promotion
yields one Book."
```

---

### Task 6: Catalog sync job, inventory write behind the queue, webhook enqueues

**Files:** create `src/app/utils/squareCatalogSync.ts`, modify `src/app/api/webhooks/square-catalog/route.ts`, modify `src/payload.config.ts`.

**Interfaces produced:** `runSquareCatalogSync(payload)`, `runSquareInventorySync(payload, counts)`, task slugs `square-catalog-sync` and `square-inventory-sync`.

- [ ] **Step 1: Write the sync body**

`src/app/utils/squareCatalogSync.ts`, in order:

1. Read `squareSyncState.catalogSyncedThrough`. Window start = that minus **15 minutes** overlap; unset → 24 hours ago. **Never derive the window from `new Date()` alone** — that is what makes a retried event skip its own change.
2. Fetch via the existing `catalog.list({ types: 'ITEM,IMAGE' })`; filter client-side on `item.updatedAt >= windowStart`. (Replacing this with `SearchCatalogObjects` is an explicit non-goal.)
3. Per item: `mapSquareItemToBook`, then look up staging by `squareItemId`, then `decideStagingAction`.
   - `write-book` → upsert Books by `squareItemId`, using `mergeEditions` for `editions`. **Never write `inventory.stockLevel`.** On a unique-violation from a concurrent create, re-read and update instead of failing.
   - `stage` → upsert the staging row by `squareItemId`, refreshing `rawItem` (through `toJsonSafe`), `validationIssues`, `lastSeenAt`, `squareUpdatedAt`, `squareCatalogVersion`, and setting `reviewStatus` to the decided value. A now-complete row records the sentinel issue `{ field: '-', code: 'resolved', detail: 'Square now supplies all required data' }` — `minRows: 1` forbids an empty array.
   - `skip` → touch `lastSeenAt` only.
4. Optional enrichment applies *after* mapping and may never set `importSource`, `editions`, or `pricing`.
5. Advance `catalogSyncedThrough` to **`min(window end, oldest unresolved item's updatedAt)`** and write the counters.
6. **If any item is unresolved, throw** after persisting the checkpoint and counters. A handler that returns normally completes successfully and is never retried — returning a failure count is not a retry.

- [ ] **Step 2: Register both tasks with an exclusive key**

In `src/payload.config.ts` `jobs.tasks`:

```ts
      {
        slug: 'square-catalog-sync',
        retries: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        // Every book write -- catalog and inventory -- shares this key, and
        // exclusive defaults to true, so they cannot interleave. This is what
        // actually prevents a stale editions array clobbering a stock write;
        // the pure merge alone cannot.
        concurrency: { key: () => 'books-write', deleteOlderPending: true },
        handler: async ({ req }) => {
          const { runSquareCatalogSync } = await import('./app/utils/squareCatalogSync');
          return { output: await runSquareCatalogSync(req.payload) };
        },
      },
      {
        slug: 'square-inventory-sync',
        retries: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        concurrency: { key: () => 'books-write' },
        handler: async ({ req, input }) => {
          const { runSquareInventorySync } = await import('./app/utils/squareCatalogSync');
          return { output: await runSquareInventorySync(req.payload, (input as any).counts) };
        },
      },
```

`backoff` takes `delay` and `type` only — `maxDelay` is not a field on this type.

- [ ] **Step 3: Move the inventory write behind the queue**

The inventory path is **healthy in production** — change where it runs, not what it does. Keep `applyInventoryCountToEditions` exactly as is; `runSquareInventorySync` wraps the existing loop body from `processInventoryCountUpdate`. In the route, both cases become enqueues:

```ts
      case 'catalog.version.updated': {
        const payload = await getPayload({ config })
        await payload.jobs.queue({ task: 'square-catalog-sync', input: {} })
        return NextResponse.json({ received: true, queued: 'square-catalog-sync' })
      }

      case 'inventory.count.updated': {
        const payload = await getPayload({ config })
        const counts = webhookEvent.data?.object?.inventory_counts || []
        await payload.jobs.queue({ task: 'square-inventory-sync', input: { counts } })
        return NextResponse.json({ received: true, queued: 'square-inventory-sync' })
      }
```

Ack only after the enqueue commits; let the route 500 if it throws so Square retries within its 24h window.

- [ ] **Step 4: Verify** — `pnpm generate:types && pnpm check:types && pnpm test && pnpm build`

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src
git commit -m "feat(square): durable catalog sync and serialised book writes

Both webhook events now enqueue and ack only once the job row commits,
so a processing failure can still trigger Square's retry. Both tasks
share an exclusive 'books-write' concurrency key, which is what actually
prevents the catalog path clobbering an inventory write. Unresolved
items throw so Payload retries rather than silently completing."
```

---

### Task 7: Integration tests against the real schema

Every one of the nine original defects was a schema-contract violation that unit tests would have passed. These assert on documents written and read back.

**Files:** create `tests/import/squareCatalogIntegration.test.ts`.

**Use an explicit disposable database, never the developer's.** Point `DATABASE_URI` at a throwaway file (e.g. `file:./.tmp-integration.db`) created and deleted by the test, and disable enrichment so no external API is called.

- [ ] **Step 1: Write all twelve tests**

1. Incomplete creation — no valid ISBN → staging row, no Book, no fabricated ISBN.
2. No price → staging row; no Book with `pricing.retailPrice === 0`.
3. Complete creation → Book with cents price, `publisherText` set, `publisher` unset, `importSource === 'square-webhook'`.
4. Edition preservation — thin payload retains `isbn10`, `publisher`, `datePublished`, `pages`, `dimensions`.
5. Stock never clobbered — a catalog write leaves a previously written `stockLevel` intact.
6. **Interleaving** — queue a catalog sync and an inventory sync for the same book and run the queue; assert the final `stockLevel` is the inventory value. This must exercise the real queue, not two sequential calls.
7. Repeat delivery — the same event twice yields one Book and one staging row.
8. **Concurrent creation** — two simultaneous syncs for one unseen `squareItemId` yield exactly one Book (unique constraint + recover-by-update).
9. Concurrent promotion — two simultaneous promotions of one staging row yield one Book.
10. Rejected stickiness — a rejected row re-observed as complete stays rejected and creates no Book.
11. Checkpoint holds on failure — one unresolved item prevents the watermark advancing past it, **and the job throws**.
12. Staged items unreachable — assert against `/api/search`, the book detail loader, `addItemToCart`, and checkout preview.

- [ ] **Step 2: Run, fix, re-run until green** — `pnpm test`

If a test fails because the implementation is wrong, fix the implementation. If the test misunderstands the schema, fix the test — and say which in the report.

- [ ] **Step 3: Commit**

```bash
git add alkebu-load/tests/import/squareCatalogIntegration.test.ts
git commit -m "test(square): integration coverage incl. real interleaving and concurrency"
```

---

### Task 8: Generate the single Postgres migration

Everything schema-affecting is now registered. This is the only task that generates DDL.

- [ ] **Step 1: Start a throwaway local Postgres**

```bash
cd /home/jadom/Coding/alkebulanimages2.0
POSTGRES_PASSWORD=devonly docker compose up -d postgres
```

Never point this at production. As of `534017e` the dev-push guard refuses non-local hosts, but do not rely on that as the only safeguard.

- [ ] **Step 2: Generate against Postgres explicitly**

```bash
cd alkebu-load
DATABASE_URI=postgresql://alkebulanimages:devonly@localhost:5432/alkebulanimages \
  pnpm payload migrate:create square_catalog_staging
```

The inline override matters: the repo `.env` is `file:`, which would select the SQLite adapter and emit SQLite DDL.

- [ ] **Step 3: Read the migration before trusting it**

It must contain, and contain nothing beyond:
- create `square_catalog_staging` + its `validation_issues` array table
- create the `square_sync_state` global table
- `books`: add `last_synced_at`, add a UNIQUE constraint/index on `square_item_id`
- `payload_jobs`: add the indexed `concurrency_key` column
- `enum_payload_jobs_task_slug`: add `square-catalog-sync` and `square-inventory-sync`

**If it ALTERs or DROPs anything else on `books`, stop and report.** That is the 2026-07-05 outage pattern.

- [ ] **Step 4: Apply and verify against the throwaway Postgres**

```bash
cd alkebu-load
DATABASE_URI=postgresql://alkebulanimages:devonly@localhost:5432/alkebulanimages pnpm payload migrate
```

Then re-run the integration suite against that Postgres to exercise real transaction semantics — dev SQLite and prod Postgres differ, and Task 5's promotion is the first transaction in this codebase.

- [ ] **Step 5: Commit** — `git add alkebu-load/src/migrations && git commit -m "feat(square): postgres migration for catalog staging"`

---

### Task 9: Reconciliation backfill

**Files:** create `scripts/reconcile-square-catalog.ts`.

- [ ] **Step 1: Write the script**

Follow the header-comment style of `scripts/backfill-wellness-shipping-weights.ts`.

- `--dry-run` is the **default**; writing requires `--commit`.
- Walks the whole Square catalog — this is the ~6.5-month backlog, not a window.
- Uses the same mapper, merge, and `decideStagingAction` as the live path. No parallel logic.
- Reports **created / updated / staged / skipped / unresolved** with per-item reasons and the ten most common reasons by count.
- Repeat-safe via the unique `squareItemId`.
- Does **not** advance the checkpoint — the live path owns that watermark.

- [ ] **Step 2: Type-check** — `pnpm check:scripts`

- [ ] **Step 3: Dry run locally**

```bash
cd alkebu-load && tsx --loader ./css-stub-loader.mjs scripts/reconcile-square-catalog.ts --dry-run
```

- [ ] **Step 4: Commit** — `git add alkebu-load/scripts/reconcile-square-catalog.ts && git commit -m "feat(square): reconciliation backfill for the catalog gap"`

---

### Task 10: Deploy and backfill — user-owned

Not dispatched to an agent: needs the Coolify Postgres terminal and judgement about the queue.

- [ ] **Step 1** — Re-read the Task 8 migration. Confirm it alters nothing unexpected on `books`.
- [ ] **Step 2** — Apply the DDL via the Coolify Postgres terminal, **before** the deploy.
- [ ] **Step 3** — `git push origin main`; watch the build; `curl -s https://payload.alkebulanimages.com/api/health`.
- [ ] **Step 4** — Confirm the inventory path still works after being moved behind the queue. This is the regression risk of the whole change: make a stock change in Square and watch it land. Do this **before** the backfill.
- [ ] **Step 5** — Dry-run the reconciliation against production. **Read the `staged` count before anything else** — that is the review queue you are inheriting. Hundreds means stop and reconsider the completeness bar.
- [ ] **Step 6** — Run with `--commit`.
- [ ] **Step 7** — Triage in `/admin` → Inventory → Square Catalog Staging. Promote what is real; reject bulk supply SKUs and miscategorised items. Rejection is permanent.
- [ ] **Step 8** — Hit `/api/search`, wait five minutes for the FlexSearch snapshot. `initialize-search.ts` will not warm the running server.
- [ ] **Step 9** — Spot-check a promoted book: detail page, price (cents, not 100× off), add to cart. Confirm a staged item 404s by direct slug.
- [ ] **Step 10** — Add a book in Square POS and confirm it reaches staging or Books within one sync. That is the thing broken since March.

---

## Follow-ups, out of scope

- `SearchCatalogObjects` + `begin_time` instead of listing the whole catalog. Performance only.
- `isActive` backfill — false on 5,174 of 5,176 books; unused by any query but a loaded gun.
- Historical Stripe sweep — `recover-stripe-orders` looks back only 40 sessions and cannot catch up on its dormant window.
- Local Postgres as the standing dev database (Task 8 stands one up transiently; making it permanent is the larger change discussed 2026-09-23).
