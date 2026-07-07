import assert from 'node:assert';
import test from 'node:test';

import { selectRecoveryCandidates } from '../../src/app/utils/stripeRecovery';
import { generateRecoveryAlertTemplate } from '../../src/app/utils/emailTemplates';

const NOW = Date.parse('2026-07-03T12:00:00Z');
const seconds = (iso: string) => Math.floor(Date.parse(iso) / 1000);

const session = (overrides: Record<string, unknown> = {}) => ({
  id: 'cs_a',
  payment_status: 'paid',
  created: seconds('2026-07-03T10:00:00Z'), // 2h old
  payment_intent: 'pi_a',
  ...overrides,
});

test('selectRecoveryCandidates keeps unmatched paid sessions', () => {
  const candidates = selectRecoveryCandidates([session()] as any, [], {
    now: NOW,
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].id, 'cs_a');
});

test('selectRecoveryCandidates drops unpaid sessions', () => {
  const candidates = selectRecoveryCandidates(
    [session({ payment_status: 'unpaid' })] as any,
    [],
    { now: NOW },
  );

  assert.equal(candidates.length, 0);
});

test('selectRecoveryCandidates drops sessions already matched by session id or payment intent', () => {
  const orders = [
    { payment: { stripeSessionId: 'cs_a' } },
    { payment: { stripePaymentIntentId: 'pi_b' } },
  ];
  const candidates = selectRecoveryCandidates(
    [session(), session({ id: 'cs_b', payment_intent: 'pi_b' })] as any,
    orders as any,
    { now: NOW },
  );

  assert.equal(candidates.length, 0);
});

test('selectRecoveryCandidates skips sessions younger than minAgeMinutes (webhook may still retry)', () => {
  const fresh = session({ created: seconds('2026-07-03T11:50:00Z') }); // 10 min old
  const candidates = selectRecoveryCandidates([fresh] as any, [], {
    now: NOW,
    minAgeMinutes: 30,
  });

  assert.equal(candidates.length, 0);
});

test('recovery alert template lists recovered order numbers and totals', () => {
  const template = generateRecoveryAlertTemplate({
    recovered: [
      { orderNumber: 'ALK-1234', totalAmount: 5499, guestEmail: 'reader@example.com' },
    ],
    scanned: 40,
    adminUrl: 'https://payload.alkebulanimages.com/admin/order-dashboard',
  });

  assert.match(template.subject, /recovered/i);
  assert.match(template.html, /ALK-1234/);
  assert.match(template.html, /54\.99/);
  assert.match(template.html, /order-dashboard/);
  assert.match(template.text, /ALK-1234/);
});
