import assert from 'node:assert';
import test from 'node:test';

import {
  getSearchBootstrapTargets,
  SEARCH_INDEX_BOOTSTRAP_TARGETS,
} from '../../src/app/utils/searchEngine';

test('search bootstrap targets use the registered Payload product slugs', () => {
  const targets = getSearchBootstrapTargets([
    'books',
    'wellness-lifestyle',
    'fashion-jewelry',
    'oils-incense',
  ]);

  assert.deepStrictEqual(
    targets.map((target) => target.collection),
    ['books', 'wellness-lifestyle', 'fashion-jewelry', 'oils-incense'],
  );
  assert.deepStrictEqual(
    targets.map((target) => target.type),
    ['books', 'wellnessLifestyle', 'fashionJewelry', 'oilsIncense'],
  );
});

test('search bootstrap targets fall back to the canonical collection list', () => {
  assert.deepStrictEqual(
    getSearchBootstrapTargets(),
    SEARCH_INDEX_BOOTSTRAP_TARGETS,
  );
});
