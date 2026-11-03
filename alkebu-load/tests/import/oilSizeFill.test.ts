import assert from 'node:assert';
import test from 'node:test';

import { planOilSizeFill, squarePriceFixFor, squareVariationFor, type OilItem } from '../../src/app/utils/oilSizeFill';

const variation = (name: string, cents: number) => ({
  id: `V-${name}`,
  presentAtAllLocations: false,
  presentAtLocationIds: ['LOC'],
  itemVariationData: {
    name,
    priceMoney: { amount: BigInt(cents), currency: 'USD' },
    trackInventory: false,
    locationOverrides: [{ locationId: 'LOC', trackInventory: false }],
  },
});

const item = (id: string, name: string, variations: ReturnType<typeof variation>[]): OilItem => ({
  id,
  presentAtAllLocations: false,
  presentAtLocationIds: ['LOC'],
  itemData: { name, variations },
});

const FULL = [variation('Roll-on', 800), variation('1 oz', 1500), variation('1/4 oz', 500), variation('1/2 oz', 1000), variation('2 oz', 2500)];

test('only the missing standard sizes are added, at the standard price', () => {
  const plan = planOilSizeFill([
    item('A', '5th Ave Scented Oil', FULL),
    item('B', 'Curve Kicks Scented Oil', [variation('Roll-On', 800), variation('1 oz', 1500)]),
  ]);
  assert.equal(plan.counts.complete, 1);
  assert.deepEqual(
    plan.additions.map((a) => [a.itemId, a.size, a.cents]),
    [['B', '1/4 oz', 500], ['B', '1/2 oz', 1000], ['B', '2 oz', 2500]],
  );
  assert.deepEqual(plan.counts.bySize, { '1/4 oz': 1, '1/2 oz': 1, '2 oz': 1 });
});

test('non-oil items, "type" incense packs and deleted items are ignored', () => {
  const plan = planOilSizeFill([
    item('T', 'Jimmy Choo Type', [variation('', 200)]),
    { ...item('D', 'Gone Scented Oil', []), isDeleted: true },
  ]);
  assert.equal(plan.counts.items, 0);
  assert.deepEqual(plan.additions, []);
});

test('odd names and off-standard prices are reported, never changed', () => {
  const plan = planOilSizeFill([item('C', 'Baccarat Rouge 540 Scented Oil', [variation('Regular', 800), variation('1 oz', 1400)])]);
  assert.deepEqual(plan.nonStandard, [{ itemName: 'Baccarat Rouge 540 Scented Oil', name: 'Regular' }]);
  assert.deepEqual(plan.priceMismatches, [{ itemName: 'Baccarat Rouge 540 Scented Oil', size: '1 oz', cents: 1400, standard: 1500 }]);
  assert.equal(plan.additions.length, 4);
});

test('a new variation is untracked, fixed-price and sold where its siblings are', () => {
  const [addition] = planOilSizeFill([item('B', 'Curve Kicks Scented Oil', [variation('1 oz', 1500)])]).additions;
  assert.deepEqual(squareVariationFor(addition, '#B-0'), {
    type: 'ITEM_VARIATION',
    id: '#B-0',
    presentAtAllLocations: false,
    presentAtLocationIds: ['LOC'],
    itemVariationData: {
      itemId: 'B',
      name: '1/4 oz',
      pricingType: 'FIXED_PRICING',
      priceMoney: { amount: 500n, currency: 'USD' },
      trackInventory: false,
      sellable: true,
      stockable: true,
      locationOverrides: [{ locationId: 'LOC', trackInventory: false }],
    },
  });
});

test('a standard size entered without a price gets the standard price, all else kept', () => {
  const unpriced = { ...variation('2 oz', 0), version: 7n } as any;
  delete unpriced.itemVariationData.priceMoney;
  unpriced.itemVariationData.pricingType = 'VARIABLE_PRICING';
  const plan = planOilSizeFill([item('E', 'Egyptian Amber Scented Oil', [...FULL.slice(0, 4), unpriced])]);
  assert.deepEqual(plan.priceMismatches, []);
  assert.equal(plan.additions.length, 0);
  const fixed = squarePriceFixFor(plan.priceFixes[0]);
  assert.equal(fixed.version, 7n);
  assert.equal(fixed.id, 'V-2 oz');
  assert.deepEqual(fixed.itemVariationData.priceMoney, { amount: 2500n, currency: 'USD' });
  assert.equal(fixed.itemVariationData.pricingType, 'FIXED_PRICING');
  assert.equal(fixed.itemVariationData.trackInventory, false);
});
