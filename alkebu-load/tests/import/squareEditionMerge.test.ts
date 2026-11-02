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

// ---- merged books: one Payload book, several Square items (one per binding) ----

const paperback = { id: 'row-pb', squareItemId: 'ITEM-PB', squareVariationId: 'VAR-PB', isbn: '9780310180302', pricing: { retailPrice: 1800 } };
const hardcover = { id: 'row-hc', squareItemId: 'ITEM-HC', squareVariationId: 'VAR-HC', isbn: '9780062457714', pricing: { retailPrice: 2800 } };

test('syncing one item never flags another item\'s editions unavailable', () => {
  const merged = mergeEditions([paperback, hardcover], [{ squareItemId: 'ITEM-PB', squareVariationId: 'VAR-PB', pricing: { retailPrice: 1900 } }], {
    squareItemId: 'ITEM-PB',
    bookSquareItemId: 'ITEM-PB',
  });
  const hc = merged.find((row) => row.squareVariationId === 'VAR-HC');
  assert.deepStrictEqual(hc, hardcover);
  assert.strictEqual(merged.find((row) => row.squareVariationId === 'VAR-PB').pricing.retailPrice, 1900);
});

test('a variation the synced item dropped is still flagged unavailable', () => {
  const merged = mergeEditions([paperback, hardcover], [], { squareItemId: 'ITEM-HC', bookSquareItemId: 'ITEM-PB' });
  assert.strictEqual(merged.find((row) => row.squareVariationId === 'VAR-HC').isAvailable, false);
  assert.deepStrictEqual(merged.find((row) => row.squareVariationId === 'VAR-PB'), paperback);
});

test('un-backfilled editions belong to the book-level item', () => {
  const legacy = { squareVariationId: 'VAR-OLD', isbn: '9780310180302' };
  const ownItem = mergeEditions([legacy], [], { squareItemId: 'ITEM-PB', bookSquareItemId: 'ITEM-PB' });
  assert.strictEqual(ownItem[0].isAvailable, false);
  const otherItem = mergeEditions([legacy], [], { squareItemId: 'ITEM-HC', bookSquareItemId: 'ITEM-PB' });
  assert.deepStrictEqual(otherItem[0], legacy);
});

test('the incoming item id is recorded on matched and new editions', () => {
  const merged = mergeEditions([{ squareVariationId: 'VAR-PB' }], [
    { squareItemId: 'ITEM-PB', squareVariationId: 'VAR-PB' },
    { squareItemId: 'ITEM-PB', squareVariationId: 'VAR-NEW' },
  ], { squareItemId: 'ITEM-PB', bookSquareItemId: 'ITEM-PB' });
  assert.deepStrictEqual(merged.map((row) => row.squareItemId), ['ITEM-PB', 'ITEM-PB']);
});
