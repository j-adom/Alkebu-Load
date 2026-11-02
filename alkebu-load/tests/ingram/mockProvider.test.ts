import assert from 'node:assert/strict';
import test from 'node:test';

import { getAvailabilityProvider } from '../../src/app/utils/ingram/AvailabilityProvider';
import { mockProvider } from '../../src/app/utils/ingram/mockProvider';

test('mockProvider.checkStock returns deterministic stock keyed by ISBN', async () => {
  const map = await mockProvider.checkStock(['9780000000002', '9780000000000']);
  assert.equal(map.size, 2);
  assert.ok(map.get('9780000000002')!.dcs.LaVergne.onHand > 10);
  assert.equal(map.get('9780000000002')!.productAvailability, '21');
  assert.equal(map.get('9780000000000')!.dcs.LaVergne.onHand, 0);
  assert.equal(map.get('9780000000000')!.productAvailability, '40');
  const again = await mockProvider.checkStock(['9780000000002']);
  assert.deepEqual(again.get('9780000000002'), map.get('9780000000002'));
});

test('mockProvider.searchLongTail returns a buyable result echoing the query', async () => {
  const results = await mockProvider.searchLongTail('wayward lives', 'title');
  assert.equal(results.length, 1);
  assert.match(results[0].title, /wayward lives/);
  assert.equal(results[0].available, true);
});

test('getAvailabilityProvider returns the mock until the live client exists', () => {
  assert.equal(getAvailabilityProvider(), mockProvider);
});
