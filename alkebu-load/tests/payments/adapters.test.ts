import assert from 'node:assert';
import test from 'node:test';

import { getAdapter, listAdapters } from '../../src/app/lib/payments/adapters';
import { stripeAdapter } from '../../src/app/lib/payments/stripeAdapter';

test('getAdapter returns stripe', () => {
  const adapter = getAdapter('stripe');
  assert.ok(adapter);
  assert.strictEqual(adapter?.slug, 'stripe');
});

test('getAdapter returns undefined for unsupported provider', () => {
  const adapter = getAdapter('square');
  assert.strictEqual(adapter, undefined);
});

test('stripe adapter initPayment uses injected createCheckoutSession', async () => {
  const stubCheckout = async (_payload: unknown, sessionData: any) => {
    assert.strictEqual(sessionData.cartId, 'cart_123');
    assert.strictEqual(sessionData.successUrl, 'https://example.com/success');
    assert.strictEqual(sessionData.cancelUrl, 'https://example.com/cancel');
    return {
      sessionId: 'sess_123',
      checkoutUrl: 'https://example.com/checkout',
    };
  };

  const adapter = stripeAdapter({ createCheckoutSessionImpl: stubCheckout as any });

  const result = await adapter.initPayment({} as any, {
    cartId: 'cart_123',
    customerEmail: 'user@example.com',
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
  });

  assert.strictEqual(result.provider, 'stripe');
  assert.strictEqual(result.providerPaymentId, 'sess_123');
  assert.strictEqual(result.checkoutUrl, 'https://example.com/checkout');
});

test('listAdapters includes stripe by default', () => {
  const adapters = listAdapters();
  const slugs = adapters.map((a) => a.slug);
  assert.ok(slugs.includes('stripe'));
});

test('square adapter is not registered without env and getAdapter returns undefined', () => {
  const adapter = getAdapter('square');
  assert.strictEqual(adapter, undefined);
});
