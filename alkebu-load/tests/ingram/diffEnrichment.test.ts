import assert from 'node:assert/strict';
import test from 'node:test';

import { diffEnrichment, rejectionKey, type FieldChange } from '../../src/app/utils/ingram/diffEnrichment';
import { FIELD_POLICY } from '../../src/app/utils/ingram/enrichmentPolicy';
import { mapBinding, mapIngramRecord, mapLanguage, mapSubjects, toOunces } from '../../src/app/utils/ingram/mapEnrichment';
import type { EnrichmentCandidate } from '../../src/app/utils/ingram/mapEnrichment';
import { paragraphsToLexical } from '../../src/app/utils/ingram/richText';

const EAN = '9780000000002';
const MANUAL = { source: 'manual' as const, at: '2026-10-01T00:00:00.000Z' };

const book = (overrides: Record<string, any> = {}) => ({
  id: 1,
  title: 'Synthetic Title',
  authorsText: [{ name: 'Jane Doe' }],
  pricing: { retailPrice: 1999 },
  inventory: { isConsignment: false },
  editions: [{ isbn: EAN, pricing: { retailPrice: 1999 } }],
  ...overrides,
});

const candidate = (edition: EnrichmentCandidate['edition'] = {}, bookFields: EnrichmentCandidate['book'] = {}): EnrichmentCandidate => ({
  ean: EAN,
  book: { title: 'Synthetic Title', contributors: ['Jane Doe'], ...bookFields },
  edition,
});

const find = (changes: FieldChange[], key: string) => changes.find((c) => c.key === key);
const ek = (path: string) => `editions.${EAN}.${path}`;

// Table-driven over the policy: one representative field per policy kind.
const VALUES: Record<string, { current: unknown; other: unknown; proposed: unknown }> = {
  'pricing.shippingWeight': { current: 10, other: 12, proposed: 16.8 },
  pages: { current: 200, other: 220, proposed: 312 },
  publisherText: { current: 'Old Press', other: 'Old Press', proposed: 'Example Press' },
  synopsis: { current: 'Curated copy', other: 'Curated copy', proposed: 'Ingram copy' },
};

function bookWith(path: string, value: unknown) {
  if (path === 'pricing.shippingWeight' || path === 'pages') {
    const pricing = { retailPrice: 1999, ...(path === 'pricing.shippingWeight' ? { shippingWeight: value } : {}) };
    return book({ editions: [{ isbn: EAN, pricing, ...(path === 'pages' ? { pages: value } : {}) }] });
  }
  return book({ [path]: value });
}

function candidateWith(path: string, value: unknown) {
  if (path === 'pricing.shippingWeight' || path === 'pages') return candidate({ [path]: value } as any);
  return candidate({}, { [path]: value } as any);
}

const keyOf = (path: string) => (path === 'pricing.shippingWeight' || path === 'pages' ? ek(path) : path);

for (const path of Object.keys(VALUES)) {
  const policy = FIELD_POLICY[path as keyof typeof FIELD_POLICY];
  const { current, proposed } = VALUES[path];

  test(`${path} (${policy}): empty -> fill`, () => {
    assert.equal(find(diffEnrichment(bookWith(path, null), candidateWith(path, proposed)), keyOf(path))?.action, 'fill');
  });

  test(`${path} (${policy}): differing value from a non-manual source -> ${policy === 'authoritative' ? 'correct' : 'conflict'}`, () => {
    const change = find(diffEnrichment(bookWith(path, current), candidateWith(path, proposed), {}), keyOf(path));
    assert.equal(change?.action, policy === 'authoritative' ? 'correct' : 'conflict');
  });

  test(`${path} (${policy}): manual source -> protected`, () => {
    const change = find(diffEnrichment(bookWith(path, current), candidateWith(path, proposed), { [keyOf(path)]: MANUAL }), keyOf(path));
    assert.equal(change?.action, 'protected');
  });
}

test('a whitespace/case-only difference is same', () => {
  const changes = diffEnrichment(book({ publisherText: '  example   PRESS ' }), candidate({}, { publisherText: 'Example Press' }));
  assert.equal(find(changes, 'publisherText')?.action, 'same');
});

test('a previously rejected proposal (same value) is same; a new value is not', () => {
  const rejected = new Set([rejectionKey('synopsis', 'synopsis', 'Ingram copy')]);
  const b = book({ synopsis: 'Curated copy' });
  assert.equal(find(diffEnrichment(b, candidate({}, { synopsis: 'ingram  copy' }), {}, { rejected }), 'synopsis')?.action, 'same');
  assert.equal(find(diffEnrichment(b, candidate({}, { synopsis: 'Newer copy' }), {}, { rejected }), 'synopsis')?.action, 'conflict');
});

test('authors are review-only: a difference is a conflict, never a fill', () => {
  const changes = diffEnrichment(book({ authorsText: [] }), candidate({}, { contributors: ['Jane Doe', 'Richard Roe'] }));
  assert.equal(find(changes, 'authorsText')?.action, 'conflict');
});

test('stock, images, categories and slug are never emitted; price only ever rises', () => {
  const b = book({ slug: 'x', categories: ['history'], images: [], editions: [{ isbn: EAN, pricing: { retailPrice: 2499 }, inventory: { stockLevel: 3 } }] });
  const changes = diffEnrichment(b, candidate({ listPriceCents: 1999, pages: 100 }));
  for (const c of changes) assert.ok(!/stock|image|categor|slug|collections/i.test(c.key), c.key);
  assert.equal(find(changes, ek('pricing.retailPrice')), undefined, 'a lower Ingram price emits nothing');
});

test('price uplift: raise, review, lock and consignment', () => {
  assert.deepEqual(
    (({ action, proposed }) => ({ action, proposed }))(find(diffEnrichment(book(), candidate({ listPriceCents: 2499 })), ek('pricing.retailPrice'))!),
    { action: 'correct', proposed: 2499 },
  );
  const cheap = book({ editions: [{ isbn: EAN, pricing: { retailPrice: 999 } }] });
  assert.equal(find(diffEnrichment(cheap, candidate({ listPriceCents: 3500 })), ek('pricing.retailPrice'))?.action, 'conflict');
  const locked = book({ editions: [{ isbn: EAN, pricing: { retailPrice: 1999, lockPrice: true } }] });
  assert.equal(find(diffEnrichment(locked, candidate({ listPriceCents: 2499 })), ek('pricing.retailPrice')), undefined);
  const consignment = book({ inventory: { isConsignment: true } });
  assert.equal(find(diffEnrichment(consignment, candidate({ listPriceCents: 2499 })), ek('pricing.retailPrice')), undefined);
});

test('system fields are always written', () => {
  const b = book({ editions: [{ isbn: EAN, pricing: { retailPrice: 1999 }, mediaMailEligible: false }] });
  const changes = diffEnrichment(b, candidate({ mediaMailEligible: true, ingramOnSaleDate: '2026-01-06T00:00:00.000Z' }), {
    [ek('mediaMailEligible')]: MANUAL,
  });
  assert.equal(find(changes, ek('mediaMailEligible'))?.action, 'correct');
  assert.equal(find(changes, ek('ingramOnSaleDate'))?.action, 'fill');
});

test('title cleanup: exact split applies, ambiguous goes to review, manual is protected', () => {
  const split = diffEnrichment(book({ title: 'Wayward Lives: Beautiful Experiments' }), candidate({}, { title: 'Wayward Lives', subtitle: 'Beautiful Experiments' }));
  assert.equal(find(split, 'title')?.action, 'correct');
  assert.equal(find(split, 'title')?.proposed, 'Wayward Lives');
  assert.equal(find(split, 'subtitle')?.action, 'fill');

  const ambiguous = diffEnrichment(book({ title: 'Synthetic Title by Someone Else' }), candidate());
  assert.equal(find(ambiguous, 'title')?.action, 'conflict');
  assert.ok(!ambiguous.some((c) => c.key === 'title' && (c.action === 'fill' || c.action === 'correct')));

  const manual = diffEnrichment(book({ title: 'Wayward Lives: Beautiful Experiments' }), candidate({}, { title: 'Wayward Lives', subtitle: 'Beautiful Experiments' }), { title: MANUAL });
  assert.equal(find(manual, 'title')?.action, 'protected');
  assert.equal(find(manual, 'subtitle')?.action, 'protected');
});

test('title cleanup strips a contributor author unless the book needs it for disambiguation', () => {
  const b = book({ title: 'Freedom by Jane Doe' });
  assert.equal(find(diffEnrichment(b, candidate({}, { title: 'Freedom' })), 'title')?.proposed, 'Freedom');
  assert.equal(find(diffEnrichment(b, candidate({}, { title: 'Freedom' }), {}, { keepAuthor: true }), 'title')?.action, 'same');
});

test('a rerun after applying the proposals is all same (idempotent)', () => {
  const c = candidate({ 'pricing.shippingWeight': 16.8, pages: 312, binding: 'paperback', datePublished: '2024-03-05T00:00:00.000Z', listPriceCents: 2499 }, { publisherText: 'Example Press', synopsis: 'Ingram copy', description: paragraphsToLexical(['Ingram copy']) });
  const applied = book({
    publisherText: 'Example Press',
    synopsis: 'Ingram copy',
    description: paragraphsToLexical(['Ingram copy']),
    editions: [{ isbn: EAN, pages: 312, binding: 'paperback', datePublished: '2024-03-05T00:00:00.000Z', pricing: { retailPrice: 2499, shippingWeight: 16.8 } }],
  });
  const actions = new Set(diffEnrichment(applied, c).map((ch) => ch.action));
  assert.deepEqual([...actions], ['same']);
});

test('edition fields match by EAN, including an ISBN-10 edition', () => {
  const b = book({ editions: [{ isbn: '0-000-00000-0', isbn10: '0000000000' }, { isbn: EAN, pricing: { retailPrice: 1999 } }] });
  const changes = diffEnrichment(b, candidate({ pages: 312 }));
  assert.equal(find(changes, ek('pages'))?.editionIsbn, EAN);
});

test('mapIngramRecord normalizes units and shapes', () => {
  const c = mapIngramRecord(
    {
      ean: EAN,
      title: 'T',
      subtitle: 'S',
      contributors: ['Doe, Jane'],
      bisac: ['HISTORY / African American', 'SOC001000'],
      publisher: 'Example Press',
      pubDate: '2024-03-05',
      binding: 'Trade Paper',
      pages: 312,
      language: 'ENG',
      weight: { value: 1.05, unit: 'lb' },
      dimensions: { length: 9, width: 6, height: 0.8, unit: 'in' },
      listPrice: { amount: 19.99, unit: 'dollars' },
      recordDate: '2026-09-15',
    },
    [{ ean: EAN, kind: 'marketing', html: '<p>First &amp; best.</p><p>Second.</p>' }],
    { ean: EAN, mediaMail: true, onSaleDate: '20240305' },
  );
  assert.equal(c.book.contributors?.[0], 'Jane Doe');
  assert.deepEqual(c.book.subjects, [{ subject: 'HISTORY / African American' }]);
  assert.equal(c.book.synopsis, 'First & best.\n\nSecond.');
  assert.equal((c.book.description as any).root.children.length, 2);
  assert.equal(c.edition['pricing.shippingWeight'], 16.8);
  assert.equal(c.edition.dimensions, '9 x 6 x 0.8 in');
  assert.equal(c.edition.binding, 'paperback');
  assert.equal(c.edition.language, 'en');
  assert.equal(c.edition.datePublished, '2024-03-05T00:00:00.000Z');
  assert.equal(c.edition.listPriceCents, 1999);
  assert.equal(c.edition.mediaMailEligible, true);
  assert.equal(c.edition.ingramOnSaleDate, '2024-03-05T00:00:00.000Z');
  assert.equal(c.recordDate, '2026-09-15');
});

test('mapIngramRecord takes price, publication date and weight from the stock file when Titles has none', () => {
  const titles = { ean: EAN, title: 'T', contributors: [], bisac: [] };
  const stock = { ean: EAN, mediaMail: false, onSaleDate: '20240305', pubListPrice: 24.99, publicationDate: '20240301', weightLbs: 1.05 };
  const c = mapIngramRecord(titles, null, stock);
  assert.equal(c.edition.listPriceCents, 2499);
  assert.equal(c.edition.datePublished, '2024-03-01T00:00:00.000Z');
  assert.equal(c.edition['pricing.shippingWeight'], 16.8);
  // A Titles value wins when a layout carries one.
  const withTitles = mapIngramRecord({ ...titles, listPrice: { amount: 19.99, unit: 'dollars' as const } }, null, stock);
  assert.equal(withTitles.edition.listPriceCents, 1999);
  assert.equal(mapIngramRecord(titles, null, { ...stock, publicationDate: '00010101' }).edition.datePublished, undefined);
});

test('mapper helpers', () => {
  assert.equal(toOunces(500, 'g'), 17.6);
  assert.equal(mapBinding('Mass Market Paperbound'), 'mass-market');
  assert.equal(mapBinding('Hardcover'), 'hardcover');
  assert.equal(mapBinding('Unknown Format'), undefined);
  assert.equal(mapLanguage('SPA'), 'es');
  assert.equal(mapLanguage('xyz'), undefined);
  assert.deepEqual(mapSubjects(['HIS056000'], new Map([['HIS056000', 'HISTORY / African American']])), [{ subject: 'HISTORY / African American' }]);
});
