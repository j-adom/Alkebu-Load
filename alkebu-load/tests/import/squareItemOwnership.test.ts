import assert from 'node:assert/strict';
import test from 'node:test';

import { assertSquareItemsUnclaimed, squareItemIdsOf } from '../../src/app/utils/squareItemOwnership';

const req = (claimedBy: Array<{ id: number }>, calls: any[] = []) =>
  ({
    payload: {
      find: async (args: any) => {
        calls.push(args);
        return { docs: claimedBy };
      },
    },
  }) as any;

test('squareItemIdsOf collects book-level and edition-level item ids', () => {
  assert.deepEqual(
    [...squareItemIdsOf({ squareItemId: 'A', editions: [{ squareItemId: 'B' }, { squareItemId: 'A' }, {}] })].sort(),
    ['A', 'B'],
  );
  assert.deepEqual([...squareItemIdsOf(undefined)], []);
});

test('a newly linked item already on another book is rejected', async () => {
  await assert.rejects(
    assertSquareItemsUnclaimed({
      data: { editions: [{ squareItemId: 'B' }] },
      originalDoc: { id: 1, editions: [] },
      req: req([{ id: 2 }]),
    }),
    (error: any) => /already linked to book 2/.test(error?.data?.errors?.[0]?.message ?? ''),
  );
});

test('only newly added ids are checked, and the book itself is excluded', async () => {
  const calls: any[] = [];
  await assertSquareItemsUnclaimed({
    data: { editions: [{ squareItemId: 'A' }, { squareItemId: 'B' }] },
    originalDoc: { id: 1, squareItemId: 'A', editions: [{ squareItemId: 'A' }] },
    req: req([], calls),
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].where.and[0], { id: { not_equals: 1 } });
  assert.deepEqual(calls[0].where.and[1].or, [
    { 'editions.squareItemId': { in: ['B'] } },
    { squareItemId: { in: ['B'] } },
  ]);
});

test('a write that adds no item ids makes no query', async () => {
  const calls: any[] = [];
  await assertSquareItemsUnclaimed({ data: { title: 'x' }, originalDoc: { id: 1, squareItemId: 'A' }, req: req([], calls) });
  await assertSquareItemsUnclaimed({ data: { editions: [{ squareItemId: 'A' }] }, originalDoc: { id: 1, squareItemId: 'A' }, req: req([], calls) });
  assert.equal(calls.length, 0);
});
