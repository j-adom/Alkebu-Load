// Undoing a run's price uplifts that reached Payload but not Square.
import assert from 'node:assert/strict';
import test from 'node:test';

import { planUnsyncedPriceRevert, revertUnsyncedPrices } from '../../src/app/utils/ingram/revertUnsyncedPrices';
import { createFakePayload } from './support/fakePayload';

const RUN = 'ingram-2026-11-17-test';
const EAN_P = '9780000000002';
const EAN_H = '9780000000019';
const keyOf = (ean: string) => `editions.${ean}.pricing.retailPrice`;

/** A book as the old code left it: edition raised to 2499 and the book price with it. */
const raisedBook = (id: string, edition: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  id,
  title: 'Book',
  squareItemId: '210000008854',
  pricing: { retailPrice: 2499 },
  enrichment: { fieldSources: { [keyOf(EAN_P)]: { source: 'ingram', at: '2026-11-17T00:00:00.000Z' }, title: { source: 'manual', at: 'x' } } },
  editions: [{ isbn: EAN_P, binding: 'paperback', pricing: { retailPrice: 2499 }, ...edition }],
  ...extra,
});

const priceLogs = (bookId: string, ean = EAN_P) => [
  { book: bookId, runId: RUN, fieldPath: keyOf(ean), target: 'payload', previousValue: { value: 1999 }, newValue: { value: 2499 } },
  { book: bookId, runId: RUN, fieldPath: 'pricing.retailPrice', target: 'payload', previousValue: { value: 1999 }, newValue: { value: 2499 } },
];

test('planUnsyncedPriceRevert: puts a legacy-linked edition back, re-derives the book price, drops provenance', () => {
  const book = raisedBook('1', { squareItemId: '210000008854' });
  const logs = priceLogs('1').map((l, i) => ({ ...l, id: i + 1 }));
  const plan = planUnsyncedPriceRevert(book, logs)!;
  assert.deepEqual(plan.reverted, [keyOf(EAN_P)]);
  assert.equal(plan.data.editions[0].pricing.retailPrice, 1999);
  assert.equal(plan.data.pricing.retailPrice, 1999);
  assert.deepEqual(Object.keys(plan.data.enrichment.fieldSources), ['title'], 'only the reverted key leaves');
  assert.deepEqual(plan.logIds, [1, 2]);
});

test('planUnsyncedPriceRevert leaves synced, Payload-only and since-changed prices alone', () => {
  // Written to Square in the same run: a square row exists for the key.
  const synced = raisedBook('1', { squareItemId: 'ITEM-P', squareVariationId: 'VAR-P' });
  const syncedLogs = [...priceLogs('1'), { book: '1', runId: RUN, fieldPath: keyOf(EAN_P), target: 'square', previousValue: { value: 1999 }, newValue: { value: 2499 } }];
  assert.equal(planUnsyncedPriceRevert(synced, syncedLogs.map((l, i) => ({ ...l, id: i }))), null);

  // No Square ids anywhere: the uplift is the website's own price and stays.
  const payloadOnly = raisedBook('2', {}, { squareItemId: null });
  assert.equal(planUnsyncedPriceRevert(payloadOnly, priceLogs('2').map((l, i) => ({ ...l, id: i }))), null);

  // Staff changed the price after the run: counted, not touched.
  const edited = raisedBook('3', { squareItemId: '210000008854', pricing: { retailPrice: 2600 } });
  const plan = planUnsyncedPriceRevert(edited, priceLogs('3').map((l, i) => ({ ...l, id: i })))!;
  assert.deepEqual(plan.reverted, []);
  assert.deepEqual(plan.changedSince, [keyOf(EAN_P)]);
  assert.deepEqual(plan.data, {});
});

test('an online-only extra edition keeps its uplift while the Square edition reverts', () => {
  const book = {
    ...raisedBook('1', { squareItemId: '210000008854' }),
    pricing: { retailPrice: 2499 },
    editions: [
      { isbn: EAN_P, binding: 'paperback', squareItemId: '210000008854', pricing: { retailPrice: 2499 } },
      { isbn: EAN_H, binding: 'hardcover', pricing: { retailPrice: 3499 } },
    ],
  };
  const logs = [
    ...priceLogs('1'),
    { book: '1', runId: RUN, fieldPath: keyOf(EAN_H), target: 'payload', previousValue: { value: 2999 }, newValue: { value: 3499 } },
  ].map((l, i) => ({ ...l, id: i }));
  const plan = planUnsyncedPriceRevert(book, logs)!;
  assert.deepEqual(plan.reverted, [keyOf(EAN_P)]);
  assert.equal(plan.data.editions[1].pricing.retailPrice, 3499);
  assert.equal(plan.data.pricing.retailPrice, 1999, 'minimum of 1999 and 3499');
});

test('revertUnsyncedPrices: dry run counts only; apply updates the book and deletes just those log rows', async () => {
  const seed = () => ({
    books: [raisedBook('1', { squareItemId: '210000008854' }), raisedBook('2', {}, { squareItemId: null })],
    'ingram-enrichment-log': [
      ...priceLogs('1'),
      ...priceLogs('2'),
      { book: '1', runId: RUN, fieldPath: `editions.${EAN_P}.binding`, target: 'payload', previousValue: { value: 'paperback' }, newValue: { value: 'hardcover' } },
      { book: '1', runId: 'other-run', fieldPath: keyOf(EAN_P), target: 'payload', previousValue: { value: 1500 }, newValue: { value: 1999 } },
    ].map((l, i) => ({ id: String(i + 1), ...l })),
  });

  const dry = createFakePayload(seed());
  const counts = await revertUnsyncedPrices(dry as any, RUN, { dryRun: true });
  assert.deepEqual(
    { books: counts.booksWithUnsyncedPrices, reverted: counts.editionsReverted, updated: counts.booksUpdated },
    { books: 1, reverted: 1, updated: 0 },
  );
  assert.equal(dry.all('books').find((b) => b.id === '1')!.editions[0].pricing.retailPrice, 2499);

  const payload = createFakePayload(seed());
  const summary = await revertUnsyncedPrices(payload as any, RUN, { dryRun: false });
  assert.equal(summary.booksUpdated, 1);
  assert.equal(summary.logRowsDeleted, 2);
  const book1 = payload.all('books').find((b) => b.id === '1')!;
  assert.equal(book1.editions[0].pricing.retailPrice, 1999);
  assert.equal(book1.pricing.retailPrice, 1999);
  assert.equal(payload.all('books').find((b) => b.id === '2')!.editions[0].pricing.retailPrice, 2499, 'Payload-only book keeps its uplift');
  const left = payload.all('ingram-enrichment-log').map((l) => `${l.book}:${l.runId}:${l.fieldPath}`).sort();
  assert.deepEqual(left, [
    `1:${RUN}:editions.${EAN_P}.binding`,
    `1:other-run:${keyOf(EAN_P)}`,
    `2:${RUN}:${keyOf(EAN_P)}`,
    `2:${RUN}:pricing.retailPrice`,
  ]);

  // Idempotent: a second apply finds nothing left to revert.
  const again = await revertUnsyncedPrices(payload as any, RUN, { dryRun: false });
  assert.equal(again.editionsReverted, 0);
  assert.equal(again.booksUpdated, 0);
});
