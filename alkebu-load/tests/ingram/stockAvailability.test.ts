import assert from 'node:assert/strict';
import test from 'node:test';

import { batchIsbns, ingramOnHand, isIngramAvailable } from '../../src/app/utils/ingram/stockAvailability';
import type { IngramStock } from '../../src/app/utils/ingram/parseStockResponse';

const stock = (overrides: Partial<IngramStock> = {}): IngramStock => ({
  ean: '9780000000002',
  backorder: false,
  mediaMail: true,
  dcs: { LaVergne: { onHand: 8, onOrder: 0, stockStatus: true } },
  ...overrides,
});
const onHand = (n: number) => ({ LaVergne: { onHand: n, onOrder: 0, stockStatus: n > 0 } });
const today = new Date('2026-10-02T12:00:00Z');

test('batchIsbns splits into groups of 25 by default', () => {
  const batches = batchIsbns(Array.from({ length: 60 }, (_, i) => String(i)));
  assert.deepEqual(batches.map((b) => b.length), [25, 25, 10]);
  assert.deepEqual(batchIsbns([]), []);
});

test('ingramOnHand prefers LaVergne, falls back to the max DC', () => {
  const both = stock({ dcs: { LaVergne: { onHand: 101, onOrder: 0, stockStatus: true }, FtWayne: { onHand: 200, onOrder: 0, stockStatus: true } } });
  assert.equal(ingramOnHand(both), 101);
  assert.equal(ingramOnHand(stock({ dcs: { FtWayne: { onHand: 200, onOrder: 0, stockStatus: true } } })), 200);
  assert.equal(ingramOnHand(stock({ dcs: {} })), 0);
});

test('isIngramAvailable uses the quantity threshold only when no availability code is present', () => {
  assert.equal(isIngramAvailable(stock({ dcs: onHand(8) }), 10, { today }), false);
  assert.equal(isIngramAvailable(stock({ dcs: onHand(40) }), 10, { today }), true);
  assert.equal(isIngramAvailable(stock({ dcs: onHand(10) }), 10, { today }), false); // strictly greater
  assert.equal(isIngramAvailable(stock({ productAvailability: '', dcs: onHand(40) }), 10, { today }), true);
});

test('isIngramAvailable trusts the availability code over quantity', () => {
  assert.equal(isIngramAvailable(stock({ productAvailability: '21', dcs: onHand(5) }), 10, { today }), true);
  assert.equal(isIngramAvailable(stock({ productAvailability: '40', dcs: onHand(500) }), 10, { today }), false);
  assert.equal(isIngramAvailable(stock({ productAvailability: '31', dcs: onHand(500) }), 10, { today }), false);
});

test('isIngramAvailable gates on the on-sale date', () => {
  const s = stock({ productAvailability: '21', dcs: onHand(40) });
  assert.equal(isIngramAvailable({ ...s, onSaleDate: '20261003' }, 10, { today }), false);
  assert.equal(isIngramAvailable({ ...s, onSaleDate: '20261002' }, 10, { today }), true);
  assert.equal(isIngramAvailable({ ...s, onSaleDate: '00010101' }, 10, { today }), true);
  assert.equal(isIngramAvailable({ ...s, onSaleDate: undefined }, 10, { today }), true);
});

test('isIngramAvailable never sells when the on-sale date could not be read', () => {
  assert.equal(isIngramAvailable(stock({ productAvailability: '21', onSaleDate: 'unrecognized', dcs: onHand(40) }), 10, { today }), false);
});
