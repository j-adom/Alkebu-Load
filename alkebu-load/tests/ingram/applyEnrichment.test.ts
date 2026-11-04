// Unit tests for the transactional apply and the review workflow, against an in-memory
// Payload with real transaction semantics (tests/ingram/support/fakePayload.ts). The
// SQLite integration suite (applyEnrichmentIntegration.test.ts) covers the same paths
// against a real Payload instance, where SQLite cannot prove atomicity.
import assert from 'node:assert/strict';
import test from 'node:test';

import { applyChangesToBook, applyEnrichment } from '../../src/app/utils/ingram/applyEnrichment';
import { diffEnrichment, rejectionKey, type FieldChange } from '../../src/app/utils/ingram/diffEnrichment';
import type { EnrichmentCandidate } from '../../src/app/utils/ingram/mapEnrichment';
import { acceptReview, rejectReview } from '../../src/app/utils/ingram/reviewWorkflow';
import { createFakePayload } from './support/fakePayload';

const EAN = '9780000000002';
const NOW = () => new Date('2026-11-01T12:00:00.000Z');
const staff = { id: 7, collection: 'users', role: 'staff' };

const baseBook = () => ({
  id: '1',
  title: 'Synthetic Title',
  synopsis: 'Curated copy',
  authorsText: [{ name: 'Jane Doe' }],
  pricing: { retailPrice: 1999 },
  editions: [{ isbn: EAN, pages: 200, pricing: { retailPrice: 1999 } }],
});

const candidate: EnrichmentCandidate = {
  ean: EAN,
  recordDate: '2026-09-15',
  book: { title: 'Synthetic Title', contributors: ['Jane Doe'], synopsis: 'Ingram copy', publisherText: 'Example Press' },
  edition: { pages: 312, 'pricing.shippingWeight': 16.8, listPriceCents: 2499 },
};

const LOG = 'ingram-enrichment-log';
const REVIEW = 'ingram-enrichment-review';

test('applies writes in one transaction: provenance stamped, one log row per value, conflict queued', async () => {
  const payload = createFakePayload({ books: [baseBook()] });
  const changes = diffEnrichment(baseBook(), candidate);
  const result = await applyEnrichment(payload as any, baseBook(), changes, 'run-1', { now: NOW, recordDate: '2026-09-15' });

  const book = payload.all('books')[0];
  assert.equal(book.editions[0].pages, 312);
  assert.equal(book.editions[0].pricing.shippingWeight, 16.8);
  assert.equal(book.editions[0].pricing.retailPrice, 2499);
  assert.equal(book.pricing.retailPrice, 2499, 'book-level price follows the raised minimum');
  assert.equal(book.publisherText, 'Example Press');
  assert.equal(book.synopsis, 'Curated copy', 'fill-gap field with curated copy is not overwritten');
  assert.deepEqual(book.enrichment.fieldSources[`editions.${EAN}.pages`], { source: 'ingram', at: NOW().toISOString() });
  assert.equal(book.enrichment.ingramRecordDate, '2026-09-15');

  const bookUpdate = payload.calls.find((c) => c.op === 'update' && c.collection === 'books');
  assert.equal(bookUpdate?.context?.ingramEnrichment, true);

  assert.equal(result.applied, 4);
  assert.equal(payload.all(LOG).length, 5, 'four fields plus the derived book-level price');
  const reviews = payload.all(REVIEW);
  assert.deepEqual(reviews.map((r) => [r.fieldPath, r.state]), [['synopsis', 'pending']]);
});

test('atomicity: a failure mid-book leaves no partial writes, logs or reviews', async () => {
  const payload = createFakePayload({ books: [baseBook()] });
  payload.failOn('create', LOG, 3);
  await assert.rejects(
    applyEnrichment(payload as any, baseBook(), diffEnrichment(baseBook(), candidate), 'run-1', { now: NOW }),
    /injected create failure/,
  );
  assert.deepEqual(payload.all('books')[0], baseBook());
  assert.equal(payload.all(LOG).length, 0);
  assert.equal(payload.all(REVIEW).length, 0);
});

test('idempotency: rerunning the same run yields zero changes', async () => {
  const payload = createFakePayload({ books: [baseBook()] });
  await applyEnrichment(payload as any, baseBook(), diffEnrichment(baseBook(), candidate), 'run-1', { now: NOW });
  const after = payload.all('books')[0];
  const rerun = diffEnrichment(after, candidate);
  assert.equal(rerun.filter((c) => c.action === 'fill' || c.action === 'correct').length, 0);
  const result = await applyEnrichment(payload as any, after, rerun, 'run-1', { now: NOW });
  assert.equal(result.applied, 0);
  assert.equal(result.queued, 0, 'the same conflict is not queued twice');
  assert.equal(payload.all(REVIEW).length, 1);
});

test('supersession: a newer, different proposal supersedes the stale pending row', async () => {
  const payload = createFakePayload({ books: [baseBook()] });
  await applyEnrichment(payload as any, baseBook(), diffEnrichment(baseBook(), candidate), 'run-1', { now: NOW });
  const newer = { ...candidate, book: { ...candidate.book, synopsis: 'Newer Ingram copy' } };
  const result = await applyEnrichment(payload as any, payload.all('books')[0], diffEnrichment(payload.all('books')[0], newer), 'run-2', { now: NOW });
  assert.equal(result.superseded, 1);
  assert.deepEqual(
    payload.all(REVIEW).map((r) => [r.proposedValue.value, r.state]),
    [
      ['Ingram copy', 'superseded'],
      ['Newer Ingram copy', 'pending'],
    ],
  );
});

test('a value edited after the diff is stale and not applied', async () => {
  const payload = createFakePayload({ books: [{ ...baseBook(), editions: [{ isbn: EAN, pages: 250, pricing: { retailPrice: 1999 } }] }] });
  const changes = diffEnrichment(baseBook(), { ...candidate, book: { title: 'Synthetic Title' }, edition: { pages: 312 } });
  const result = await applyEnrichment(payload as any, baseBook(), changes, 'run-1', { now: NOW });
  assert.equal(result.stale, 1);
  assert.equal(result.applied, 0);
  assert.equal(payload.all('books')[0].editions[0].pages, 250);
});

test('accept applies through the same path, stamps provenance and marks the row accepted', async () => {
  const payload = createFakePayload({ books: [baseBook()] });
  await applyEnrichment(payload as any, baseBook(), diffEnrichment(baseBook(), candidate), 'run-1', { now: NOW });
  const review = payload.all(REVIEW)[0];

  const result = await acceptReview(payload as any, review.id, staff, {}, NOW);
  assert.equal(result.applied, 1);
  const book = payload.all('books')[0];
  assert.equal(book.synopsis, 'Ingram copy');
  assert.equal(book.enrichment.fieldSources.synopsis.source, 'ingram');
  const row = payload.all(REVIEW)[0];
  assert.equal(row.state, 'accepted');
  assert.equal(row.reviewedBy, 7);
  assert.ok(payload.all(LOG).some((l) => l.fieldPath === 'synopsis' && l.action === 'accept' && l.previousValue.value === 'Curated copy'));
  await assert.rejects(acceptReview(payload as any, review.id, staff, {}, NOW), /already accepted/);
});

test('accept refuses (and rolls back) when the book changed since the proposal', async () => {
  const payload = createFakePayload({ books: [baseBook()] });
  await applyEnrichment(payload as any, baseBook(), diffEnrichment(baseBook(), candidate), 'run-1', { now: NOW });
  const review = payload.all(REVIEW)[0];
  await payload.update({ collection: 'books', id: '1', data: { synopsis: 'Edited meanwhile' } });
  await assert.rejects(acceptReview(payload as any, review.id, staff, {}, NOW), /changed after this proposal/);
  assert.equal(payload.all(REVIEW)[0].state, 'pending');
  assert.equal(payload.all('books')[0].synopsis, 'Edited meanwhile');
});

test('reject suppresses the same proposal on later runs', async () => {
  const payload = createFakePayload({ books: [baseBook()] });
  await applyEnrichment(payload as any, baseBook(), diffEnrichment(baseBook(), candidate), 'run-1', { now: NOW });
  const review = payload.all(REVIEW)[0];
  await rejectReview(payload as any, review.id, staff, NOW);
  assert.equal(payload.all(REVIEW)[0].state, 'rejected');

  const rejected = new Set([review.proposedKey as string]);
  assert.equal(review.proposedKey, rejectionKey('synopsis', 'synopsis', 'Ingram copy'));
  const rerun = diffEnrichment(payload.all('books')[0], candidate, undefined, { rejected });
  assert.equal(rerun.find((c) => c.key === 'synopsis')?.action, 'same');
});

test('customers and anonymous users cannot accept or reject', async () => {
  const payload = createFakePayload({ books: [baseBook()] });
  await assert.rejects(acceptReview(payload as any, 'x', { collection: 'customers', role: 'admin' }), /Only admin or staff/);
  await assert.rejects(rejectReview(payload as any, 'x', undefined), /Only admin or staff/);
});

test('applyChangesToBook is pure and keys edition writes by EAN', () => {
  const book = { ...baseBook(), editions: [{ isbn: '9780000000019', pages: 1 }, ...baseBook().editions] };
  const change: FieldChange = { key: `editions.${EAN}.pages`, path: 'pages', editionIsbn: EAN, current: 200, proposed: 312, action: 'correct' };
  const { data, applied } = applyChangesToBook(book, [change], { now: NOW().toISOString() });
  assert.equal(data.editions[0].pages, 1);
  assert.equal(data.editions[1].pages, 312);
  assert.equal(applied[0].previous, 200);
  assert.equal(book.editions[1].pages, 200, 'input not mutated');
});
