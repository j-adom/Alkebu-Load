import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSnapshot, stockV2Format } from '../../src/app/utils/ingram/catalogStockSnapshot';

// Synthetic StockV2 records (see parseStockV2.test.ts for the layout).
function record(ean: string, laVergneOnHand: number, code = '21'): string {
  const chars = Array<string>(301).fill(' ');
  const put = (start: number, value: string) => chars.splice(start - 1, value.length, ...value);
  put(2, ean);
  put(39, String(laVergneOnHand).padStart(7, '0'));
  put(197, '00010101');
  put(272, code);
  return chars.join('');
}

async function* lines(...items: string[]) {
  for (const item of items) yield item;
}

const today = new Date('2026-10-03T12:00:00Z');

test('keeps only catalog EANs and reduces each to on-hand + availability', async () => {
  const snapshot = await buildSnapshot(
    lines(record('9780000000002', 57), record('9790000000001', 4, '40'), record('9781111111113', 99), 'garbage'),
    new Set(['9780000000002', '9790000000001']),
    stockV2Format,
    { threshold: 10, today },
  );
  assert.deepEqual(Object.fromEntries(snapshot.stock), {
    '9780000000002': { onHand: 57, available: true },
    '9790000000001': { onHand: 4, available: false },
  });
  assert.equal(snapshot.scannedLines, 4);
  assert.equal(snapshot.matched, 2);
  assert.equal(snapshot.skippedLines, 1);
});

test('an empty catalog set matches nothing', async () => {
  const snapshot = await buildSnapshot(lines(record('9780000000002', 57)), new Set(), stockV2Format, { threshold: 10, today });
  assert.equal(snapshot.stock.size, 0);
});

test('the CSV feed end to end: header, catalog filter, and format-surprise counters', async () => {
  const { createCatalogCsvFormat } = await import('../../src/app/utils/ingram/parseCatalogStockCsv');
  const header = 'EAN,On Sale Date,Product Availability Code,LaVergne TN On Hand,LaVergne TN On Order';
  const snapshot = await buildSnapshot(
    lines(
      header,
      '9780000000002,20250115,21,57,0',
      '9790000000001,next spring,21,40,0',
      '9781111111113,20250115,21,99,0',
      '9780306406157,,ZZ,40,0',
    ),
    new Set(['9780000000002', '9790000000001', '9780306406157']),
    createCatalogCsvFormat(),
    { threshold: 10, today },
  );
  assert.deepEqual(Object.fromEntries(snapshot.stock), {
    '9780000000002': { onHand: 57, available: true },
    '9790000000001': { onHand: 40, available: false },
    '9780306406157': { onHand: 40, available: true },
  });
  assert.equal(snapshot.scannedLines, 4, 'the header is not counted as a record');
  assert.equal(snapshot.unrecognizedOnSaleDates, 1);
  assert.equal(snapshot.unrecognizedAvailabilityCodes, 1);
});
