// Synthetic lines are built FROM a layout constant. The generic parser features (quoting,
// escaping, multi-value columns, numeric fields) run against TEST_LAYOUT, since Ingram's real
// Titles Basic layout uses none of them; the real layout has its own tests below.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  emptyParseErrors,
  normalizeDate,
  parseTitlesBasicLine,
  splitDelimited,
  splitDerivedTitle,
  TITLES_BASIC_COLUMNS,
  TITLES_BASIC_LAYOUT,
  titlesBasicEan,
  type TitlesBasicField,
  type TitlesBasicLayout,
} from '../../src/app/utils/ingram/titlesBasicParser';
import { buildTitlesBasicLine, type SyntheticTitle } from './support/titlesBasicFixture';

// Every field key, quoted and multi-valued: exercises the parser beyond the real layout.
const TEST_LAYOUT: TitlesBasicLayout = {
  placeholder: false,
  columns: ['ean', 'title', 'subtitle', 'contributor', 'contributor', 'contributor', 'publisher', 'skip:Imprint', 'pubDate', 'binding', 'pages', 'language', 'bisac', 'bisac', 'bisac', 'length', 'width', 'height', 'weight', 'listPrice', 'recordDate'],
  delimiter: '|',
  quote: '"',
  escape: null,
  multiValueSeparator: ';',
  weightUnit: 'lb',
  dimensionUnit: 'in',
  priceUnit: 'dollars',
};
const line = (values: SyntheticTitle, layout: TitlesBasicLayout = TEST_LAYOUT) => buildTitlesBasicLine(values, layout);
const parse = (text: string, layout: TitlesBasicLayout = TEST_LAYOUT, errors = emptyParseErrors()) => parseTitlesBasicLine(text, layout, errors);

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

test('the real layout: 25 columns, with our fields at the spec positions', () => {
  assert.equal(TITLES_BASIC_LAYOUT.placeholder, false);
  assert.equal(TITLES_BASIC_COLUMNS.length, 25);
  const at: Array<[number, TitlesBasicField]> = [[1, 'ean'], [2, 'title'], [8, 'contributor'], [14, 'binding'], [16, 'bisac'], [19, 'publisher']];
  for (const [field, key] of at) assert.equal(TITLES_BASIC_COLUMNS[field - 1], key, `field ${field}`);
  assert.equal(TITLES_BASIC_COLUMNS.filter((c) => !c.startsWith('skip:')).length, at.length);
});

test('the real layout splits the derived title and reads one contributor and subject', () => {
  const record = parseTitlesBasicLine(
    line(
      {
        ean: '9780000000002',
        title: 'A Synthetic Title: Made Up for Tests [With Plush Toy]',
        contributor: ['Doe, Jane'],
        binding: 'Paperback',
        bisac: ['History | United States - General'],
        publisher: 'Example Press',
      },
      TITLES_BASIC_LAYOUT,
    ),
  );
  assert.deepEqual(record, {
    ean: '9780000000002',
    title: 'A Synthetic Title',
    subtitle: 'Made Up for Tests',
    contributors: ['Doe, Jane'],
    bisac: ['History | United States - General'],
    publisher: 'Example Press',
    binding: 'Paperback',
  });
});

test('the real layout tolerates a trailing pipe and rejects a line missing a column', () => {
  const ok = line({ ean: '9780000000002', title: 'T', bisac: ['A | B | C'] }, TITLES_BASIC_LAYOUT);
  assert.deepEqual(parseTitlesBasicLine(`${ok}|`)?.bisac, ['A | B | C']);
  const errors = emptyParseErrors();
  assert.equal(parseTitlesBasicLine(ok.split('|').slice(0, 20).join('|'), TITLES_BASIC_LAYOUT, errors), null);
  assert.equal(errors.malformed, 1);
});

test('splitDerivedTitle', () => {
  assert.deepEqual(splitDerivedTitle('Title Only'), { title: 'Title Only' });
  assert.deepEqual(splitDerivedTitle('Main: Sub: More'), { title: 'Main', subtitle: 'Sub: More' });
  assert.deepEqual(splitDerivedTitle('Main [With CDROM]'), { title: 'Main' });
  assert.deepEqual(splitDerivedTitle('Re:Visions'), { title: 'Re:Visions' });
});

test('maps every field from a full synthetic line', () => {
  const record = parse(line(FULL));
  assert.ok(record);
  assert.equal(record.ean, FULL.ean);
  assert.equal(record.title, 'A Synthetic Title');
  assert.equal(record.subtitle, 'Made Up for Tests');
  assert.equal(record.publisher, 'Example Press');
  assert.equal(record.pubDate, '2024-03-05');
  assert.equal(record.binding, 'Paperback');
  assert.equal(record.pages, 312);
  assert.equal(record.language, 'ENG');
  assert.deepEqual(record.dimensions, { length: 9, width: 6, height: 0.8, unit: TEST_LAYOUT.dimensionUnit });
  assert.deepEqual(record.weight, { value: 1.05, unit: TEST_LAYOUT.weightUnit });
  assert.deepEqual(record.listPrice, { amount: 19.99, unit: TEST_LAYOUT.priceUnit });
  assert.equal(record.recordDate, '2026-09-15');
  assert.equal(titlesBasicEan(line(FULL), TEST_LAYOUT), FULL.ean);
});

test('empty optional fields are omitted, not zero or blank', () => {
  const record = parse(line({ ean: FULL.ean, title: 'Only A Title' }));
  assert.ok(record);
  assert.deepEqual(record, { ean: FULL.ean, title: 'Only A Title', contributors: [], bisac: [] });
});

test('collects multiple contributors and BISAC codes across columns and separators', () => {
  const sep = TEST_LAYOUT.multiValueSeparator;
  const record = parse(
    line({ ...FULL, contributor: [`Doe, Jane${sep} Poe, Edgar`, 'Roe, Richard'], bisac: ['HIS056000', `SOC001000${sep}FIC000000`] }),
  );
  assert.ok(record);
  assert.deepEqual(record.contributors, ['Doe, Jane', 'Poe, Edgar', 'Roe, Richard']);
  assert.deepEqual(record.bisac, ['HIS056000', 'SOC001000', 'FIC000000']);
});

test('an embedded delimiter survives quoting (and escaping, when the layout uses it)', () => {
  const quoted = parse(line({ ...FULL, title: 'Pipes | And "Quotes"' }));
  assert.equal(quoted?.title, 'Pipes | And "Quotes"');

  const escapeLayout: TitlesBasicLayout = { ...TEST_LAYOUT, quote: null, escape: '\\' };
  const escaped = parse(line({ ...FULL, title: 'Left | Right' }, escapeLayout), escapeLayout);
  assert.equal(escaped?.title, 'Left | Right');
  assert.deepEqual(splitDelimited('a\\|b|c', escapeLayout), ['a|b', 'c']);
});

test('malformed lines return null and are counted', () => {
  const errors = emptyParseErrors();
  assert.equal(parse('too|few|fields', TEST_LAYOUT, errors), null);
  assert.equal(parse(line({ ...FULL, ean: '12345' }), TEST_LAYOUT, errors), null);
  assert.equal(parse(line({ ...FULL, title: '   ' }), TEST_LAYOUT, errors), null);
  const header = TEST_LAYOUT.columns.map((c) => c.toUpperCase()).join('|');
  assert.equal(parse(header, TEST_LAYOUT, errors), null);
  assert.equal(titlesBasicEan(header, TEST_LAYOUT), null);
  assert.equal(errors.malformed, 4);
  // A trailing delimiter is tolerated.
  assert.ok(parse(`${line(FULL)}|`));
});

test('normalizeDate reads the common Ingram date shapes and rejects impossible dates', () => {
  assert.equal(normalizeDate('20240305'), '2024-03-05');
  assert.equal(normalizeDate('2024-03-05T00:00:00'), '2024-03-05');
  assert.equal(normalizeDate('3/5/2024'), '2024-03-05');
  assert.equal(normalizeDate('20240231'), undefined);
  assert.equal(normalizeDate('00000000'), undefined);
  assert.equal(normalizeDate(''), undefined);
});
