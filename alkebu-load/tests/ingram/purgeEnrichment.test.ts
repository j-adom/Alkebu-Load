import assert from 'node:assert/strict';
import test from 'node:test';

import { applyEnrichment } from '../../src/app/utils/ingram/applyEnrichment';
import { diffEnrichment } from '../../src/app/utils/ingram/diffEnrichment';
import type { EnrichmentCandidate } from '../../src/app/utils/ingram/mapEnrichment';
import { planBookPurge, runPurge } from '../../src/app/utils/ingram/purgeEnrichment';
import { createFakePayload } from './support/fakePayload';

const EAN = '9780000000002';
const MANUAL = { source: 'manual' as const, at: '2026-10-01T00:00:00.000Z' };

const original = () => ({
  id: '1',
  title: 'Wayward Lives: Beautiful Experiments by Jane Doe',
  synopsis: 'Curated copy',
  authorsText: [{ name: 'Jane Doe' }],
  pricing: { retailPrice: 1999 },
  editions: [{ isbn: EAN, pages: 200, binding: 'paperback', pricing: { retailPrice: 1999, shippingWeight: 9 } }],
  enrichment: { fieldSources: { [`editions.${EAN}.binding`]: MANUAL } },
});

const candidate: EnrichmentCandidate = {
  ean: EAN,
  book: { title: 'Wayward Lives', subtitle: 'Beautiful Experiments', contributors: ['Jane Doe'], publisherText: 'Example Press', synopsis: 'Ingram copy' },
  edition: { pages: 312, 'pricing.shippingWeight': 16.8, binding: 'hardcover', mediaMailEligible: true, listPriceCents: 2499 },
};

async function enriched() {
  const payload = createFakePayload({ books: [original()] });
  await applyEnrichment(payload as any, original(), diffEnrichment(original(), candidate), 'run-1');
  return payload;
}

test('the purge restores pre-Ingram values, clears Ingram-only ones and keeps manual fields', async () => {
  const payload = await enriched();
  assert.equal(payload.all('books')[0].editions[0].pages, 312);
  assert.ok(payload.all('ingram-enrichment-log').length > 0);
  assert.ok(payload.all('ingram-enrichment-review').length > 0);

  const summary = await runPurge(payload as any, { dryRun: false });
  assert.equal(summary.booksUpdated, 1);
  const book = payload.all('books')[0];
  assert.equal(book.title, original().title);
  assert.equal(book.subtitle, null);
  assert.equal(book.titleLong, null);
  assert.equal(book.publisherText, null, 'was empty before Ingram: cleared');
  assert.equal(book.synopsis, 'Curated copy', 'never written by Ingram');
  assert.equal(book.editions[0].pages, 200);
  assert.equal(book.editions[0].pricing.shippingWeight, 9);
  assert.equal(book.editions[0].pricing.retailPrice, 1999);
  assert.equal(book.pricing.retailPrice, 1999, 'derived book-level price restored');
  assert.equal(book.editions[0].mediaMailEligible, null, 'system field cleared');
  assert.equal(book.editions[0].binding, 'paperback', 'manual field untouched');
  assert.deepEqual(book.enrichment.fieldSources, { [`editions.${EAN}.binding`]: MANUAL });
  assert.equal(book.enrichment.ingramEnrichedAt, null);
  assert.equal(payload.all('ingram-enrichment-log').length, 0);
  assert.equal(payload.all('ingram-enrichment-review').length, 0);
});

test('a dry run changes nothing and reports counts', async () => {
  const payload = await enriched();
  const before = payload.all('books')[0];
  const summary = await runPurge(payload as any, { dryRun: true });
  assert.deepEqual(payload.all('books')[0], before);
  assert.ok(payload.all('ingram-enrichment-log').length > 0);
  assert.equal(summary.booksWithIngramData, 1);
  assert.ok(summary.fieldsRestored > 0);
  assert.ok(summary.fieldsCleared > 0);
});

test('a failed book keeps the log (the only record of previous values)', async () => {
  const payload = await enriched();
  payload.failOn('update', 'books');
  const summary = await runPurge(payload as any, { dryRun: false });
  assert.equal(summary.booksFailed, 1);
  assert.ok(payload.all('ingram-enrichment-log').length > 0);
});

test('Square changes are reported, not touched', () => {
  const plan = planBookPurge(
    { id: '1', title: 'Wayward Lives', enrichment: { fieldSources: { title: { source: 'ingram', at: 'x' } } } },
    [
      { fieldPath: 'title', target: 'square', previousValue: { value: 'Old Name (Paperback)' }, squareObjectId: 'ITEM-1' },
      { fieldPath: 'title', target: 'payload', previousValue: { value: 'Old Name' }, previousSource: null, createdAt: '2026-11-01' },
    ],
  );
  assert.equal(plan?.data.title, 'Old Name');
  assert.equal(plan?.restored, 1);
});
