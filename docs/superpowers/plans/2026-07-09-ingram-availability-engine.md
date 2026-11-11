# Ingram Availability & Discovery Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-stage, Ingram-powered online availability engine — a unified "In Stock" for the curated catalog plus a deliberate long-tail discovery search — that makes the store the primary source for loyal buyers and captures long-tail sales in-house.

**Architecture:** Stage 1 (curated catalog, indexed) resolves a unified availability from Square on-hand OR a cached Ingram Web Service on-hand OR a manual vendor flag. Stage 2 (long-tail, `noindex`) is a Turnstile-gated "look wider" search that queries the Ingram Web Service live and shows buyable special-order results. Ingram is reached only through an `AvailabilityProvider` interface, so the whole engine is built and tested against a mock provider before real credentials arrive.

**Tech Stack:** Payload CMS 3.x (Next.js 15, backend, `pnpm`), SvelteKit/Svelte 5 (storefront, `npm`), PostgreSQL (prod) / SQLite (dev), `fast-xml-parser` (new dep, SOAP/XML responses), Cloudflare Turnstile (already integrated on the contact form), Node test runner (`pnpm test`).

## Amendments (2026-07-16)

After reviewing the Ingram FTP inventory onboarding package (`Ingram Inventory Info/` at repo root, gitignored — Implementation Guide v2.14, 2,099-record StockV2 sample, code tables):

1. **Availability is code-first** — `isIngramAvailable` (Task 3) gates on the On-Sale-Date (Ingram shows pre-order on-hand up to 14 days before street date), then trusts the Product Availability Code (`20`/`21`/`22` fulfillable, `31`/`40` not), and uses the quantity threshold only when the code is absent.
2. **New Task 2b** — pure StockV2 fixed-width parser + fixture cut from the vendor sample, emitting the same `IngramStock` shape as the Task-2 XML parser so all downstream consumers work with either transport.
3. **Task 12 is transport-agnostic** — the refresh cron consumes `Map<ean, IngramStock>` from either the Web Service `checkStock` or an FTP StockV2 stream-filter (FTP licensing permits persistence; Web Service forbids mirroring). If FTP credentials activate before Web Service certification, Stage 1 can go live on FTP alone; Tasks 13–14 still wait on the Web Service.
4. Spec updated in lockstep: `docs/superpowers/specs/2026-07-09-ingram-availability-engine-design.md`.

## Amendments (2026-10-02)

Production access was verified (see the spec's "Connectivity status"), and catalog enrichment was added as **Phase 3**.

1. **Web Service is SOAP.** Credentials go in a `UserInfo` header. Query Type 9 uses `SearchRequestTypes12349Enhanced`. Task 11 must build SOAP envelopes, not REST form posts, so the Global Constraints transport line below is superseded.
2. **No `<Stock>` in WS responses yet** with `dataRequest=STK`. Stage 1 should go live on the **FTP source** (Task 12's transport note), and Tasks 13/14 wait on Ingram's answer about the Stock Check add-on.
3. **SFTP host** is `ftp.ingramcontent.com`, using OpenSSH or Node `ssh2` (curl/libssh2 fails key exchange).
4. **Phase 3 (Tasks 16–22): enrich existing Books from Titles Basic over FTP.** It shares the SFTP fetch and stream-filter with Task 12's FTP source.
5. **Owner directives (2026-10-02):** raise prices to Ingram list when it is higher (never lower), clean up titles (Ingram title + new `subtitle` field, strip author unless disambiguating), and **write both to Square** (Task 20b).
6. **AI restriction (agreement §2(c)):** fixtures are synthetic, never vendor sample files. Live runs are performed by the owner, and only counts/status are shared. Ingram-sourced fields never go to an AI/LLM service.

## Global Constraints

- **Ingram Web Service:** REST + Basic Auth (base64 `user:password`). Test endpoint `https://idswebtest.ingramcontent.com/cws/companion.asmx`; production URL supplied on contract approval. Config via env: `INGRAM_WS_URL`, `INGRAM_WS_USER`, `INGRAM_WS_PASSWORD`.
- **No DB mirroring of Web Service data** — the `ingram*` edition fields are a TTL cache, refreshed on schedule; long-tail results are never persisted or indexed. (Web Service license term. The **FTP feed** is the inverse — licensed for DB load — so any *persistent* Ingram data sources from FTP.)
- **Stock threshold:** default **10**, env `INGRAM_STOCK_THRESHOLD`. Keyed on the **LaVergne** DC `OnHand` (primary), other DCs as fallback. *Fallback signal only* — resolution is code-first with an On-Sale-Date gate (Task 3).
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
    productAvailability?: string;   // normalized to the 2-char prodstat code ('21' etc.) when present
    onSaleDate?: string;            // YYYYMMDD street date; '00010101'/unset = sellable on receipt
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

While cutting the fixture, check whether the response carries an availability status and/or on-sale/street date element — if so, populate `productAvailability` (normalized to the 2-char prodstat code) and `onSaleDate` in the parser. The Task-2b StockV2 parser always populates both.

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
  productAvailability?: string;   // 2-char prodstat code when present
  onSaleDate?: string;            // YYYYMMDD; populate if the response carries a street date
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

### Task 2b: StockV2 fixed-width parser (pure) *(added 2026-07-16)*

The Ingram FTP inventory package makes the FTP feed a viable Stage-1 source (see plan Amendments + spec "FTP inventory feed"). This parser emits the **same `IngramStock` shape as Task 2**, so Tasks 3/6/12 work with either transport. Positions are 1-based inclusive per the IDS Implementation Guide v2.14; the assertions below were **verified against record 1 of the vendor sample file** on 2026-07-16.

**Files:**
- Create: `alkebu-load/src/app/utils/ingram/parseStockV2.ts`
- Create: `alkebu-load/tests/ingram/parseStockV2.test.ts`
- Create: `alkebu-load/tests/ingram/fixtures/stockv2-sample.dat` — first 5 lines of `Ingram Inventory Info/IDS_Inventory/Inventory_Files/stockv2@ingram.dat` (a 5-line excerpt for tests is fine; never commit the full vendor file)

**Interfaces:**
- Consumes: nothing (pure).
- Produces:
  ```ts
  export interface StockV2Record extends IngramStock {
    weightLbs: number;        // pos 239–244, two implied decimals
    discountLevel: string;    // pos 166–168, e.g. '20%', 'REG'
    publisherStatus: string;  // pos 179–180, e.g. 'IP' (see pubstatus.txt)
  }
  export function parseStockV2Line(line: string): StockV2Record;
  ```

- [ ] **Step 1: Cut the fixture** — `head -5 "Ingram Inventory Info/IDS_Inventory/Inventory_Files/stockv2@ingram.dat" > alkebu-load/tests/ingram/fixtures/stockv2-sample.dat`

- [ ] **Step 2: Write the failing test**

```ts
// alkebu-load/tests/ingram/parseStockV2.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseStockV2Line } from '../../src/app/utils/ingram/parseStockV2';

const [line] = readFileSync(fileURLToPath(new URL('./fixtures/stockv2-sample.dat', import.meta.url)), 'utf8').split(/\r?\n/);

test('parseStockV2Line slices the vendor sample record correctly', () => {
  const rec = parseStockV2Line(line);
  assert.equal(rec.ean, '9781171177340');
  assert.equal(rec.dcs.LaVergne.onHand, 147);
  assert.equal(rec.dcs.LaVergne.stockStatus, true);
  assert.equal(rec.dcs.Roseburg.onHand, 0);
  assert.equal(rec.pubListPrice, 21.75);
  assert.equal(rec.discountLevel, '20%');
  assert.equal(rec.publisherStatus, 'IP');
  assert.equal(rec.productAvailability, '21');  // prodstat: in stock
  assert.equal(rec.onSaleDate, '00010101');     // no street date set → sellable on receipt
  assert.equal(rec.mediaMail, true);
  assert.equal(rec.backorder, false);
  assert.equal(rec.weightLbs, 0.69);
});
```

- [ ] **Step 3: Run test to verify it fails** — `cd alkebu-load && pnpm test -- --test-name-pattern="parseStockV2Line"`. Expected: FAIL — module not found.

- [ ] **Step 4: Implement the parser**

```ts
// alkebu-load/src/app/utils/ingram/parseStockV2.ts
import type { IngramStock } from './parseStockResponse';

export interface StockV2Record extends IngramStock {
  weightLbs: number;
  discountLevel: string;
  publisherStatus: string;
}

// 1-based inclusive positions per IDS Inventory Implementation Guide v2.14 (Feb 2022).
const f = (line: string, start: number, end: number) => line.slice(start - 1, end).trim();
const n = (s: string) => (s === '' ? 0 : Number(s));

const DCS: Record<string, { onHand: [number, number]; onOrder: [number, number]; flag: number }> = {
  LaVergne:     { onHand: [39, 45], onOrder: [95, 101],  flag: 181 },
  Roseburg:     { onHand: [46, 52], onOrder: [102, 108], flag: 182 },
  FtWayne:      { onHand: [53, 59], onOrder: [109, 115], flag: 183 },
  Chambersburg: { onHand: [60, 66], onOrder: [116, 122], flag: 184 },
  Allentown:    { onHand: [67, 73], onOrder: [123, 129], flag: 185 },
};

export function parseStockV2Line(line: string): StockV2Record {
  const dcs: IngramStock['dcs'] = {};
  for (const [name, p] of Object.entries(DCS)) {
    dcs[name] = {
      onHand: n(f(line, ...p.onHand)),
      onOrder: n(f(line, ...p.onOrder)),
      stockStatus: f(line, p.flag, p.flag) === 'Y',
    };
  }
  return {
    ean: f(line, 2, 14),
    pubListPrice: n(f(line, 151, 157)) / 100,   // two implied decimals
    productAvailability: f(line, 272, 273),
    onSaleDate: f(line, 197, 204),
    backorder: f(line, 219, 219) === 'Y',
    mediaMail: f(line, 220, 220) === 'Y',
    dcs,
    weightLbs: n(f(line, 239, 244)) / 100,
    discountLevel: f(line, 166, 168),
    publisherStatus: f(line, 179, 180),
  };
}
```

- [ ] **Step 5: Run tests to verify they pass** — `cd alkebu-load && pnpm test`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add alkebu-load/src/app/utils/ingram/parseStockV2.ts alkebu-load/tests/ingram/parseStockV2.test.ts alkebu-load/tests/ingram/fixtures/stockv2-sample.dat
git commit -m "feat(ingram): StockV2 fixed-width parser (FTP feed, same IngramStock shape)"
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
  export function isIngramAvailable(stock: IngramStock, threshold: number, opts?: { today?: Date; primaryDc?: string }): boolean;
  // Code-first (amended 2026-07-16): On-Sale-Date gate → Product Availability Code (20/21/22 yes, 31/40 no) → threshold fallback
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

test('isIngramAvailable applies threshold when no availability code present', () => {
  const s = { ean: 'x', backorder: false, mediaMail: true, dcs: { LaVergne: { onHand: 8, onOrder: 0, stockStatus: true } } } as any;
  assert.equal(isIngramAvailable(s, 10), false);
  assert.equal(isIngramAvailable({ ...s, dcs: { LaVergne: { onHand: 40, onOrder: 0, stockStatus: true } } }, 10), true);
});

test('isIngramAvailable trusts the availability code over quantity', () => {
  const low = { ean: 'x', backorder: false, mediaMail: true, dcs: { LaVergne: { onHand: 5, onOrder: 0, stockStatus: true } } } as any;
  assert.equal(isIngramAvailable({ ...low, productAvailability: '21' }, 10), true);   // stocked → orderable despite sub-threshold qty
  const high = { ...low, dcs: { LaVergne: { onHand: 500, onOrder: 0, stockStatus: true } } };
  assert.equal(isIngramAvailable({ ...high, productAvailability: '40' }, 10), false); // gone from Ingram → stale qty never overrides
  assert.equal(isIngramAvailable({ ...high, productAvailability: '31' }, 10), false); // temporarily out of stock
});

test('isIngramAvailable gates on the On-Sale-Date (pre-orders show on-hand up to 14 days early)', () => {
  const s = { ean: 'x', backorder: false, mediaMail: true, productAvailability: '21', onSaleDate: '29990101', dcs: { LaVergne: { onHand: 40, onOrder: 0, stockStatus: true } } } as any;
  assert.equal(isIngramAvailable(s, 10), false);
  assert.equal(isIngramAvailable({ ...s, onSaleDate: '20200101' }, 10), true);
  assert.equal(isIngramAvailable({ ...s, onSaleDate: '00010101' }, 10), true); // no street date set → sellable on receipt
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

// prodstat codes (reference file prodstat.txt): 20 available / 21 in stock / 22 special order;
// 31 temporarily out of stock / 40 not available from Ingram.
const FULFILLABLE_CODES = new Set(['20', '21', '22']);
const UNAVAILABLE_CODES = new Set(['31', '40']);

export function isIngramAvailable(stock: IngramStock, threshold: number, opts: { today?: Date; primaryDc?: string } = {}): boolean {
  // On-Sale-Date gate: Ingram shows pre-order on-hand up to 14 days before street date — never sell early.
  if (!isOnSale(stock.onSaleDate, opts.today ?? new Date())) return false;
  const code = stock.productAvailability?.trim();
  if (code && UNAVAILABLE_CODES.has(code)) return false;
  if (code && FULFILLABLE_CODES.has(code)) return true;
  return ingramOnHand(stock, opts.primaryDc) > threshold; // code absent → quantity threshold fallback
}

function isOnSale(onSaleDate: string | undefined, today: Date): boolean {
  // YYYYMMDD; unset / '00010101' / '000000…' = no street date → sellable on receipt.
  if (!onSaleDate || !/^\d{8}$/.test(onSaleDate) || onSaleDate <= '00010101') return true;
  const todayStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  return onSaleDate <= todayStr;
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
    productAvailability: onHand ? '21' : '40', // prodstat codes, matching real feeds (see Task 3)
    onSaleDate: '00010101',                    // no street date set → sellable on receipt
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

## Phase 1 status (2026-10-02)

Tasks 1–10 are implemented on `feat/ingram-availability-engine`. Each was committed with tests, and the backend suite passes. Deviations from the task text:

- **Fixtures are synthetic** (Tasks 2, 2b): invented values in the real SOAP envelope, and fixed-width records built at the documented positions. No vendor sample files.
- **Task 2:** EANs and codes are parsed as strings (`parseTagValue: false`); products with no `<Stock>` parse with empty `dcs`.
- **Task 3:** the on-sale date is compared against the **America/Chicago** calendar date, not UTC.
- **Tasks 6/7, transition rule:** a book becomes "Request" only after Ingram has been checked for it (`ingramCheckedAt` set) and nothing can fulfill it. Unchecked books keep today's rule (purchasable at zero stock), so the catalog doesn't flip before the refresh runs. Staff `request-only`/`discontinued` statuses always win. Resolver source `unchecked` was added.
- **Task 7:** storefront tests use Node's test runner (`tests/bookAvailability.test.mjs`), not vitest.
- **Task 8:** the count is computed in `beforeChange` on create (one write), replacing the log-only `afterChange`.
- **Task 9:** line `fulfillmentSource` is classified in an Orders `beforeChange` hook, read before the Stripe webhook decrements stock, and never throws. The dashboard gets a badge, a per-line label and an "Ingram Orders" metric.
- **Task 10:** the storefront uses a `?/lookWider` form action that forwards the visitor IP (`x-client-ip`, trusted only with the storefront API key). Rate limits are per visitor (10 per 10 min) and global (`LONG_TAIL_HOURLY_CAP`, default 120/h), checked before the Turnstile check. Results show **Request this title** until Task 14 makes them buyable. Look-wider searches are logged as `searchEngine: 'combined'` with `externalResultCount`, which avoids a schema change.
- **Production DDL:** `alkebu-load/scripts/add-ingram-availability-schema.sql` covers Tasks 5 and 9 (edition columns, order flag, line enum). *Tested 2026-10-03 on a disposable PostgreSQL 18.6 (prod is 17.9):* `main`'s Payload created the "before" schema, seeded with two books and four editions. The script applied cleanly and a rerun was a no-op. The backfill filled exactly the two Square-linked editions of the linked book. The patched schema is **identical** to the schema the branch's own Payload pushes (188 columns on books/books_editions/orders/orders_items/payload_jobs*, plus all indexes and the three enums). With dev push disabled, the branch reads and writes the new edition fields, queries by `editions.squareItemId` and `needsIngramOrder`, and queues both Ingram jobs. Existing editions default to `false` for both new booleans.
- **Deploy prerequisites:** apply the SQL first; set `TURNSTILE_SECRET_KEY` on the backend (already used by contact) and `PUBLIC_TURNSTILE_SITE_KEY` on the storefront. The provider is still the mock, so look-wider returns a sample result until Task 11. **Don't deploy Task 10 to production while the mock is active.**

## Phase 2 — Ingram-live (unblock when contract/credentials land)

> *Amended 2026-07-16:* the FTP and Web Service halves of the contract may activate at different times. If **FTP lands first**, Stage 1 can go live early — implement Task 12's FTP alternative source and run Task 15's rollout for catalog availability; Tasks 11/13/14 (live client, checkout confirm, long-tail) still wait on Web Service credentials.

### Phase 2 status (2026-10-02): Stage-1 refresh from SFTP, built ahead of Task 11

Built first because the Web Service returns no `<Stock>` section yet. This is Task 12's FTP route:
- **Feed:** `Inventory/Catalog_Stock/cat_ing_stock.zip` (CSV, ~195 MB zipped, header-driven parser). The CSV **does** carry `Product Availability Code`, so open question #4 is answered. StockV2 remains selectable with `INGRAM_STOCK_FEED=stockv2`.
- **SFTP:** Node `ssh2` (the GoAnywhere server negotiates ecdh-sha2-nistp256 / rsa-sha2-512 / aes128-gcm), with the host key pinned (`SHA256:MKA9n3…pkzoc`, overridable by env).
- **Jobs:** `ingram-stock-fetch` (daily 11:30 UTC, no lock, gated by `INGRAM_STOCK_REFRESH_ENABLED=true`) queues `ingram-stock-apply` (under the `books-write` lock shared with the Square jobs). Only changed books are written; unchanged ones are re-stamped weekly. A file under 500k lines, or with more than 5% unreadable lines, is rejected.
- **Safety:** an unreadable on-sale date means "not on sale". The snapshot counts unrecognized dates and availability codes for the dry run.
- **Owner dry run:** `tsx scripts/ingram-stock-refresh.ts` (counts only). It needs the scoped SQL applied first, because the branch's Books config selects the new columns.

### Status (2026-11-02)

- `main` (Next 16 / Payload 3.91 security upgrades) is merged into this branch (`569c296`). Backend: 533 tests, production build exit 0. Storefront: tests pass, svelte-check 0 errors.
- "Search all books" (Task 10) is now behind `LONG_TAIL_SEARCH_ENABLED` (backend) and `PUBLIC_LONG_TAIL_SEARCH_ENABLED` (storefront), both off by default. This removes the "don't deploy Task 10 while the mock is active" blocker.
- Ingram env vars are documented in `alkebu-load/.env.example` (Task 15 Step 1).
- The production schema was applied on 2026-10-03. The owner's dry run produced the 254-row review list (`ingram-availability-review-awb-matches.csv`): 185 books not carried by Ingram, 51 Ingram can't supply. The ISBN column in that copy was mangled to scientific notation by a spreadsheet, so regenerate it before using ISBNs from it.
- **Remaining, owner-run:**
  1. Finish reviewing that list. Set `request-only` or `discontinued` on books that should change, or flag `availableToOrder` for AWB-sourced ones.
  2. Deploy.
  3. Run `pnpm ingram:stock-refresh -- --apply`.
  4. Set `INGRAM_STOCK_REFRESH_ENABLED=true` in Coolify.
- Tasks 11, 13 and 14 still wait on Ingram's Stock Check add-on. Phase 3 (Tasks 16–22) waits on the owner transcribing the Titles Basic column layout (Task 17 Step 1).
- The stacked branch `fix/square-duplicate-books` carries the Square duplicate fix and `pnpm square:link-repair` (see that commit).

### Status (2026-11-05): Stage-1 refresh live

- The owner skipped the manual review and accepted the refresh's rules: request-only and discontinued books are protected, books sold in the last 4 years (Square or website) are rescued with `availableToOrder`, and everything else follows Ingram.
- Dry run (2026-11-04): 5,540 books, 3,932 matched EANs, 951 buyable-to-request (739 not carried, 212 can't supply), 597 rescued by sales, 77 protected.
- A full `--apply` over the SSH tunnel is too slow (dozens of round trips per book; the tunnel dropped twice). The owner ran `--apply --only-rescues` to write the rescues, and the scheduled job wrote the rest server-side.
- `INGRAM_STOCK_REFRESH_ENABLED=true` in Coolify. The first scheduled apply ran 2026-11-05 16:35 UTC, after the app restart, and stamped 2,794 books.
- Verified 2026-11-05: 956 books on Request from Ingram, 77 staff-set, 4,520 buyable. The next fetch is queued for 11:30 UTC daily.
- Still waiting: Tasks 11, 13 and 14 need Ingram's Stock Check add-on, and Phase 3 needs the Titles Basic layout (Task 17 Step 1).

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

> **Transport note (2026-07-16):** keep the write path transport-agnostic — it consumes `Map<ean, IngramStock>`, nothing more. If FTP credentials activate before Web Service certification, add the alternative source instead of waiting: download the books part file (`stkv2pt1@ingram.zip`) from the Ingram FTP, stream lines through `parseStockV2Line` (Task 2b), keep only catalog EANs (in-memory set — no universe mirror needed, and FTP licensing permits persistence anyway), and feed the same write path. `isIngramAvailable` (Task 3) already handles both transports' availability codes and On-Sale-Date. Stage 2 long-tail stays Web-Service-only.

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
- Modify: `alkebu-load/.env.example` (`INGRAM_WS_URL`, `INGRAM_WS_USER`, `INGRAM_WS_PASSWORD`, `INGRAM_STOCK_THRESHOLD`; plus `INGRAM_FTP_HOST`/`INGRAM_FTP_USER`/`INGRAM_FTP_PASSWORD` if the FTP source is in play)
- Modify: `docs/launch.md` (add an Ingram availability readiness section)
- Create: a lightweight volume counter/log in the refresh cron + long-tail route

- [ ] **Step 1** Add env vars + document them (backend CLAUDE.md env section).
- [ ] **Step 2** Confirm the nightly-refresh call volume against the subscription limit (from the Ingram rep); adjust the cron cadence/`INGRAM_STOCK_THRESHOLD` accordingly.
- [ ] **Step 3** Seed a controlled test: point at the Ingram **test server**, run `refreshIngramAvailability` for a handful of known ISBNs, verify `ingram*` fields populate.
- [ ] **Step 4** Switch to production creds; run a bounded first refresh; spot-check availability on a few PDPs and a long-tail search end-to-end (search → look wider → Turnstile → buyable → order → dashboard "Order from Ingram" flag).
- [ ] **Step 5: Commit + update launch board** — `chore(ingram): go-live config + rollout notes`.

---

## Phase 3 — Catalog enrichment from Ingram Titles Basic (FTP) *(added 2026-10-02)*

> Spec: "Catalog enrichment from Ingram Titles Basic". Independent of Phases 1–2 except the shared SFTP fetch (Task 16), which Task 12's FTP source also uses. All fixtures are **synthetic**. Column layouts come from `DeveloperSpecs/` on the SFTP server; the owner transcribes field names and positions into the parser constants (Task 17). Claude does not read the vendor spec or sample files.

### Task 16: SFTP fetch + catalog stream-filter (shared)

**Files:**
- Create: `alkebu-load/src/app/utils/ingram/sftpFetch.ts`
- Create: `alkebu-load/src/app/utils/ingram/catalogFilter.ts`
- Create: `alkebu-load/tests/ingram/catalogFilter.test.ts`
- Modify: `alkebu-load/package.json` (add `ssh2-sftp-client` and `unzipper`, or equivalent streaming unzip)

**Interfaces:**
- `fetchIngramFile(remotePath, { sinceChecksum? }) → { localPath, checksum, skipped }`: downloads over SFTP (`INGRAM_FTP_HOST/USER/PASSWORD`), returns `skipped: true` when the checksum matches the last processed file, and cleans up temp files on failure.
- `loadCatalogEans(payload) → Set<string>`: every edition ISBN normalized to EAN-13 (ISBN-10 converted, hyphens stripped, checksum-validated).
- `streamCatalogRecords(zipPath, entryName, ean(line) → string|null, eans) → AsyncIterable<string>`: yields only lines whose EAN is in the set and never buffers the whole file.

- [ ] **Step 1: Failing tests:** EAN normalization (ISBN-10 → 13, invalid checksum dropped). The stream filter, given a synthetic 10-line file with 3 catalog EANs, yields exactly those 3 lines in order without reading the file into memory (assert through a counting stream).
- [ ] **Step 2: Implement.** Use a mocked SFTP client in tests; no network.
- [ ] **Step 3: Verify:** `pnpm test && pnpm check:types`.
- [ ] **Step 4: Commit:** `feat(ingram): SFTP fetch and catalog EAN stream-filter`.

### Task 17: Titles Basic + description parsers (pure)

**Files:**
- Create: `alkebu-load/src/app/utils/ingram/titlesBasicParser.ts`, `descriptionParser.ts`
- Create: `alkebu-load/tests/ingram/titlesBasicParser.test.ts`, `descriptionParser.test.ts` (synthetic fixtures under `tests/ingram/fixtures/`)

**Interfaces:**
- `TITLES_BASIC_COLUMNS`: ordered column-name constant transcribed from the vendor layout by the owner.
- `parseTitlesBasicLine(line) → TitlesBasicRecord | null`: pipe-delimited, `{ ean, title, subtitle, contributors[], publisher, pubDate, binding, pages, language, bisac[], dimensions, weight, listPrice }`; malformed → `null` plus a counted error.
- `parseDescriptionRecord(...) → { ean, kind: 'marketing'|'brief'|'annotation', html }`: description files are multi-line/variable, so the parser is a stream reducer.

- [ ] **Step 1 (owner):** transcribe the column order and field names (no data) from `DeveloperSpecs/` into `TITLES_BASIC_COLUMNS` and the description record markers.
- [ ] **Step 2: Failing tests** against synthetic lines built *from the column constant*: correct field mapping, empty optional fields, embedded pipes/escapes per the spec, multi-contributor parsing, BISAC list.
- [ ] **Step 3: Implement**, then verify, then commit: `feat(ingram): Titles Basic and description parsers`.

### Task 18: Books provenance fields + manual-edit hook + SQL

**Files:**
- Modify: `alkebu-load/src/collections/Books.tsx`: `enrichment` group (`fieldSources` JSON, `ingramEnrichedAt`, `ingramRecordDate`); `subtitle` (text); `titleLong` derived from `title` + `subtitle` in a `beforeChange` hook; `editions[].mediaMailEligible`, `editions[].ingramOnSaleDate`, `editions[].pricing.lockPrice` (checkbox); `'ingram'` in `importSource`.
- Modify: `alkebu-web` book card + PDP components: render `subtitle` under the title (follow-up commit in the same task).
- Create: `alkebu-load/src/collections/hooks/stampManualFieldSources.ts`
- Create: `alkebu-load/scripts/add-ingram-enrichment-schema.sql`: scoped, idempotent DDL with verify queries, following `add-square-catalog-staging-schema.sql` (no generated migration against prod)
- Create: `alkebu-load/tests/ingram/stampManualFieldSources.test.ts`

**Interfaces:**
- `stampManualFieldSources({ data, originalDoc, req, context })`: for each tracked field path whose value changed, sets `fieldSources[path] = { source: 'manual', at }` only when `req.user` is staff/admin **and** `context.ingramEnrichment !== true`.

- [ ] **Step 1: Failing tests:** an admin edit stamps manual, a job write (context flag) does not, unchanged fields are untouched, and nested edition paths (`editions.0.shippingWeight`) are keyed by edition ISBN rather than index so reorders don't misattribute.
- [ ] **Step 2: Implement**, then `pnpm generate:types`, then write and test the SQL on disposable Postgres (apply, rerun, verify).
- [ ] **Step 3: Commit:** `feat(books): field provenance and manual-edit protection for enrichment`.

### Task 19: Mapper + diff engine (pure)

**Files:**
- Create: `alkebu-load/src/app/utils/ingram/enrichmentPolicy.ts` (the spec's field-policy table as data)
- Create: `alkebu-load/src/app/utils/ingram/mapEnrichment.ts`, `diffEnrichment.ts`
- Create: `alkebu-load/src/app/utils/ingram/titleCleanup.ts`
- Create: `alkebu-load/tests/ingram/diffEnrichment.test.ts`, `titleCleanup.test.ts`

**Interfaces:**
- `cleanTitle({ current, ingramTitle, ingramSubtitle, contributors }) → { title, subtitle, removed: ('subtitle'|'author')[], confidence: 'exact'|'ambiguous' }`: strips a matching subtitle and a contributor-matching author segment (`by X`, ` - X`, `(X)`, `X:`). It never strips text that doesn't match.
- `findDisambiguationTitles(books: { id, baseTitle, authorKey }[]) → Set<bookId>`: books whose cleaned base title is shared by a book with a different author keep their author segment. Runs over the whole catalog before any title is applied.
- `priceUplift({ currentCents, ingramListCents, isConsignment, lockPrice }) → { action: 'raise'|'keep'|'review', cents }`: `raise` when Ingram > current; `review` when > 3× current; `keep` when equal/lower, missing, consignment or locked.
- `mapIngramRecord(titles, descriptions?, stock?) → EnrichmentCandidate`: normalizes units (weight → our shipping-weight unit, dimensions → our format), converts description HTML → plain `synopsis` and Lexical `description`, and BISAC → `subjects`.
- `diffEnrichment(book, candidate, fieldSources) → FieldChange[]` with `{ path, editionIsbn?, current, proposed, action: 'fill'|'correct'|'same'|'conflict'|'protected' }`.

- [ ] **Step 1: Failing tests (table-driven over the policy):** an empty field gives `fill`; an authoritative field from isbndb gives `correct`; an authoritative field from manual gives `protected`; a fill-gap field that differs gives `conflict`; a review-only title difference gives `conflict` and never `fill`; price/stock/images are never emitted; a whitespace/case-only difference gives `same`; and a previously rejected proposal (same value) gives `same`. **Title cleanup:** `Title: Subtitle` + Ingram subtitle gives title/subtitle split; `Title by Jane Doe` with contributor Jane Doe strips the author; `Title by Someone Else` (not a contributor) is ambiguous and goes to review; two books with base title `Freedom` and different authors both keep their author; the same title with the same author is stripped (not disambiguation); a manual title gives `protected`. **Price:** 1999 vs Ingram 2499 raises; 2499 vs 1999 keeps; consignment or `lockPrice` keeps; Ingram 0 or missing keeps; 999 vs 3500 goes to review.
- [ ] **Step 2: Implement**, then verify, then commit: `feat(ingram): enrichment mapper and policy-driven diff`.

### Task 20: Apply, log, and review queue

**Files:**
- Create: `alkebu-load/src/collections/IngramEnrichmentLog.ts`, `IngramEnrichmentReview.ts` (register in `payload.config.ts`; add to Task 18's SQL)
- Create: `alkebu-load/src/app/utils/ingram/applyEnrichment.ts`
- Create: `alkebu-load/src/app/components/IngramEnrichmentReview.tsx` (admin view: current vs proposed, accept/reject per field, bulk accept by field type)
- Create: `alkebu-load/tests/ingram/applyEnrichment.test.ts` (integration, real Postgres like the Square suite)

**Interfaces:**
- `applyEnrichment(payload, book, changes, runId)`: writes `fill`/`correct` changes in **one transaction per book** with `context.ingramEnrichment = true`, stamps `fieldSources[path] = { source: 'ingram', at }`, inserts a log row per change, and upserts `conflict` changes into the review queue (superseding stale pending rows for the same path).
- `acceptReview(id, user)` / `rejectReview(id, user)`: accept applies via the same path; reject records the value so the diff suppresses it next time.

- [ ] **Step 1: Failing tests:** atomicity (a failure mid-book leaves no partial writes or logs), idempotency (rerunning the same run gives 0 changes), supersession, the accept path stamps provenance, the reject path suppresses.
- [ ] **Step 2: Implement**, then verify, then commit: `feat(ingram): transactional enrichment apply with audit log and review queue`.

### Task 20b: Square write-back for price and title

**Files:**
- Create: `alkebu-load/src/app/utils/ingram/squareWriteBack.ts` (reuse the Square client setup from `squareCatalogSync.ts`; `squareSync.ts` has an unwired upsert to borrow from but is not called anywhere today)
- Create: `alkebu-load/tests/ingram/squareWriteBack.test.ts` (mock Square client)

**Interfaces:**
- `planSquareWrites(changes) → SquareWrite[]`: price changes go to the variation `price_money` (by `squareVariationId`); title changes go to the item `name` (by the edition's Square item) as `<cleaned title> (<binding>)`, since each binding is its own Square item. Books without Square ids are skipped (Payload-only).
- `applySquareWrites(client, writes, { dryRun }) → { written, conflicts, skipped }`: fetches current objects, applies only if the current Square value still equals the value the diff was computed from, and calls `BatchUpsertCatalogObjects` (≤100 per batch) with current `version`. On version mismatch it re-fetches and recomputes once, otherwise reports a conflict. It logs previous name/price/version to `IngramEnrichmentLog`.
- Called from `applyEnrichment` **before** the Payload write for the same book, under the `books-write` concurrency key.

- [ ] **Step 1: Failing tests:** a dry run calls no upsert; a version conflict leads to re-fetch and recompute; a value changed in Square since the diff is skipped (never clobber a staff change made in the POS); batching ≤100; a Square failure means no Payload write for that book; a Payload failure after Square success is left for the catalog sync to converge (assert no retry storm).
- [ ] **Step 2: Implement**, then verify, then commit: `feat(ingram): write price uplifts and title cleanup back to Square`.

### Task 21: Enrichment job, dry-run CLI, schedules

**Files:**
- Create: `alkebu-load/src/app/utils/ingram/runEnrichment.ts` (orchestrates Tasks 16 → 17 → 19 → 20)
- Create: `alkebu-load/scripts/ingram-enrich.ts` (`--dry-run` default; `--apply` explicit; `--limit N`)
- Modify: `alkebu-load/src/payload.config.ts`: tasks `ingram-enrich-titles` (weekly, Tue 14:00 UTC, after the 6 AM CT drop) and `ingram-enrich-descriptions` (monthly, first Mon 14:00 UTC), both with the exclusive concurrency key pattern from the Square jobs and gated by `ENABLE_JOB_AUTORUN`

**Interfaces:**
- `runEnrichment(payload, { files, dryRun, limit }) → RunSummary { runId, scanned, matched, unmatchedEans, parseErrors, byField: Record<path, Record<action, n>> }`. **Counts only, no titles or values**, so the summary can be shared safely.

- [ ] **Step 1: Failing tests:** a dry run writes nothing, the summary has no string values from records, and `--limit` bounds the books touched.
- [ ] **Step 2: Implement**, then verify (`pnpm test && pnpm check:types && pnpm build`).
- [ ] **Step 3: Commit:** `feat(ingram): scheduled catalog enrichment with dry-run CLI`.

### Task 22: Backfill rollout + termination purge (owner-run)

**Files:**
- Create: `alkebu-load/scripts/ingram-purge-metadata.ts`: reverts or clears every field whose `fieldSources` is `ingram` (restoring the logged previous value when it came from a non-Ingram source), deletes the Ingram log and review rows, and reports counts. Dry-run by default. This is required by agreement §6(c) if the subscription ends.
- Modify: `docs/launch.md`, `alkebu-load/CLAUDE.md` (env vars, jobs, AI restriction)

- [ ] **Step 1:** apply Task 18's SQL in production (owner, Coolify PG terminal) **before** deploying.
- [ ] **Step 2:** `tsx scripts/ingram-enrich.ts --dry-run`, owner-run; share **only** the summary counts. If `conflict` counts are in the hundreds for a field, revisit the policy before applying.
- [ ] **Step 3:** review the dry-run's **price-uplift** count and **title-cleanup** count (exact vs ambiguous vs disambiguation-kept). Tell staff that in-store prices will change.
- [ ] **Step 4:** `--apply --limit 50`; spot-check 5 PDPs (weight, pages, synopsis, title/subtitle), the same 5 items in Square POS (name and price), and the Shippo quote for one cart; then do a full apply.
- [ ] **Step 5:** work the review queue (bulk accept objective fields, eyeball descriptions).
- [ ] **Step 6:** test the purge script's dry run on a DB copy; confirm it reverses a sample book exactly.
- [ ] **Step 7: Commit:** `chore(ingram): enrichment rollout notes and termination purge`.

---

### Status (2026-11-05): real layouts in, scope adjusted to the licensed files

- The owner decided the vendor **format specs** (DeveloperSpecs/, the description and inventory guides) are not product or catalog data and may be read by Claude. Data files and `Samples/` are still owner-only; format checks on data report shapes and counts only.
- **Titles Basic** (guide v2 r6) has 25 pipe-delimited, unqualified fields: derived title (subtitle and "[With …]" accessory included), one contributor, binding, one BISAC subject heading, and publisher imprint. It has **no** price, publication date, pages, dimensions, weight, language or record date. The parser splits the derived title at the first ": ". Field 16 (BISAC heading) may carry unquoted pipes, so extra fields fold back into it, anchored on field 22 (Accessory Code, always three digits).
- **Price, publication date and weight** come from the Catalog Stock CSV. A 2026-11-05 delta (55,700 rows) wrote price and weight as decimals with 2 places, and dates as MM/DD/YYYY. The weekly titles job now reads the stock file by default (`INGRAM_ENRICH_WITH_STOCK_FILE=false` skips it).
- **Pages, dimensions and language** have no licensed source (they'd need the full Titles file), so they're never proposed.
- **Descriptions:** publisher marketing is fixed-width (EAN 1–13, length 14–18, text 19–end), and brief is `EAN|BD|length|text`. Each has its own layout. The Titles Basic annotation file is skipped by default because it holds only the first 100 characters.
- Remote names as listed on the server: `DESC_BKLST/PMALL_active.zip`, `PubDescripi/ingmmthy-13.zip`.
- `main` is merged into the branch. 811 tests pass.
- **Next (owner):** Task 22 Steps 1–5.

### Status (2026-11-11): enrichment branch ready to deploy

- `main` (`f85f0cb`) merged into `feat/ingram-enrichment`. Backend: 813 tests pass, `check:types`, `check:scripts` and `pnpm build` exit 0, lint 0 errors. Storefront: 48 tests pass. svelte-check shows only `$env/static/public` errors from the worktree having no `.env.local`.
- Drafted (not sent) a reply on Ingram Data Services ticket 5898468. It asks about the Stock Check add-on (Tasks 11/13/14), §3(c) query approval, the monthly hit limit, and storing cover images. No earlier question to Ingram was found in the owner's mail.
- **Compliance gap (spec §3(b)):** `alkebu-web/src/routes/terms-of-service` has no Ingram no-copy/no-redistribution clause. Add it before Phase 3 puts Ingram metadata on the site.
- **Owner rollout (Task 22), in order:**
  1. Open the tunnel (CLAUDE.md, "Reaching the production database") and run `scripts/add-ingram-enrichment-schema.sql` with `psql -v ON_ERROR_STOP=1 -f`. It is idempotent, so rerun it even if it was applied for the 2026-11-05 dry run. Expect `COMMIT`, then every row `ok = t` in the optional check at the bottom of the file.
  2. Merge `feat/ingram-enrichment` into `main`. Coolify auto-deploys. Leave `INGRAM_ENRICHMENT_ENABLED` unset for now.
  3. Dry run: `DATABASE_URI='postgresql://…@localhost:55433/alkebulan' pnpm ingram:enrich`. Share only the printed counts. Revisit the policy if any field has hundreds of `conflict`.
  4. Tell staff that in-store prices will rise where Ingram list is higher. Then run `pnpm ingram:enrich -- --apply --limit 50 --square` and spot-check 5 product pages, the same 5 items in Square POS, and one Shippo quote.
  5. Let the server do the full run rather than the tunnel (a full stock `--apply` over the tunnel dropped twice). Set `INGRAM_ENRICHMENT_ENABLED=true` and `INGRAM_ENRICHMENT_SQUARE_WRITEBACK=true` in Coolify. The weekly titles job (Tue 14:00 UTC) applies everything, and reruns are idempotent. The CLI has no resume flag; rerunning it skips books already done but downloads the files again.
  6. Work the review queue at `/admin/ingram-review`. Then run the description dry run (`pnpm ingram:enrich -- --job descriptions`) before the monthly job's first run.

## Companion: Edition Consolidation prerequisite *(decided and built 2026-10-02)*

Square stays one item per binding. Built on this branch, before any books are merged:

- **Schema:** `editions[].squareItemId` (text), **indexed but not unique**, because one Square item's variations can sit on two editions of the same book. The invariant "a Square item belongs to exactly one book" is enforced in a Books `beforeChange` hook (`squareItemOwnership.ts`). It only queries when a write adds an item id. The book-level `squareItemId` stays and marks the book's own item.
- **Backfill:** in `scripts/add-ingram-availability-schema.sql`. It copies `books.square_item_id` onto Square-linked editions with a NULL value, and is idempotent.
- **Catalog sync:** `findBookForSquareItem` checks the edition link, then the book-level link, then a variation on an unlinked or same-item edition. Two or more books in one step is a data error (unresolved), never a guess. `bookUpdateForSquareItem`: the book's own item updates title, price and editions as before; another item only reconciles its own editions.
- **`mergeEditions(existing, incoming, { squareItemId, bookSquareItemId })`:** only the synced item's editions can be flagged unavailable. Un-backfilled editions belong to the book-level item.
- **Tests:** unit tests plus integration tests 13–14 (a consolidated book across two items; the ownership guard).
- **Merging never edits Square.**

## Self-Review

**Spec coverage:** Availability resolution (Task 6/7), Web Service client + Query Type 9 + batching (Tasks 2/3/11), provider abstraction + mock (Task 4), schema fields (Task 5), scheduled refresh (Task 12), checkout confirm (Task 13), Stage-2 gated flow + Turnstile + demand logging (Tasks 8/10/14), fulfillment flag (Task 9), Square coexistence + clamp (Task 1), compliance/noindex (Tasks 10/14), go-live/volume (Task 15). Companion phases (Edition Consolidation, Merchandising Intelligence) are intentionally out of this plan — they get their own specs/plans. **No gaps.**

**Placeholder scan:** pure-logic tasks (1, 2, 3, 4, 6, 7, 8) carry full code + tests. Integration/UI tasks (9, 10, 11–15) give exact files, interfaces (signatures), and test intent; their internal code follows the cited existing patterns (jobs.tasks, Turnstile verify, OrderDashboard tabs) rather than inventing unverifiable markup — acceptable because they are credential-gated and pattern-bound, not logic placeholders.

**Type consistency:** `IngramStock`/`DcStock` (Task 2) consumed unchanged in Tasks 3/11/12; `AvailabilityProvider`/`LongTailResult` (Task 4) consumed in Tasks 10/11/14; `ResolvedAvailability` (Task 6) consumed in Tasks 7/13; edition fields (Task 5) consumed in Tasks 6/7/12. Names consistent across tasks.

**Phase 3 (2026-10-02):** covers every element of the spec's enrichment section: FTP-only source and stream-filter (16), parsers (17), provenance and manual protection (18), policy table and diff (19), transactional apply, audit log and review (20), price uplift and title cleanup with Square write-back (19, 20b), scheduled job and counts-only reporting (21), rollout and §6(c) purge (22). Cover images are deliberately excluded pending Ingram's answer. Owner-dependent steps: column transcription (17.1) and all live runs (22).

**Amendments 2026-07-16** (after reviewing the Ingram FTP inventory package — see the Amendments section up top): Task 2b added (StockV2 fixed-width parser; test assertions verified against record 1 of the vendor sample); `IngramStock` gained `onSaleDate` (Task 2); Task 3's `isIngramAvailable` is now code-first with an On-Sale-Date gate; the mock provider emits prodstat codes; Task 12 documented as transport-agnostic with an FTP stream-filter alternative; Phase 2 may split go-live if FTP credentials land first. `StockV2Record` (Task 2b) extends `IngramStock`, so all existing consumers are unaffected.
