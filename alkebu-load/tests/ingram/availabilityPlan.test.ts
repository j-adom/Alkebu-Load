import assert from 'node:assert/strict';
import test from 'node:test';

import { planBookAvailability } from '../../src/app/utils/ingram/availabilityPlan';

const NOW = '2026-10-03T11:30:00.000Z';
const stock = (entries: Record<string, { onHand: number; available: boolean }>) => new Map(Object.entries(entries));
const book = (editions: any[], availabilityStatus = 'available') => ({ id: 1, title: 'T', availabilityStatus, editions });

test('a buyable book Ingram can supply stays buyable', () => {
  const plan = planBookAvailability(book([{ isbn: '9780000000002', inventory: { stockLevel: 0 } }]), stock({ '9780000000002': { onHand: 40, available: true } }), {
    checkedAt: NOW,
    fullCoverage: true,
  });
  assert.equal(plan.before, 'in_stock');
  assert.equal(plan.after, 'in_stock');
  assert.equal(plan.changed, true);
  assert.equal(plan.transition, 'stays-buyable');
});

test('zero stock and not in Ingram flips to request, with the reason', () => {
  const plan = planBookAvailability(book([{ isbn: '9780000000002', inventory: { stockLevel: 0 } }]), stock({}), {
    checkedAt: NOW,
    fullCoverage: true,
  });
  assert.equal(plan.transition, 'buyable-to-request');
  assert.equal(plan.reason, 'not-carried-by-ingram');
});

test('Ingram carries it but cannot supply it: reason says so', () => {
  const plan = planBookAvailability(book([{ isbn: '9780000000002' }]), stock({ '9780000000002': { onHand: 0, available: false } }), {
    checkedAt: NOW,
    fullCoverage: true,
  });
  assert.equal(plan.transition, 'buyable-to-request');
  assert.equal(plan.reason, 'ingram-cannot-supply');
});

test('store stock keeps a book buyable whatever Ingram says', () => {
  const plan = planBookAvailability(book([{ isbn: '9780000000002', inventory: { stockLevel: 2 } }]), stock({}), {
    checkedAt: NOW,
    fullCoverage: true,
  });
  assert.equal(plan.transition, 'stays-buyable');
});

test('request-only and discontinued books are left completely untouched', () => {
  for (const status of ['request-only', 'discontinued']) {
    const input = book([{ isbn: '9780000000002' }], status);
    const plan = planBookAvailability(input, stock({ '9780000000002': { onHand: 40, available: true } }), {
      checkedAt: NOW,
      fullCoverage: true,
    });
    assert.equal(plan.protected, true);
    assert.equal(plan.changed, false);
    assert.equal(plan.editions, input.editions);
    assert.equal(plan.transition, 'protected');
  }
});

test('a recent in-store sale rescues a book that would flip, flagging only the sold edition', () => {
  const editions = [
    { isbn: '9780000000002', squareVariationId: 'VAR-SOLD' },
    { isbn: '9790000000001', squareVariationId: 'VAR-NEVER' },
  ];
  const plan = planBookAvailability(book(editions), stock({}), {
    checkedAt: NOW,
    fullCoverage: true,
    soldVariationIds: new Map([['VAR-SOLD', '2024-05-01T00:00:00Z']]),
  });
  assert.equal(plan.transition, 'rescued-by-sales');
  assert.equal(plan.after, 'in_stock');
  assert.equal(plan.lastSoldAt, '2024-05-01T00:00:00Z');
  assert.equal(plan.editions[0].inventory.availableToOrder, true);
  assert.equal(plan.editions[1].inventory?.availableToOrder, undefined);
});

test('sales never touch books that stay buyable anyway', () => {
  const plan = planBookAvailability(book([{ isbn: '9780000000002', squareVariationId: 'VAR-SOLD', inventory: { stockLevel: 3 } }]), stock({}), {
    checkedAt: NOW,
    fullCoverage: true,
    soldVariationIds: new Map([['VAR-SOLD', '2024-05-01T00:00:00Z']]),
  });
  assert.equal(plan.transition, 'stays-buyable');
  assert.equal(plan.editions[0].inventory.availableToOrder, undefined);
});

test('a book already flagged available-to-order by staff stays buyable', () => {
  const plan = planBookAvailability(book([{ isbn: '9780000000002', inventory: { availableToOrder: true } }]), stock({}), {
    checkedAt: NOW,
    fullCoverage: true,
  });
  assert.equal(plan.transition, 'stays-buyable');
});

test('a website sale rescues the edition with the ISBN that was bought', () => {
  const editions = [
    { isbn: '9780000000002', isPrimary: true },
    { isbn: '9790000000001' },
  ];
  const plan = planBookAvailability({ id: 7, availabilityStatus: 'available', editions }, stock({}), {
    checkedAt: NOW,
    fullCoverage: true,
    onlineSales: new Map([['7', { lastSoldAt: '2025-02-01T00:00:00Z', isbns: new Set(['9790000000001']) }]]),
  });
  assert.equal(plan.transition, 'rescued-by-sales');
  assert.equal(plan.saleSource, 'online');
  assert.equal(plan.editions[0].inventory?.availableToOrder, undefined);
  assert.equal(plan.editions[1].inventory.availableToOrder, true);
});

test('a website sale with no matching ISBN flags the primary edition', () => {
  const editions = [{ isbn: '9790000000001' }, { isbn: '9780000000002', isPrimary: true }];
  const plan = planBookAvailability({ id: 8, availabilityStatus: 'available', editions }, stock({}), {
    checkedAt: NOW,
    fullCoverage: true,
    onlineSales: new Map([['8', { lastSoldAt: '2025-02-01T00:00:00Z', isbns: new Set() }]]),
  });
  assert.equal(plan.editions[1].inventory.availableToOrder, true);
  assert.equal(plan.editions[0].inventory?.availableToOrder, undefined);
});

test('in-store and website sales together report "both" and the latest date', () => {
  const plan = planBookAvailability(
    { id: 9, availabilityStatus: 'available', editions: [{ isbn: '9780000000002', squareVariationId: 'V' }] },
    stock({}),
    {
      checkedAt: NOW,
      fullCoverage: true,
      soldVariationIds: new Map([['V', '2023-01-01T00:00:00Z']]),
      onlineSales: new Map([['9', { lastSoldAt: '2025-06-01T00:00:00Z', isbns: new Set(['9780000000002']) }]]),
    },
  );
  assert.equal(plan.saleSource, 'both');
  assert.equal(plan.lastSoldAt, '2025-06-01T00:00:00Z');
});

test('a pre-Payload (Snipcart) sale rescues the edition with that ISBN', () => {
  const editions = [{ isbn: '9780000000002' }, { isbn10: '0306406152' }];
  const plan = planBookAvailability({ id: 12, availabilityStatus: 'available', editions }, stock({}), {
    checkedAt: NOW,
    fullCoverage: true,
    soldEans: new Map([['9780306406157', '2024-08-01T10:00:00.000Z']]),
  });
  assert.equal(plan.transition, 'rescued-by-sales');
  assert.equal(plan.saleSource, 'online');
  assert.equal(plan.lastSoldAt, '2024-08-01T10:00:00.000Z');
  assert.equal(plan.editions[0].inventory?.availableToOrder, undefined);
  assert.equal(plan.editions[1].inventory.availableToOrder, true);
});
