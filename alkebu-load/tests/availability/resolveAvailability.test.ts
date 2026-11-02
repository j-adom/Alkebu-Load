import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAvailability } from '../../src/app/utils/availability/resolveAvailability';

const book = (inventories: Record<string, unknown>[], availabilityStatus = 'available') => ({
  availabilityStatus,
  editions: inventories.map((inventory) => ({ inventory })),
});

test('in-store on-hand wins and reports source in-store', () => {
  assert.deepEqual(resolveAvailability(book([{ stockLevel: 3, ingramAvailable: true }])), {
    state: 'in_stock',
    source: 'in-store',
    shipEstimate: 'Ships in 3–8 days',
  });
});

test('Ingram availability on any edition makes the book in stock', () => {
  const r = resolveAvailability(book([{ stockLevel: 0 }, { stockLevel: 0, ingramAvailable: true }]));
  assert.equal(r.state, 'in_stock');
  assert.equal(r.source, 'ingram');
});

test('manual vendor flag makes the book in stock', () => {
  const r = resolveAvailability(book([{ stockLevel: 0, availableToOrder: true }]));
  assert.equal(r.state, 'in_stock');
  assert.equal(r.source, 'vendor');
});

test('once Ingram has been checked, nothing available falls back to request', () => {
  const checked = { stockLevel: 0, ingramAvailable: false, ingramCheckedAt: '2026-10-02T08:00:00.000Z' };
  assert.deepEqual(resolveAvailability(book([checked])), {
    state: 'request',
    source: 'none',
    shipEstimate: 'Ships in 3–8 days',
  });
});

// Transition rule: until the Ingram refresh has looked at a book, keep today's behavior
// (status 'available' is purchasable even at zero stock), or most of the catalog would
// flip to "Request" before any Ingram data exists.
test('a never-checked available book stays purchasable with source unchecked', () => {
  const r = resolveAvailability(book([{ stockLevel: 0 }]));
  assert.equal(r.state, 'in_stock');
  assert.equal(r.source, 'unchecked');
  assert.equal(resolveAvailability({}).state, 'in_stock');
});

test('request-only and discontinued books stay request even with stock signals', () => {
  assert.equal(resolveAvailability(book([{ stockLevel: 4 }], 'request-only')).state, 'request');
  assert.equal(resolveAvailability(book([{ stockLevel: 0, ingramAvailable: true }], 'request-only')).state, 'request');
  assert.equal(resolveAvailability(book([{ stockLevel: 0, availableToOrder: true }], 'discontinued')).state, 'request');
});
