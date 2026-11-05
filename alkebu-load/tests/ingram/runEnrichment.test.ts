// End-to-end run over synthetic zips (built from the layout constants) and an in-memory
// Payload. No SFTP, no Square, no vendor data.
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { DESCRIPTION_LAYOUTS } from '../../src/app/utils/ingram/descriptionParser';
import { createCatalogCsvFormat } from '../../src/app/utils/ingram/parseCatalogStockCsv';
import { PlaceholderLayoutError, runEnrichment } from '../../src/app/utils/ingram/runEnrichment';
import { TITLES_BASIC_LAYOUT } from '../../src/app/utils/ingram/titlesBasicParser';
import { enrichmentFilesFor, isFirstMondayUtc, runScheduledEnrichment } from '../../src/app/utils/ingram/scheduledEnrichment';
import { createFakePayload } from './support/fakePayload';
import { makeZip } from './support/makeZip';
import { buildTitlesBasicLine } from './support/titlesBasicFixture';

const EANS = ['9780000000002', '9780000000019', '9780000000026', '9780000000033'];
// Distinctive synthetic strings: none may appear in a run summary.
const SECRET_TITLE = 'Zyxquorian Chronicles';
const SECRET_PUBLISHER = 'Qwertyplex Press';
const SECRET_COPY = 'Florbinated marketing copy';

let dir: string;
let titlesZip: string;
let descZip: string;
let stockZip: string;

// Catalog Stock CSV column names (as delivered), synthetic values.
const STOCK_HEADER = 'EAN,List Price,Publication Date,On Sale Date,Media Mail Indicator,Weight,Product Availability Code,LaVergne TN On Hand';

const book = (i: number) => ({
  id: String(i + 1),
  title: `${SECRET_TITLE} ${i}: Volume ${i} by Jane Doe`,
  authorsText: [{ name: 'Jane Doe' }],
  pricing: { retailPrice: 1999 },
  editions: [{ isbn: EANS[i], pages: 100, pricing: { retailPrice: 1999 } }],
});

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ingram-run-'));
  const lines = EANS.slice(0, 3).map((ean, i) =>
    // Titles Basic's derived title carries the subtitle (and any accessory note).
    buildTitlesBasicLine({
      ean,
      title: `${SECRET_TITLE} ${i}: Volume ${i} [With CD]`,
      contributor: ['Doe, Jane'],
      binding: 'Paperback',
      publisher: SECRET_PUBLISHER,
    }),
  );
  // A non-catalog title and a malformed line, which must be filtered/counted, not applied.
  lines.push(buildTitlesBasicLine({ ean: '9780000000057', title: 'Not ours' }), `${EANS[0]}|broken`);
  titlesZip = join(dir, 'ttl.zip');
  await writeFile(titlesZip, makeZip([{ name: 'ttlingbasic.txt', content: `${lines.join('\n')}\n` }]));

  const brief = DESCRIPTION_LAYOUTS.brief;
  const desc = (ean: string, text: string) => {
    const fields: string[] = [];
    for (let i = 0; i < brief.textField; i += 1) fields.push(i === brief.eanField ? ean : 'X');
    return [...fields, text].join(brief.delimiter);
  };
  descZip = join(dir, 'brief.zip');
  await writeFile(descZip, makeZip([{ name: 'brdn.txt', content: `${desc(EANS[0], `<p>${SECRET_COPY}</p>`)}\n` }]));

  const stockRows = EANS.slice(0, 3).map((ean) => `${ean},24.99,03/05/2024,03/05/2024,Y,1.05,21,40`);
  stockZip = join(dir, 'stock.zip');
  await writeFile(stockZip, makeZip([{ name: 'cat_ing_stock.csv', content: `${[STOCK_HEADER, ...stockRows].join('\n')}\n` }]));
});

after(async () => {
  await rm(dir, { recursive: true, force: true });
});

const files = () => ({
  titles: { path: titlesZip },
  descriptions: [{ path: descZip, kind: 'brief' as const }],
  stock: { path: stockZip, format: createCatalogCsvFormat() },
});

test('a run refuses a placeholder layout unless explicitly allowed (tests only)', async () => {
  const payload = createFakePayload({ books: [book(0)] });
  const titlesLayout = { ...TITLES_BASIC_LAYOUT, placeholder: true };
  await assert.rejects(runEnrichment(payload as any, { files: files(), dryRun: true, titlesLayout }), PlaceholderLayoutError);
  const descriptionLayout = { ...DESCRIPTION_LAYOUTS.brief, placeholder: true };
  await assert.rejects(runEnrichment(payload as any, { files: files(), dryRun: true, descriptionLayout }), PlaceholderLayoutError);
});

test('a dry run writes nothing and reports counts only', async () => {
  const payload = createFakePayload({ books: [0, 1, 2, 3].map(book) });
  const summary = await runEnrichment(payload as any, { files: files(), dryRun: true });

  assert.equal(payload.calls.filter((c) => c.op !== 'updateGlobal').length, 0, 'no create/update at all');
  assert.equal(summary.scanned, 4);
  assert.equal(summary.matched, 3);
  assert.equal(summary.catalogEans, 4);
  assert.equal(summary.unmatchedEans, 1);
  assert.equal(summary.parseErrors, 1);
  assert.equal(summary.booksTouched, 3);
  // Price comes from the stock file: Titles Basic has none.
  assert.equal(summary.byField['pricing.retailPrice']?.correct, 3);
  assert.equal(summary.byField.pages, undefined, 'no licensed source for pages');
  assert.equal(summary.byField.synopsis?.fill, 1);
  assert.equal(summary.titleCleanup.exact, 3);
  assert.equal(summary.applied.applied, 0);

  const text = JSON.stringify(summary);
  for (const secret of [SECRET_TITLE, SECRET_PUBLISHER, SECRET_COPY, 'Jane Doe', 'Volume', 'With CD']) {
    assert.ok(!text.includes(secret), `summary leaked "${secret}"`);
  }
});

test('--limit bounds the books touched', async () => {
  const payload = createFakePayload({ books: [0, 1, 2, 3].map(book) });
  const summary = await runEnrichment(payload as any, { files: files(), dryRun: false, limit: 2 });
  assert.equal(summary.booksTouched, 2);
  const updatedBooks = new Set(payload.calls.filter((c) => c.op === 'update' && c.collection === 'books').map((c) => c.data?.title ?? c.data));
  assert.equal(updatedBooks.size, 2);
  const changed = payload.all('books').filter((b) => b.enrichment?.ingramEnrichedAt);
  assert.equal(changed.length, 2);
  assert.equal(changed[0].title, `${SECRET_TITLE} 0`);
  assert.equal(changed[0].subtitle, 'Volume 0');
});

test('an applied run is idempotent', async () => {
  const payload = createFakePayload({ books: [0, 1, 2, 3].map(book) });
  await runEnrichment(payload as any, { files: files(), dryRun: false });
  const again = await runEnrichment(payload as any, { files: files(), dryRun: false });
  assert.equal(again.applied.applied, 0);
  assert.equal(again.applied.queued, 0);
});

test('scheduled run: skips unchanged files, records checksums only after a clean full apply', async () => {
  const payload = createFakePayload({ books: [0, 1].map(book) });
  const local = { titles: titlesZip, stock: stockZip };
  const opts = { dryRun: false };

  const dry = await runScheduledEnrichment(payload as any, 'titles', { ...opts, dryRun: true }, { local, square: null });
  assert.ok(!('skipped' in dry));
  assert.equal(payload.globals.size, 0, 'a dry run records nothing');

  const limited = await runScheduledEnrichment(payload as any, 'titles', { ...opts, limit: 1 }, { local, square: null });
  assert.ok(!('skipped' in limited));
  assert.equal(payload.globals.size, 0, 'a bounded run records nothing');

  const first = await runScheduledEnrichment(payload as any, 'titles', opts, { local, square: null });
  assert.ok(!('skipped' in first));
  const state = payload.globals.get('ingramEnrichmentState')!;
  assert.deepEqual(Object.keys(state.processedFiles).sort(), ['Inventory/Catalog_Stock/cat_ing_stock.zip', 'TitlesBasic/ttlingbasic_pipe.zip']);
  assert.ok(!JSON.stringify(state.lastRunSummary).includes(SECRET_TITLE));

  const second = await runScheduledEnrichment(payload as any, 'titles', opts, { local, square: null });
  assert.deepEqual(second, { skipped: 'files unchanged since the last applied run' });
  const forced = await runScheduledEnrichment(payload as any, 'titles', { ...opts, force: true }, { local, square: null });
  assert.ok(!('skipped' in forced));
});

test('scheduled titles run reuses the daily refresh stock records instead of downloading', async () => {
  const payload = createFakePayload({ books: [0, 1].map(book) });
  const records = Object.fromEntries(
    EANS.slice(0, 2).map((ean) => [ean, { ean, backorder: false, mediaMail: true, pubListPrice: 24.99, dcs: {} }]),
  );
  const downloads: string[] = [];
  const result = await runScheduledEnrichment(payload as any, 'titles', { dryRun: false }, {
    local: { titles: titlesZip },
    square: null,
    stockCache: async (source) => ({ savedAt: new Date().toISOString(), sourceFile: source, checksum: 'abc', records }),
    download: async (remote) => {
      downloads.push(remote);
    },
  });
  assert.ok(!('skipped' in result));
  assert.equal(downloads.length, 0, 'nothing downloaded');
  assert.equal(result.byField['pricing.retailPrice']?.correct, 2, 'cached prices were used');
  const state = payload.globals.get('ingramEnrichmentState')!;
  assert.equal(state.processedFiles['Inventory/Catalog_Stock/cat_ing_stock.zip'].checksum, 'abc');

  // No fresh cache: the stock file is downloaded as before.
  const fresh = createFakePayload({ books: [0, 1].map(book) });
  const fallback = await runScheduledEnrichment(fresh as any, 'titles', { dryRun: true }, {
    local: { titles: titlesZip },
    square: null,
    stockCache: async () => null,
    download: async (remote, local) => {
      downloads.push(remote);
      const { copyFile } = await import('node:fs/promises');
      await copyFile(stockZip, local);
    },
  });
  assert.ok(!('skipped' in fallback));
  assert.deepEqual(downloads, ['Inventory/Catalog_Stock/cat_ing_stock.zip']);
});

test('job file selection and the first-Monday rule', () => {
  assert.deepEqual(enrichmentFilesFor('titles', {}).map((s) => s.kind), ['titles', 'stock']);
  assert.deepEqual(enrichmentFilesFor('titles', { INGRAM_ENRICH_WITH_STOCK_FILE: 'false' }).map((s) => s.kind), ['titles']);
  assert.deepEqual(
    enrichmentFilesFor('titles', { INGRAM_ANNOTATIONS_PATH: 'TitlesBasic/annobasic_pipe.zip' }).map((s) => s.kind),
    ['titles', 'annotation', 'stock'],
  );
  const monthly = enrichmentFilesFor('descriptions', {});
  assert.ok(typeof monthly[0].remote === 'object' && monthly[0].remote.pattern.test('ingmmthy-13.zip'));
  assert.deepEqual(enrichmentFilesFor('descriptions', {}, { backfill: true }).map((s) => s.remote), ['DESC_BKLST/PMALL_active.zip', 'DESC_BKLST/brdn_GBLFL.zip']);
  assert.equal(isFirstMondayUtc(new Date('2026-11-02T14:00:00Z')), true);
  assert.equal(isFirstMondayUtc(new Date('2026-11-09T14:00:00Z')), false);
  assert.equal(isFirstMondayUtc(new Date('2026-11-03T14:00:00Z')), false);
});
