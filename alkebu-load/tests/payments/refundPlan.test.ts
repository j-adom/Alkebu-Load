import assert from 'node:assert';
import test from 'node:test';

import { buildRefundPlan } from '../../src/app/utils/refundCalculations';

const paperbackProduct = {
  pricing: { shippingWeight: 16 },
  editions: [{ binding: 'paperback', pricing: {} }],
};
const TN = { city: 'Nashville', state: 'TN', zip: '37208', country: 'US' };

function makeOrder(overrides: any = {}) {
  return {
    items: [
      { id: 'a', productTitle: 'Book A', productType: 'books', quantity: 2, unitPrice: 1000, refundedQuantity: 0, product: paperbackProduct },
      { id: 'b', productTitle: 'Book B', productType: 'books', quantity: 1, unitPrice: 2000, refundedQuantity: 0, product: paperbackProduct },
    ],
    taxAmount: 390,
    shippingAmount: 561,
    totalAmount: 4951, // 4000 + 390 + 561
    shippingAddress: TN,
    refunds: [],
    ...overrides,
  };
}

test('whole-order refund (no items) plans the full remaining total', () => {
  const plan = buildRefundPlan(makeOrder() as any, { reason: 'customer_request' });
  assert.strictEqual(plan.ok, true);
  if (!plan.ok) return;
  assert.strictEqual(plan.amount, 4951);
  assert.strictEqual(plan.isPartial, false);
  assert.strictEqual(plan.paymentStatus, 'refunded');
  assert.strictEqual(plan.newOrderStatus, 'returned');
});

test('per-item refund plans subtotal + prorated tax + incremental shipping', () => {
  const plan = buildRefundPlan(makeOrder() as any, {
    reason: 'out_of_print',
    items: [{ itemId: 'b', quantity: 1 }],
  });
  assert.ok(plan.ok);
  if (!plan.ok) return;
  // $20 item + half of $3.90 tax (195) + incremental shipping
  assert.strictEqual(plan.breakdown.itemsSubtotal, 2000);
  assert.strictEqual(plan.breakdown.tax, 195);
  assert.strictEqual(plan.amount, plan.breakdown.total);
  assert.strictEqual(plan.isPartial, true);
  assert.strictEqual(plan.paymentStatus, 'partially_refunded');
  assert.strictEqual(plan.newOrderStatus, undefined);
  assert.strictEqual(plan.reasonLabel, 'Out of print');
});

test('a fully-refunded line is flagged do-not-ship; partial line is not', () => {
  const plan = buildRefundPlan(makeOrder() as any, {
    reason: 'out_of_print',
    items: [
      { itemId: 'a', quantity: 1 }, // 1 of 2 → still shippable
      { itemId: 'b', quantity: 1 }, // 1 of 1 → do not ship
    ],
  });
  assert.ok(plan.ok);
  if (!plan.ok) return;
  const a = plan.itemUpdates.find((u) => u.itemId === 'a');
  const b = plan.itemUpdates.find((u) => u.itemId === 'b');
  assert.strictEqual(a?.refundedQuantity, 1);
  assert.strictEqual(a?.doNotShip, false);
  assert.strictEqual(b?.refundedQuantity, 1);
  assert.strictEqual(b?.doNotShip, true);
});

test('amountOverride is honored but capped at remaining refundable', () => {
  const plan = buildRefundPlan(makeOrder() as any, {
    reason: 'other',
    items: [{ itemId: 'a', quantity: 1 }],
    amountOverride: 999999,
  });
  assert.ok(plan.ok);
  if (!plan.ok) return;
  assert.strictEqual(plan.amount, 4951); // capped at full remaining
  assert.strictEqual(plan.isPartial, false);
});

test('rejects an unknown reason', () => {
  const plan = buildRefundPlan(makeOrder() as any, { reason: 'made_up' as any });
  assert.strictEqual(plan.ok, false);
  if (plan.ok) return;
  assert.strictEqual(plan.status, 400);
});

test('rejects an item id that is not on the order', () => {
  const plan = buildRefundPlan(makeOrder() as any, {
    reason: 'damaged',
    items: [{ itemId: 'zzz', quantity: 1 }],
  });
  assert.strictEqual(plan.ok, false);
});

test('rejects a quantity beyond what remains unrefunded on the line', () => {
  const order = makeOrder({
    items: [
      { id: 'a', productTitle: 'Book A', productType: 'books', quantity: 2, unitPrice: 1000, refundedQuantity: 1, product: paperbackProduct },
    ],
  });
  // Only 1 left unrefunded, asking for 2.
  const plan = buildRefundPlan(order as any, { reason: 'damaged', items: [{ itemId: 'a', quantity: 2 }] });
  assert.strictEqual(plan.ok, false);
});

test('rejects when nothing refundable remains', () => {
  const order = makeOrder({ refunds: [{ amount: 4951 }] });
  const plan = buildRefundPlan(order as any, { reason: 'customer_request' });
  assert.strictEqual(plan.ok, false);
});

test('second partial refund derives remaining from prior refunds', () => {
  const order = makeOrder({
    items: [
      { id: 'a', productTitle: 'Book A', productType: 'books', quantity: 2, unitPrice: 1000, refundedQuantity: 1, product: paperbackProduct },
      { id: 'b', productTitle: 'Book B', productType: 'books', quantity: 1, unitPrice: 2000, refundedQuantity: 0, product: paperbackProduct },
    ],
    refunds: [{ amount: 1200 }],
  });
  const plan = buildRefundPlan(order as any, { reason: 'out_of_print', items: [{ itemId: 'a', quantity: 1 }] });
  assert.ok(plan.ok);
  if (!plan.ok) return;
  assert.strictEqual(plan.itemUpdates[0].refundedQuantity, 2);
  assert.strictEqual(plan.itemUpdates[0].doNotShip, true);
  assert.ok(plan.amount <= 4951 - 1200); // never exceeds remaining
});
