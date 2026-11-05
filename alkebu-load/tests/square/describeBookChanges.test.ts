import assert from 'node:assert';
import test from 'node:test';

import { describeBookChanges } from '../../src/app/utils/squareCatalogSync';

const book = {
  title: 'The Isis Papers',
  pricing: { retailPrice: 2495 },
  squareItemId: 'ITEM1',
  editions: [{ isbn: '9780883781050' }],
};

test('reports no changes when Square matches the book', () => {
  assert.deepStrictEqual(
    describeBookChanges(book, {
      title: 'The Isis Papers',
      pricing: { retailPrice: 2495 },
      squareItemId: 'ITEM1',
      editions: [{ isbn: '9780883781050' }],
    }),
    [],
  );
});

test('separates capitalisation-only title differences from real retitles', () => {
  assert.deepStrictEqual(describeBookChanges(book, { title: 'THE ISIS PAPERS' }), ['title (case only)']);
  assert.deepStrictEqual(describeBookChanges(book, { title: 'Isis Papers (Paperback)' }), ['title']);
});

test('flags price, edition set and Square link changes', () => {
  assert.deepStrictEqual(
    describeBookChanges(book, {
      pricing: { retailPrice: 2695 },
      editions: [{ isbn: '9780883781050' }, { isbn: '9781234567897' }],
      squareItemId: 'ITEM2',
    }),
    ['price', 'editions', 'square link'],
  );
});
