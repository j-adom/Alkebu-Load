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

test('missing name: incomplete with an item-level title/missing issue', () => {
  const r = mapSquareItemToBook({
    id: 'ITEM1',
    updatedAt: '2026-09-20T10:00:00Z',
    itemData: { variations: [varn('V1', VALID_A, 2299n)] },
  });
  assert.strictEqual(r.kind, 'incomplete');
  if (r.kind !== 'incomplete') return;
  assert.ok(r.issues.some((i) => i.field === 'title' && i.code === 'missing' && i.variationId === undefined));
  assert.strictEqual(r.proposed.proposedTitle, undefined);
});

test('empty-string name: incomplete with an item-level title/missing issue', () => {
  const r = mapSquareItemToBook(item([varn('V1', VALID_A, 2299n)], ''));
  assert.strictEqual(r.kind, 'incomplete');
  if (r.kind !== 'incomplete') return;
  assert.ok(r.issues.some((i) => i.field === 'title' && i.code === 'missing' && i.variationId === undefined));
  assert.strictEqual(r.proposed.proposedTitle, undefined);
});

test('whitespace-only name: incomplete with an item-level title/missing issue', () => {
  const r = mapSquareItemToBook(item([varn('V1', VALID_A, 2299n)], '   '));
  assert.strictEqual(r.kind, 'incomplete');
  if (r.kind !== 'incomplete') return;
  assert.ok(r.issues.some((i) => i.field === 'title' && i.code === 'missing' && i.variationId === undefined));
  assert.strictEqual(r.proposed.proposedTitle, undefined);
});

test('non-string name: incomplete with an item-level title/missing issue', () => {
  const r = mapSquareItemToBook({
    id: 'ITEM1',
    updatedAt: '2026-09-20T10:00:00Z',
    itemData: { name: 12345, variations: [varn('V1', VALID_A, 2299n)] },
  });
  assert.strictEqual(r.kind, 'incomplete');
  if (r.kind !== 'incomplete') return;
  assert.ok(r.issues.some((i) => i.field === 'title' && i.code === 'missing' && i.variationId === undefined));
  assert.strictEqual(r.proposed.proposedTitle, undefined);
});

test('missing title AND an unusable variation reports both issues', () => {
  const r = mapSquareItemToBook({
    id: 'ITEM1',
    updatedAt: '2026-09-20T10:00:00Z',
    itemData: { variations: [varn('BAD', 'SHELF-TAG-7', 1500n)] },
  });
  assert.strictEqual(r.kind, 'incomplete');
  if (r.kind !== 'incomplete') return;
  assert.ok(r.issues.some((i) => i.field === 'title' && i.code === 'missing'));
  assert.ok(r.issues.some((i) => i.variationId === 'BAD' && i.field === 'editions.isbn'));
});

test('malformed input is incomplete, never a throw', () => {
  for (const bad of [null, undefined, {}, { id: 'X' }, { itemData: {} }, { itemData: { variations: 'nope' } }]) {
    assert.strictEqual(mapSquareItemToBook(bad).kind, 'incomplete');
  }
});

test('the ISBN can come from the barcode when sku holds a store code', () => {
  const r = mapSquareItemToBook({
    type: 'ITEM',
    id: 'ITEM-UPC',
    itemData: {
      name: 'Kwanzaa',
      variations: [{ id: 'V1', itemVariationData: { sku: 'H623082', upc: '9780310180302', priceMoney: { amount: 1999n } } }],
    },
  });
  assert.strictEqual(r.kind, 'complete');
  assert.strictEqual((r as any).data.editions[0].isbn, '9780310180302');
});

test('gtin is checked too, and a valid sku still wins', () => {
  const fromGtin = mapSquareItemToBook({
    type: 'ITEM',
    id: 'ITEM-GTIN',
    itemData: { name: 'G', variations: [{ id: 'V1', itemVariationData: { sku: '270576Z', gtin: '9780062457714', priceMoney: { amount: 1000n } } }] },
  });
  assert.strictEqual((fromGtin as any).data.editions[0].isbn, '9780062457714');
  const skuWins = mapSquareItemToBook({
    type: 'ITEM',
    id: 'ITEM-SKU',
    itemData: { name: 'S', variations: [{ id: 'V1', itemVariationData: { sku: '9780310180302', upc: '9780062457714', priceMoney: { amount: 1000n } } }] },
  });
  assert.strictEqual((skuWins as any).data.editions[0].isbn, '9780310180302');
});

test('the invalid-checksum detail lists every value it tried', () => {
  const r = mapSquareItemToBook({
    type: 'ITEM',
    id: 'ITEM-BAD',
    itemData: { name: 'B', variations: [{ id: 'V1', itemVariationData: { sku: 'H623082', upc: '123456789012', priceMoney: { amount: 1000n } } }] },
  });
  assert.strictEqual(r.kind, 'incomplete');
  assert.match((r as any).issues[0].detail, /"H623082", "123456789012": none is a valid ISBN/);
});

test('isNonBookCategory: only a set, non-Books reporting category is non-book', async () => {
  const { isNonBookCategory, DEFAULT_BOOKS_CATEGORY_ID } = await import('../../src/app/utils/squareCatalogMapping');
  const withCategory = (id?: string) => ({ itemData: id === undefined ? {} : { reportingCategory: { id } } });
  assert.strictEqual(isNonBookCategory(withCategory(DEFAULT_BOOKS_CATEGORY_ID)), false);
  assert.strictEqual(isNonBookCategory(withCategory('HOTU26XFEIY5AZ4M22JPR7CE')), true);
  assert.strictEqual(isNonBookCategory(withCategory()), false);
  assert.strictEqual(isNonBookCategory(withCategory('OTHER'), 'OTHER'), false);
});

test('isValidIsbn rejects checksum-valid EAN-13s outside the 978/979 Bookland prefix', () => {
  assert.strictEqual(isValidIsbn('9780310180302'), true);
  assert.strictEqual(isValidIsbn('8901234567890'), false); // valid EAN-13 checksum, not an ISBN
  assert.strictEqual(isValidIsbn('0306406152'), true); // ISBN-10 unaffected
});
