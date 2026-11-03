import assert from 'node:assert';
import test from 'node:test';

import { getShippingQuotes, isShippingQuoteExpired } from '../../src/app/utils/shippingQuotes';

const originalShippoToken = process.env.SHIPPO_API_TOKEN;
const originalShippoKey = process.env.SHIPPO_API_KEY;

const clearShippoEnv = () => {
  delete process.env.SHIPPO_API_TOKEN;
  delete process.env.SHIPPO_API_KEY;
};

test.after(() => {
  if (originalShippoToken) {
    process.env.SHIPPO_API_TOKEN = originalShippoToken;
  } else {
    delete process.env.SHIPPO_API_TOKEN;
  }
  if (originalShippoKey) {
    process.env.SHIPPO_API_KEY = originalShippoKey;
  } else {
    delete process.env.SHIPPO_API_KEY;
  }
});

test('book-only orders default to media mail in estimated quotes', async () => {
  clearShippoEnv();

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
  assert.strictEqual(quote.selectedOption.amount, 439);
  assert.ok(quote.shippingOptions.some((option) => option.service === 'Standard'));
});

test('isShippingQuoteExpired treats missing and past quotes as expired', () => {
  assert.strictEqual(isShippingQuoteExpired(null), true);
  assert.strictEqual(isShippingQuoteExpired('2020-01-01T00:00:00.000Z'), true);
  assert.strictEqual(isShippingQuoteExpired('2999-01-01T00:00:00.000Z'), false);
});

test('book-only orders can switch away from media mail', async () => {
  clearShippoEnv();

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
    selectedShippingRateId: 'best-available-expedited',
  });

  assert.strictEqual(quote.selectedShippingRateId, 'best-available-expedited');
  assert.strictEqual(quote.selectedOption.method, 'expedited');
  assert.strictEqual(quote.selectedOption.isMediaMail, false);
});

test('shippo API failures use estimated rates when token is configured', async () => {
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

  assert.strictEqual(quote.quoteSource, 'estimated');
  assert.strictEqual(quote.selectedOption.service, 'Media Mail');
});

test('empty Shippo rate responses use estimated rates', async () => {
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

  assert.strictEqual(quote.quoteSource, 'estimated');
  assert.ok(quote.shippingOptions.some((option) => option.id === 'best-available-media-mail'));
});

test('book-only estimated media mail is priced by total weight', async () => {
  clearShippoEnv();

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
        quantity: 3,
        unitPrice: 2000,
      },
    ] as any,
    shippingAddress: {
      street: '2721 Jefferson St',
      city: 'Nashville',
      state: 'TN',
      zip: '37208',
      country: 'US',
    },
    subtotal: 6000,
  });

  // 3 paperbacks × 8oz = 24oz → 2 lb → 513
  assert.strictEqual(quote.selectedOption.id, 'best-available-media-mail');
  assert.strictEqual(quote.selectedOption.amount, 513);
});

test('live Shippo quotes for book-only carts add table-priced Media Mail as the default', async () => {
  process.env.SHIPPO_API_TOKEN = 'shippo_test_token';

  const quote = await getShippingQuotes({
    items: [
      {
        product: { editions: [{ binding: 'hardcover', pricing: { shippingWeight: 26 } }] },
        productType: 'books',
        quantity: 1,
        unitPrice: 2500,
      },
    ] as any,
    shippingAddress: {
      street: '1600 Pennsylvania Ave NW',
      city: 'Washington',
      state: 'DC',
      zip: '20500',
      country: 'US',
    },
    subtotal: 2500,
    fetchImpl: async () =>
      ({
        ok: true,
        json: async () => ({
          rates: [
            {
              object_id: 'rate_ga',
              provider: 'USPS',
              amount: '6.65',
              estimated_days: 3,
              servicelevel: { name: 'Ground Advantage', token: 'usps_ground_advantage' },
            },
          ],
        }),
      }) as any,
  });

  assert.strictEqual(quote.quoteSource, 'shippo');
  assert.strictEqual(quote.selectedOption.id, 'best-available-media-mail');
  assert.strictEqual(quote.selectedOption.amount, 513);
  assert.ok(quote.shippingOptions.some((option) => option.id === 'rate_ga'));
});
