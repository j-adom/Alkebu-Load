import assert from 'node:assert';
import test from 'node:test';

import { applyPouredAvailability, pouredSizeKey, unknownPouredNames } from '../../src/app/utils/pouredToOrder';

const v = (scent: string, variantName: string | null, extra: Record<string, unknown> = {}) => ({
  scent,
  variantName,
  trackInventory: false,
  isAvailable: false,
  ...extra,
});

test('any in-stock scent sells in any in-stock bottle', () => {
  const out = applyPouredAvailability([v('Amber', '1 oz'), v('Amber', '2 oz'), v('Musk', '1 oz')], {});
  assert.deepEqual(out.map((x) => x.isAvailable), [true, true, true]);
});

test('an out-of-stock scent is unavailable in every size; an out-of-stock bottle for every scent', () => {
  const out = applyPouredAvailability(
    [v('Amber', '1 oz'), v('Amber', '2 oz'), v('Musk', '1 oz'), v('Musk', '2 oz')],
    { unavailableScents: [{ scent: ' amber ' }], unavailableSizes: [{ size: '2 OZ' }] },
  );
  assert.deepEqual(out.map((x) => x.isAvailable), [false, false, true, false]);
});

test('rows without a real size never sell; tracked rows keep their own availability', () => {
  const out = applyPouredAvailability(
    [v('Black', null), v('Baccarat Rouge 540', 'Regular'), v('Musk', 'Musk'), v('Amber', '1 oz', { trackInventory: true, isAvailable: true })],
    { unavailableScents: [{ scent: 'Amber' }] },
  );
  assert.deepEqual(out.map((x) => x.isAvailable), [false, false, false, true]);
  assert.equal(pouredSizeKey({ scent: 'x', variantName: 'Roll-On' }), 'roll-on');
});

test('list entries that match nothing on the product are reported', () => {
  const variations = [v('Amber', '1 oz'), v('Musk', 'Roll-on')];
  assert.deepEqual(
    unknownPouredNames(variations, { unavailableScents: [{ scent: 'amber' }, { scent: 'Ambr' }], unavailableSizes: [{ size: 'roll-on' }, { size: '3 oz' }] }),
    { scents: ['Ambr'], sizes: ['3 oz'] },
  );
});
