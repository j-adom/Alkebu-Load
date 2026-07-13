# Wellness Activation Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the four house-made wellness lines (Whipped Shea Butter, Scented Oil, Soaps, Raw Butters — $94,862/yr of proven in-store demand) on the storefront, behind a human curation gate.

**Architecture:** Square stays the source of truth for price and stock; Payload owns images, copy, slug, and a `publishOnline` gate that defaults to `false`. Sync is strictly one-directional (Square → Payload). Scent is a variant axis, so 191 SKUs collapse to ~35 product pages.

**Tech Stack:** Payload CMS 3.x on Next.js 15, PostgreSQL (prod) / SQLite (dev), `pnpm`, `node:test` + `node:assert`, `tsx` for standalone scripts, SvelteKit 5 storefront.

**Spec:** `docs/superpowers/specs/2026-07-13-wellness-activation-design.md`

## Global Constraints

- Package manager is **`pnpm`** in `alkebu-load/`, **`npm`** in `alkebu-web/`. Never mix.
- Tests run via `pnpm test` (Node test runner over `tests/**/*.test.ts`). The script already injects `STRIPE_SECRET_KEY=sk_test_dummy` — Stripe SDK initializes at module load, so tests fail without it.
- **Wellness and oils prices are stored in CENTS**, matching Square's `price_money.amount` exactly. Never inferred.
- After ANY collection schema change, run `pnpm generate:types` to regenerate `src/payload-types.ts`.
- Production builds fail on type/lint errors. Run `pnpm lint` and `pnpm build` before declaring a task done.
- `publishOnline` defaults to `false`. No task may default it to `true` or set it programmatically.
- Payload REST `select` uses **bracket syntax** (`select[slug]=true`). The comma form is silently ignored.

---

## Background: the bug Task 1 fixes

`alkebu-load/src/app/utils/cartProductDetails.ts:18-25` currently reads:

```ts
const normalizePriceToCents = (value: unknown): number | null => {
  const amount = asFiniteNumber(value);
  if (amount === null) return null;
  // Existing book prices are stored in cents, while apparel data is stored in dollars.
  return Math.round(amount >= 1000 ? amount : amount * 100);
};
```

This guesses the unit from the magnitude of the number. Two live consequences:

1. A wellness price stored in cents — `999` for a $9.99 shea butter — is below the 1000 threshold, so it gets multiplied by 100 and becomes **$999.00**.
2. `WellnessLifestyle` and `OilsIncense` have **no `price` field at all** yet are already in the polymorphic cart relationship (`CartItems.product.relationTo`). `resolveCartProductUnitPrice` ends in `?? 0`, so a wellness item added to a cart today prices at **$0.00**.

Both are currently masked only because the collections are empty. Task 1 replaces the magnitude guess with an explicit per-collection unit table and makes an unresolvable price fail loudly.

---

## File Structure

**Create:**
- `alkebu-load/src/app/utils/productPricing.ts` — explicit per-collection price units. One responsibility: convert a stored price to cents, given the collection it came from.
- `alkebu-load/src/app/utils/wellnessProductLines.ts` — the reviewed Square-item → product-line mapping table and its lookup function.
- `alkebu-load/scripts/import-wellness-from-square.ts` — idempotent Square → Payload importer.
- `alkebu-load/scripts/backfill-wellness-shipping-weights.ts` — packaging-based weight defaults.
- `alkebu-load/tests/cart/productPricing.test.ts`
- `alkebu-load/tests/import/wellnessProductLines.test.ts`
- `alkebu-web/src/lib/components/Shop/VariantPicker.svelte` — scent/size selector.

**Modify:**
- `alkebu-load/src/app/utils/cartProductDetails.ts` — wellness variation resolver; use explicit units.
- `alkebu-load/src/app/utils/cartOperations.ts:355` — pass `productType` into the price resolver.
- `alkebu-load/src/collections/WellnessLifestyle.ts` — commerce fields.
- `alkebu-load/src/collections/OilsIncense.ts` — commerce fields.
- `alkebu-load/src/app/api/webhooks/square-catalog/route.ts:502` — extend stock sync to wellness/oils.
- `alkebu-load/tests/cart/cartProductDetails.test.ts` — update for new signature.
- `alkebu-web/src/routes/shop/+page.svelte:36-42` — flip Health & Beauty card to `enabled: true`.

---

### Task 1: Explicit price units (closes the $0.00 and $999.00 bugs)

Pure functions, no schema dependency. Do this first — it fixes a live latent bug independent of everything else.

**Files:**
- Create: `alkebu-load/src/app/utils/productPricing.ts`
- Create: `alkebu-load/tests/cart/productPricing.test.ts`
- Modify: `alkebu-load/src/app/utils/cartProductDetails.ts`
- Modify: `alkebu-load/src/app/utils/cartOperations.ts:355`
- Modify: `alkebu-load/tests/cart/cartProductDetails.test.ts`

**Interfaces:**
- Produces: `toCents(value: unknown, collection: string): number | null`, `PRICE_UNITS: Record<string, 'cents' | 'dollars'>`, and a changed signature `resolveCartProductUnitPrice(product, productType: string, customization?)`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test**

Create `alkebu-load/tests/cart/productPricing.test.ts`:

```ts
import assert from 'node:assert';
import test from 'node:test';

import { toCents } from '../../src/app/utils/productPricing';

test('wellness prices are cents and are never scaled', () => {
  // The old magnitude heuristic turned 999 into 99900 ($999.00). Guard against it.
  assert.strictEqual(toCents(999, 'wellness-lifestyle'), 999);
  assert.strictEqual(toCents(1499, 'wellness-lifestyle'), 1499);
  assert.strictEqual(toCents(699, 'oils-incense'), 699);
});

test('apparel prices are dollars and are scaled to cents', () => {
  assert.strictEqual(toCents(25, 'fashion-jewelry'), 2500);
  // A pricey apparel item: the old heuristic read 1200 as cents ($12.00).
  assert.strictEqual(toCents(1200, 'fashion-jewelry'), 120000);
});

test('book prices are already cents', () => {
  assert.strictEqual(toCents(1799, 'books'), 1799);
});

test('unknown collections and non-numbers return null rather than guessing', () => {
  assert.strictEqual(toCents(10, 'not-a-collection'), null);
  assert.strictEqual(toCents(undefined, 'wellness-lifestyle'), null);
  assert.strictEqual(toCents('12.99', 'wellness-lifestyle'), null);
  assert.strictEqual(toCents(NaN, 'books'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd alkebu-load && pnpm test`
Expected: FAIL — `Cannot find module '../../src/app/utils/productPricing'`

- [ ] **Step 3: Write minimal implementation**

Create `alkebu-load/src/app/utils/productPricing.ts`:

```ts
/**
 * Price units are declared per collection, never inferred.
 *
 * The previous implementation guessed from magnitude (`amount >= 1000 ? cents : dollars`),
 * which mis-priced any cents value below $10.00 and any dollars value above $1000.
 */
export const PRICE_UNITS: Record<string, 'cents' | 'dollars'> = {
  books: 'cents',
  'fashion-jewelry': 'dollars',
  'wellness-lifestyle': 'cents',
  'oils-incense': 'cents',
};

export const toCents = (value: unknown, collection: string): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;

  const unit = PRICE_UNITS[collection];
  if (!unit) return null;

  return Math.round(unit === 'dollars' ? value * 100 : value);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd alkebu-load && pnpm test`
Expected: PASS (4 new tests)

- [ ] **Step 5: Add the wellness variation resolver + wire explicit units into the cart**

Wellness variations cannot reuse `resolveFashionVariation`: that helper matches `variation.size` as **text**, but wellness `variations[].size` is a **group** (`{ volume, unit }`). Wellness selection is keyed on SKU / Square variation id instead.

In `alkebu-load/src/app/utils/cartProductDetails.ts`, add near the other resolvers:

```ts
import { toCents } from './productPricing';

const WELLNESS_COLLECTIONS = new Set(['wellness-lifestyle', 'oils-incense']);

const resolveWellnessVariation = (product: any, customization?: Customization) => {
  if (!Array.isArray(product?.variations) || product.variations.length === 0) {
    return null;
  }

  const requestedSku = customization?.variationSku;
  if (requestedSku) {
    const bySku = product.variations.find((variation: any) =>
      matchesText(variation?.sku, requestedSku),
    );
    if (bySku) return bySku;
  }

  const requestedVariationId = customization?.squareVariationId;
  if (requestedVariationId) {
    const byId = product.variations.find((variation: any) =>
      matchesText(variation?.squareVariationId, requestedVariationId),
    );
    if (byId) return byId;
  }

  // Single-variation products (most soaps, raw butters) need no selection.
  return product.variations.length === 1 ? product.variations[0] : null;
};
```

Then replace `resolveCartProductUnitPrice` (currently at lines 126-145) entirely with:

```ts
export const resolveCartProductUnitPrice = (
  product: any,
  productType: string,
  customization?: Customization,
): number => {
  if (WELLNESS_COLLECTIONS.has(productType)) {
    const variation = resolveWellnessVariation(product, customization);
    const price = toCents(variation?.price, productType);

    if (price === null) {
      // Never fall through to 0 — a $0.00 line item is a silent revenue loss.
      throw new Error(
        `Cannot resolve price for ${productType} product ${product?.id ?? '(unknown)'}: ` +
          `no variation matched (sku=${customization?.variationSku ?? 'none'}) or variation has no price.`,
      );
    }

    return price;
  }

  const bookEdition = resolveBookEdition(product, customization);
  const fashionVariation = resolveFashionVariation(product, customization);
  const hasBookPricing =
    bookEdition?.pricing?.retailPrice !== undefined ||
    product?.pricing?.retailPrice !== undefined;

  const price =
    (hasBookPricing
      ? normalizeBookPriceToCents(bookEdition?.pricing?.retailPrice) ??
        normalizeBookPriceToCents(product?.pricing?.retailPrice)
      : null) ??
    toCents(fashionVariation?.price, productType) ??
    toCents(product?.price, productType);

  if (price === null) {
    console.error(
      `[cart] Unresolvable price for ${productType} product ${product?.id ?? '(unknown)'}; ` +
        `falling back to 0. This is a bug.`,
    );
    return 0;
  }

  return price;
};
```

Delete the now-unused `normalizePriceToCents` helper (lines 18-25).

> **Deliberate asymmetry:** wellness/oils **throw** on an unresolvable price (new code path, zero regression risk), while books/apparel log loudly and preserve the existing `0` fallback. Widening the throw to all collections is correct but is a behavior change to live checkout — track it as a follow-up, don't smuggle it in here.

Extend the `customization` type in `alkebu-load/src/app/utils/cartOperations.ts:162-166` so variant selection type-checks:

```ts
  customization?: {
    giftWrap?: boolean;
    giftMessage?: string;
    personalNote?: string;
    variationSku?: string;
    squareVariationId?: string;
  };
```

And update the call site at `cartOperations.ts:355` to pass the product type:

```ts
      const unitPrice = resolveCartProductUnitPrice(product, item.productType, item.customization);
```

- [ ] **Step 6: Update the existing cart tests for the new signature**

In `alkebu-load/tests/cart/cartProductDetails.test.ts`, the three existing `resolveCartProductUnitPrice` calls (lines 31, 42, 51) now need a `productType`. Line 31 is a book, lines 42 and 51 are apparel:

```ts
  assert.strictEqual(resolveCartProductUnitPrice(product, 'books', customization), 1799);
```

```ts
  assert.strictEqual(resolveCartProductUnitPrice(product, 'fashion-jewelry'), 2500);
```

Then append the new wellness cases:

```ts
test('wellness cart details resolve the chosen scent variation and keep cents', () => {
  const product = {
    id: 'wl_1',
    name: 'Whipped Shea Butter',
    variations: [
      { sku: 'WSB-BLACKWOMAN-4OZ', scent: 'Black Woman', price: 1499, squareVariationId: 'SQ_A' },
      { sku: 'WSB-MANGO-4OZ', scent: 'Mango Butter', price: 1499, squareVariationId: 'SQ_B' },
      { sku: 'WSB-PINKSUGAR-8OZ', scent: 'Pink Sugar', price: 2499, squareVariationId: 'SQ_C' },
    ],
  };

  assert.strictEqual(
    resolveCartProductUnitPrice(product, 'wellness-lifestyle', { variationSku: 'WSB-PINKSUGAR-8OZ' }),
    2499,
  );
  // Selection by Square variation id also works.
  assert.strictEqual(
    resolveCartProductUnitPrice(product, 'wellness-lifestyle', { squareVariationId: 'SQ_A' }),
    1499,
  );
});

test('single-variation wellness products need no explicit selection', () => {
  const product = {
    id: 'wl_2',
    name: 'Yadain Bar Soap',
    variations: [{ sku: 'YADAIN-BAR', price: 899, squareVariationId: 'SQ_Y' }],
  };

  assert.strictEqual(resolveCartProductUnitPrice(product, 'wellness-lifestyle'), 899);
});

test('an unmatched wellness variation throws instead of pricing at zero', () => {
  const product = {
    id: 'wl_3',
    name: 'Scented Oil',
    variations: [
      { sku: 'OIL-EGYPTIANMUSK-1OZ', price: 1299, squareVariationId: 'SQ_M' },
      { sku: 'OIL-PINKSUGAR-1OZ', price: 1299, squareVariationId: 'SQ_P' },
    ],
  };

  assert.throws(
    () => resolveCartProductUnitPrice(product, 'wellness-lifestyle', { variationSku: 'NOPE' }),
    /Cannot resolve price/,
  );
  // The pre-fix behavior — silently returning 0 — must never come back.
  assert.throws(() => resolveCartProductUnitPrice(product, 'wellness-lifestyle'), /Cannot resolve price/);
});
```

- [ ] **Step 7: Run the full suite**

Run: `cd alkebu-load && pnpm test && pnpm lint`
Expected: PASS, no lint errors. Confirm the pre-existing cart tests still pass (the apparel dollar→cent path must be unchanged).

- [ ] **Step 8: Commit**

```bash
git add alkebu-load/src/app/utils/productPricing.ts \
        alkebu-load/src/app/utils/cartProductDetails.ts \
        alkebu-load/src/app/utils/cartOperations.ts \
        alkebu-load/tests/cart/productPricing.test.ts \
        alkebu-load/tests/cart/cartProductDetails.test.ts
git commit -m "fix(cart): declare price units per collection instead of guessing by magnitude

The old normalizePriceToCents guessed the unit from the number's size
(>= 1000 => cents, else dollars). That mis-prices any cents value under
\$10.00 and any dollars value over \$1000. It also left wellness — already
wired into the polymorphic cart relationship but with no price field —
resolving to \$0.00.

Units are now declared per collection. Wellness/oils resolve their chosen
variation by SKU or Square variation id, in cents, and throw rather than
fall through to a zero-priced line item."
```

---

### Task 2: Commerce fields on WellnessLifestyle + OilsIncense

**Files:**
- Modify: `alkebu-load/src/collections/WellnessLifestyle.ts`
- Modify: `alkebu-load/src/collections/OilsIncense.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: fields `slug`, `publishOnline`, `heroImage`, `scentFamily` (top level); `price`, `stock`, `weight` inside `variations[]`. Task 1's resolver reads `variations[].price`; Task 4 writes all of them; Task 5 writes `variations[].stock`; Task 6 writes `variations[].weight`.

Mirror the field shapes already proven in `alkebu-load/src/collections/FashionJewelry.ts` (`slug` at line 21, `price` at line 43, `weight` at line 471).

- [ ] **Step 1: Add top-level commerce fields to both collections**

Add to the `fields` array of **both** `WellnessLifestyle.ts` and `OilsIncense.ts`:

```ts
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'URL slug, e.g. "whipped-shea-butter". Auto-generated from name if blank.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) =>
            value ||
            (data?.name || '')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, ''),
        ],
      },
    },
    {
      name: 'publishOnline',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'OFF by default. Square carries bulk supply SKUs and miscategorized items ' +
          '(a djembe drum and a line item named "Shipping" are both filed under wellness). ' +
          'A human must confirm each product before it reaches the storefront.',
      },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Primary product photo. Pre-optimize before upload — Media has no imageSizes.',
      },
    },
```

`OilsIncense` already has `scentFamily` (line 59). Add the same select to `WellnessLifestyle`, copying the exact `options` array from `OilsIncense.ts:59-79` so the two collections filter identically.

- [ ] **Step 2: Add commerce fields inside `variations[]` on both collections**

In `WellnessLifestyle.ts` the `variations` array is at line 298; in `OilsIncense.ts` at line 80. Add to the `fields` array of **each**:

```ts
        {
          name: 'price',
          type: 'number',
          required: true,
          min: 0,
          admin: {
            description: 'Price in CENTS (matches Square price_money.amount). 1499 = $14.99.',
          },
        },
        {
          name: 'stock',
          type: 'number',
          defaultValue: 0,
          min: 0,
          admin: {
            description: 'On-hand count. Overwritten by the Square inventory webhook.',
          },
        },
        {
          name: 'weight',
          type: 'number',
          min: 0,
          admin: {
            description: 'Shipped weight in OUNCES, including packaging. Shippo mis-rates without it.',
          },
        },
```

- [ ] **Step 3: Delete the dead `medusaVariantId` field**

Remove it from `WellnessLifestyle.ts:425-430` and `OilsIncense.ts:139-144`. MedusaJS was dropped from the architecture; the field is unreferenced.

Verify nothing depends on it:

Run: `cd alkebu-load && grep -rn "medusaVariantId" src/ scripts/ tests/`
Expected: no results after the edit.

- [ ] **Step 4: Regenerate types and verify the build**

Run: `cd alkebu-load && pnpm generate:types && pnpm lint && pnpm build`
Expected: `src/payload-types.ts` now shows `price`, `stock`, `weight` on both collections' variations, and `publishOnline` / `slug` / `heroImage` at top level. Build exits 0.

> **Production note:** adding fields is a schema migration. Per the "Payload plugins add schema even when disabled" incident (July 5), generate the DDL and apply it via the Coolify Postgres terminal before deploying — the Tailscale DB is unreachable from WSL.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/collections/WellnessLifestyle.ts \
        alkebu-load/src/collections/OilsIncense.ts \
        alkebu-load/src/payload-types.ts
git commit -m "feat(wellness): add commerce fields to WellnessLifestyle and OilsIncense

Both collections were content schemas (concentration, scentFamily, sageBlend)
with no price, stock, weight, or slug — yet both were already wired into the
polymorphic cart relationship.

Adds slug, publishOnline (default false), heroImage, scentFamily at top level
and price (cents), stock, weight (oz) inside variations[]. Drops the dead
medusaVariantId field; Medusa was dropped from the architecture."
```

---

### Task 3: Product-line mapping table

191 Square SKUs collapse to ~35 product pages. This is a **reviewed table, not a regex** — an exploratory regex during research misfiled a Mali Djembe as a supplement. That failure mode is unacceptable on a page that takes money.

**Files:**
- Create: `alkebu-load/src/app/utils/wellnessProductLines.ts`
- Create: `alkebu-load/tests/import/wellnessProductLines.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `matchProductLine(squareItemName: string): ProductLineMatch | null` and the `PRODUCT_LINES` table. Task 4 calls `matchProductLine` for every Square item and skips `null`.

```ts
export interface ProductLineMatch {
  lineKey: string;        // stable id, e.g. 'whipped-shea-butter'
  lineName: string;       // display, e.g. 'Whipped Shea Butter'
  collection: 'wellness-lifestyle' | 'oils-incense';
  variantLabel: string;   // e.g. 'Black Woman' — the scent, or the size, or '' for single-variant
  variantAxis: 'scent' | 'size' | 'none';
}
```

- [ ] **Step 1: Write the failing test**

Create `alkebu-load/tests/import/wellnessProductLines.test.ts`:

```ts
import assert from 'node:assert';
import test from 'node:test';

import { matchProductLine } from '../../src/app/utils/wellnessProductLines';

test('whipped shea butter SKUs collapse to one line with the scent as the variant', () => {
  const match = matchProductLine('Whipped Shea Butter Black Woman');
  assert.strictEqual(match?.lineKey, 'whipped-shea-butter');
  assert.strictEqual(match?.collection, 'wellness-lifestyle');
  assert.strictEqual(match?.variantAxis, 'scent');
  assert.strictEqual(match?.variantLabel, 'Black Woman');

  assert.strictEqual(matchProductLine('Whipped Shea Butter Mango Butter')?.lineKey, 'whipped-shea-butter');
  assert.strictEqual(matchProductLine('Whipped Shea Butter Pink Sugar')?.variantLabel, 'Pink Sugar');
});

test('scented oils collapse to one line, including the "type" naming convention', () => {
  assert.strictEqual(matchProductLine('Egyptian Musk Scented Oil')?.lineKey, 'scented-oil');
  assert.strictEqual(matchProductLine('Egyptian Musk Scented Oil')?.variantLabel, 'Egyptian Musk');
  assert.strictEqual(matchProductLine('Egyptian Musk Scented Oil')?.collection, 'oils-incense');

  // The top seller (2,259 units) uses the bare "<scent> type" convention.
  assert.strictEqual(matchProductLine('Mr. Obama type')?.lineKey, 'scented-oil');
  assert.strictEqual(matchProductLine('Mr. Obama type')?.variantLabel, 'Mr. Obama');
});

test('soaps are distinct products, not scent variants of one soap', () => {
  const yadain = matchProductLine('Yadain Bar Soap');
  const sunaroma = matchProductLine('Sunaroma with Shea Butter & Vitamin E Oil Soap Bar 8 oz');

  assert.strictEqual(yadain?.variantAxis, 'none');
  assert.notStrictEqual(yadain?.lineKey, sunaroma?.lineKey);
});

test('same soap in two sizes is one product with a size variant', () => {
  const lb = matchProductLine('Raw Black Soap LB');
  const halfLb = matchProductLine('Raw Black Soap 1/2 LB');

  assert.strictEqual(lb?.lineKey, halfLb?.lineKey);
  assert.strictEqual(lb?.variantAxis, 'size');
  assert.strictEqual(lb?.variantLabel, '1 lb');
  assert.strictEqual(halfLb?.variantLabel, '1/2 lb');
});

test('ingredient words in a Phase 1 product name do not trigger exclusion', () => {
  // Regression: an earlier draft excluded /\bhoney\b/ to keep Phase 2 tonics out, which
  // silently dropped this $2,572/yr soap — the #2 soap by revenue. Exclude by product
  // shape, never by ingredient.
  const bar = matchProductLine('Turmeric, Lemon, Honey & Kojic Facial Bar');
  assert.strictEqual(bar?.lineKey, 'turmeric-kojic-facial-bar');
  assert.strictEqual(bar?.variantAxis, 'none');
});

test('a size-suffixed soap is not eaten by the bulk guard', () => {
  // Regression: "Raw Black Soap 1/2 LB" contains "2 LB", which the bulk guard's
  // \d+\s*lb pattern matches. Anchored allow-list entries must be checked BEFORE the guard.
  assert.strictEqual(matchProductLine('Raw Black Soap 1/2 LB')?.lineKey, 'raw-black-soap');
  assert.strictEqual(matchProductLine('Raw Black Soap 1/2 LB')?.variantLabel, '1/2 lb');
});

test('bulk supply, packaging, and miscategorized items are excluded', () => {
  // Bulk / raw materials the store blends with — never sellable online.
  assert.strictEqual(matchProductLine('25lb Box Shea Butter'), null);
  assert.strictEqual(matchProductLine('1 lb Fragrance Oil'), null);
  assert.strictEqual(matchProductLine('5 Gallon BPA Free Bottle w/no Spout'), null);
  assert.strictEqual(matchProductLine('1oz Oil Bottle Diamond Cut - 2 Dozen'), null);

  // Genuinely miscategorized in Square, found during the catalog audit.
  assert.strictEqual(matchProductLine('Mali Djembe'), null);
  assert.strictEqual(matchProductLine('Mud Cloth Bucket Hat'), null);
  assert.strictEqual(matchProductLine('Shipping'), null);

  // Phase 2 — deferred deliberately (perishable / regulatory).
  assert.strictEqual(matchProductLine('Seamoss World Gel'), null);
  assert.strictEqual(matchProductLine('AIH Blood Pressure'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd alkebu-load && pnpm test`
Expected: FAIL — `Cannot find module '../../src/app/utils/wellnessProductLines'`

- [ ] **Step 3: Write the implementation**

Create `alkebu-load/src/app/utils/wellnessProductLines.ts`:

```ts
export interface ProductLineMatch {
  lineKey: string;
  lineName: string;
  collection: 'wellness-lifestyle' | 'oils-incense';
  variantLabel: string;
  variantAxis: 'scent' | 'size' | 'none';
}

/**
 * Phase 1 covers four house-made lines only. Everything else — bulk supply SKUs,
 * miscategorized items, and the deferred Sea Moss / Bitters families — returns null.
 *
 * This is an allow-list on purpose. Square's wellness tree contains a djembe drum,
 * a bucket hat, and a line item named "Shipping"; its categories cannot be trusted
 * as a publish signal.
 */

/**
 * Guards the two LOOSE scent patterns below against bulk supply and packaging SKUs.
 *
 * This list covers bulk/packaging/miscategorized items ONLY. It deliberately does NOT
 * list the deferred Phase 2 families (Sea Moss, Bitters/Tonics) — the allow-list below
 * is anchored, so anything not explicitly named already returns null.
 *
 * Excluding by ingredient word is a trap: an earlier draft had /\bhoney\b/ to keep the
 * Phase 2 tonics out, which silently dropped "Turmeric, Lemon, Honey & Kojic Facial Bar" —
 * a $2,572/yr Phase 1 soap. Exclude by *product shape*, never by ingredient.
 */
const BULK_OR_PACKAGING = [
  /\b\d+\s*(lb|lbs|gallon|gal|liter|litre)\s*(box|bottle|jug)?\b/i, // "25lb Box Shea Butter", "3 Gallon BPA Free Bottle"
  /\bbottle\b/i,                              // empty containers: "1oz Oil Bottle single"
  /\bdozen|gross|bulk\b/i,
  /\bdiamond cut|swirl|spout|roll-on\b/i,
  /^\s*shipping\s*$/i,
  /\bdjembe|bucket hat|rug|shower curtain\b/i,
  /^\d+\s*lb\s+fragrance oil$/i,              // "1 lb Fragrance Oil" — blending stock
];

const SIZE_LABELS: Record<string, string> = {
  lb: '1 lb',
  'l b': '1 lb',
  '1/2 lb': '1/2 lb',
};

// Distinct soap products. Each is its own line; some carry a size variant.
const SOAPS: Array<{ key: string; name: string; pattern: RegExp }> = [
  { key: 'raw-black-soap', name: 'Raw Black Soap', pattern: /^raw black soap\b/i },
  { key: 'yadain-bar-soap', name: 'Yadain Bar Soap', pattern: /^yadain bar soap$/i },
  { key: 'turmeric-kojic-facial-bar', name: 'Turmeric, Lemon, Honey & Kojic Facial Bar', pattern: /^turmeric, lemon, honey & kojic facial bar$/i },
  { key: 'sunaroma-shea-vitamin-e', name: 'Sunaroma Shea Butter & Vitamin E Soap Bar', pattern: /^sunaroma with shea butter/i },
  { key: 'gye-nyame-blackseed-soap', name: 'Gye Nyame Blackseed Soap', pattern: /^gye nyame blackseed soap$/i },
  { key: 'zuresh-black-shea-detox', name: 'Zuresh Black & Shea Detox Soap', pattern: /^zuresh black & shea detox soap$/i },
  { key: 'zuresh-whipped-olive-bar', name: 'Zuresh Whipped Olive Bar', pattern: /^zuresh whipped olive bar$/i },
  { key: 'essencetree-turmeric-sea-buckthorn', name: 'EssenceTree Turmeric & Sea Buckthorn Soap', pattern: /^essencetree turmeric & sea buckthorn soap$/i },
  { key: 'african-liquid-black-soap', name: 'African Liquid Black Soap', pattern: /^african liquid black soap$/i },
  { key: 'turmeric-soap', name: 'Turmeric Soap', pattern: /^turmeric soap$/i },
  { key: 'erzuli-black-soap-bar', name: 'Erzuli Black Soap Bar', pattern: /^erzuli black soap bar$/i },
  { key: 'african-black-soap-shea-aloe', name: 'African Black Soap — Shea Butter & Aloe Vera', pattern: /^african black soap - shea butter & aloe vera$/i },
  { key: 'yoni-soap-acv', name: 'Feminine Wash w/ Apple Cider Vinegar Yoni Soap', pattern: /^feminine wash w\/ apple cider vinegar yoni soap$/i },
];

// Distinct raw butters. No variant axis.
const RAW_BUTTERS: Array<{ key: string; name: string; pattern: RegExp }> = [
  { key: 'raw-shea-butter', name: 'Raw Shea Butter', pattern: /^raw shea butter$/i },
  { key: 'natural-raw-mango-butter', name: 'Natural Raw Mango Butter', pattern: /^natural raw mango butter$/i },
  { key: 'cocoa-butter-vitamin-e', name: 'Cocoa Butter with Vitamin E', pattern: /^cocoa butter w\/ vitamin e$/i },
];

export const matchProductLine = (squareItemName: string): ProductLineMatch | null => {
  const name = (squareItemName || '').trim();
  if (!name) return null;

  // ORDER MATTERS. The anchored allow-lists (soaps, raw butters) run FIRST, before the
  // bulk guard. "Raw Black Soap 1/2 LB" contains "2 LB" and would otherwise be eaten by
  // the guard's \d+\s*lb pattern. Anchored names are already unambiguous — they need no guard.

  // 1. Soaps — distinct products; Raw Black Soap additionally has a size axis.
  for (const soap of SOAPS) {
    if (!soap.pattern.test(name)) continue;

    if (soap.key === 'raw-black-soap') {
      const half = /1\/2\s*lb/i.test(name);
      return {
        lineKey: soap.key,
        lineName: soap.name,
        collection: 'wellness-lifestyle',
        variantLabel: half ? SIZE_LABELS['1/2 lb'] : SIZE_LABELS.lb,
        variantAxis: 'size',
      };
    }

    return {
      lineKey: soap.key,
      lineName: soap.name,
      collection: 'wellness-lifestyle',
      variantLabel: '',
      variantAxis: 'none',
    };
  }

  // 2. Raw butters — distinct products, no variants.
  for (const butter of RAW_BUTTERS) {
    if (butter.pattern.test(name)) {
      return {
        lineKey: butter.key,
        lineName: butter.name,
        collection: 'wellness-lifestyle',
        variantLabel: '',
        variantAxis: 'none',
      };
    }
  }

  // Only the LOOSE patterns below need the bulk/packaging guard.
  if (BULK_OR_PACKAGING.some((pattern) => pattern.test(name))) return null;

  // 3. Whipped Shea Butter — scent is the variant axis (loose tail).
  const shea = /^whipped shea butter\s+(.+)$/i.exec(name);
  if (shea) {
    return {
      lineKey: 'whipped-shea-butter',
      lineName: 'Whipped Shea Butter',
      collection: 'wellness-lifestyle',
      variantLabel: shea[1].trim(),
      variantAxis: 'scent',
    };
  }

  // 4. Scented Oil — scent is the variant axis. Two naming conventions in Square:
  //    "<Scent> Scented Oil" and the bare "<Scent> type" (the top seller, 2,259 units).
  const scented = /^(.+?)\s+scented oil$/i.exec(name);
  const typeOil = /^(.+?)\s+type$/i.exec(name);
  const oilScent = scented?.[1] ?? typeOil?.[1];
  if (oilScent) {
    return {
      lineKey: 'scented-oil',
      lineName: 'Scented Oil',
      collection: 'oils-incense',
      variantLabel: oilScent.trim(),
      variantAxis: 'scent',
    };
  }

  // Not in Phase 1. The allow-list is anchored, so Sea Moss, Bitters/Tonics, and every
  // other deferred or unknown item falls through to null without needing an exclusion rule.
  return null;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd alkebu-load && pnpm test`
Expected: PASS (5 new tests)

- [ ] **Step 5: Dry-run the table against the real Square catalog**

Before trusting the table, print what it matches and — more importantly — what it drops. Silent truncation reads as "covered everything" when it didn't.

Write a throwaway script that pulls the Square wellness tree (see the audit approach in the spec) and prints, for every item: name → `lineKey` or `EXCLUDED`. Manually read the excluded list. Any *sellable* product in the excluded list is a table bug; fix the table, not the test.

Expected: ~191 items match across ~35 lines; the excluded list contains only bulk supply, packaging, miscategorized items, and the deferred Phase-2 families.

- [ ] **Step 6: Commit**

```bash
git add alkebu-load/src/app/utils/wellnessProductLines.ts \
        alkebu-load/tests/import/wellnessProductLines.test.ts
git commit -m "feat(wellness): add reviewed Square item -> product line mapping

An allow-list, not a heuristic. Square's wellness tree contains a djembe drum,
a mud cloth bucket hat, and a line item named 'Shipping', plus bulk supply SKUs
(25lb Box Shea Butter, 5 Gallon BPA Free Bottle) that must never be sold online.

Collapses 191 Phase 1 SKUs into ~35 product lines: scent is the variant axis for
Whipped Shea Butter and Scented Oil; soaps and raw butters are distinct products.
Sea Moss (perishable) and Bitters/Tonics (regulatory) are excluded by design."
```

---

### Task 4: Square → Payload import script

**Files:**
- Create: `alkebu-load/scripts/import-wellness-from-square.ts`

**Interfaces:**
- Consumes: `matchProductLine` / `ProductLineMatch` from Task 3; the schema fields from Task 2.
- Produces: populated `wellness-lifestyle` and `oils-incense` documents, upserted on `slug` (== `lineKey`), each with `variations[]` carrying `sku`, `scent`, `price` (cents), `stock`, `squareItemId`, `squareVariationId`. All left at `publishOnline: false`.

- [ ] **Step 1: Write the script**

Create `alkebu-load/scripts/import-wellness-from-square.ts`. Model the Payload bootstrap on the existing `scripts/import-square-to-payload.ts`.

```ts
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { matchProductLine, type ProductLineMatch } from '../src/app/utils/wellnessProductLines'

// The Square wellness/oils category tree (from the catalog audit).
const CATEGORY_IDS = [
  '6LSVL2XWVFKVKMIHJUZGVI35', // Health & Wellness
  'MLL5J7VLSPWJRT4OX5SZ4Z5V', // Nutrition
  'KVKKAD53DMSLVTMVH4CFL7LU', // Hair & Skincare
  'OYJXH3GRV6BAOFFD36YBP6UB', // Skincare
  'A4EKDSWHNJTNU35SHTFIIQNK', // Shea Butter
  'XLJ6GDZ225D2XENLZSM2QTGM', // Soaps
  'TLA45UGMDFF47DWXMSIMXCYN', // Lotions
  'ONNOCCEW6JQ3KJJZXSK3EMZZ', // Body Butters & Oils
  'DYGPHUQUGYTWXRIDXWFFCKY4', // Hair Products
  'HOTU26XFEIY5AZ4M22JPR7CE', // Incense & Oils
]

const COMMIT = process.argv.includes('--commit')

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

interface SquareVariation {
  id: string
  item_variation_data?: {
    name?: string
    sku?: string
    price_money?: { amount?: number }
  }
}

interface SquareItem {
  id: string
  item_data?: { name?: string; description?: string; variations?: SquareVariation[] }
}

async function fetchSquareItems(): Promise<SquareItem[]> {
  const items: SquareItem[] = []
  let cursor: string | undefined

  do {
    const res = await fetch('https://connect.squareup.com/v2/catalog/search-catalog-items', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2025-01-23',
      },
      body: JSON.stringify({ category_ids: CATEGORY_IDS, limit: 100, cursor }),
    })

    if (!res.ok) throw new Error(`Square API ${res.status}: ${await res.text()}`)

    const data = await res.json()
    items.push(...(data.items ?? []))
    cursor = data.cursor
  } while (cursor)

  return items
}

interface PendingVariation {
  sku: string
  scent?: string
  price: number
  stock: number
  squareItemId: string
  squareVariationId: string
}

interface PendingLine {
  match: ProductLineMatch
  variations: PendingVariation[]
  squareItemIds: string[]
}

async function main() {
  const payload = await getPayload({ config })
  const items = await fetchSquareItems()

  console.log(`Fetched ${items.length} items from the Square wellness tree.\n`)

  const lines = new Map<string, PendingLine>()
  const skipped: string[] = []

  for (const item of items) {
    const name = item.item_data?.name ?? ''
    const match = matchProductLine(name)

    if (!match) {
      skipped.push(name)
      continue
    }

    const line =
      lines.get(match.lineKey) ??
      { match, variations: [], squareItemIds: [] }

    line.squareItemIds.push(item.id)

    for (const variation of item.item_data?.variations ?? []) {
      const price = variation.item_variation_data?.price_money?.amount

      // Price is copied VERBATIM. Square amounts are already cents; converting
      // here would re-introduce the exact bug this project set out to kill.
      if (typeof price !== 'number') {
        skipped.push(`${name} (variation ${variation.id}: no price)`)
        continue
      }

      const sizeLabel = variation.item_variation_data?.name ?? ''

      line.variations.push({
        sku:
          variation.item_variation_data?.sku ||
          `${match.lineKey}-${slugify(match.variantLabel)}-${slugify(sizeLabel)}`.replace(/-+$/, ''),
        scent: match.variantAxis === 'scent' ? match.variantLabel : undefined,
        price,
        stock: 0, // The inventory webhook (Task 5) is the live source of truth.
        squareItemId: item.id,
        squareVariationId: variation.id,
      })
    }

    lines.set(match.lineKey, line)
  }

  let created = 0
  let updated = 0
  let variationCount = 0

  for (const [lineKey, line] of lines) {
    variationCount += line.variations.length

    const doc = {
      name: line.match.lineName,
      slug: lineKey,
      variations: line.variations,
      // publishOnline is deliberately absent. It defaults to false and only a
      // human turns it on. Setting it here would defeat the entire curation gate.
    }

    if (!COMMIT) {
      console.log(
        `[dry-run] ${lineKey} (${line.match.collection}) — ${line.variations.length} variations`,
      )
      continue
    }

    const existing = await payload.find({
      collection: line.match.collection,
      where: { slug: { equals: lineKey } },
      limit: 1,
      depth: 0,
    })

    if (existing.docs.length > 0) {
      await payload.update({
        collection: line.match.collection,
        id: existing.docs[0].id,
        data: doc,
      })
      updated++
    } else {
      await payload.create({ collection: line.match.collection, data: doc as any })
      created++
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Lines:      ${lines.size}  (created ${created}, updated ${updated})`)
  console.log(`Variations: ${variationCount}`)
  console.log(`Skipped:    ${skipped.length}`)
  console.log(`${'='.repeat(60)}\n`)

  // Never truncate this silently — a sellable product hiding in the skip list is
  // a mapping-table bug, and printing only a count would conceal it.
  console.log('SKIPPED ITEMS (read this list — any sellable product here is a Task 3 bug):')
  for (const name of skipped) console.log(`  - ${name}`)

  if (!COMMIT) console.log('\nDry run. Nothing was written. Re-run with --commit to persist.')

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

Note the upsert keys on `slug` (== `lineKey`), not `squareItemId` — one Payload document aggregates *many* Square items (55 shea butter items become one document), so the line key is the stable identity. `squareItemId` is retained per variation for stock sync.

- [ ] **Step 2: Type-check the script**

Run: `cd alkebu-load && pnpm check:scripts`
Expected: exit 0. (Scripts are checked against `tsconfig.scripts.json`, separate from the Next build.)

- [ ] **Step 3: Dry-run against production Square, writing nothing**

Run: `cd alkebu-load && tsx --loader ./css-stub-loader.mjs scripts/import-wellness-from-square.ts --dry-run`

> The CSS loader flag is required: Local-API scripts fail on a transitive `.css` import without it.

Expected: ~35 lines, ~191 variations, and a skip list containing only bulk/packaging/miscategorized/Phase-2 items. **Read the skip list.** Any sellable product in it is a Task 3 table bug.

- [ ] **Step 4: Commit for real against the local dev DB**

Run: `cd alkebu-load && tsx --loader ./css-stub-loader.mjs scripts/import-wellness-from-square.ts --commit`

Then verify idempotency by running it a second time:

Expected: second run reports 0 created, ~35 updated, and the document count is unchanged. Confirm in `/admin` that a Whipped Shea Butter document exists with ~55 variations, each with a scent and a cents price, and that `publishOnline` is unchecked.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/scripts/import-wellness-from-square.ts
git commit -m "feat(wellness): idempotent Square -> Payload importer for Phase 1 lines

Upserts on slug (== product line key), since many Square items collapse into one
Payload document — 55 shea butter SKUs become one product with 55 scent variants.
squareVariationId is retained per variation for stock sync.

Prices copied verbatim in cents from Square price_money.amount. Never sets
publishOnline — curation is a human gate. Defaults to --dry-run and prints the
full skip list, so silent truncation can't read as full coverage."
```

---

### Task 5: Extend the Square inventory webhook to wellness/oils

**Files:**
- Modify: `alkebu-load/src/app/api/webhooks/square-catalog/route.ts:502-558`

**Interfaces:**
- Consumes: `variations[].squareVariationId` and `variations[].stock` from Task 2.
- Produces: live stock on wellness/oils variations.

`processInventoryCountUpdate` currently searches only `books` (line 530) and gives up when no book matches (line 536-539). Extend it to fall through to the wellness collections.

- [ ] **Step 1: Add a wellness stock updater**

In `route.ts`, alongside `applyInventoryCountToEditions`, add:

```ts
// Square is the source of truth for stock; each count overwrites the matching
// wellness/oils variation. Returns true if a document was updated.
async function applyInventoryCountToWellness(
  payload: any,
  variationId: string,
  quantity: number,
): Promise<boolean> {
  for (const collection of ['wellness-lifestyle', 'oils-incense'] as const) {
    const result = await payload.find({
      collection,
      where: { 'variations.squareVariationId': { equals: variationId } },
      limit: 1,
      depth: 0,
    })

    if (result.docs.length === 0) continue

    const doc = result.docs[0]
    const newVariations = (doc.variations || []).map((variation: any) =>
      variation?.squareVariationId === variationId
        ? { ...variation, stock: quantity }
        : variation,
    )

    await payload.update({
      collection,
      id: doc.id,
      data: { variations: newVariations },
    })

    console.log(`✅ Stock for "${doc.name}" variation ${variationId} set to ${quantity}`)
    return true
  }

  return false
}
```

- [ ] **Step 2: Fall through to wellness when no book matches**

Replace the early-`continue` at lines 536-539 with a fall-through:

```ts
      if (result.docs.length === 0) {
        const wellnessUpdated = await applyInventoryCountToWellness(payload, variationId, quantity)

        if (wellnessUpdated) {
          updated++
        } else {
          console.log(`⚠️ No book edition or wellness variation matches Square variation ${variationId}`)
        }

        continue
      }
```

- [ ] **Step 3: Verify against the local dev DB**

Pick a `squareVariationId` from an imported wellness variation, then POST a synthetic `inventory.count.updated` payload to the webhook route and confirm the variation's `stock` changes in `/admin`.

Run: `cd alkebu-load && pnpm test && pnpm lint && pnpm build`
Expected: existing webhook tests in `tests/webhooks/` still pass; build exits 0.

- [ ] **Step 4: Commit**

```bash
git add alkebu-load/src/app/api/webhooks/square-catalog/route.ts
git commit -m "feat(wellness): sync Square inventory counts to wellness/oils variations

processInventoryCountUpdate only searched books and dropped every other count.
Now falls through to wellness-lifestyle and oils-incense, matching on
variations.squareVariationId."
```

---

### Task 6: Shipping weights

Shippo mis-rates without real weights, and wellness is not Media Mail eligible — a mis-rated shipment eats the margin on a $14.99 tub.

**Files:**
- Create: `alkebu-load/scripts/backfill-wellness-shipping-weights.ts`

**Interfaces:**
- Consumes: `variations[].weight` from Task 2.
- Produces: populated shipped weights, in ounces.

- [ ] **Step 1: Write the backfill script**

Model on the existing `scripts/backfill-book-shipping-weights.ts`. Square is unlikely to carry weights, so derive defaults from the product line and variation size, then let staff override per variation.

Defaults (shipped weight, including packaging):

| Line | Variation | Default |
|---|---|---|
| Whipped Shea Butter | 4 oz | 6 oz |
| Whipped Shea Butter | 8 oz | 11 oz |
| Scented Oil | 1 oz | 3 oz |
| Raw Shea Butter | — | 18 oz |
| Raw Black Soap | 1 lb | 18 oz |
| Raw Black Soap | 1/2 lb | 10 oz |
| Soaps (bar) | — | 6 oz |
| Cocoa / Mango Butter | — | 10 oz |

The script must only fill variations where `weight` is unset — never overwrite a staff-entered value. Support `--dry-run` (default) and `--commit`.

- [ ] **Step 2: Type-check, dry-run, then commit the data**

Run: `cd alkebu-load && pnpm check:scripts`
Expected: exit 0.

Run: `tsx --loader ./css-stub-loader.mjs scripts/backfill-wellness-shipping-weights.ts --dry-run`
Expected: every Phase 1 variation gets a weight; none already set are touched.

Then re-run with `--commit`.

- [ ] **Step 3: Confirm Shippo rates a wellness cart**

Add a wellness item to a cart and call `POST /api/checkout/preview`. Confirm a real shipping quote comes back and is **not** Media Mail (that default is book-only).

- [ ] **Step 4: Commit**

```bash
git add alkebu-load/scripts/backfill-wellness-shipping-weights.ts
git commit -m "feat(wellness): backfill shipped weights from packaging defaults

Shippo mis-rates without weights, and wellness is not Media Mail eligible.
Fills only unset variation weights; never overwrites a staff-entered value."
```

---

### Task 7: Storefront — variant picker and turning the section on

**Files:**
- Create: `alkebu-web/src/lib/components/Shop/VariantPicker.svelte`
- Modify: `alkebu-web/src/routes/shop/health-and-beauty/[...slug]/+page.svelte`
- Modify: `alkebu-web/src/routes/shop/health-and-beauty/+page.server.ts`
- Modify: `alkebu-web/src/routes/shop/+page.svelte:36-42`

**Interfaces:**
- Consumes: `variations[]` (with `scent`, `price` in cents, `stock`), `publishOnline`, `slug`, `heroImage`.
- Produces: a cart payload carrying `customization.variationSku`, which Task 1's resolver reads.

> Use the Svelte MCP server for this task. Call `list-sections`, then `get-documentation` for the relevant Svelte 5 sections, and run `svelte-autofixer` on every component before considering it done.

- [ ] **Step 1: Filter the storefront queries to published products only**

In `health-and-beauty/+page.server.ts`, add `where[publishOnline][equals]=true` to **both** the `wellness-lifestyle` and `oils-incense` query param builders (around lines 20-45). An unpublished product must be unreachable, including by direct slug URL — add the same filter to the `[...slug]` detail loader.

- [ ] **Step 2: Build the variant picker**

`VariantPicker.svelte` takes `variations` and emits the selected variation. Requirements:

- When `variantAxis` is scent and there are many scents (104 for oils), render a searchable/grouped selector, not a 104-item dropdown.
- Out-of-stock variations (`stock <= 0`) are visibly disabled, not hidden — a shopper looking for "Egyptian Musk" should learn it's sold out, not think it never existed.
- Selecting a variation updates the displayed price (remember: **cents** — divide by 100 for display).
- Single-variation products (soaps, raw butters) render no picker at all.

- [ ] **Step 3: Send the chosen variation to the cart**

The add-to-cart call must include the SKU so the backend can resolve the price:

```js
customization: { variationSku: selectedVariation.sku }
```

Without this, Task 1's resolver throws for any multi-variation product — which is the intended failure, but it means the picker and the resolver must agree on the SKU exactly.

- [ ] **Step 4: Turn the Health & Beauty card on**

In `alkebu-web/src/routes/shop/+page.svelte`, change the Health & Beauty entry (line ~36-42) from `enabled: false` to `enabled: true`.

Leave the **African Art & Imports** card at `enabled: false` — home goods is not in Phase 1 scope.

- [ ] **Step 5: Verify**

Run: `cd alkebu-web && npm run check && npm run lint && npm run build`
Expected: `svelte-check` reports 0 errors; build exits 0.

Then, with the backend running, drive the real flow: open `/shop/health-and-beauty`, pick a scent, add to cart, and confirm the cart line shows the **correct price for the chosen scent** — not $0.00 and not $999.00.

- [ ] **Step 6: Commit**

```bash
git add alkebu-web/src/lib/components/Shop/VariantPicker.svelte \
        alkebu-web/src/routes/shop/health-and-beauty/ \
        alkebu-web/src/routes/shop/+page.svelte
git commit -m "feat(web): wellness variant picker and enable Health & Beauty

Storefront queries filter on publishOnline so unpublished products are
unreachable, including by direct slug. Add-to-cart carries the chosen
variationSku so the backend resolves the right price."
```

---

### Task 8: Admin curation view

Staff need to see, at a glance, which products are ready to publish and which are blocked on a photo.

**Files:**
- Modify: `alkebu-load/src/collections/WellnessLifestyle.ts` (admin config)
- Modify: `alkebu-load/src/collections/OilsIncense.ts` (admin config)

**Interfaces:**
- Consumes: `publishOnline`, `heroImage` from Task 2.

- [ ] **Step 1: Surface curation state in the list view**

Set `admin.defaultColumns` on both collections to show name, `publishOnline`, and an image-coverage indicator. Add a `field.admin.components.Cell` that renders "📷 missing" when `heroImage` is unset — that is the single thing blocking publication for most products.

> Per the verified Payload 3.79.x extension points: `field.admin.components.Cell` for custom cells, `admin.views.list.Component` for a full list-view replacement. Prefer the Cell — it's the smaller change.

- [ ] **Step 2: Regenerate the import map**

Run: `cd alkebu-load && pnpm generate:importmap && pnpm build`
Expected: build exits 0 and the new Cell renders in `/admin`.

- [ ] **Step 3: Commit**

```bash
git add alkebu-load/src/collections/WellnessLifestyle.ts \
        alkebu-load/src/collections/OilsIncense.ts \
        alkebu-load/src/app/components/admin/
git commit -m "feat(admin): surface publish state and missing photos in wellness list views"
```

---

## Definition of Done

- [ ] `pnpm test` and `pnpm lint` pass in `alkebu-load`; `npm run check` and `npm run build` pass in `alkebu-web`.
- [ ] A wellness item can be added to a cart and checked out end-to-end against `sk_test_dummy`, at the **correct price for the chosen scent**.
- [ ] An unpublished product 404s on the storefront, including by direct slug URL.
- [ ] Re-running the importer creates no duplicates.
- [ ] A Square inventory change moves the matching wellness variation's `stock` in Payload.
- [ ] `/shop/health-and-beauty` renders products; the shop index card is live.
- [ ] Schema DDL has been generated and applied to production Postgres via the Coolify terminal **before** the backend deploy.

## Known follow-ups (deliberately not in this plan)

- **Widen the zero-price throw to books and apparel.** Task 1 throws only for wellness/oils to avoid a behavior change in live checkout. A $0.00 line item is a bug for every collection; make it throw everywhere once there's a clean window to verify no legitimate free items exist.
- **Media has no `imageSizes`.** Product photos must be pre-optimized before upload; nothing auto-resizes. Responsive product imagery is its own piece of work.
- **Phase 2: Sea Moss** ($34,323/yr) needs a cold-chain shipping story before it can go online.
- **Phase 2: Bitters & Tonics** ($23,504/yr) needs SKU renaming and DSHEA disclaimers — a compliance workstream, not an engineering one.
