import assert from 'node:assert';
import test from 'node:test';

import { toJsonSafe, fromJsonSafe } from '../../src/app/utils/jsonSafe';

test('a raw Square object with BigInt amounts cannot be stringified', () => {
  assert.throws(() => JSON.stringify({ priceMoney: { amount: 2299n } }), TypeError);
});

test('toJsonSafe makes it stringifiable', () => {
  const safe = toJsonSafe({ priceMoney: { amount: 2299n, currency: 'USD' } });
  assert.doesNotThrow(() => JSON.stringify(safe));
});

test('BigInt round-trips losslessly, including values beyond Number.MAX_SAFE_INTEGER', () => {
  const big = 9007199254740993n; // MAX_SAFE_INTEGER + 2
  const back = fromJsonSafe(JSON.parse(JSON.stringify(toJsonSafe({ v: big }))));
  assert.strictEqual((back as any).v, big);
});

test('walks nested arrays and objects', () => {
  const safe = toJsonSafe({
    itemData: { variations: [{ itemVariationData: { priceMoney: { amount: 1899n } } }] },
  });
  const json = JSON.stringify(safe);
  const back: any = fromJsonSafe(JSON.parse(json));
  assert.strictEqual(back.itemData.variations[0].itemVariationData.priceMoney.amount, 1899n);
});

test('leaves ordinary values untouched', () => {
  const input = { a: 1, b: 'x', c: true, d: null, e: [1, 2] };
  assert.deepStrictEqual(fromJsonSafe(JSON.parse(JSON.stringify(toJsonSafe(input)))), input);
});

test('does not mistake a user string for an encoded bigint', () => {
  // A Square field could legitimately contain an object shaped like our marker.
  const tricky = { note: { __bigint: 'not a number' } };
  const back: any = fromJsonSafe(JSON.parse(JSON.stringify(toJsonSafe(tricky))));
  assert.strictEqual(typeof back.note.__bigint, 'string');
});

test('handles undefined and Date without throwing', () => {
  assert.doesNotThrow(() => JSON.stringify(toJsonSafe({ d: new Date(0), u: undefined })));
});
