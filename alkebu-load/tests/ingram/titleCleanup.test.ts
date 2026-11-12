import assert from 'node:assert/strict';
import test from 'node:test';

import { priceUplift } from '../../src/app/utils/ingram/enrichmentPolicy';
import { authorKey, cleanTitle, findDisambiguationTitles, lastNameKey } from '../../src/app/utils/ingram/titleCleanup';

test('Title: Subtitle plus an Ingram subtitle splits into title and subtitle', () => {
  assert.deepEqual(
    cleanTitle({ current: 'Wayward Lives: Beautiful Experiments', ingramTitle: 'Wayward Lives', ingramSubtitle: 'Beautiful Experiments', contributors: [] }),
    { title: 'Wayward Lives', subtitle: 'Beautiful Experiments', removed: ['subtitle'], confidence: 'exact' },
  );
});

test('a title that already equals the Ingram title just gains the subtitle', () => {
  const r = cleanTitle({ current: 'wayward lives', ingramTitle: 'Wayward Lives', ingramSubtitle: 'Beautiful Experiments', contributors: [] });
  assert.equal(r.confidence, 'exact');
  assert.deepEqual(r.removed, []);
  assert.equal(r.subtitle, 'Beautiful Experiments');
});

test('"Title by Jane Doe" with contributor Jane Doe strips the author', () => {
  for (const contributor of ['Jane Doe', 'Doe, Jane']) {
    assert.deepEqual(cleanTitle({ current: 'Synthetic Title by Jane Doe', contributors: [contributor] }), {
      title: 'Synthetic Title',
      subtitle: null,
      removed: ['author'],
      confidence: 'exact',
    });
  }
  // Other author shapes.
  assert.equal(cleanTitle({ current: 'Synthetic Title - Jane Doe', contributors: ['Jane Doe'] }).title, 'Synthetic Title');
  assert.equal(cleanTitle({ current: 'Synthetic Title (Jane Doe)', contributors: ['Jane Doe'] }).title, 'Synthetic Title');
  assert.equal(cleanTitle({ current: 'Doe: Synthetic Title', contributors: ['Jane Doe'] }).title, 'Synthetic Title');
});

test('author and subtitle together: "Title: Subtitle by Author"', () => {
  const r = cleanTitle({ current: 'Wayward Lives: Beautiful Experiments by Jane Doe', ingramTitle: 'Wayward Lives', ingramSubtitle: 'Beautiful Experiments', contributors: ['Doe, Jane'] });
  assert.deepEqual(r, { title: 'Wayward Lives', subtitle: 'Beautiful Experiments', removed: ['author', 'subtitle'], confidence: 'exact' });
});

test('"Title by Someone Else" (not a contributor) is ambiguous and nothing is stripped', () => {
  const r = cleanTitle({ current: 'Synthetic Title by Someone Else', contributors: ['Jane Doe'] });
  assert.equal(r.confidence, 'ambiguous');
  assert.equal(r.title, 'Synthetic Title by Someone Else');
  assert.deepEqual(r.removed, []);
  // With an Ingram title, that title is what staff are asked to review.
  assert.equal(cleanTitle({ current: 'Synthetic Title by Someone Else', ingramTitle: 'Synthetic Title', contributors: ['Jane Doe'] }).title, 'Synthetic Title');
});

test('text that matches nothing is never stripped', () => {
  const r = cleanTitle({ current: 'Synthetic Title (2nd Edition)', contributors: ['Jane Doe'] });
  assert.deepEqual(r, { title: 'Synthetic Title (2nd Edition)', subtitle: null, removed: [], confidence: 'exact' });
  // A title that is not recognisably the Ingram title goes to review.
  const other = cleanTitle({ current: 'Completely Different', ingramTitle: 'Wayward Lives', ingramSubtitle: 'Sub', contributors: [] });
  assert.equal(other.confidence, 'ambiguous');
});

test('keepAuthor (disambiguation) keeps the author segment', () => {
  const r = cleanTitle({ current: 'Freedom by Jane Doe', contributors: ['Jane Doe'], keepAuthor: true });
  assert.equal(r.title, 'Freedom by Jane Doe');
  assert.deepEqual(r.removed, []);
});

test('findDisambiguationTitles: shared base title with different authors keeps both; same author does not', () => {
  const keep = findDisambiguationTitles([
    { id: 1, baseTitle: 'Freedom', authorKey: authorKey(['Jane Doe']) },
    { id: 2, baseTitle: 'freedom', authorKey: authorKey(['Richard Roe']) },
    { id: 3, baseTitle: 'Wayward Lives', authorKey: authorKey(['Jane Doe']) },
    { id: 4, baseTitle: 'Wayward Lives', authorKey: authorKey(['Doe, Jane']) },
  ]);
  assert.deepEqual([...keep].sort(), [1, 2]);
});

test('lastNameKey handles both name orders and suffixes', () => {
  assert.equal(lastNameKey('Doe, Jane'), 'doe');
  assert.equal(lastNameKey('Martin Luther King Jr.'), 'king');
  assert.equal(lastNameKey(''), '');
});

test('priceUplift raises, keeps and reviews per the owner directive', () => {
  assert.deepEqual(priceUplift({ currentCents: 1999, ingramListCents: 2499 }), { action: 'raise', cents: 2499 });
  assert.deepEqual(priceUplift({ currentCents: 2499, ingramListCents: 1999 }), { action: 'keep', cents: 2499 });
  assert.equal(priceUplift({ currentCents: 1999, ingramListCents: 2499, isConsignment: true }).action, 'keep');
  assert.equal(priceUplift({ currentCents: 1999, ingramListCents: 2499, lockPrice: true }).action, 'keep');
  assert.equal(priceUplift({ currentCents: 1999, ingramListCents: 0 }).action, 'keep');
  assert.equal(priceUplift({ currentCents: 1999, ingramListCents: undefined }).action, 'keep');
  assert.deepEqual(priceUplift({ currentCents: 999, ingramListCents: 3500 }), { action: 'review', cents: 3500 });
  assert.equal(priceUplift({ currentCents: null, ingramListCents: 1500 }).action, 'review');
});
