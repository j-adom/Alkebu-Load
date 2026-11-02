import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getBookAvailabilityMessage,
  getBookAvailabilityStatus,
  isBookPurchasable,
} from '../src/lib/utils/bookAvailability.ts';

const book = (inventory, availabilityStatus = 'available') => ({
  availabilityStatus,
  editions: [{ isPrimary: true, inventory }],
});
const CHECKED = '2026-10-02T08:00:00.000Z';

test('one ship message regardless of where the copy comes from', () => {
  assert.equal(getBookAvailabilityMessage(book({ stockLevel: 4 })), 'Ships in 3–8 days');
  assert.equal(getBookAvailabilityMessage(book({ stockLevel: 0, ingramAvailable: true, ingramCheckedAt: CHECKED })), 'Ships in 3–8 days');
  assert.equal(getBookAvailabilityMessage(book({ stockLevel: 0, availableToOrder: true })), 'Ships in 3–8 days');
});

test('Ingram or vendor availability makes a zero-stock book purchasable', () => {
  assert.equal(isBookPurchasable(book({ stockLevel: 0, ingramAvailable: true, ingramCheckedAt: CHECKED })), true);
  assert.equal(isBookPurchasable(book({ stockLevel: 0, availableToOrder: true, ingramCheckedAt: CHECKED })), true);
});

test('never-checked books keep the pre-Ingram rule: purchasable at zero stock', () => {
  assert.equal(isBookPurchasable(book({ stockLevel: 0 })), true);
  assert.equal(getBookAvailabilityStatus(book({ stockLevel: 0 })), 'available');
});

test('checked with nothing able to fulfill it becomes a request', () => {
  const unfulfillable = book({ stockLevel: 0, ingramAvailable: false, ingramCheckedAt: CHECKED });
  assert.equal(isBookPurchasable(unfulfillable), false);
  assert.equal(getBookAvailabilityStatus(unfulfillable), 'request-only');
  assert.match(getBookAvailabilityMessage(unfulfillable), /by request/);
});

test('staff request-only and discontinued statuses still win', () => {
  assert.equal(isBookPurchasable(book({ stockLevel: 5 }, 'request-only')), false);
  assert.equal(getBookAvailabilityStatus(book({ stockLevel: 5 }, 'discontinued')), 'discontinued');
  assert.equal(getBookAvailabilityMessage(book({ stockLevel: 5 }, 'discontinued')), 'This title is no longer available.');
});
