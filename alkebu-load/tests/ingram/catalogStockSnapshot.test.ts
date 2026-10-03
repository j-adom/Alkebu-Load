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
