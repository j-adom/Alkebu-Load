import assert from 'node:assert/strict';
import test from 'node:test';

import { parseStockV2Line } from '../../src/app/utils/ingram/parseStockV2';

// SYNTHETIC record (agreement §2(c)): invented values placed at the 1-based inclusive
// positions from the IDS Inventory Implementation Guide v2.14, not a vendor sample line.
function record(fields: Array<[start: number, end: number, value: string, align?: 'right']>): string {
  const chars = Array<string>(301).fill(' ');
  for (const [start, end, value, align] of fields) {
    const width = end - start + 1;
    const padded = align === 'right' ? value.padStart(width, '0') : value.padEnd(width, ' ');
    assert.equal(padded.length, width, `value "${value}" does not fit ${start}-${end}`);
    chars.splice(start - 1, width, ...padded);
  }
  return chars.join('');
}

const line = record([
  [2, 14, '9780000000002'],
  [39, 45, '57', 'right'], // LaVergne on hand
  [46, 52, '0', 'right'], // Roseburg on hand
  [53, 59, '3', 'right'], // FtWayne on hand
  [60, 66, '0', 'right'], // Chambersburg on hand
  [67, 73, '0', 'right'], // Allentown on hand
  [109, 115, '30', 'right'], // FtWayne on order
  [151, 157, '2495', 'right'], // list price, 2 implied decimals
  [166, 168, '40%'],
  [179, 180, 'IP'],
  [181, 181, 'Y'], // LaVergne stock flag
  [183, 183, 'N'], // FtWayne stock flag
  [197, 204, '20250115'],
  [219, 219, 'N'], // backorder only
  [220, 220, 'Y'], // Media Mail eligible
  [239, 244, '69', 'right'], // weight, 2 implied decimals
  [272, 273, '21'],
]);

test('parseStockV2Line slices every field at its documented position', () => {
  const rec = parseStockV2Line(line);
  assert.equal(rec.ean, '9780000000002');
  assert.equal(rec.dcs.LaVergne.onHand, 57);
  assert.equal(rec.dcs.LaVergne.stockStatus, true);
  assert.equal(rec.dcs.FtWayne.onHand, 3);
  assert.equal(rec.dcs.FtWayne.onOrder, 30);
  assert.equal(rec.dcs.FtWayne.stockStatus, false);
  assert.equal(rec.dcs.Roseburg.onHand, 0);
  assert.equal(rec.pubListPrice, 24.95);
  assert.equal(rec.discountLevel, '40%');
  assert.equal(rec.publisherStatus, 'IP');
  assert.equal(rec.productAvailability, '21');
  assert.equal(rec.onSaleDate, '20250115');
  assert.equal(rec.backorder, false);
  assert.equal(rec.mediaMail, true);
  assert.equal(rec.weightLbs, 0.69);
});

test('parseStockV2Line tolerates a trailing CR and blank numeric fields', () => {
  const rec = parseStockV2Line(record([[2, 14, '9790000000001']]) + '\r');
  assert.equal(rec.ean, '9790000000001');
  assert.equal(rec.dcs.LaVergne.onHand, 0);
  assert.equal(rec.pubListPrice, 0);
  assert.equal(rec.productAvailability, '');
});

test('stockV2Ean reads only the EAN, for cheap stream filtering', async () => {
  const { stockV2Ean } = await import('../../src/app/utils/ingram/parseStockV2');
  assert.equal(stockV2Ean(line), '9780000000002');
  assert.equal(stockV2Ean('short'), null);
});
