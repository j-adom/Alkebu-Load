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
