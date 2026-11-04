// Synthetic description lines built from DESCRIPTION_LAYOUT (never vendor samples).
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDescriptionReducer,
  DESCRIPTION_LAYOUT,
  parseDescriptionRecord,
  parseDescriptionStream,
  type DescriptionLayout,
} from '../../src/app/utils/ingram/descriptionParser';

const A = '9780000000002';
const B = '9780000000019';
const C = '9780000000026';

/** A record's first line under the given layout: EAN and text at their field positions. */
function startLine(ean: string, text: string, layout: DescriptionLayout = DESCRIPTION_LAYOUT): string {
  const fields: string[] = [];
  for (let i = 0; i < layout.textField; i += 1) fields.push(i === layout.eanField ? ean : 'X');
  return [...fields, text].join(layout.delimiter);
}

async function collect(lines: string[], opts: Parameters<typeof parseDescriptionStream>[2] = {}) {
  async function* source() {
    for (const line of lines) yield line;
  }
  const out = [];
  for await (const record of parseDescriptionStream(source(), 'marketing', opts)) out.push(record);
  return out;
}

test('a single-line record parses into ean, kind and text', () => {
  assert.deepEqual(parseDescriptionRecord([startLine(A, '<p>Synthetic copy.</p>')], 'brief'), {
    ean: A,
    kind: 'brief',
    html: '<p>Synthetic copy.</p>',
  });
  assert.equal(parseDescriptionRecord([startLine(A, '   ')], 'brief'), null);
});

test('continuation lines join the current record; text may contain the delimiter', async () => {
  const records = await collect([
    'EAN|DESCRIPTION',
    startLine(A, '<p>First paragraph | with a pipe.</p>'),
    '<p>Second paragraph.</p>',
    startLine(B, 'Short one.'),
  ]);
  assert.deepEqual(records, [
    { ean: A, kind: 'marketing', html: '<p>First paragraph | with a pipe.</p>\n<p>Second paragraph.</p>' },
    { ean: B, kind: 'marketing', html: 'Short one.' },
  ]);
});

test('consecutive rows for one EAN are merged into one record', async () => {
  const records = await collect([startLine(A, 'Part one.'), startLine(A, 'Part two.'), startLine(B, 'Other.')]);
  assert.equal(records.length, 2);
  assert.equal(records[0].html, 'Part one.\nPart two.');
});

test('records outside the catalog are dropped without accumulating their lines', () => {
  const reducer = createDescriptionReducer('annotation', { eans: new Set([B]) });
  const out = [
    ...reducer.push(startLine(A, 'Not ours.')),
    ...reducer.push('a long continuation we never keep'),
    ...reducer.push(startLine(B, 'Ours.')),
    ...reducer.push(startLine(C, 'Not ours either.')),
    ...reducer.end(),
  ];
  assert.deepEqual(out, [{ ean: B, kind: 'annotation', html: 'Ours.' }]);
  assert.equal(reducer.stats.records, 3);
});

test('an explicit end-of-record marker closes a record, and stray lines are counted', async () => {
  const layout: DescriptionLayout = { ...DESCRIPTION_LAYOUT, recordEndMarker: '<<END>>' };
  const records = await collect(
    [startLine(A, 'Body', layout), 'more body', '<<END>>', 'stray line outside a record', startLine(B, 'Next', layout)],
    { layout },
  );
  assert.deepEqual(
    records.map((r) => [r.ean, r.html]),
    [
      [A, 'Body\nmore body'],
      [B, 'Next'],
    ],
  );
});
