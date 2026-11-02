import assert from 'node:assert';
import test from 'node:test';

import {
  fetchSoldVariationIds,
  fetchVariationTracking,
  planUntrackedAvailability,
} from '../../src/app/utils/wellnessUntrackedAvailability';

const doc = {
  id: 7,
  name: 'Scented Oil',
  slug: 'scented-oil',
  variations: [
    { id: 'r1', sku: 'AMB', scent: 'Amber', variantName: '1/4 oz', squareVariationId: 'V1', stock: 0, isAvailable: true, weight: 2 },
    { id: 'r2', sku: 'MSK', scent: 'Musk', variantName: '1/4 oz', squareVariationId: 'V2', stock: 0, isAvailable: true },
    { id: 'r3', sku: 'SHEA', scent: 'Shea', squareVariationId: 'V3', stock: 4, isAvailable: false },
    { id: 'r4', sku: 'MANUAL', scent: 'Hand-added' },
    { id: 'r5', sku: 'GONE', squareVariationId: 'V-DELETED', isAvailable: true },
  ],
};

const tracking = new Map([
  ['V1', false],
  ['V2', false],
  ['V3', true],
]);
const sold = new Map([['V1', '2026-09-14T18:00:00Z']]);

test('untracked + sold -> available, untracked + unsold -> unavailable, tracked keeps its fields', () => {
  const plan = planUntrackedAvailability('oils-incense', doc, tracking, sold);
  const byId = Object.fromEntries(plan.variations.map((v) => [v.id, v]));

  assert.deepStrictEqual(
    { trackInventory: byId.r1.trackInventory, isAvailable: byId.r1.isAvailable, weight: byId.r1.weight, stock: byId.r1.stock },
    { trackInventory: false, isAvailable: true, weight: 2, stock: 0 },
  );
  assert.strictEqual(byId.r2.trackInventory, false);
  assert.strictEqual(byId.r2.isAvailable, false);
  // Tracked: staff's isAvailable: false and the stock are left alone.
  assert.strictEqual(byId.r3.trackInventory, true);
  assert.strictEqual(byId.r3.isAvailable, false);
  assert.strictEqual(byId.r3.stock, 4);
  // Not in Square: same object, untouched.
  assert.strictEqual(byId.r4, doc.variations[3]);
  assert.strictEqual(byId.r5, doc.variations[4]);
  // Row ids are kept so Payload updates rather than recreates the rows.
  assert.deepStrictEqual(plan.variations.map((v) => v.id), ['r1', 'r2', 'r3', 'r4', 'r5']);

  assert.deepStrictEqual(plan.counts, {
    variations: 5,
    tracked: 1,
    untracked: 2,
    soldAvailable: 1,
    scentSoldAvailable: 0,
    unsoldUnavailable: 1,
    notInSquare: 2,
    // r1 already isAvailable true but trackInventory unset (=true) -> changes;
    // r3 tracked with unset trackInventory -> already matches.
    unchanged: 3,
  });
  assert.strictEqual(plan.changed, true);
  assert.deepStrictEqual(plan.review, [
    { product: 'Scented Oil', scent: 'Amber', size: '1/4 oz', sku: 'AMB', lastSold: '2026-09-14', isAvailable: true },
    { product: 'Scented Oil', scent: 'Musk', size: '1/4 oz', sku: 'MSK', lastSold: '', isAvailable: false },
  ]);
});

test('every size of a scent that sold in the window is available', () => {
  const amber = {
    ...doc,
    variations: [
      { id: 'a1', sku: 'AMB-Q', scent: 'Amber', variantName: '1/4 oz', squareVariationId: 'V1', stock: 0, isAvailable: true },
      { id: 'a2', sku: 'AMB-2', scent: ' amber ', variantName: '2 oz', squareVariationId: 'V9', stock: 0, isAvailable: false },
    ],
  };
  const plan = planUntrackedAvailability('oils-incense', amber, new Map([['V1', false], ['V9', false]]), sold);
  assert.deepStrictEqual(plan.variations.map((v) => v.isAvailable), [true, true]);
  assert.strictEqual(plan.counts.soldAvailable, 1);
  assert.strictEqual(plan.counts.scentSoldAvailable, 1);
  assert.strictEqual(plan.review[1].lastSold, '2026-09-14');
});

test('a second run over the applied result changes nothing', () => {
  const first = planUntrackedAvailability('oils-incense', doc, tracking, sold);
  const second = planUntrackedAvailability('oils-incense', { ...doc, variations: first.variations }, tracking, sold);

  assert.strictEqual(second.changed, false);
  assert.strictEqual(second.counts.unchanged, 5);
});

test('fetchVariationTracking batches ids and honours our location override', async () => {
  const calls: string[][] = [];
  const client = {
    catalog: {
      batchGet: async ({ objectIds }: { objectIds: string[] }) => {
        calls.push(objectIds);
        return {
          objects: [
            { type: 'ITEM_VARIATION', id: 'V1', itemVariationData: { trackInventory: false } },
            { type: 'ITEM_VARIATION', id: 'V2', itemVariationData: {} },
            {
              type: 'ITEM_VARIATION',
              id: 'V3',
              itemVariationData: { trackInventory: true, locationOverrides: [{ locationId: 'LOC', trackInventory: false }] },
            },
            { type: 'ITEM_VARIATION', id: 'V4', isDeleted: true, itemVariationData: { trackInventory: false } },
          ],
        };
      },
    },
  };

  const tracking = await fetchVariationTracking(client, ['V1', 'V2', 'V3', 'V4', 'V1'], 'LOC');

  assert.strictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0], ['V1', 'V2', 'V3', 'V4']);
  assert.deepStrictEqual([...tracking], [
    ['V1', false],
    ['V2', true],
    ['V3', false],
  ]);
});

test('fetchSoldVariationIds pages through every location and keeps the latest sale', async () => {
  const requests: any[] = [];
  const client = {
    locations: { list: async () => ({ locations: [{ id: 'L1' }, { id: 'L2' }] }) },
    orders: {
      search: async (request: any) => {
        requests.push(request);
        if (!request.cursor) {
          return {
            orders: [{ closedAt: '2026-08-01T00:00:00Z', lineItems: [{ catalogObjectId: 'V1' }, { name: 'custom' }] }],
            cursor: 'next',
          };
        }
        return { orders: [{ closedAt: '2026-09-01T00:00:00Z', lineItems: [{ catalogObjectId: 'V1' }, { catalogObjectId: 'V2' }] }] };
      },
    },
  };

  const result = await fetchSoldVariationIds(client, '2026-05-02T00:00:00Z');

  assert.strictEqual(requests.length, 2);
  assert.deepStrictEqual(requests[0].locationIds, ['L1', 'L2']);
  assert.deepStrictEqual(requests[0].query.filter.stateFilter.states, ['COMPLETED']);
  assert.strictEqual(requests[0].query.filter.dateTimeFilter.closedAt.startAt, '2026-05-02T00:00:00Z');
  assert.strictEqual(requests[1].cursor, 'next');
  assert.strictEqual(result.orders, 2);
  assert.deepStrictEqual([...result.sold], [
    ['V1', '2026-09-01T00:00:00Z'],
    ['V2', '2026-09-01T00:00:00Z'],
  ]);
});
