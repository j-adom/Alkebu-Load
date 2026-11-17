import assert from 'node:assert';
import test from 'node:test';

import { processStripeWebhook } from '../../src/app/utils/stripeHelpers';

/**
 * Stripe re-delivers payment_intent.* events (automatic retries, out-of-order
 * delivery, a manual "Resend" in the Workbench). Those handlers must only move
 * an order forward: a late event must never drag a shipped order back to
 * "processing" or mark a paid order as failed/cancelled.
 */

type OrderFixture = {
  id: number;
  status?: string;
  payment?: {
    provider?: string;
    providerPaymentId?: string;
    stripePaymentIntentId?: string;
    paymentStatus?: string;
  };
};

function fakePayload(order: OrderFixture | null) {
  const updates: Array<{ collection: string; id: unknown; data: Record<string, unknown> }> = [];
  const payload = {
    find: async () => ({ docs: order ? [order] : [] }),
    update: async (args: { collection: string; id: unknown; data: Record<string, unknown> }) => {
      updates.push(args);
      return { ...order, ...args.data };
    },
  } as any;
  return { payload, updates };
}

const intentEvent = (type: string, id = 'pi_test_123') =>
  ({ type, data: { object: { id } } }) as any;

const succeeded = () => intentEvent('payment_intent.succeeded');
const failed = () => intentEvent('payment_intent.payment_failed');

test('payment_intent.succeeded on a shipped order leaves its status unchanged', async () => {
  const { payload, updates } = fakePayload({
    id: 1,
    status: 'shipped',
    payment: {
      provider: 'stripe',
      providerPaymentId: 'pi_test_123',
      stripePaymentIntentId: 'pi_test_123',
      paymentStatus: 'succeeded',
    },
  });

  await processStripeWebhook(payload, succeeded());

  assert.deepStrictEqual(updates, [], 'duplicate success on a shipped order must be a no-op');
});

test('payment_intent.succeeded never writes status on a fulfilled order, even if payment fields are stale', async () => {
  for (const status of ['shipped', 'delivered', 'completed', 'returned']) {
    const { payload, updates } = fakePayload({
      id: 2,
      status,
      payment: { stripePaymentIntentId: 'pi_test_123', paymentStatus: 'processing' },
    });

    await processStripeWebhook(payload, succeeded());

    assert.strictEqual(updates.length, 1, status);
    assert.ok(!('status' in updates[0].data), `status must not be written for a ${status} order`);
    assert.strictEqual(updates[0].data['payment.paymentStatus'], 'succeeded');
  }
});

test('payment_intent.succeeded does not turn a refunded payment back into succeeded', async () => {
  const { payload, updates } = fakePayload({
    id: 3,
    status: 'returned',
    payment: {
      provider: 'stripe',
      providerPaymentId: 'pi_test_123',
      stripePaymentIntentId: 'pi_test_123',
      paymentStatus: 'refunded',
    },
  });

  await processStripeWebhook(payload, succeeded());

  assert.deepStrictEqual(updates, []);
});

test('payment_intent.succeeded on a pending order still moves it to processing', async () => {
  const { payload, updates } = fakePayload({
    id: 4,
    status: 'pending',
    payment: { stripePaymentIntentId: 'pi_test_123', paymentStatus: 'pending' },
  });

  await processStripeWebhook(payload, succeeded());

  assert.strictEqual(updates.length, 1);
  assert.strictEqual(updates[0].collection, 'orders');
  assert.strictEqual(updates[0].id, 4);
  assert.deepStrictEqual(updates[0].data, {
    'payment.provider': 'stripe',
    'payment.providerPaymentId': 'pi_test_123',
    'payment.paymentStatus': 'succeeded',
    status: 'processing',
  });
});

test('payment_intent.succeeded on a freshly paid order moves it to processing', async () => {
  const { payload, updates } = fakePayload({
    id: 5,
    status: 'paid',
    payment: { stripePaymentIntentId: 'pi_test_123', paymentStatus: 'succeeded' },
  });

  await processStripeWebhook(payload, succeeded());

  assert.strictEqual(updates.length, 1);
  assert.strictEqual(updates[0].data.status, 'processing');
});

test('payment_intent.payment_failed on a succeeded order leaves it unchanged', async () => {
  for (const status of ['paid', 'processing', 'shipped', 'completed']) {
    const { payload, updates } = fakePayload({
      id: 6,
      status,
      payment: { stripePaymentIntentId: 'pi_test_123', paymentStatus: 'succeeded' },
    });

    await processStripeWebhook(payload, failed());

    assert.deepStrictEqual(updates, [], `stale failure must not touch a ${status} order`);
  }
});

test('payment_intent.payment_failed does not touch refunded payments', async () => {
  for (const paymentStatus of ['partially_refunded', 'refunded']) {
    const { payload, updates } = fakePayload({
      id: 7,
      status: 'paid',
      payment: { stripePaymentIntentId: 'pi_test_123', paymentStatus },
    });

    await processStripeWebhook(payload, failed());

    assert.deepStrictEqual(updates, [], paymentStatus);
  }
});

test('payment_intent.payment_failed on an unresolved pending order cancels it', async () => {
  const { payload, updates } = fakePayload({
    id: 8,
    status: 'pending',
    payment: { stripePaymentIntentId: 'pi_test_123', paymentStatus: 'pending' },
  });

  await processStripeWebhook(payload, failed());

  assert.strictEqual(updates.length, 1);
  assert.deepStrictEqual(updates[0].data, {
    'payment.paymentStatus': 'failed',
    status: 'cancelled',
  });
});

test('a duplicate payment_intent.payment_failed is a no-op', async () => {
  const { payload, updates } = fakePayload({
    id: 9,
    status: 'cancelled',
    payment: { stripePaymentIntentId: 'pi_test_123', paymentStatus: 'failed' },
  });

  await processStripeWebhook(payload, failed());

  assert.deepStrictEqual(updates, []);
});

test('payment_intent.succeeded after a failure revives the order it cancelled', async () => {
  const { payload, updates } = fakePayload({
    id: 10,
    status: 'cancelled',
    payment: { stripePaymentIntentId: 'pi_test_123', paymentStatus: 'failed' },
  });

  await processStripeWebhook(payload, succeeded());

  assert.strictEqual(updates.length, 1);
  assert.strictEqual(updates[0].data['payment.paymentStatus'], 'succeeded');
  assert.strictEqual(updates[0].data.status, 'processing');
});

test('payment_intent.succeeded leaves a staff-cancelled paid order cancelled', async () => {
  const { payload, updates } = fakePayload({
    id: 11,
    status: 'cancelled',
    payment: {
      provider: 'stripe',
      providerPaymentId: 'pi_test_123',
      stripePaymentIntentId: 'pi_test_123',
      paymentStatus: 'succeeded',
    },
  });

  await processStripeWebhook(payload, succeeded());

  assert.deepStrictEqual(updates, []);
});

test('payment_intent events with no matching order resolve without writing', async () => {
  const { payload, updates } = fakePayload(null);

  await processStripeWebhook(payload, succeeded());
  await processStripeWebhook(payload, failed());

  assert.deepStrictEqual(updates, []);
});
