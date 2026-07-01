import assert from 'node:assert';
import test from 'node:test';

import {
  NEEDS_ATTENTION_STATUSES,
  buildDraftRefund,
  lowStockWhere,
  needsAttentionWhere,
} from '../../src/plugins/mcp/logic';
import type { RefundOrder } from '../../src/app/utils/refundCalculations';

test('needsAttentionWhere targets paid + processing orders', () => {
  const where = needsAttentionWhere();
  assert.deepStrictEqual(where, { status: { in: ['paid', 'processing'] } });
  // Guard against accidentally including terminal states.
  assert.ok(!NEEDS_ATTENTION_STATUSES.includes('shipped' as never));
  assert.ok(!NEEDS_ATTENTION_STATUSES.includes('completed' as never));
});

test('lowStockWhere builds a stock-level threshold clause', () => {
  assert.deepStrictEqual(lowStockWhere(5), {
    'inventory.stockLevel': { less_than_equal: 5 },
  });
  assert.deepStrictEqual(lowStockWhere(0), {
    'inventory.stockLevel': { less_than_equal: 0 },
  });
});

// A two-line order: 2 books @ $10, 1 book @ $5. tax 15% of subtotal, $4 shipping.
const order: RefundOrder = {
  items: [
    { id: 'a', productType: 'book', quantity: 2, unitPrice: 1000, totalPrice: 2000 },
    { id: 'b', productType: 'book', quantity: 1, unitPrice: 500, totalPrice: 500 },
  ],
  taxAmount: 375, // 15% of 2500
  shippingAmount: 400,
  totalAmount: 3275,
  shippingAddress: null,
};

test('buildDraftRefund proposes a partial refund body with computed amounts', () => {
  const proposal = buildDraftRefund('order-1', order, [{ itemId: 'a', quantity: 1 }], 'damaged', 'spine bent');

  assert.strictEqual(proposal.draft, true);
  assert.strictEqual(proposal.endpoint, 'POST /api/refund');
  assert.strictEqual(proposal.body.orderId, 'order-1');
  assert.deepStrictEqual(proposal.body.items, [{ itemId: 'a', quantity: 1 }]);
  assert.strictEqual(proposal.body.reason, 'damaged');
  assert.strictEqual(proposal.body.note, 'spine bent');

  // 1 × $10 selected; tax prorated = round(375 * 1000 / 2500) = 150.
  assert.strictEqual(proposal.computed.itemsSubtotal, 1000);
  assert.strictEqual(proposal.computed.tax, 150);
  assert.match(proposal.note, /DRAFT ONLY/);
});

test('buildDraftRefund with no items proposes a whole-order refund (no items in body)', () => {
  const proposal = buildDraftRefund('order-1', order, undefined, 'customer_request');

  // Whole-order: body omits items (route treats absent items as full refund).
  assert.strictEqual('items' in proposal.body, false);
  // Computed over every line: full subtotal 2500 + full tax 375 + full shipping 400.
  assert.strictEqual(proposal.computed.itemsSubtotal, 2500);
  assert.strictEqual(proposal.computed.tax, 375);
  assert.strictEqual(proposal.computed.shipping, 400);
  assert.strictEqual(proposal.computed.total, 3275);
});

test('buildDraftRefund never emits an execute/side-effecting endpoint', () => {
  const proposal = buildDraftRefund('order-1', order, undefined, 'other');
  // The tool must only ever propose — the body is for a human to POST.
  assert.strictEqual(proposal.endpoint, 'POST /api/refund');
  assert.strictEqual(proposal.draft, true);
});
