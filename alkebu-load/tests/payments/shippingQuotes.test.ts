import assert from 'node:assert';
import test from 'node:test';

import { getShippingQuotes, isShippingQuoteExpired } from '../../src/app/utils/shippingQuotes';

const originalShippoToken = process.env.SHIPPO_API_TOKEN;

test.after(() => {
  if (originalShippoToken) {
    process.env.SHIPPO_API_TOKEN = originalShippoToken;
  } else {
    delete process.env.SHIPPO_API_TOKEN;
  }
});

test('book-only orders default to media mail in fallback quotes', async () => {
  delete process.env.SHIPPO_API_TOKEN;

  const quote = await getShippingQuotes({
    items: [
      {
        product: {
          editions: [
            {
              binding: 'paperback',
              pricing: {},
            },
          ],
        },
        productType: 'books',
        quantity: 1,
        unitPrice: 2500,
      },
    ] as any,
    shippingAddress: {
      street: '2721 Jefferson St',
      city: 'Nashville',
      state: 'TN',
      zip: '37208',
      country: 'US',
    },
    subtotal: 2500,
  });

  assert.strictEqual(quote.selectedOption.isMediaMail, true);
  assert.strictEqual(quote.selectedOption.service, 'Media Mail');
  assert.ok(quote.shippingOptions.some((option) => option.service === 'Standard'));
});

test('isShippingQuoteExpired treats missing and past quotes as expired', () => {
  assert.strictEqual(isShippingQuoteExpired(null), true);
  assert.strictEqual(isShippingQuoteExpired('2020-01-01T00:00:00.000Z'), true);
  assert.strictEqual(isShippingQuoteExpired('2999-01-01T00:00:00.000Z'), false);
});

test('book-only orders can switch away from media mail', async () => {
  delete process.env.SHIPPO_API_TOKEN;

  const quote = await getShippingQuotes({
    items: [
      {
        product: {
          editions: [
            {
              binding: 'paperback',
              pricing: {},
            },
          ],
        },
        productType: 'books',
        quantity: 1,
        unitPrice: 2500,
      },
    ] as any,
    shippingAddress: {
      street: '2721 Jefferson St',
      city: 'Nashville',
      state: 'TN',
      zip: '37208',
      country: 'US',
    },
    subtotal: 2500,
    selectedShippingRateId: 'fallback-expedited',
  });

  assert.strictEqual(quote.selectedShippingRateId, 'fallback-expedited');
  assert.strictEqual(quote.selectedOption.method, 'expedited');
  assert.strictEqual(quote.selectedOption.isMediaMail, false);
});

test('shippo API failures fall back to static rates when token is configured', async () => {
  process.env.SHIPPO_API_TOKEN = 'shippo_test_token';

  const quote = await getShippingQuotes({
    items: [
      {
        product: {
          editions: [
            {
              binding: 'paperback',
              pricing: {},
            },
          ],
        },
        productType: 'books',
        quantity: 1,
        unitPrice: 2500,
      },
    ] as any,
    shippingAddress: {
      street: '2721 Jefferson St',
      city: 'Nashville',
      state: 'TN',
      zip: '37208',
      country: 'US',
    },
    subtotal: 2500,
    fetchImpl: async () =>
      ({
        ok: false,
        json: async () => ({ detail: 'Invalid Shippo token' }),
      }) as any,
  });

  assert.strictEqual(quote.quoteSource, 'fallback');
  assert.strictEqual(quote.selectedOption.service, 'Media Mail');
});

test('empty Shippo rate responses fall back to static rates', async () => {
  process.env.SHIPPO_API_TOKEN = 'shippo_test_token';

  const quote = await getShippingQuotes({
    items: [
      {
        product: {
          pricing: {
            shippingWeight: 8,
          },
        },
        productType: 'books',
        quantity: 1,
        unitPrice: 2500,
      },
    ] as any,
    shippingAddress: {
      street: '2721 Jefferson St',
      city: 'Nashville',
      state: 'TN',
      zip: '37208',
      country: 'US',
    },
    subtotal: 2500,
    fetchImpl: async () =>
      ({
        ok: true,
        json: async () => ({ rates: [] }),
      }) as any,
  });

  assert.strictEqual(quote.quoteSource, 'fallback');
  assert.ok(quote.shippingOptions.some((option) => option.id === 'fallback-media-mail'));
});
