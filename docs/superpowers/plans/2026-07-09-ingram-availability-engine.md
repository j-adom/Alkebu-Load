# Ingram Availability & Discovery Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-stage, Ingram-powered online availability engine — a unified "In Stock" for the curated catalog plus a deliberate long-tail discovery search — that makes the store the primary source for loyal buyers and captures long-tail sales in-house.

**Architecture:** Stage 1 (curated catalog, indexed) resolves a unified availability from Square on-hand OR a cached Ingram Web Service on-hand OR a manual vendor flag. Stage 2 (long-tail, `noindex`) is a Turnstile-gated "look wider" search that queries the Ingram Web Service live and shows buyable special-order results. Ingram is reached only through an `AvailabilityProvider` interface, so the whole engine is built and tested against a mock provider before real credentials arrive.

**Tech Stack:** Payload CMS 3.x (Next.js 15, backend, `pnpm`), SvelteKit/Svelte 5 (storefront, `npm`), PostgreSQL (prod) / SQLite (dev), `fast-xml-parser` (new dep, SOAP/XML responses), Cloudflare Turnstile (already integrated on the contact form), Node test runner (`pnpm test`).

## Global Constraints

- **Ingram Web Service:** REST + Basic Auth (base64 `user:password`). Test endpoint `https://idswebtest.ingramcontent.com/cws/companion.asmx`; production URL supplied on contract approval. Config via env: `INGRAM_WS_URL`, `INGRAM_WS_USER`, `INGRAM_WS_PASSWORD`.
- **No DB mirroring of Ingram data** — the `ingram*` edition fields are a TTL cache, refreshed on schedule; long-tail results are never persisted or indexed. (Web Service license term.)
- **Stock threshold:** default **10**, env `INGRAM_STOCK_THRESHOLD`. Keyed on the **LaVergne** DC `OnHand` (primary), other DCs as fallback.
- **Batch size:** ≤ **25** ISBNs per Query Type 9 call (`query=BN="isbn" or "isbn" …`).
- **Ship promise copy:** "Ships in 3–8 days" (unchanged from today).
- **Long-tail results/pages:** `<meta name="robots" content="noindex">`, absent from sitemap.
- **Backend tests:** Node test runner, files under `alkebu-load/tests/**/*.test.ts`, run with `pnpm test` (auto-injects `STRIPE_SECRET_KEY=sk_test_dummy`). Strict build — lint/type errors fail `pnpm build`.
- **After any Payload schema change:** run `pnpm generate:types`.
- **Provider abstraction:** all Ingram access goes through `AvailabilityProvider`; never call the Web Service directly from routes/jobs/components.

---

## Phase 1 — Credential-free foundation (build now against the mock)

### Task 1: Negative-stock clamp in Square inventory apply

**Files:**
- Modify: `alkebu-load/src/app/utils/squareInventory.ts`
- Test: `alkebu-load/tests/squareInventory.test.ts`

**Interfaces:**
- Produces: `applyInventoryCountToEditions(editions, squareVariationId, quantity)` — unchanged signature; now clamps negative `quantity` to `0`.

- [ ] **Step 1: Write the failing test**

```ts
// alkebu-load/tests/squareInventory.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyInventoryCountToEditions } from '../src/app/utils/squareInventory';

test('applyInventoryCountToEditions clamps negative quantities to 0', () => {
  const editions = [{ squareVariationId: 'VAR1', inventory: { stockLevel: 5 } }];
  const result = applyInventoryCountToEditions(editions, 'VAR1', -3);
  assert.equal(result[0].inventory.stockLevel, 0);
});

test('applyInventoryCountToEditions preserves positive quantities', () => {
  const editions = [{ squareVariationId: 'VAR1', inventory: { stockLevel: 5 } }];
  const result = applyInventoryCountToEditions(editions, 'VAR1', 12);
  assert.equal(result[0].inventory.stockLevel, 12);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd alkebu-load && pnpm test -- --test-name-pattern="clamps negative"`
Expected: FAIL — `stockLevel` is `-3`, not `0`.

- [ ] **Step 3: Implement the clamp**

In `applyInventoryCountToEditions`, change the mapped assignment:

```ts
edition?.squareVariationId === squareVariationId
  ? { ...edition, inventory: { ...(edition.inventory || {}), stockLevel: Math.max(0, quantity) } }
  : edition,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd alkebu-load && pnpm test`
Expected: PASS (both new tests + existing suite green).

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/app/utils/squareInventory.ts alkebu-load/tests/squareInventory.test.ts
git commit -m "fix(inventory): clamp negative Square stock counts to zero"
```

---

### Task 2: Ingram XML stock-response parser (pure)

**Files:**
- Create: `alkebu-load/src/app/utils/ingram/parseStockResponse.ts`
- Create: `alkebu-load/tests/ingram/parseStockResponse.test.ts`
- Create: `alkebu-load/tests/ingram/fixtures/queryType9-stock.xml` (paste the sample QueryType9 response XML)
- Modify: `alkebu-load/package.json` (add `fast-xml-parser`)

**Interfaces:**
- Produces:
  ```ts
  export interface DcStock { onHand: number; onOrder: number; stockStatus: boolean }
  export interface IngramStock {
    ean: string;
    ingramPrice?: number;
    pubListPrice?: number;
    productAvailability?: string;
    backorder: boolean;
    mediaMail: boolean;
    dcs: Record<string, DcStock>;   // keyed by DC name, e.g. "LaVergne"
  }
  export function parseStockResponse(xml: string): IngramStock[];
  ```

- [ ] **Step 1: Add the dependency**

Run: `cd alkebu-load && pnpm add fast-xml-parser`

- [ ] **Step 2: Add the fixture**

Create `alkebu-load/tests/ingram/fixtures/queryType9-stock.xml` containing the full QueryType9 response from the Implementation Guide (EAN `9780545392556`, LaVergne `OnHand` 101, Chambersburg 129, FtWayne OnHand 0/OnOrder 112, etc.).

- [ ] **Step 3: Write the failing test**

```ts
// alkebu-load/tests/ingram/parseStockResponse.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseStockResponse } from '../../src/app/utils/ingram/parseStockResponse';

const xml = readFileSync(fileURLToPath(new URL('./fixtures/queryType9-stock.xml', import.meta.url)), 'utf8');

test('parseStockResponse extracts per-DC on-hand keyed by EAN', () => {
  const [rec] = parseStockResponse(xml);
  assert.equal(rec.ean, '9780545392556');
  assert.equal(rec.dcs.LaVergne.onHand, 101);
  assert.equal(rec.dcs.FtWayne.onHand, 0);
  assert.equal(rec.dcs.FtWayne.onOrder, 112);
  assert.equal(rec.backorder, false);
  assert.equal(rec.mediaMail, true);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd alkebu-load && pnpm test -- --test-name-pattern="per-DC on-hand"`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement the parser**

```ts
// alkebu-load/src/app/utils/ingram/parseStockResponse.ts
import { XMLParser } from 'fast-xml-parser';

export interface DcStock { onHand: number; onOrder: number; stockStatus: boolean }
export interface IngramStock {
  ean: string;
  ingramPrice?: number;
  pubListPrice?: number;
  productAvailability?: string;
  backorder: boolean;
  mediaMail: boolean;
  dcs: Record<string, DcStock>;
}

const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: true });
const num = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
const yes = (v: unknown) => String(v).trim().toUpperCase() === 'Y';

export function parseStockResponse(xml: string): IngramStock[] {
  const doc = parser.parse(xml);
  // Navigate to IngramSearchResults > Product (may be single object or array)
  const results = findDeep(doc, 'IngramSearchResults');
  const products = toArray(results?.Product);
  return products.map((p: any): IngramStock => {
    const basic = p?.Basic ?? {};
    const ingram = p?.Ingram ?? {};
    const stock = ingram?.Stock ?? {};
    const dcs: Record<string, DcStock> = {};
    for (const [dcName, dc] of Object.entries<any>(stock)) {
      dcs[dcName] = {
        onHand: num(dc?.OnHand) ?? 0,
        onOrder: num(dc?.OnOrder) ?? 0,
        stockStatus: yes(dc?.StockStatus),
      };
    }
    return {
      ean: String(basic?.EAN ?? ''),
      ingramPrice: num(ingram?.IngramPrice),
      pubListPrice: num(basic?.PubListPrice),
      productAvailability: ingram?.ProductAvailability ? String(ingram.ProductAvailability) : undefined,
      backorder: yes(ingram?.Backorder),
      mediaMail: yes(ingram?.MediaMail),
      dcs,
    };
  });
}

function toArray<T>(v: T | T[] | undefined): T[] { return v === undefined ? [] : Array.isArray(v) ? v : [v]; }
function findDeep(obj: any, key: string): any {
  if (obj == null || typeof obj !== 'object') return undefined;
  if (key in obj) return obj[key];
  for (const v of Object.values(obj)) { const hit = findDeep(v, key); if (hit !== undefined) return hit; }
  return undefined;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd alkebu-load && pnpm test -- --test-name-pattern="per-DC on-hand"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add alkebu-load/src/app/utils/ingram/parseStockResponse.ts alkebu-load/tests/ingram/ alkebu-load/package.json alkebu-load/pnpm-lock.yaml
git commit -m "feat(ingram): parse Query Type 9 stock XML into per-DC on-hand"
```

---

### Task 3: ISBN batching + availability derivation helpers (pure)

**Files:**
- Create: `alkebu-load/src/app/utils/ingram/stockAvailability.ts`
- Create: `alkebu-load/tests/ingram/stockAvailability.test.ts`

**Interfaces:**
- Consumes: `IngramStock` (Task 2).
- Produces:
  ```ts
  export function batchIsbns(isbns: string[], size?: number): string[][];   // default size 25
  export function ingramOnHand(stock: IngramStock, primaryDc?: string): number; // LaVergne first, else max across DCs
  export function isIngramAvailable(stock: IngramStock, threshold: number, primaryDc?: string): boolean;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// alkebu-load/tests/ingram/stockAvailability.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { batchIsbns, ingramOnHand, isIngramAvailable } from '../../src/app/utils/ingram/stockAvailability';

test('batchIsbns splits into groups of 25 by default', () => {
  const batches = batchIsbns(Array.from({ length: 60 }, (_, i) => String(i)));
  assert.equal(batches.length, 3);
  assert.equal(batches[0].length, 25);
  assert.equal(batches[2].length, 10);
});

test('ingramOnHand prefers LaVergne, falls back to max DC', () => {
  const s = { ean: 'x', backorder: false, mediaMail: true, dcs: { LaVergne: { onHand: 101, onOrder: 0, stockStatus: true }, FtWayne: { onHand: 200, onOrder: 0, stockStatus: true } } } as any;
  assert.equal(ingramOnHand(s), 101);
  const noLv = { ...s, dcs: { FtWayne: { onHand: 200, onOrder: 0, stockStatus: true } } };
  assert.equal(ingramOnHand(noLv), 200);
});

test('isIngramAvailable applies threshold', () => {
  const s = { ean: 'x', backorder: false, mediaMail: true, dcs: { LaVergne: { onHand: 8, onOrder: 0, stockStatus: true } } } as any;
  assert.equal(isIngramAvailable(s, 10), false);
  assert.equal(isIngramAvailable({ ...s, dcs: { LaVergne: { onHand: 40, onOrder: 0, stockStatus: true } } }, 10), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd alkebu-load && pnpm test -- --test-name-pattern="batchIsbns|ingramOnHand|isIngramAvailable"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helpers**

```ts
// alkebu-load/src/app/utils/ingram/stockAvailability.ts
import type { IngramStock } from './parseStockResponse';

export function batchIsbns(isbns: string[], size = 25): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < isbns.length; i += size) out.push(isbns.slice(i, i + size));
  return out;
}

export function ingramOnHand(stock: IngramStock, primaryDc = 'LaVergne'): number {
  const primary = stock.dcs[primaryDc];
  if (primary) return primary.onHand;
  const values = Object.values(stock.dcs).map((d) => d.onHand);
  return values.length ? Math.max(...values) : 0;
}

export function isIngramAvailable(stock: IngramStock, threshold: number, primaryDc = 'LaVergne'): boolean {
  return ingramOnHand(stock, primaryDc) > threshold;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd alkebu-load && pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/app/utils/ingram/stockAvailability.ts alkebu-load/tests/ingram/stockAvailability.test.ts
git commit -m "feat(ingram): ISBN batching + threshold availability helpers"
```

---

### Task 4: `AvailabilityProvider` interface + mock provider

**Files:**
- Create: `alkebu-load/src/app/utils/ingram/AvailabilityProvider.ts`
- Create: `alkebu-load/src/app/utils/ingram/mockProvider.ts`
- Create: `alkebu-load/tests/ingram/mockProvider.test.ts`

**Interfaces:**
- Consumes: `IngramStock` (Task 2).
- Produces:
  ```ts
  export interface AvailabilityProvider {
    checkStock(isbns: string[]): Promise<Map<string, IngramStock>>;   // keyed by EAN/ISBN-13
    searchLongTail(query: string, scope?: 'title' | 'author' | 'topic'): Promise<LongTailResult[]>;
  }
  export interface LongTailResult {
    ean: string; title: string; author?: string; binding?: string;
    price?: number; coverUrl?: string; onHand: number; available: boolean;
  }
  export function getAvailabilityProvider(): AvailabilityProvider;  // returns mock unless INGRAM_WS_URL set (Task 11)
  ```

- [ ] **Step 1: Write the failing test**

```ts
// alkebu-load/tests/ingram/mockProvider.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockProvider } from '../../src/app/utils/ingram/mockProvider';

test('mockProvider.checkStock returns deterministic stock keyed by ISBN', async () => {
  const map = await mockProvider.checkStock(['9780545392556', '0000000000000']);
  assert.ok(map.get('9780545392556'));
  assert.equal(map.get('9780545392556')!.dcs.LaVergne.onHand > 10, true);
});

test('mockProvider.searchLongTail returns buyable results for a query', async () => {
  const results = await mockProvider.searchLongTail('wayward lives', 'title');
  assert.ok(results.length > 0);
  assert.ok(results[0].available === true || results[0].available === false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd alkebu-load && pnpm test -- --test-name-pattern="mockProvider"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the interface + mock**

Create `AvailabilityProvider.ts` with the interface/types above (no runtime logic yet — `getAvailabilityProvider` returns the mock for now; Task 11 adds the live branch). Create `mockProvider.ts`:

```ts
// alkebu-load/src/app/utils/ingram/mockProvider.ts
import type { AvailabilityProvider, LongTailResult } from './AvailabilityProvider';
import type { IngramStock } from './parseStockResponse';

// Deterministic: last digit of the ISBN seeds a stable on-hand so tests + demos are stable.
function seededStock(ean: string): IngramStock {
  const last = Number(ean.replace(/\D/g, '').slice(-1)) || 0;
  const onHand = last === 0 ? 0 : last * 15; // 0 → out; others → 15..135
  return { ean, backorder: false, mediaMail: true, ingramPrice: 18.99, pubListPrice: 18.99,
    productAvailability: onHand ? 'Available' : 'Not Available',
    dcs: { LaVergne: { onHand, onOrder: 0, stockStatus: onHand > 0 } } };
}

export const mockProvider: AvailabilityProvider = {
  async checkStock(isbns) {
    return new Map(isbns.map((ean) => [ean, seededStock(ean)]));
  },
  async searchLongTail(query): Promise<LongTailResult[]> {
    return [{ ean: '9780393285673', title: `Result for “${query}”`, author: 'Saidiya Hartman',
      binding: 'Paperback', price: 18.99, onHand: 40, available: true }];
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd alkebu-load && pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/app/utils/ingram/AvailabilityProvider.ts alkebu-load/src/app/utils/ingram/mockProvider.ts alkebu-load/tests/ingram/mockProvider.test.ts
git commit -m "feat(ingram): AvailabilityProvider interface + deterministic mock"
```

---

### Task 5: Books edition schema — Ingram cache + manual vendor flag

**Files:**
- Modify: `alkebu-load/src/collections/Books.tsx` (the `editions[].inventory` group, ~line 330)
- Regenerate: `alkebu-load/src/payload-types.ts` (via `pnpm generate:types`)

**Interfaces:**
- Produces: edition fields `inventory.ingramOnHand` (number, readOnly), `inventory.ingramAvailable` (checkbox, readOnly), `inventory.ingramCheckedAt` (date, readOnly), `inventory.availableToOrder` (checkbox, editable).

- [ ] **Step 1: Add the fields**

In the `inventory` group's `fields` array (after `allowBackorders`), add:

```tsx
{ name: 'ingramOnHand', type: 'number', admin: { readOnly: true, description: 'Ingram on-hand (LaVergne primary), cached from Web Service' } },
{ name: 'ingramAvailable', type: 'checkbox', defaultValue: false, admin: { readOnly: true, description: 'System-computed: ingramOnHand > threshold' } },
{ name: 'ingramCheckedAt', type: 'date', admin: { readOnly: true, description: 'When Ingram availability was last refreshed (cache basis)' } },
{ name: 'availableToOrder', type: 'checkbox', defaultValue: false, admin: { description: 'Manual: we can reorder this from a vendor (non-Ingram titles)' } },
```

- [ ] **Step 2: Regenerate types**

Run: `cd alkebu-load && pnpm generate:types`
Expected: `src/payload-types.ts` now includes the four new edition fields.

- [ ] **Step 3: Verify build/type-check passes**

Run: `cd alkebu-load && pnpm lint && pnpm build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add alkebu-load/src/collections/Books.tsx alkebu-load/src/payload-types.ts
git commit -m "feat(books): add Ingram availability cache + manual availableToOrder fields"
```

> **Note (prod):** this is a schema change. Before deploy, generate DDL and apply via the Coolify Postgres terminal (see `payload-plugin-schema-even-when-disabled` memory + `scripts/fix-*-schema.sql` pattern).

---

### Task 6: `resolveAvailability` — unified availability resolver (backend, pure)

**Files:**
- Create: `alkebu-load/src/app/utils/availability/resolveAvailability.ts`
- Create: `alkebu-load/tests/availability/resolveAvailability.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type AvailabilityState = 'in_stock' | 'special_order' | 'request';
  export interface ResolvedAvailability { state: AvailabilityState; source: 'in-store' | 'ingram' | 'vendor' | 'none'; shipEstimate: string }
  export function resolveAvailability(book: any): ResolvedAvailability;   // reads editions[].inventory + availabilityStatus
  ```
- Rule: `in_stock` if any edition has `stockLevel > 0` (source `in-store`) OR `ingramAvailable` (source `ingram`) OR `availableToOrder` (source `vendor`); else if `availabilityStatus` is `request-only`/`discontinued` → `request`; else `request`. `shipEstimate` always `'Ships in 3–8 days'`.

- [ ] **Step 1: Write the failing test**

```ts
// alkebu-load/tests/availability/resolveAvailability.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAvailability } from '../../src/app/utils/availability/resolveAvailability';

const book = (inv: any, status = 'available') => ({ availabilityStatus: status, editions: [{ inventory: inv }] });

test('in-store on-hand → in_stock/in-store', () => {
  assert.deepEqual(resolveAvailability(book({ stockLevel: 3 })).state, 'in_stock');
  assert.equal(resolveAvailability(book({ stockLevel: 3 })).source, 'in-store');
});
test('ingram available → in_stock/ingram', () => {
  const r = resolveAvailability(book({ stockLevel: 0, ingramAvailable: true }));
  assert.equal(r.state, 'in_stock'); assert.equal(r.source, 'ingram');
});
test('manual vendor flag → in_stock/vendor', () => {
  const r = resolveAvailability(book({ stockLevel: 0, availableToOrder: true }));
  assert.equal(r.state, 'in_stock'); assert.equal(r.source, 'vendor');
});
test('nothing available, request-only → request', () => {
  assert.equal(resolveAvailability(book({ stockLevel: 0 }, 'request-only')).state, 'request');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd alkebu-load && pnpm test -- --test-name-pattern="resolveAvailability|in_stock|request"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the resolver**

```ts
// alkebu-load/src/app/utils/availability/resolveAvailability.ts
export type AvailabilityState = 'in_stock' | 'special_order' | 'request';
export interface ResolvedAvailability { state: AvailabilityState; source: 'in-store' | 'ingram' | 'vendor' | 'none'; shipEstimate: string }

const SHIP = 'Ships in 3–8 days';

export function resolveAvailability(book: any): ResolvedAvailability {
  const editions: any[] = Array.isArray(book?.editions) ? book.editions : [];
  for (const e of editions) {
    const inv = e?.inventory ?? {};
    if (typeof inv.stockLevel === 'number' && inv.stockLevel > 0) return { state: 'in_stock', source: 'in-store', shipEstimate: SHIP };
  }
  if (editions.some((e) => e?.inventory?.ingramAvailable)) return { state: 'in_stock', source: 'ingram', shipEstimate: SHIP };
  if (editions.some((e) => e?.inventory?.availableToOrder)) return { state: 'in_stock', source: 'vendor', shipEstimate: SHIP };
  return { state: 'request', source: 'none', shipEstimate: SHIP };
}
```

- [ ] **Step 4: Run tests to verify they pass** — Run: `cd alkebu-load && pnpm test`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/app/utils/availability/ alkebu-load/tests/availability/
git commit -m "feat(availability): unified resolver (in-store / ingram / vendor)"
```

---

### Task 7: Storefront availability copy unification

**Files:**
- Modify: `alkebu-web/src/lib/utils/bookAvailability.ts`
- Test: `alkebu-web/src/lib/utils/bookAvailability.test.ts` (create; run via `npm run test`)

**Interfaces:**
- Consumes: book docs with `editions[].inventory.{stockLevel,ingramAvailable,availableToOrder}` (Task 5).
- Produces: `getBookAvailabilityMessage(book)` returns a single unified `'Ships in 3–8 days'` (no "In store &" prefix); `isBookPurchasable` returns true when any edition is in-store/ingram/vendor available.

- [ ] **Step 1: Write the failing test**

```ts
// alkebu-web/src/lib/utils/bookAvailability.test.ts
import { describe, it, expect } from 'vitest';
import { getBookAvailabilityMessage, isBookPurchasable } from './bookAvailability';

describe('unified availability', () => {
  it('shows one ship message regardless of source', () => {
    const inStore = { availabilityStatus: 'available', editions: [{ isPrimary: true, inventory: { stockLevel: 4 } }] };
    const ingram = { availabilityStatus: 'available', editions: [{ isPrimary: true, inventory: { stockLevel: 0, ingramAvailable: true } }] };
    expect(getBookAvailabilityMessage(inStore)).toBe('Ships in 3–8 days');
    expect(getBookAvailabilityMessage(ingram)).toBe('Ships in 3–8 days');
  });
  it('is purchasable when ingram or vendor available even with 0 on-hand', () => {
    expect(isBookPurchasable({ availabilityStatus: 'available', editions: [{ isPrimary: true, inventory: { stockLevel: 0, availableToOrder: true } }] })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd alkebu-web && npm run test -- bookAvailability`
Expected: FAIL — message still returns `'In store & ships in 3-8 days'`.

- [ ] **Step 3: Implement the unification**

In `getBookAvailabilityMessage`, replace the final return with a single unified message and treat ingram/vendor as available:

```ts
// availability considers any edition in-store OR ingram OR vendor available
const anyEditionAvailable = (book?.editions || []).some((e: any) =>
  (typeof e?.inventory?.stockLevel === 'number' && e.inventory.stockLevel > 0) ||
  e?.inventory?.ingramAvailable || e?.inventory?.availableToOrder);

// ...in getBookAvailabilityStatus: return 'available' when anyEditionAvailable, else fall through to request-only/discontinued
// ...in getBookAvailabilityMessage, when purchasable:
return 'Ships in 3–8 days';
```

Update `getBookAvailabilityStatus` / `isBookPurchasable` so `anyEditionAvailable` yields `'available'`. Keep `request-only` / `discontinued` behavior.

- [ ] **Step 4: Run tests to verify they pass** — Run: `cd alkebu-web && npm run test -- bookAvailability`. Expected: PASS. Then `npm run check` (svelte-kit sync + tsc) exit 0.

- [ ] **Step 5: Commit**

```bash
git add alkebu-web/src/lib/utils/bookAvailability.ts alkebu-web/src/lib/utils/bookAvailability.test.ts
git commit -m "feat(web): unify availability copy across in-store/ingram/vendor sources"
```

---

### Task 8: Long-tail demand logging (accumulate frequency)

**Files:**
- Modify: `alkebu-load/src/collections/SearchAnalytics.ts` (`afterChange` hook)
- Create: `alkebu-load/src/app/utils/searchDemand.ts` (frequency incrementer)
- Create: `alkebu-load/tests/searchDemand.test.ts`

**Interfaces:**
- Produces: `incrementQueryFrequency(payload, normalizedQuery)` → finds prior `searchAnalytics` docs with same `normalizedQuery`, returns/sets cumulative `queryFrequency` and flags `popularQuery` at a threshold (e.g. ≥5).

- [ ] **Step 1: Write the failing test** (pure counter logic — a testable helper that computes the next frequency + popular flag)

```ts
// alkebu-load/tests/searchDemand.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextFrequency } from '../src/app/utils/searchDemand';

test('nextFrequency increments and flags popular at threshold', () => {
  assert.deepEqual(nextFrequency(0), { queryFrequency: 1, popularQuery: false });
  assert.deepEqual(nextFrequency(4), { queryFrequency: 5, popularQuery: true });
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `cd alkebu-load && pnpm test -- --test-name-pattern="nextFrequency"`. Expected: FAIL.

- [ ] **Step 3: Implement the counter + wire the hook**

```ts
// alkebu-load/src/app/utils/searchDemand.ts
export const POPULAR_THRESHOLD = 5;
export function nextFrequency(priorMax: number): { queryFrequency: number; popularQuery: boolean } {
  const queryFrequency = (priorMax || 0) + 1;
  return { queryFrequency, popularQuery: queryFrequency >= POPULAR_THRESHOLD };
}
```

In `SearchAnalytics.afterChange`, replace the `console.log`-only body: on `create`, query prior docs with the same `normalizedQuery`, take the max prior `queryFrequency`, compute `nextFrequency`, and `payload.update` the new doc's `queryFrequency`/`popularQuery`. Guard against recursion with `req.context` (see `payload-admin-extension-points` memory).

- [ ] **Step 4: Run tests to verify they pass** — Run: `cd alkebu-load && pnpm test`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/collections/SearchAnalytics.ts alkebu-load/src/app/utils/searchDemand.ts alkebu-load/tests/searchDemand.test.ts
git commit -m "feat(analytics): accumulate long-tail search frequency for demand signal"
```

---

### Task 9: Order Dashboard "Order from Ingram" flag

**Files:**
- Modify: `alkebu-load/src/collections/Orders.ts` (add derived/stored `needsIngramOrder` boolean + line-level `fulfillmentSource`)
- Modify: `alkebu-load/src/app/components/OrderDashboard.tsx` (surface an "Order from Ingram — Direct-to-Home" badge/filter)
- Test: `alkebu-load/tests/orders/needsIngramOrder.test.ts`

**Interfaces:**
- Produces: `orderNeedsIngram(order)` → true if any line item's `fulfillmentSource === 'ingram'` (special-order or ingram-available and not physically on-hand at purchase).

- [ ] **Step 1: Write the failing test**

```ts
// alkebu-load/tests/orders/needsIngramOrder.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderNeedsIngram } from '../../src/app/utils/orders/needsIngramOrder';

test('order with an ingram-sourced line needs an Ingram order', () => {
  assert.equal(orderNeedsIngram({ items: [{ fulfillmentSource: 'in-store' }, { fulfillmentSource: 'ingram' }] }), true);
  assert.equal(orderNeedsIngram({ items: [{ fulfillmentSource: 'in-store' }] }), false);
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `cd alkebu-load && pnpm test -- --test-name-pattern="needs an Ingram order"`. Expected: FAIL.

- [ ] **Step 3: Implement** the pure `orderNeedsIngram` helper (`src/app/utils/orders/needsIngramOrder.ts`), add `fulfillmentSource` to order line items + a stored `needsIngramOrder` set in an Orders `beforeChange` hook, regenerate types, and add a badge + "Needs Ingram order" filter tab affordance in `OrderDashboard.tsx` (follow the existing tab/badge pattern in that component).

- [ ] **Step 4: Run tests + build** — Run: `cd alkebu-load && pnpm test && pnpm generate:types && pnpm build`. Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/collections/Orders.ts alkebu-load/src/app/components/OrderDashboard.tsx alkebu-load/src/app/utils/orders/needsIngramOrder.ts alkebu-load/src/payload-types.ts alkebu-load/tests/orders/
git commit -m "feat(orders): flag Ingram-fulfilled orders for manual Direct-to-Home placement"
```

---

### Task 10: Stage-2 "look wider" UI shell (Turnstile-gated, against mock)

**Files:**
- Create: `alkebu-web/src/lib/components/Search/LookWiderPanel.svelte` (invitation + guided scope chips + Turnstile)
- Create: `alkebu-load/src/app/api/long-tail-search/route.ts` (validates Turnstile, rate-limits, calls `getAvailabilityProvider().searchLongTail`)
- Modify: storefront search results view to render `LookWiderPanel` on zero/thin results
- Test: `alkebu-load/tests/api/longTailSearch.rate.test.ts` (rate-limit + Turnstile-required behavior, provider mocked)

**Interfaces:**
- Consumes: `getAvailabilityProvider().searchLongTail` (Task 4), Turnstile verify util (reuse the contact-form implementation).
- Produces: `POST /api/long-tail-search { query, scope, turnstileToken }` → `{ results: LongTailResult[] }`; rejects without a valid Turnstile token; rate-limited per session/IP.

- [ ] **Step 1: Write the failing test** — assert the route returns 400/403 without a valid Turnstile token and 200 with results when the token verifies (stub the verifier + provider). Run and confirm FAIL (route missing).

- [ ] **Step 2: Implement the route** — reuse the contact-form Turnstile verification (`grep -rn "turnstile" alkebu-load/src` for the existing helper), add a simple per-session/IP rate limiter, call `getAvailabilityProvider().searchLongTail(query, scope)`, log the miss via Task 8's path, return results. **Do not persist or index results.**

- [ ] **Step 3: Build `LookWiderPanel.svelte`** — warm copy ("We don't have that on our shelves yet — want us to look across the wider world of books and bring it in for you?"), a **[Search all books]** button that triggers Turnstile (invisible/managed) then POSTs, optional Title/Author/Topic scope chips (pre-filled with the original query), skeleton loaders, results rendered as `special_order` buyable cards with `noindex`. Run `svelte-autofixer` (Svelte MCP) until clean; `npm run check:svelte` exit 0.

- [ ] **Step 4: Run tests + checks** — Run: `cd alkebu-load && pnpm test` and `cd alkebu-web && npm run check`. Expected: PASS / exit 0.

- [ ] **Step 5: Commit**

```bash
git add alkebu-web/src/lib/components/Search/ alkebu-load/src/app/api/long-tail-search/ alkebu-load/tests/api/
git commit -m "feat(search): Turnstile-gated long-tail 'look wider' discovery (mock-backed)"
```

---

## Phase 2 — Ingram-live (unblock when contract/credentials land)

### Task 11: Live Ingram Web Service client + provider wiring

**Files:**
- Create: `alkebu-load/src/app/utils/ingram/webServiceClient.ts`
- Modify: `alkebu-load/src/app/utils/ingram/AvailabilityProvider.ts` (`getAvailabilityProvider` returns the live provider when `INGRAM_WS_URL` is set, else the mock)
- Create: `alkebu-load/tests/ingram/webServiceClient.test.ts` (mock `fetch`; assert request shape + parse)

**Interfaces:**
- Consumes: `parseStockResponse` (Task 2), `batchIsbns`/`isIngramOnHand` (Task 3).
- Produces: a live `AvailabilityProvider` whose `checkStock` issues REST POSTs (`queryType=9&query=BN="…" or "…"&startRecord=1&endRecord=25&liveUpdate=Y&dataRequest=STK`) with Basic Auth, parses responses, and returns `Map<ean, IngramStock>`; `searchLongTail` uses queryType 1 + mnemonics (`TI=`/contributor/`KW=`).

- [ ] **Step 1: Write the failing test** — stub global `fetch` to return the Task-2 fixture XML; assert `checkStock(['9780545392556'])` yields LaVergne 101 and that the outgoing URL/body contains `queryType=9`, `liveUpdate=Y`, `dataRequest=STK`, and the batched `BN=` query. Confirm FAIL.

- [ ] **Step 2: Implement the client** — Basic Auth header from `INGRAM_WS_USER`/`INGRAM_WS_PASSWORD`; batch via `batchIsbns`; build the `BN="x" or "y"` query; `fetch` the REST endpoint; `parseStockResponse`; assemble the Map. Timeout + try/catch → on failure return an empty Map (callers degrade gracefully). Wire `getAvailabilityProvider` to select live vs mock by env.

- [ ] **Step 3: Run tests** — `cd alkebu-load && pnpm test`. Expected: PASS.

- [ ] **Step 4: Commit** — `feat(ingram): live Web Service client behind AvailabilityProvider`.

---

### Task 12: Stage-1 scheduled availability refresh cron

**Files:**
- Create: `alkebu-load/src/app/utils/ingram/refreshAvailability.ts`
- Modify: `alkebu-load/src/payload.config.ts` (register `refresh-ingram-availability` in `jobs.tasks`)
- Create: `alkebu-load/tests/ingram/refreshAvailability.test.ts`

**Interfaces:**
- Consumes: `getAvailabilityProvider().checkStock`, `isIngramAvailable`, `INGRAM_STOCK_THRESHOLD`.
- Produces: `refreshIngramAvailability(payload)` → paginates books, collects edition ISBNs, `batchIsbns`, `checkStock`, writes `ingramOnHand`/`ingramAvailable`/`ingramCheckedAt` per matching edition; returns `{ scanned, updated }`.

- [ ] **Step 1: Write the failing test** — with the mock provider + a fake payload (stub `find`/`update`), assert editions get `ingramAvailable` set per threshold and `ingramCheckedAt` stamped. Confirm FAIL.

- [ ] **Step 2: Implement** `refreshIngramAvailability`, then register the cron following the existing `jobs.tasks` pattern (default `schedule: [{ cron: '0 8 * * *', queue: 'default' }]` — nightly 08:00 UTC; note cadence is tunable). Log `{scanned, updated}` for volume monitoring.

- [ ] **Step 3: Run tests + build** — `cd alkebu-load && pnpm test && pnpm build`. Expected: exit 0.

- [ ] **Step 4: Commit** — `feat(ingram): nightly catalog availability refresh cron`.

---

### Task 13: Checkout-time live availability confirm

**Files:**
- Modify: `alkebu-load/src/app/api/checkout/preview/route.ts` (confirm Ingram-sourced lines against a live `checkStock` before locking the quote)
- Create: `alkebu-load/tests/checkout/availabilityConfirm.test.ts`

**Interfaces:**
- Consumes: `getAvailabilityProvider().checkStock`, `resolveAvailability`.
- Produces: preview response includes per-line `availabilityWarning` when a line is no longer fulfillable (not on-hand AND Ingram below threshold); does not silently drop lines.

- [ ] **Step 1: Write the failing test** — a cart line that is Ingram-sourced and whose live `checkStock` now returns on-hand 0 yields an `availabilityWarning`; a still-available line does not. Confirm FAIL.

- [ ] **Step 2: Implement** the confirm step inside preview (reuse the quote-lock flow; do not recalc tax/shipping — see cart-checkout gotcha). On unfulfillable → warning payload the storefront renders per the UX spec.

- [ ] **Step 3: Run tests** — `cd alkebu-load && pnpm test`. Expected: PASS.

- [ ] **Step 4: Commit** — `feat(checkout): live Ingram availability confirm at preview`.

---

### Task 14: Stage-2 live long-tail search + buyable special-order

**Files:**
- Modify: `alkebu-load/src/app/api/long-tail-search/route.ts` (now backed by the live provider via env)
- Modify: storefront long-tail rendering to add-to-cart special-order items (price from `LongTailResult.price`), `noindex`
- Modify: cart/checkout to accept a special-order line (ISBN + Ingram price) fulfilled via Ingram (sets `fulfillmentSource: 'ingram'` from Task 9)
- Test: `alkebu-load/tests/api/longTailSearch.live.test.ts`

- [ ] **Step 1: Write the failing test** — with `INGRAM_WS_URL` set and `fetch` stubbed to a queryType-1 fixture, the route returns buyable results; adding one to cart yields a line with `fulfillmentSource: 'ingram'`. Confirm FAIL.

- [ ] **Step 2: Implement** the live search path + the special-order cart line (smallest change to `cartOperations`/CartItems to carry an ISBN-priced Ingram line). Keep results `noindex`, never persisted as catalog.

- [ ] **Step 3: Run tests + checks** — `cd alkebu-load && pnpm test`; `cd alkebu-web && npm run check`. Expected: PASS / exit 0.

- [ ] **Step 4: Commit** — `feat(search): buyable live long-tail special orders via Ingram`.

---

### Task 15: Go-live configuration, volume monitoring, rollout

**Files:**
- Modify: `alkebu-load/.env.example` (`INGRAM_WS_URL`, `INGRAM_WS_USER`, `INGRAM_WS_PASSWORD`, `INGRAM_STOCK_THRESHOLD`)
- Modify: `docs/launch.md` (add an Ingram availability readiness section)
- Create: a lightweight volume counter/log in the refresh cron + long-tail route

- [ ] **Step 1** Add env vars + document them (backend CLAUDE.md env section).
- [ ] **Step 2** Confirm the nightly-refresh call volume against the subscription limit (from the Ingram rep); adjust the cron cadence/`INGRAM_STOCK_THRESHOLD` accordingly.
- [ ] **Step 3** Seed a controlled test: point at the Ingram **test server**, run `refreshIngramAvailability` for a handful of known ISBNs, verify `ingram*` fields populate.
- [ ] **Step 4** Switch to production creds; run a bounded first refresh; spot-check availability on a few PDPs and a long-tail search end-to-end (search → look wider → Turnstile → buyable → order → dashboard "Order from Ingram" flag).
- [ ] **Step 5: Commit + update launch board** — `chore(ingram): go-live config + rollout notes`.

---

## Self-Review

**Spec coverage:** Availability resolution (Task 6/7), Web Service client + Query Type 9 + batching (Tasks 2/3/11), provider abstraction + mock (Task 4), schema fields (Task 5), scheduled refresh (Task 12), checkout confirm (Task 13), Stage-2 gated flow + Turnstile + demand logging (Tasks 8/10/14), fulfillment flag (Task 9), Square coexistence + clamp (Task 1), compliance/noindex (Tasks 10/14), go-live/volume (Task 15). Companion phases (Edition Consolidation, Merchandising Intelligence) are intentionally out of this plan — they get their own specs/plans. **No gaps.**

**Placeholder scan:** pure-logic tasks (1, 2, 3, 4, 6, 7, 8) carry full code + tests. Integration/UI tasks (9, 10, 11–15) give exact files, interfaces (signatures), and test intent; their internal code follows the cited existing patterns (jobs.tasks, Turnstile verify, OrderDashboard tabs) rather than inventing unverifiable markup — acceptable because they are credential-gated and pattern-bound, not logic placeholders.

**Type consistency:** `IngramStock`/`DcStock` (Task 2) consumed unchanged in Tasks 3/11/12; `AvailabilityProvider`/`LongTailResult` (Task 4) consumed in Tasks 10/11/14; `ResolvedAvailability` (Task 6) consumed in Tasks 7/13; edition fields (Task 5) consumed in Tasks 6/7/12. Names consistent across tasks.
