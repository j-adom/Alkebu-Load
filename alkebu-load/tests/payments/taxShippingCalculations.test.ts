import assert from 'node:assert';
import test from 'node:test';

import {
  calculateTax,
  calculateOrderTotals,
  calculateTotalWeight,
} from '../../src/app/utils/taxShippingCalculations';

test('book-only orders use paperback fallback weight and media mail pricing', () => {
  const items = [
    {
      product: {
        pricing: {
          shippingWeight: 16,
        },
        editions: [
          {
            binding: 'paperback',
            pricing: {
              shippingWeight: null,
            },
          },
        ],
      },
      productType: 'books',
      quantity: 2,
      unitPrice: 1200,
    },
  ];

  const totalWeight = calculateTotalWeight(items as any);
  const totals = calculateOrderTotals(items as any, {
    state: 'TN',
    zip: '37208',
    country: 'US',
  });

  assert.strictEqual(totalWeight, 16);
  assert.strictEqual(totals.shipping.method, 'media-mail');
  assert.strictEqual(totals.shipping.cost, 413);
});

test('hardcover fallback remains one pound when no explicit edition weight exists', () => {
  const totalWeight = calculateTotalWeight([
    {
      product: {
        pricing: {
          shippingWeight: 16,
        },
        editions: [
          {
            binding: 'hardcover',
            pricing: {},
          },
        ],
      },
      productType: 'books',
      quantity: 1,
      unitPrice: 2500,
    },
  ] as any);

  assert.strictEqual(totalWeight, 16);
});

test('non-placeholder top-level book weights are preserved', () => {
  const totalWeight = calculateTotalWeight([
    {
      product: {
        pricing: {
          shippingWeight: 9,
        },
        editions: [
          {
            binding: 'paperback',
            pricing: {},
          },
        ],
      },
      productType: 'books',
      quantity: 1,
      unitPrice: 1800,
    },
  ] as any);

  assert.strictEqual(totalWeight, 9);
});

test('tennessee addresses tax book-only orders', () => {
  const tax = calculateTax([
    {
      product: {
        pricing: {
          shippingWeight: 8,
        },
      },
      productType: 'books',
      quantity: 2,
      unitPrice: 1500,
    },
  ] as any, {
    city: 'Nashville',
    state: 'TN',
    zip: '37208',
    country: 'US',
  });

  assert.strictEqual(tax.amount, 285);
  assert.strictEqual(tax.exempt, false);
});

test('out-of-state addresses do not collect tax', () => {
  const tax = calculateTax([
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
  ] as any, {
    city: 'Atlanta',
    state: 'GA',
    zip: '30303',
    country: 'US',
  });

  assert.strictEqual(tax.amount, 0);
  assert.strictEqual(tax.rate, 0);
});
