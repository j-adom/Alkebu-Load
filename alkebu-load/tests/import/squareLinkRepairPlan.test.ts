import assert from 'node:assert';
import test from 'node:test';

import { planSquareLinkRepair, type PlanBook, type SquareIndex } from '../../src/app/utils/squareLinkRepairPlan';

const book = (id: number, over: Partial<PlanBook>): PlanBook => ({
  id,
  title: `Book ${id}`,
  createdAt: '2026-03-08T00:00:00Z',
  updatedAt: '2026-03-08T00:00:00Z',
  importSource: 'csv-import',
  squareItemId: null,
  editions: [],
  ...over,
});

const index = (rows: Array<[variationId: string, itemId: string, ean?: string]>): SquareIndex => {
  const variations = new Map();
  const byEan = new Map();
  for (const [variationId, itemId, ean] of rows) {
    variations.set(variationId, { itemId, variationId });
    if (ean) byEan.set(ean, [...(byEan.get(ean) ?? []), { itemId, variationId }]);
  }
  return { variations, byEan };
};

const ISBN = '9780913543962';

test('a CSV-imported book with its variation id stored as the item id gets the real item id', () => {
  const plan = planSquareLinkRepair(
    [book(4764, { squareItemId: 'VAR', editions: [{ id: 'e1', isbn: ISBN, squareVariationId: 'VAR', squareItemId: 'VAR' }] })],
    index([['VAR', 'ITEM', ISBN]]),
  );
  assert.deepEqual(plan.repairs, [
    { bookId: 4764, squareItemId: 'ITEM', editions: [{ editionId: 'e1', squareItemId: 'ITEM', squareVariationId: 'VAR', via: 'variation' }] },
  ]);
  assert.equal(plan.counts.repaired, 1);
});

test('a manual book with a dead numeric id is relinked by its ISBN-10', () => {
  const plan = planSquareLinkRepair(
    [book(3202, { importSource: 'manual', squareItemId: '210000000351', editions: [{ id: 'e1', isbn: '0913543969', squareVariationId: '210000000351', squareItemId: null }] })],
    index([['VAR', 'ITEM', ISBN]]),
  );
  assert.equal(plan.repairs[0].editions[0].via, 'isbn');
  assert.equal(plan.repairs[0].editions[0].squareVariationId, 'VAR');
  assert.equal(plan.counts.relinkedByIsbn, 1);
});

test('a book whose links are already right is left alone', () => {
  const plan = planSquareLinkRepair(
    [book(1, { squareItemId: 'ITEM', editions: [{ id: 'e1', isbn: ISBN, squareVariationId: 'VAR', squareItemId: 'ITEM' }] })],
    index([['VAR', 'ITEM', ISBN]]),
  );
  assert.deepEqual(plan.repairs, []);
  assert.equal(plan.counts.alreadyCorrect, 1);
});

test('a Square-sync copy of an older book merges into the older one', () => {
  const plan = planSquareLinkRepair(
    [
      book(8154, { importSource: 'square-webhook', createdAt: '2026-11-01T00:00:00Z', squareItemId: 'ITEM', editions: [{ id: 'd1', isbn: ISBN, squareVariationId: 'VAR', squareItemId: 'ITEM' }] }),
      book(4764, { squareItemId: 'VAR', editions: [{ id: 'e1', isbn: ISBN, squareVariationId: 'VAR', squareItemId: 'VAR' }] }),
    ],
    index([['VAR', 'ITEM', ISBN]]),
  );
  assert.equal(plan.merges.length, 1);
  assert.equal(plan.merges[0].keeperId, 4764);
  assert.deepEqual(plan.merges[0].duplicateIds, [8154]);
  assert.equal(plan.merges[0].keeperEditions[0].squareItemId, 'ITEM');
  assert.deepEqual(plan.repairs, []);
});

test('two older books on one item are a conflict, never merged', () => {
  const plan = planSquareLinkRepair(
    [
      book(1, { editions: [{ id: 'a', isbn: ISBN, squareVariationId: 'VAR', squareItemId: null }] }),
      book(2, { importSource: 'manual', editions: [{ id: 'b', isbn: null, squareVariationId: 'VAR2', squareItemId: null }] }),
    ],
    index([['VAR', 'ITEM', ISBN], ['VAR2', 'ITEM']]),
  );
  assert.deepEqual(plan.merges, []);
  assert.deepEqual(plan.conflicts.map((c) => c.bookIds), [[1, 2]]);
});

test('an ISBN on two Square variations is ambiguous and not relinked', () => {
  const plan = planSquareLinkRepair(
    [book(1, { squareItemId: '2100', editions: [{ id: 'e1', isbn: ISBN, squareVariationId: '2100', squareItemId: null }] })],
    index([['V1', 'I1', ISBN], ['V2', 'I2', ISBN]]),
  );
  assert.deepEqual(plan.repairs, []);
  assert.equal(plan.counts.notInSquare, 1);
});

test('books with no Square link at all are ignored', () => {
  const plan = planSquareLinkRepair([book(1, { editions: [{ id: 'e1', isbn: ISBN, squareVariationId: null, squareItemId: null }] })], index([['VAR', 'ITEM', ISBN]]));
  assert.equal(plan.counts.notInSquare + plan.counts.repaired + plan.counts.alreadyCorrect, 0);
});
