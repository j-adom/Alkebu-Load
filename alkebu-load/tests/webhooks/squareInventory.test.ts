import assert from 'node:assert';
import test from 'node:test';

import {
  applyInventoryCountToEditions,
  applyInventoryCountToVariations,
} from '../../src/app/utils/squareInventory';

test('sets stockLevel on the edition matching the Square variation id', () => {
  const editions = [
    { squareVariationId: 'VAR_A', inventory: { stockLevel: 1, allowBackorders: true } },
    { squareVariationId: 'VAR_B', inventory: { stockLevel: 9 } },
  ];

  const result = applyInventoryCountToEditions(editions, 'VAR_B', 4);

  assert.strictEqual(result[1].inventory.stockLevel, 4);
  // Other fields on the matched edition are preserved.
  assert.strictEqual(result[0].inventory.stockLevel, 1);
  assert.strictEqual(result[0].inventory.allowBackorders, true);
});

test('preserves sibling editions unchanged (same reference)', () => {
  const editions = [
    { squareVariationId: 'VAR_A', inventory: { stockLevel: 1 } },
    { squareVariationId: 'VAR_B', inventory: { stockLevel: 9 } },
  ];

  const result = applyInventoryCountToEditions(editions, 'VAR_A', 7);

  assert.strictEqual(result[1], editions[1]);
});

test('creates an inventory group when the edition has none', () => {
  const editions = [{ squareVariationId: 'VAR_A' }];

  const result = applyInventoryCountToEditions(editions, 'VAR_A', 3);

  assert.deepStrictEqual(result[0].inventory, { stockLevel: 3 });
});

test('returns editions untouched when no variation matches', () => {
  const editions = [{ squareVariationId: 'VAR_A', inventory: { stockLevel: 1 } }];

  const result = applyInventoryCountToEditions(editions, 'VAR_UNKNOWN', 5);

  assert.deepStrictEqual(result, editions);
});

test('handles an empty editions array', () => {
  assert.deepStrictEqual(applyInventoryCountToEditions([], 'VAR_A', 5), []);
});

// --- Wellness / Oils variations -------------------------------------------------
// Regression guard for the array-clobbering bug class: Payload does NOT row-reconcile
// array fields on update -- if `variations` is sent in `data`, the ENTIRE stored array
// is replaced. Task 4's importer had a Critical bug from exactly this (rebuilding
// variations[] wiped synced stock and backfilled shipping weights). These tests confirm
// the stock-update path only ever changes `stock` on the matched row and leaves every
// other field, on every row, untouched.

test('sets stock on the wellness/oils variation matching the Square variation id', () => {
  const variations = [
    { sku: 'SKU-A', squareVariationId: 'VAR_A', price: 1499, weight: 4, stock: 1 },
    { sku: 'SKU-B', squareVariationId: 'VAR_B', price: 2999, weight: 8, stock: 9 },
  ];

  const result = applyInventoryCountToVariations(variations, 'VAR_B', 4);

  assert.strictEqual(result[1].stock, 4);
});

test('preserves every other field on the updated row and every other row untouched (price/weight regression guard)', () => {
  const variations = [
    {
      sku: 'SKU-A',
      squareVariationId: 'VAR_A',
      price: 1499,
      weight: 4,
      stock: 1,
      scent: 'Lavender',
      isAvailable: true,
      size: { volume: 30, unit: 'ml' },
      packaging: 'glass-bottle',
      squareItemId: 'ITEM_1',
    },
    { sku: 'SKU-B', squareVariationId: 'VAR_B', price: 2999, weight: 8, stock: 9 },
  ];

  const result = applyInventoryCountToVariations(variations, 'VAR_A', 42);

  // Only stock changed on the matched row.
  assert.strictEqual(result[0].stock, 42);
  // Every other field on the matched row survives untouched.
  assert.strictEqual(result[0].price, 1499);
  assert.strictEqual(result[0].weight, 4);
  assert.strictEqual(result[0].scent, 'Lavender');
  assert.strictEqual(result[0].isAvailable, true);
  assert.deepStrictEqual(result[0].size, { volume: 30, unit: 'ml' });
  assert.strictEqual(result[0].packaging, 'glass-bottle');
  assert.strictEqual(result[0].squareItemId, 'ITEM_1');
  // The sibling variation is returned unchanged (same reference).
  assert.strictEqual(result[1], variations[1]);
});

test('returns variations untouched when no variation matches (count matching nothing)', () => {
  const variations = [
    { sku: 'SKU-A', squareVariationId: 'VAR_A', price: 1499, weight: 4, stock: 1 },
  ];

  const result = applyInventoryCountToVariations(variations, 'VAR_UNKNOWN', 5);

  assert.deepStrictEqual(result, variations);
});

test('handles an empty variations array', () => {
  assert.deepStrictEqual(applyInventoryCountToVariations([], 'VAR_A', 5), []);
});

// --- Regression: Quantity 0 (sell-out) must NOT be treated as falsy --------
// Square sends quantity: 0 when a product genuinely sells out. Any `if (!quantity)`
// style guard would silently ignore that and leave a sold-out product still
// purchasable on the storefront. This test pins the correct behavior: 0 is a
// legitimate sell-out state, not a missing value, and must update stock/stockLevel
// to exactly 0.

test('sets stock to exactly 0 on sell-out (quantity 0 is a real state, not falsy)', () => {
  const variations = [
    { sku: 'SKU-A', squareVariationId: 'VAR_A', price: 1499, weight: 4, stock: 10 },
    { sku: 'SKU-B', squareVariationId: 'VAR_B', price: 2999, weight: 8, stock: 5 },
  ];

  const result = applyInventoryCountToVariations(variations, 'VAR_A', 0);

  // The matched variation's stock is set to exactly 0 (not treated as falsy and skipped).
  assert.strictEqual(result[0].stock, 0);
  // All other fields on the matched row survive untouched.
  assert.strictEqual(result[0].sku, 'SKU-A');
  assert.strictEqual(result[0].price, 1499);
  assert.strictEqual(result[0].weight, 4);
  // Sibling variation is unaffected.
  assert.strictEqual(result[1], variations[1]);
});

test('sets stockLevel to exactly 0 on sell-out for editions (quantity 0 is a real state, not falsy)', () => {
  const editions = [
    { squareVariationId: 'VAR_A', inventory: { stockLevel: 10, allowBackorders: false } },
    { squareVariationId: 'VAR_B', inventory: { stockLevel: 5 } },
  ];

  const result = applyInventoryCountToEditions(editions, 'VAR_A', 0);

  // The matched edition's stockLevel is set to exactly 0 (not treated as falsy and skipped).
  assert.strictEqual(result[0].inventory.stockLevel, 0);
  // Other inventory fields on the matched edition survive untouched.
  assert.strictEqual(result[0].inventory.allowBackorders, false);
  // Sibling edition is unaffected.
  assert.strictEqual(result[1], editions[1]);
});

// --- Regression: Missing/null squareVariationId in array ---------------------
// A malformed row with missing or null squareVariationId should not crash the
// function or prevent updating genuinely matching rows. This tests defensive
// handling of real data anomalies.

test('updates only matching rows when array contains a row with missing squareVariationId', () => {
  const variations = [
    { sku: 'SKU-MALFORMED', price: 999, weight: 2, stock: 5 }, // No squareVariationId
    { sku: 'SKU-A', squareVariationId: 'VAR_A', price: 1499, weight: 4, stock: 10 },
    { sku: 'SKU-B', squareVariationId: 'VAR_B', price: 2999, weight: 8, stock: 5 },
  ];

  const result = applyInventoryCountToVariations(variations, 'VAR_A', 7);

  // The matched variation is updated.
  assert.strictEqual(result[1].stock, 7);
  assert.strictEqual(result[1].sku, 'SKU-A');
  // The malformed row (no squareVariationId) is passed through unchanged (same reference).
  assert.strictEqual(result[0], variations[0]);
  // Unmatched rows remain unchanged.
  assert.strictEqual(result[2], variations[2]);
});

test('updates only matching editions when array contains a row with null squareVariationId', () => {
  const editions = [
    { squareVariationId: null, inventory: { stockLevel: 5 } },
    { squareVariationId: 'VAR_A', inventory: { stockLevel: 10 } },
    { squareVariationId: 'VAR_B', inventory: { stockLevel: 3 } },
  ];

  const result = applyInventoryCountToEditions(editions, 'VAR_A', 8);

  // The matched edition is updated.
  assert.strictEqual(result[1].inventory.stockLevel, 8);
  // The malformed row (null squareVariationId) is passed through unchanged (same reference).
  assert.strictEqual(result[0], editions[0]);
  // Unmatched rows remain unchanged.
  assert.strictEqual(result[2], editions[2]);
});
