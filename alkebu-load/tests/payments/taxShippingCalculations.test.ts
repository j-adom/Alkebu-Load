import assert from 'node:assert';
import test from 'node:test';

import {
  calculateTax,
  calculateOrderTotals,
  calculateTotalWeight,
  calculateItemsShippingCost,
} from '../../src/app/utils/taxShippingCalculations';

const paperback = (quantity: number, unitPrice: number) => ({
  product: { pricing: { shippingWeight: 16 }, editions: [{ binding: 'paperback', pricing: {} }] },
  productType: 'books',
  quantity,
  unitPrice,
});

const jewelry = (quantity: number, unitPrice: number) => ({
  product: { pricing: { shippingWeight: 2 } },
  productType: 'fashion-jewelry',
  quantity,
  unitPrice,
});

test('calculateItemsShippingCost: book-only set uses media mail by weight', () => {
  // One paperback resolves to 8oz → 1 billable lb → media mail tier 1 = 439
  assert.strictEqual(calculateItemsShippingCost([paperback(1, 1200)] as any, 'TN'), 439);
});

test('calculateItemsShippingCost: two paperbacks (16oz) still one media-mail pound', () => {
  assert.strictEqual(calculateItemsShippingCost([paperback(2, 1200)] as any, 'TN'), 439);
});

test('calculateItemsShippingCost: mixed cart falls back to standard weight-based rates', () => {
  // book (8oz) + jewelry (2oz) = 10oz → 1 lb, TN local standard base = 599
  assert.strictEqual(
    calculateItemsShippingCost([paperback(1, 1200), jewelry(1, 3000)] as any, 'TN'),
    599,
  );
});

test('calculateItemsShippingCost: empty set costs nothing', () => {
  assert.strictEqual(calculateItemsShippingCost([] as any, 'TN'), 0);
});

test('calculateItemsShippingCost: ignores the free-shipping threshold (deterministic subset cost)', () => {
  // A large book-only subtotal would ship free in calculateOrderTotals, but the
  // subset primitive must return the real carrier cost so refund math can diff it.
  assert.strictEqual(calculateItemsShippingCost([paperback(1, 50000)] as any, 'TN'), 439);
});

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
  assert.strictEqual(totals.shipping.cost, 439);
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

test('wellness cart item resolves weight from the selected variation, not the 4oz default', () => {
  const totalWeight = calculateTotalWeight([
    {
      product: {
        variations: [
          { sku: 'SOAP-SMALL', weight: 6 },
          { sku: 'SOAP-LARGE', weight: 18 },
        ],
      },
      productType: 'wellness-lifestyle',
      quantity: 1,
      unitPrice: 1200,
      sku: 'SOAP-LARGE',
    },
  ] as any);

  assert.strictEqual(totalWeight, 18);
});

test('wellness cart item with no sku match falls back to the 4oz default', () => {
  const totalWeight = calculateTotalWeight([
    {
      product: {
        variations: [{ sku: 'SOAP-LARGE', weight: 18 }],
      },
      productType: 'wellness-lifestyle',
      quantity: 1,
      unitPrice: 1200,
      // no sku on the cart item — can't identify which variation was selected
    },
  ] as any);

  assert.strictEqual(totalWeight, 4);
});

test('wellness cart item whose matched variation has no weight set falls back to the default (not 0)', () => {
  const totalWeight = calculateTotalWeight([
    {
      product: {
        variations: [{ sku: 'SOAP-UNWEIGHED' }],
      },
      productType: 'wellness-lifestyle',
      quantity: 1,
      unitPrice: 1200,
      sku: 'SOAP-UNWEIGHED',
    },
  ] as any);

  assert.strictEqual(totalWeight, 4);
});

test('oils cart item resolves weight from the selected variation, not the 3oz default', () => {
  const totalWeight = calculateTotalWeight([
    {
      product: {
        variations: [{ sku: 'OIL-2OZ', weight: 5 }],
      },
      productType: 'oils-incense',
      quantity: 1,
      unitPrice: 800,
      sku: 'OIL-2OZ',
    },
  ] as any);

  assert.strictEqual(totalWeight, 5);
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

const book = (binding: string, editionWeight: number | undefined, quantity = 1) => ({
  product: { editions: [{ binding, pricing: editionWeight === undefined ? {} : { shippingWeight: editionWeight } }] },
  productType: 'books',
  quantity,
  unitPrice: 2000,
});

test('book weights are floored at half a pound for paperback and a pound for hardcover', () => {
  assert.strictEqual(calculateTotalWeight([book('paperback', 4)] as any), 8);
  assert.strictEqual(calculateTotalWeight([book('mass-market', 5)] as any), 8);
  assert.strictEqual(calculateTotalWeight([book('hardcover', 10)] as any), 16);
});

test('book weights above the minimum use the recorded weight', () => {
  assert.strictEqual(calculateTotalWeight([book('paperback', 13)] as any), 13);
  assert.strictEqual(calculateTotalWeight([book('hardcover', 26)] as any), 26);
});

test('digital bindings have no minimum weight', () => {
  assert.strictEqual(calculateTotalWeight([book('ebook', undefined)] as any), 0);
});

test('media mail follows the USPS table by real total weight', () => {
  // 26oz hardcover → 2 lb → 513
  assert.strictEqual(calculateItemsShippingCost([book('hardcover', 26)] as any, 'TN'), 513);
  // 3 × 20oz hardcovers = 60oz → 4 lb → 660
  assert.strictEqual(calculateItemsShippingCost([book('hardcover', 20, 3)] as any, 'TN'), 660);
  // 10 lb boundary and the 70 lb maximum
  assert.strictEqual(calculateItemsShippingCost([book('hardcover', 160)] as any, 'TN'), 1102);
  assert.strictEqual(calculateItemsShippingCost([book('hardcover', 70 * 16)] as any, 'TN'), 5523);
});
