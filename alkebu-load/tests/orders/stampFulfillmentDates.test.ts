import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { Orders, stampFulfillmentDates } from '../../src/collections/Orders';

const run = (data: any, originalDoc: any, operation: 'create' | 'update' = 'update') =>
  (stampFulfillmentDates as any)({ data, originalDoc, operation }) as any;

test('stamps shippedAt when status moves to shipped without a date', () => {
  const result = run({ status: 'shipped' }, { status: 'paid', fulfillment: { shippingMethod: 'usps' } });
  assert.ok(!Number.isNaN(Date.parse(result.fulfillment.shippedAt)));
  assert.equal(result.fulfillment.deliveredAt, undefined);
});

test('stamps deliveredAt when status moves to delivered, keeping other incoming fulfillment fields', () => {
  const result = run(
    { status: 'delivered', fulfillment: { trackingNumber: '9400' } },
    { status: 'shipped', fulfillment: { shippedAt: '2026-11-01T00:00:00.000Z' } },
  );
  assert.ok(!Number.isNaN(Date.parse(result.fulfillment.deliveredAt)));
  assert.equal(result.fulfillment.trackingNumber, '9400');
  assert.equal(result.fulfillment.shippedAt, undefined, 'does not rewrite the stored shippedAt');
});

test('keeps a date the caller supplied or one already stored', () => {
  const supplied = run(
    { status: 'shipped', fulfillment: { shippedAt: '2026-11-02T00:00:00.000Z' } },
    { status: 'paid' },
  );
  assert.equal(supplied.fulfillment.shippedAt, '2026-11-02T00:00:00.000Z');

  const stored = run({ status: 'shipped' }, { status: 'processing', fulfillment: { shippedAt: '2026-11-03T00:00:00.000Z' } });
  assert.equal(stored.fulfillment, undefined);
});

test('does nothing on create, without a status change, or for other statuses', () => {
  assert.deepEqual(run({ status: 'shipped' }, undefined, 'create'), { status: 'shipped' });
  assert.deepEqual(run({ status: 'shipped' }, { status: 'shipped' }), { status: 'shipped' });
  assert.deepEqual(run({ fulfillment: { trackingNumber: '1' } }, { status: 'paid' }), { fulfillment: { trackingNumber: '1' } });
  assert.deepEqual(run({ status: 'processing' }, { status: 'paid' }), { status: 'processing' });
});

test('the hook is registered in beforeChange', () => {
  assert.ok((Orders.hooks!.beforeChange as unknown[]).includes(stampFulfillmentDates));
});

test('no Orders hook writes to the orders collection outside the request transaction', () => {
  // afterChange runs before the outer transaction commits. A nested update of the same
  // order without `req` opens a second transaction that blocks on the first one's row
  // lock and never returns (the deadlock this file guards against).
  const source = readFileSync(new URL('../../src/collections/Orders.ts', import.meta.url), 'utf8');
  const calls = source.split(/payload\.update\(\{/).slice(1).map((rest) => rest.slice(0, rest.indexOf('});')));
  const orderWrites = calls.filter((call) => /collection:\s*'orders'/.test(call));
  for (const call of orderWrites) {
    assert.match(call, /\breq,/, `orders update must pass req:\n${call}`);
  }
});
