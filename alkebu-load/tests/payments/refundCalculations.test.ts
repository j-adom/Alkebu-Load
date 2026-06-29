import assert from 'node:assert';
import test from 'node:test';

import {
  orderSubtotal,
  itemsSubtotal,
  proratedTax,
  incrementalShipping,
  suggestedRefund,
  clampRefundAmount,
  remainingItemsAfter,
} from '../../src/app/utils/refundCalculations';

// A paperback resolves to 8oz (placeholder 16oz top-level + paperback edition).
const paperbackProduct = {
  pricing: { shippingWeight: 16 },
  editions: [{ binding: 'paperback', pricing: {} }],
};

const TN = { city: 'Nashville', state: 'TN', zip: '37208', country: 'US' };

// Two-line order: 2×$10 books + 1×$20 book → subtotal $40.
const order = {
  items: [
    { id: 'a', productType: 'books', quantity: 2, unitPrice: 1000, totalPrice: 2000, product: paperbackProduct },
    { id: 'b', productType: 'books', quantity: 1, unitPrice: 2000, totalPrice: 2000, product: paperbackProduct },
  ],
  taxAmount: 390,
  shippingAmount: 561,
  totalAmount: 4000 + 390 + 561,
  shippingAddress: TN,
};

test('orderSubtotal sums unitPrice × quantity across all lines', () => {
  assert.strictEqual(orderSubtotal(order as any), 4000);
});

test('itemsSubtotal totals only the selected quantity of selected lines', () => {
  assert.strictEqual(itemsSubtotal(order as any, [{ itemId: 'b', quantity: 1 }]), 2000);
  // Partial quantity of a multi-qty line.
  assert.strictEqual(itemsSubtotal(order as any, [{ itemId: 'a', quantity: 1 }]), 1000);
});

test('proratedTax allocates order tax by selected-subtotal share, rounded to cents', () => {
  // Select $20 of a $40 subtotal → half of $3.90 tax = 195¢.
  assert.strictEqual(proratedTax(order as any, [{ itemId: 'b', quantity: 1 }]), 195);
});

test('proratedTax rounds (does not truncate) a fractional cent', () => {
  // Select $10 of $40 → 1/4 of 390 = 97.5 → rounds to 98.
  assert.strictEqual(proratedTax(order as any, [{ itemId: 'a', quantity: 1 }]), 98);
});

test('proratedTax is zero when the order subtotal is zero (no divide-by-zero)', () => {
  const freeOrder = { ...order, items: [{ id: 'x', productType: 'books', quantity: 1, unitPrice: 0, product: paperbackProduct }] };
  assert.strictEqual(proratedTax(freeOrder as any, [{ itemId: 'x', quantity: 1 }]), 0);
});

test('remainingItemsAfter subtracts selected quantities and drops emptied lines', () => {
  const remaining = remainingItemsAfter(order as any, [{ itemId: 'b', quantity: 1 }]);
  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0].quantity, 2);
  assert.strictEqual((remaining[0] as any).productType, 'books');
});

test('incrementalShipping returns the full shipping paid when the whole order is refunded', () => {
  const all = [
    { itemId: 'a', quantity: 2 },
    { itemId: 'b', quantity: 1 },
  ];
  assert.strictEqual(incrementalShipping(order as any, all), 561);
});

test('incrementalShipping refunds the carrier-tier difference the removed items cost', () => {
  // 4 paperbacks = 32oz = 2 media-mail lb (487¢). Remove 2 → 16oz = 1 lb (413¢).
  const bookOrder = {
    items: [{ id: 'a', productType: 'books', quantity: 4, unitPrice: 1000, product: paperbackProduct }],
    taxAmount: 0,
    shippingAmount: 487,
    totalAmount: 4000 + 487,
    shippingAddress: TN,
  };
  assert.strictEqual(incrementalShipping(bookOrder as any, [{ itemId: 'a', quantity: 2 }]), 74);
});

test('incrementalShipping is zero on a free-shipping ($0) order', () => {
  const freeShip = { ...order, shippingAmount: 0 };
  assert.strictEqual(incrementalShipping(freeShip as any, [{ itemId: 'b', quantity: 1 }]), 0);
});

test('incrementalShipping clamps to zero when remaining cost exceeds shipping paid', () => {
  // Paid only 200¢ (discounted); remaining single book still costs 413¢ → no shipping refund.
  const discounted = { ...order, shippingAmount: 200 };
  assert.strictEqual(incrementalShipping(discounted as any, [{ itemId: 'b', quantity: 1 }]), 0);
});

test('suggestedRefund sums items subtotal, prorated tax, and incremental shipping', () => {
  const s = suggestedRefund(order as any, [{ itemId: 'b', quantity: 1 }]);
  assert.strictEqual(s.itemsSubtotal, 2000);
  assert.strictEqual(s.tax, 195);
  assert.strictEqual(s.total, s.itemsSubtotal + s.tax + s.shipping);
});

test('clampRefundAmount bounds a value to [0, remaining refundable]', () => {
  assert.strictEqual(clampRefundAmount(500, 1000), 500);
  assert.strictEqual(clampRefundAmount(1500, 1000), 1000); // over-refund capped
  assert.strictEqual(clampRefundAmount(-5, 1000), 0); // negative floored
});
