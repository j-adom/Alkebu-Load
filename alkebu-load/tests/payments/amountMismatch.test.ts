import assert from 'node:assert';
import test from 'node:test';

import { releaseCheckoutLock } from '../../src/app/utils/checkoutLock';
import { describeAmountMismatch } from '../../src/app/utils/stripeHelpers';

/**
 * The webhook and the recovery job build the order from the cart. If the cart no
 * longer totals what Stripe charged, staff must hear about it before shipping.
 */

test('describeAmountMismatch: silent when the order totals what Stripe charged', () => {
  assert.strictEqual(describeAmountMismatch({ id: 'cs_1', amount_total: 2099 }, 2099), null);
});

test('describeAmountMismatch: silent when Stripe did not report an amount', () => {
  assert.strictEqual(describeAmountMismatch({ id: 'cs_1' }, 2099), null);
  assert.strictEqual(describeAmountMismatch({ id: 'cs_1', amount_total: null }, 2099), null);
});

test('describeAmountMismatch: names both amounts and the session when they differ', () => {
  const note = describeAmountMismatch({ id: 'cs_1', amount_total: 2099 }, 7500);
  assert.ok(note);
  assert.match(note, /\$20\.99/);
  assert.match(note, /\$75\.00/);
  assert.match(note, /cs_1/);
  assert.match(note, /Do not ship/);
});

test('releaseCheckoutLock: an abandoned cart keeps its status but drops the dead session', async () => {
  const updates: any[] = [];
  const payload = { update: async (args: any) => updates.push(args) } as any;

  const result = await releaseCheckoutLock(
    payload,
    { id: 7, status: 'abandoned', stripeSessionId: 'cs_old' },
    { expireSession: async () => 'expired' },
  );

  assert.deepStrictEqual(result, { released: true });
  assert.deepStrictEqual(updates, [
    { collection: 'carts', id: 7, data: { status: 'abandoned', stripeSessionId: null } },
  ]);
});

test('releaseCheckoutLock: converted carts and carts without a session are left alone', async () => {
  const payload = {
    update: async () => {
      throw new Error('must not write');
    },
  } as any;
  const expireSession = async () => {
    throw new Error('must not call Stripe');
  };

  for (const cart of [
    { id: 1, status: 'converted', stripeSessionId: 'cs_done' },
    { id: 2, status: 'active', stripeSessionId: null },
    { id: 3, status: 'checkout' },
    null,
  ]) {
    assert.deepStrictEqual(await releaseCheckoutLock(payload, cart as any, { expireSession }), { released: true });
  }
});
