import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyLineFulfillment,
  orderNeedsIngram,
  pickOrderedEdition,
} from '../../src/app/utils/orders/needsIngramOrder';

test('orderNeedsIngram is true when any line is Ingram-sourced', () => {
  assert.equal(orderNeedsIngram({ items: [{ fulfillmentSource: 'in-store' }, { fulfillmentSource: 'ingram' }] }), true);
  assert.equal(orderNeedsIngram({ items: [{ fulfillmentSource: 'in-store' }, { fulfillmentSource: 'vendor' }] }), false);
  assert.equal(orderNeedsIngram({}), false);
});

test('classifyLineFulfillment prefers store copies, then Ingram, then a vendor', () => {
  assert.equal(classifyLineFulfillment({ inventory: { stockLevel: 2 } }, 2), 'in-store');
  assert.equal(classifyLineFulfillment({ inventory: { stockLevel: 1, ingramAvailable: true } }, 2), 'ingram');
  assert.equal(classifyLineFulfillment({ inventory: { stockLevel: 0, availableToOrder: true } }, 1), 'vendor');
  assert.equal(classifyLineFulfillment({ inventory: { stockLevel: 0 } }, 1), undefined);
  assert.equal(classifyLineFulfillment(undefined, 1), undefined);
});

test('pickOrderedEdition matches the purchased ISBN, else the primary edition', () => {
  const book = {
    editions: [
      { isbn: '9780000000002', isPrimary: true },
      { isbn: '9790000000001' },
    ],
  };
  assert.equal(pickOrderedEdition(book, { isbn: '9790000000001' })?.isbn, '9790000000001');
  assert.equal(pickOrderedEdition(book, { isbn: '9781111111111' })?.isbn, '9780000000002');
  assert.equal(pickOrderedEdition(book, undefined)?.isbn, '9780000000002');
  assert.equal(pickOrderedEdition({}, undefined), undefined);
});
