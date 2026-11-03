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

const NASHVILLE = {
  street: '2721 Jefferson St',
  city: 'Nashville',
  state: 'TN',
  zip: '37208',
  country: 'US',
};

const paperbackLine = (quantity: number, unitPrice: number) => ({
  product: { editions: [{ binding: 'paperback', pricing: {} }] },
  productType: 'books',
  quantity,
  unitPrice,
});

test('free shipping offers one free option and prices other methods as upgrades', async () => {
  clearShippoEnv();

  // 4 × $25 paperbacks = $100, over the $75 default threshold; 32oz → 2 lb Media Mail = 513
  const quote = await getShippingQuotes({
    items: [paperbackLine(4, 2500)] as any,
    shippingAddress: NASHVILLE,
    subtotal: 10000,
  });

  const free = quote.shippingOptions.filter((option) => option.amount === 0);
  assert.strictEqual(free.length, 1, 'exactly one free option');
  assert.strictEqual(free[0].isFreeShipping, true);
  assert.strictEqual(free[0].isMediaMail, true, 'free option ships Media Mail');
  assert.strictEqual(quote.selectedOption.id, free[0].id, 'free option is preselected');
  assert.strictEqual(quote.shippingOptions[0].id, free[0].id, 'free option listed first');

  // Estimated TN standard for 2 lb = 599 + 199 = 798 → upgrade 798 - 513 = 285
  const standard = quote.shippingOptions.find((option) => option.id === 'best-available-standard');
  assert.strictEqual(standard?.amount, 285);
  assert.ok(quote.shippingOptions.every((option) => option.isFreeShipping || option.amount > 0));
});

test('free shipping on a live Shippo quote charges only the difference for faster methods', async () => {
  process.env.SHIPPO_API_TOKEN = 'shippo_test_token';

  const quote = await getShippingQuotes({
    items: [paperbackLine(4, 2500)] as any,
    shippingAddress: NASHVILLE,
    subtotal: 10000,
    fetchImpl: async () =>
      ({
        ok: true,
        json: async () => ({
          rates: [
            { object_id: 'rate_ga', provider: 'USPS', amount: '6.65', estimated_days: 3, servicelevel: { name: 'Ground Advantage', token: 'usps_ground_advantage' } },
            { object_id: 'rate_pri', provider: 'USPS', amount: '9.22', estimated_days: 2, servicelevel: { name: 'Priority Mail', token: 'usps_priority' } },
          ],
        }),
      }) as any,
  });

  assert.strictEqual(quote.selectedOption.isFreeShipping, true);
  assert.strictEqual(quote.selectedOption.amount, 0);
  assert.strictEqual(quote.shippingOptions.find((o) => o.id === 'rate_ga')?.amount, 665 - 513);
  assert.strictEqual(quote.shippingOptions.find((o) => o.id === 'rate_pri')?.amount, 922 - 513);
});

test('non-book carts default to the cheapest rate', async () => {
  process.env.SHIPPO_API_TOKEN = 'shippo_test_token';

  const quote = await getShippingQuotes({
    items: [{ product: { pricing: { shippingWeight: 4 } }, productType: 'wellness-lifestyle', quantity: 1, unitPrice: 2000 }] as any,
    shippingAddress: NASHVILLE,
    subtotal: 2000,
    fetchImpl: async () =>
      ({
        ok: true,
        json: async () => ({
          rates: [
            { object_id: 'rate_pri', provider: 'USPS', amount: '9.22', estimated_days: 2, servicelevel: { name: 'Priority Mail', token: 'usps_priority' } },
            { object_id: 'rate_saver', provider: 'UPS', amount: '6.00', estimated_days: 3, servicelevel: { name: 'Ground Saver', token: 'ups_ground_saver' } },
          ],
        }),
      }) as any,
  });

  assert.strictEqual(quote.selectedOption.id, 'rate_saver');
  assert.strictEqual(quote.shippingOptions[0].id, 'rate_saver', 'cheapest listed first');
  assert.ok(quote.shippingOptions.every((option) => !option.isFreeShipping));
});
