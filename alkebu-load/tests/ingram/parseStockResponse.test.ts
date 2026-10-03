import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseStockResponse } from '../../src/app/utils/ingram/parseStockResponse';

const xml = readFileSync(
  fileURLToPath(new URL('./fixtures/queryType9-stock.synthetic.xml', import.meta.url)),
  'utf8',
);

test('parseStockResponse extracts per-DC stock keyed by EAN from a SOAP response', () => {
  const [rec] = parseStockResponse(xml);
  assert.equal(rec.ean, '9780000000002');
  assert.equal(rec.dcs.LaVergne.onHand, 57);
  assert.equal(rec.dcs.LaVergne.stockStatus, true);
  assert.equal(rec.dcs.FtWayne.onHand, 0);
  assert.equal(rec.dcs.FtWayne.onOrder, 30);
  assert.equal(rec.pubListPrice, 24.95);
  assert.equal(rec.ingramPrice, 14.97);
  assert.equal(rec.productAvailability, '21');
  assert.equal(rec.onSaleDate, '20250115');
  assert.equal(rec.backorder, false);
  assert.equal(rec.mediaMail, true);
});

test('parseStockResponse returns a product without a stock section with empty DCs', () => {
  const [, bare] = parseStockResponse(xml);
  assert.equal(bare.ean, '9790000000001');
  assert.deepEqual(bare.dcs, {});
  assert.equal(bare.productAvailability, undefined);
  assert.equal(bare.backorder, false);
});

test('parseStockResponse keeps EANs as strings (no numeric coercion)', () => {
  const [rec] = parseStockResponse(xml);
  assert.equal(typeof rec.ean, 'string');
});

test('parseStockResponse returns [] for a response with no products or invalid XML', () => {
  assert.deepEqual(parseStockResponse('<IngramSearchResults><TotalRecs>0</TotalRecs></IngramSearchResults>'), []);
  assert.deepEqual(parseStockResponse('not xml'), []);
});
