import assert from 'node:assert/strict';
import test from 'node:test';

import { createCatalogCsvFormat, normalizeOnSaleDate, splitCsvLine } from '../../src/app/utils/ingram/parseCatalogStockCsv';

// Header exactly as Ingram's Catalog Stock CSV delivers it (column names only, 2026-10-02).
const HEADER =
  'EAN,List Price,Discount Level,Product Type,Publication Date,On Sale Date,Back Order Only Indicator,Media Mail Indicator,Weight,Restricted Code,Product Classification Code,Returnable Indicator,Return Date,Product Availability Code,LaVergne TN On Hand,LaVergne TN On Order,Roseburg OR On Hand,Roseburg OR On Order,Ft Wayne IN On Hand,Ft Wayne IN On Order,Chambersburg PA On Hand,Chambersburg PA On Order,Future DC1 On Hand,Future DC1 On Order,Future DC2 On Hand,Future DC2 On Order,Future DC3 On Hand,Future DC3 On Order,Future DC4 On Hand,Future DC4 On Order';

// SYNTHETIC row (invented values), built from the header so column order can't drift.
function row(values: Record<string, string>): string {
  return HEADER.split(',')
    .map((name) => values[name] ?? '')
    .join(',');
}

test('reads the header, then maps a record to IngramStock by column name', () => {
  const format = createCatalogCsvFormat();
  assert.equal(format.readHeader(HEADER), true);
  const line = row({
    EAN: '9780000000002',
    'On Sale Date': '20250115',
    'Back Order Only Indicator': 'N',
    'Media Mail Indicator': 'Y',
    'Product Availability Code': '21',
    'LaVergne TN On Hand': '57',
    'Ft Wayne IN On Hand': '3',
    'Ft Wayne IN On Order': '30',
  });
  assert.equal(format.ean(line), '9780000000002');
  const rec = format.parse(line)!;
  assert.equal(rec.ean, '9780000000002');
  assert.equal(rec.productAvailability, '21');
  assert.equal(rec.onSaleDate, '20250115');
  assert.equal(rec.mediaMail, true);
  assert.equal(rec.backorder, false);
  assert.deepEqual(rec.dcs.LaVergne, { onHand: 57, onOrder: 0, stockStatus: true });
  assert.deepEqual(rec.dcs.FtWayne, { onHand: 3, onOrder: 30, stockStatus: true });
  assert.equal(rec.dcs.Chambersburg.onHand, 0);
  assert.equal('FutureDC1' in rec.dcs, false, 'unused future DCs are ignored');
});

test('handles quoted fields', () => {
  const format = createCatalogCsvFormat();
  format.readHeader(HEADER.split(',').map((h) => `"${h}"`).join(','));
  const line = row({ EAN: '9780000000002', 'LaVergne TN On Hand': '5' })
    .split(',')
    .map((v) => `"${v}"`)
    .join(',');
  assert.equal(format.ean(line), '9780000000002');
  assert.equal(format.parse(line)!.dcs.LaVergne.onHand, 5);
});

test('refuses a header that lacks the columns availability depends on', () => {
  const format = createCatalogCsvFormat();
  assert.throws(() => format.readHeader('EAN,List Price,Weight'), /Product Availability Code/);
  assert.throws(() => createCatalogCsvFormat().readHeader('9780000000002,1,2'), /header/i);
});

test('rejects rows with a malformed EAN', () => {
  const format = createCatalogCsvFormat();
  format.readHeader(HEADER);
  assert.equal(format.ean(row({ EAN: 'ABC' })), null);
  assert.equal(format.ean(''), null);
});

test('normalizeOnSaleDate accepts common date shapes and flags others', () => {
  assert.equal(normalizeOnSaleDate('20250115'), '20250115');
  assert.equal(normalizeOnSaleDate('2025-01-15'), '20250115');
  assert.equal(normalizeOnSaleDate('1/5/2025'), '20250105');
  assert.equal(normalizeOnSaleDate(''), undefined);
  assert.equal(normalizeOnSaleDate('soon'), 'unrecognized');
});

test('splitCsvLine handles escaped quotes', () => {
  assert.deepEqual(splitCsvLine('a,"b,c","d""e"'), ['a', 'b,c', 'd"e']);
});
