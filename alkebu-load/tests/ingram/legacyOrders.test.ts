import assert from 'node:assert/strict';
import test from 'node:test';

import { parseSnipcartOrders } from '../../src/app/utils/ingram/legacyOrders';

// SYNTHETIC export: same column names as Snipcart's, invented values.
const csv = [
  'Invoice number,Customer name,Order date,Order status,Item ID,Item name',
  'SNIP-1,Someone,2024-05-01 14:21:08,Shipped,9780000000002,Book A',
  'SNIP-2,Someone,2025-01-02 09:00:00,Delivered,9780000000002,Book A',
  'SNIP-3,Someone,2024-06-01 10:00:00,Cancelled,9790000000001,Book B',
  'SNIP-4,Someone,2021-03-01 10:00:00,Shipped,9790000000001,Book B',
  'SNIP-5,Someone,2024-07-01 10:00:00,Shipped,c650b285-2ad5-4c0b-9f78-119c64cabeed,T-shirt',
  'SNIP-6,Someone,2024-08-01 10:00:00,Pending,0306406152,Old ISBN-10',
].join('\n');

test('counts paid book lines in the window by EAN, latest date wins', () => {
  const r = parseSnipcartOrders(csv, '2022-10-04T00:00:00.000Z');
  assert.deepEqual(Object.fromEntries(r.sold), {
    '9780000000002': '2025-01-02T09:00:00.000Z',
    '9780306406157': '2024-08-01T10:00:00.000Z',
  });
  assert.equal(r.lines, 6);
  assert.equal(r.counted, 3);
  assert.equal(r.cancelled, 1);
  assert.equal(r.outsideWindow, 1);
  assert.equal(r.notABook, 1);
});
