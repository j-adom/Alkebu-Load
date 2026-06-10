import assert from 'node:assert';
import test from 'node:test';

import { applyInventoryCountToEditions } from '../../src/app/utils/squareInventory';

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
