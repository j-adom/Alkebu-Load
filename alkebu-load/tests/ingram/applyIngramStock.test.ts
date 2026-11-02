import assert from 'node:assert/strict';
import test from 'node:test';

import { applyStockToEditions, type CompactStock } from '../../src/app/utils/ingram/applyIngramStock';

const NOW = '2026-10-03T11:30:00.000Z';
const stock = (entries: Record<string, CompactStock>) => new Map(Object.entries(entries));

test('writes on-hand, availability and the check time for a matched edition', () => {
  const editions = [{ id: 'e1', isbn: '9780000000002', inventory: { stockLevel: 2 } }];
  const { editions: next, changed } = applyStockToEditions(editions, stock({ '9780000000002': { onHand: 57, available: true } }), {
    checkedAt: NOW,
    fullCoverage: false,
  });
  assert.equal(changed, true);
  assert.deepEqual(next[0].inventory, { stockLevel: 2, ingramOnHand: 57, ingramAvailable: true, ingramCheckedAt: NOW });
  assert.equal(next[0].id, 'e1');
});

test('matches editions by ISBN-10 too', () => {
  const editions = [{ isbn10: '0306406152' }];
  const { editions: next } = applyStockToEditions(editions, stock({ '9780306406157': { onHand: 3, available: true } }), {
    checkedAt: NOW,
    fullCoverage: false,
  });
  assert.equal(next[0].inventory.ingramOnHand, 3);
});

test('a full-coverage run marks catalog editions Ingram no longer carries as checked and unavailable', () => {
  const editions = [{ isbn: '9780000000002', inventory: { ingramOnHand: 9, ingramAvailable: true } }];
  const { editions: next, changed } = applyStockToEditions(editions, stock({}), { checkedAt: NOW, fullCoverage: true });
  assert.equal(changed, true);
  assert.deepEqual(next[0].inventory, { ingramOnHand: 0, ingramAvailable: false, ingramCheckedAt: NOW });
});

test('a partial run leaves unmatched editions untouched', () => {
  const editions = [{ isbn: '9780000000002', inventory: { ingramOnHand: 9 } }];
  const result = applyStockToEditions(editions, stock({}), { checkedAt: NOW, fullCoverage: false });
  assert.equal(result.changed, false);
  assert.equal(result.editions[0], editions[0]);
});

test('editions without a valid ISBN are never marked checked', () => {
  const editions = [{ isbn: 'not-an-isbn' }];
  const result = applyStockToEditions(editions, stock({}), { checkedAt: NOW, fullCoverage: true });
  assert.equal(result.changed, false);
});

test('an unchanged value with a recent check is not rewritten (saves a write per book)', () => {
  const recent = '2026-10-01T11:30:00.000Z';
  const editions = [{ isbn: '9780000000002', inventory: { ingramOnHand: 57, ingramAvailable: true, ingramCheckedAt: recent } }];
  const result = applyStockToEditions(editions, stock({ '9780000000002': { onHand: 57, available: true } }), {
    checkedAt: NOW,
    fullCoverage: true,
  });
  assert.equal(result.changed, false);
});

test('an unchanged value is re-stamped once its check is a week old', () => {
  const old = '2026-09-25T11:30:00.000Z';
  const editions = [{ isbn: '9780000000002', inventory: { ingramOnHand: 57, ingramAvailable: true, ingramCheckedAt: old } }];
  const result = applyStockToEditions(editions, stock({ '9780000000002': { onHand: 57, available: true } }), {
    checkedAt: NOW,
    fullCoverage: true,
  });
  assert.equal(result.changed, true);
  assert.equal(result.editions[0].inventory.ingramCheckedAt, NOW);
});
