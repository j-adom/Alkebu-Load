import assert from 'node:assert';
import test from 'node:test';

import { processStripeWebhook } from '../../src/app/utils/stripeHelpers';

/**
 * A paid checkout.session.completed event whose cart cannot be found MUST
 * reject so the webhook route returns 500 and Stripe retries delivery.
 * Silently returning here acknowledges the webhook (200) and permanently
 * drops a paid order with no alert.
 */

const completedEvent = (sessionId: string) =>
  ({
    type: 'checkout.session.completed',
    data: { object: { id: sessionId } },
  }) as any;

test('checkout.session.completed rejects when no cart matches the session', async () => {
  const fakePayload = {
    find: async () => ({ docs: [] }),
  } as any;

  await assert.rejects(
    () => processStripeWebhook(fakePayload, completedEvent('cs_test_no_cart')),
    /cart/i,
  );
});

test('checkout.session.completed rejects when the cart has no line items', async () => {
  const fakePayload = {
    find: async (args: { collection: string }) => {
      if (args.collection === 'carts') {
        return { docs: [{ id: 42 }] };
      }
      // cart items (and anything else) come back empty
      return { docs: [] };
    },
  } as any;

  await assert.rejects(
    () => processStripeWebhook(fakePayload, completedEvent('cs_test_no_items')),
    /items/i,
  );
});
