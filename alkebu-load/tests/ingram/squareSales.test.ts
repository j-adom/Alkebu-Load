import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchSoldVariationIds } from '../../src/app/utils/ingram/squareSales';

function fakeSquare(locationIds: string[], pages: any[][]) {
  const calls: any[] = [];
  let page = 0;
  return {
    calls,
    client: {
      locations: { list: async () => ({ locations: locationIds.map((id) => ({ id })) }) },
      orders: {
        search: async (request: any) => {
          calls.push(request);
          const orders = pages[page] ?? [];
          page += 1;
          return { orders, cursor: page < pages.length ? `c${page}` : undefined };
        },
      },
    } as any,
  };
}

test('collects the latest sale per variation across pages', async () => {
  const { client, calls } = fakeSquare(['L1'], [
    [
      { closedAt: '2024-01-01T00:00:00Z', lineItems: [{ catalogObjectId: 'V1' }, { catalogObjectId: 'V2' }] },
      { closedAt: '2025-06-01T00:00:00Z', lineItems: [{ catalogObjectId: 'V1' }] },
    ],
    [{ closedAt: '2023-03-01T00:00:00Z', lineItems: [{ catalogObjectId: 'V3' }, { name: 'custom amount' }] }],
  ]);
  const { sold, orders } = await fetchSoldVariationIds(client, '2022-10-03T00:00:00Z');
  assert.equal(orders, 3);
  assert.deepEqual(Object.fromEntries(sold), {
    V1: '2025-06-01T00:00:00Z',
    V2: '2024-01-01T00:00:00Z',
    V3: '2023-03-01T00:00:00Z',
  });
  assert.deepEqual(calls[0].locationIds, ['L1']);
  assert.deepEqual(calls[0].query.filter.stateFilter.states, ['COMPLETED']);
  assert.equal(calls[0].query.filter.dateTimeFilter.closedAt.startAt, '2022-10-03T00:00:00Z');
  assert.equal(calls[1].cursor, 'c1');
});

test('searches locations in groups of 10 (Square limit)', async () => {
  const ids = Array.from({ length: 12 }, (_, i) => `L${i}`);
  const { client, calls } = fakeSquare(ids, []);
  await fetchSoldVariationIds(client, '2022-10-03T00:00:00Z');
  assert.deepEqual(calls.map((c) => c.locationIds.length), [10, 2]);
});
