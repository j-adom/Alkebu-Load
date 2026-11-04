// Synthetic lines are built FROM the layout constant, so these tests keep passing once the
// owner transcribes the real column order (and fail loudly if a key we need disappears).
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  emptyParseErrors,
  normalizeDate,
  parseTitlesBasicLine,
  splitDelimited,
  TITLES_BASIC_COLUMNS,
  TITLES_BASIC_LAYOUT,
  titlesBasicEan,
  type TitlesBasicField,
  type TitlesBasicLayout,
} from '../../src/app/utils/ingram/titlesBasicParser';
import { buildTitlesBasicLine, type SyntheticTitle } from './support/titlesBasicFixture';

const FULL: SyntheticTitle = {
  ean: '9780000000002',
  title: 'A Synthetic Title',
  subtitle: 'Made Up for Tests',
  contributor: ['Doe, Jane', 'Roe, Richard'],
  publisher: 'Example Press',
  pubDate: '20240305',
  binding: 'Paperback',
  pages: '312',
  language: 'ENG',
  bisac: ['HIS056000', 'SOC001000'],
  length: '9.00',
  width: '6.00',
  height: '0.80',
  weight: '1.05',
  listPrice: '19.99',
  recordDate: '20260915',
};

test('the layout constant carries every field the mapper needs', () => {
  const needed: TitlesBasicField[] = ['ean', 'title', 'subtitle', 'contributor', 'publisher', 'pubDate', 'binding', 'pages', 'bisac', 'weight', 'listPrice'];
  for (const key of needed) assert.ok(TITLES_BASIC_COLUMNS.includes(key), `TITLES_BASIC_COLUMNS lacks ${key}`);
  assert.equal(TITLES_BASIC_COLUMNS.filter((c) => c === 'ean').length, 1);
});

test('maps every field from a full synthetic line', () => {
  const record = parseTitlesBasicLine(buildTitlesBasicLine(FULL));
  assert.ok(record);
  assert.equal(record.ean, FULL.ean);
  assert.equal(record.title, 'A Synthetic Title');
  assert.equal(record.subtitle, 'Made Up for Tests');
  assert.equal(record.publisher, 'Example Press');
  assert.equal(record.pubDate, '2024-03-05');
  assert.equal(record.binding, 'Paperback');
  assert.equal(record.pages, 312);
  assert.equal(record.language, 'ENG');
  assert.deepEqual(record.dimensions, { length: 9, width: 6, height: 0.8, unit: TITLES_BASIC_LAYOUT.dimensionUnit });
  assert.deepEqual(record.weight, { value: 1.05, unit: TITLES_BASIC_LAYOUT.weightUnit });
  assert.deepEqual(record.listPrice, { amount: 19.99, unit: TITLES_BASIC_LAYOUT.priceUnit });
  assert.equal(record.recordDate, '2026-09-15');
  assert.equal(titlesBasicEan(buildTitlesBasicLine(FULL)), FULL.ean);
});

test('empty optional fields are omitted, not zero or blank', () => {
  const record = parseTitlesBasicLine(buildTitlesBasicLine({ ean: FULL.ean, title: 'Only A Title' }));
  assert.ok(record);
  assert.deepEqual(record, { ean: FULL.ean, title: 'Only A Title', contributors: [], bisac: [] });
});

test('collects multiple contributors and BISAC codes across columns and separators', () => {
  const sep = TITLES_BASIC_LAYOUT.multiValueSeparator;
  const record = parseTitlesBasicLine(
    buildTitlesBasicLine({ ...FULL, contributor: [`Doe, Jane${sep} Poe, Edgar`, 'Roe, Richard'], bisac: ['HIS056000', `SOC001000${sep}FIC000000`] }),
  );
  assert.ok(record);
  assert.deepEqual(record.contributors, ['Doe, Jane', 'Poe, Edgar', 'Roe, Richard']);
  assert.deepEqual(record.bisac, ['HIS056000', 'SOC001000', 'FIC000000']);
});

test('an embedded delimiter survives quoting (and escaping, when the layout uses it)', () => {
  const quoted = parseTitlesBasicLine(buildTitlesBasicLine({ ...FULL, title: 'Pipes | And "Quotes"' }));
  assert.equal(quoted?.title, 'Pipes | And "Quotes"');

  const escapeLayout: TitlesBasicLayout = { ...TITLES_BASIC_LAYOUT, quote: null, escape: '\\' };
  const escaped = parseTitlesBasicLine(buildTitlesBasicLine({ ...FULL, title: 'Left | Right' }, escapeLayout), escapeLayout);
  assert.equal(escaped?.title, 'Left | Right');
  assert.deepEqual(splitDelimited('a\\|b|c', escapeLayout), ['a|b', 'c']);
});

test('malformed lines return null and are counted', () => {
  const errors = emptyParseErrors();
  assert.equal(parseTitlesBasicLine('too|few|fields', TITLES_BASIC_LAYOUT, errors), null);
  assert.equal(parseTitlesBasicLine(buildTitlesBasicLine({ ...FULL, ean: '12345' }), TITLES_BASIC_LAYOUT, errors), null);
  assert.equal(parseTitlesBasicLine(buildTitlesBasicLine({ ...FULL, title: '   ' }), TITLES_BASIC_LAYOUT, errors), null);
  const header = TITLES_BASIC_COLUMNS.map((c) => c.toUpperCase()).join('|');
  assert.equal(parseTitlesBasicLine(header, TITLES_BASIC_LAYOUT, errors), null);
  assert.equal(titlesBasicEan(header), null);
  assert.equal(errors.malformed, 4);
  // A trailing delimiter is tolerated.
  assert.ok(parseTitlesBasicLine(`${buildTitlesBasicLine(FULL)}|`));
});

test('normalizeDate reads the common Ingram date shapes and rejects impossible dates', () => {
  assert.equal(normalizeDate('20240305'), '2024-03-05');
  assert.equal(normalizeDate('2024-03-05T00:00:00'), '2024-03-05');
  assert.equal(normalizeDate('3/5/2024'), '2024-03-05');
  assert.equal(normalizeDate('20240231'), undefined);
  assert.equal(normalizeDate('00000000'), undefined);
  assert.equal(normalizeDate(''), undefined);
});
