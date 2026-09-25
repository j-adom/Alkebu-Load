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
