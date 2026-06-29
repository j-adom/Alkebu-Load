import assert from 'node:assert';
import test from 'node:test';

import { generateRefundNotificationTemplate } from '../../src/app/utils/emailTemplates';

const base = {
  orderNumber: 'ALK-TEST-0001',
  customerName: 'Ada Lovelace',
  customerEmail: 'ada@example.com',
  refundAmount: 2195,
  reasonLabel: 'Out of print',
  items: [{ productTitle: 'The Souls of Black Folk', quantity: 1, amount: 2195 }],
};

test('refund email states the refunded amount and the human reason', () => {
  const tpl = generateRefundNotificationTemplate({ ...base, isPartial: true });
  assert.ok(tpl.subject.includes('ALK-TEST-0001'));
  assert.ok(tpl.html.includes('$21.95'));
  assert.ok(tpl.text.includes('$21.95'));
  assert.ok(tpl.html.includes('Out of print'));
  assert.ok(tpl.html.includes('The Souls of Black Folk'));
});

test('partial refund tells the customer the rest still ships', () => {
  const tpl = generateRefundNotificationTemplate({ ...base, isPartial: true });
  assert.ok(/rest of your order/i.test(tpl.html));
  assert.ok(/rest of your order/i.test(tpl.text));
});

test('full refund omits the "rest still ships" line', () => {
  const tpl = generateRefundNotificationTemplate({ ...base, isPartial: false });
  assert.ok(!/rest of your order/i.test(tpl.html));
});

test('optional staff note is included when present', () => {
  const tpl = generateRefundNotificationTemplate({
    ...base,
    isPartial: true,
    note: 'Sorry — our distributor discontinued this title.',
  });
  assert.ok(tpl.html.includes('Sorry — our distributor discontinued this title.'));
});
