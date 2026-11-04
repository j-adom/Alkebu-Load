import assert from 'node:assert';
import test from 'node:test';

import { cleanSquareTitle, mapSquareItemToBook } from '../../src/app/utils/squareCatalogMapping';

test('strips the binding and "- by Author" suffixes Square names carry', () => {
  assert.equal(cleanSquareTitle('Black Girl You Are Atlas - by Renée Watson (Hardcover)'), 'Black Girl You Are Atlas');
  assert.equal(cleanSquareTitle('Black Star - (The Door of No Return) by Kwame Alexander (Hardcover)'), 'Black Star');
  assert.equal(cleanSquareTitle('Black Panther Woman - (Hardcover)'), 'Black Panther Woman');
  assert.equal(cleanSquareTitle('Black Power and the Garvey Movement (Paperback)'), 'Black Power and the Garvey Movement');
  assert.equal(cleanSquareTitle('Blood at the Root - by Ladarrion Williams (Paperback)'), 'Blood at the Root');
  assert.equal(cleanSquareTitle('EneBlA - (Hardcover), Books'), 'EneBlA');
});

test('leaves real titles alone', () => {
  for (const title of [
    'Stand by Me',
    'Dear Martin by Nic Stone',
    'Count to LOVE! (A Bright Brown Baby Board Book) by Andrea Pinkney',
    'Child of the Dream (A Memoir of 1963)',
    'Enuma Elish - the Seven Tablets of Creation',
    'Boy 2.0',
    '1996',
  ]) {
    assert.equal(cleanSquareTitle(title), title);
  }
});

test('never empties a title', () => {
  assert.equal(cleanSquareTitle('(Paperback)'), '(Paperback)');
});

test('new books mapped from Square get the cleaned title', () => {
  const mapped = mapSquareItemToBook({
    id: 'ITEM1',
    itemData: {
      name: 'Boy 2.0 - by Tracey Baptiste (Hardcover)',
      variations: [
        {
          id: 'VAR1',
          itemVariationData: { upc: '9780316458559', priceMoney: { amount: 1899, currency: 'USD' } },
        },
      ],
    },
  });
  assert.equal((mapped as any).data?.title ?? (mapped as any).proposed?.title, 'Boy 2.0');
});
