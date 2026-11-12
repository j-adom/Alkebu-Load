// Square write-back against a mock catalog client: no Square SDK, no network.
import assert from 'node:assert/strict';
import test from 'node:test';

import { applyEnrichment } from '../../src/app/utils/ingram/applyEnrichment';
import type { FieldChange } from '../../src/app/utils/ingram/diffEnrichment';
import {
  applySquareWrites,
  planSquareAuthorFills,
  planSquareWrites,
  SQUARE_AUTHOR_ATTRIBUTE_KEY,
  SQUARE_BATCH_LIMIT,
  squareAuthorValue,
  type SquareCatalogClient,
  type SquareWrite,
} from '../../src/app/utils/ingram/squareWriteBack';
import { mapSquareItemToBook } from '../../src/app/utils/squareCatalogMapping';
import { squareItemName, stripBindingSuffix } from '../../src/app/utils/squareItemName';
import { createFakePayload } from './support/fakePayload';

const EAN_P = '9780000000002';
const EAN_H = '9780000000019';

function mockClient(objects: any[], opts: { upsertErrors?: unknown[] } = {}) {
  const store = new Map(objects.map((o) => [o.id, structuredClone(o)]));
  const errors = [...(opts.upsertErrors ?? [])];
  const calls = { batchGet: 0, batchUpsert: 0, upsertSizes: [] as number[], upserted: [] as any[] };
  const client: SquareCatalogClient & { store: typeof store; calls: typeof calls } = {
    store,
    calls,
    catalog: {
      async batchGet({ objectIds }) {
        calls.batchGet += 1;
        return { objects: objectIds.map((id) => store.get(id)).filter(Boolean).map((o) => structuredClone(o)) };
      },
      async batchUpsert({ batches }) {
        calls.batchUpsert += 1;
        const objs = batches.flatMap((b) => b.objects);
        calls.upsertSizes.push(objs.length);
        const error = errors.shift();
        if (error) throw error;
        calls.upserted.push(...objs);
        const out = objs.map((o) => {
          const next = { ...o, version: BigInt(Number(o.version ?? 0) + 1) };
          store.set(o.id, next);
          return next;
        });
        return { objects: out };
      },
    },
  };
  return client;
}

const variation = (id: string, itemId: string, cents: number, version = 1) => ({
  type: 'ITEM_VARIATION',
  id,
  version: BigInt(version),
  itemVariationData: { itemId, priceMoney: { amount: BigInt(cents), currency: 'USD' } },
});
const item = (id: string, name: string, variations: any[] = [], version = 1) => ({
  type: 'ITEM',
  id,
  version: BigInt(version),
  itemData: { name, variations },
});

const linkedBook = () => ({
  id: '1',
  title: 'Wayward Lives: Beautiful Experiments',
  squareItemId: 'ITEM-P',
  pricing: { retailPrice: 1999 },
  editions: [
    { isbn: EAN_P, binding: 'paperback', squareItemId: 'ITEM-P', squareVariationId: 'VAR-P', pricing: { retailPrice: 1999 } },
    { isbn: EAN_H, binding: 'hardcover', squareItemId: 'ITEM-H', squareVariationId: 'VAR-H', pricing: { retailPrice: 2999 } },
  ],
});

const priceChange = (ean: string, current: number, proposed: number): FieldChange => ({
  key: `editions.${ean}.pricing.retailPrice`,
  path: 'pricing.retailPrice',
  editionIsbn: ean,
  current,
  proposed,
  action: 'correct',
});
const titleChange: FieldChange = { key: 'title', path: 'title', current: 'Wayward Lives: Beautiful Experiments', proposed: 'Wayward Lives', action: 'correct' };
const subtitleChange: FieldChange = { key: 'subtitle', path: 'subtitle', current: null, proposed: 'Beautiful Experiments', action: 'fill' };

test('planSquareWrites: price to the variation, title to every binding item, nothing for Payload-only books', () => {
  const writes = planSquareWrites(linkedBook(), [priceChange(EAN_P, 1999, 2499), titleChange, subtitleChange]);
  assert.deepEqual(
    writes.map((w) => [w.kind, w.objectId, w.next]),
    [
      ['price', 'VAR-P', 2499],
      ['name', 'ITEM-P', 'Wayward Lives (Paperback)'],
      ['name', 'ITEM-H', 'Wayward Lives (Hardcover)'],
    ],
  );
  const payloadOnly = { ...linkedBook(), squareItemId: null, editions: linkedBook().editions.map(({ squareItemId: _a, squareVariationId: _b, ...e }) => e) };
  assert.deepEqual(planSquareWrites(payloadOnly, [priceChange(EAN_P, 1999, 2499), titleChange]), []);
});

test('a dry run calls neither the fetch nor the upsert', async () => {
  const client = mockClient([variation('VAR-P', 'ITEM-P', 1999)]);
  const writes = planSquareWrites(linkedBook(), [priceChange(EAN_P, 1999, 2499)]);
  const result = await applySquareWrites(client, writes, { dryRun: true });
  assert.equal(client.calls.batchUpsert, 0);
  assert.equal(client.calls.batchGet, 0);
  assert.equal(result.skipped.length, 1);
});

test('writes with the fetched version and logs the previous value', async () => {
  const client = mockClient([variation('VAR-P', 'ITEM-P', 1999, 7)]);
  const result = await applySquareWrites(client, planSquareWrites(linkedBook(), [priceChange(EAN_P, 1999, 2499)]), { dryRun: false });
  assert.equal(client.calls.upserted[0].version, 7n);
  assert.equal(client.calls.upserted[0].itemVariationData.priceMoney.amount, 2499n);
  assert.deepEqual(result.written.map((w) => [w.previous, w.previousVersion, w.newVersion]), [[1999, '7', '8']]);
});

test('a version conflict re-fetches and recomputes once', async () => {
  // The mock rejects the first upsert as a version mismatch (a concurrent edit that left the price alone).
  const client = mockClient([variation('VAR-P', 'ITEM-P', 1999, 1)], {
    upsertErrors: [Object.assign(new Error('Object version does not match'), { statusCode: 400, errors: [{ code: 'VERSION_MISMATCH' }] })],
  });
  const result = await applySquareWrites(client, planSquareWrites(linkedBook(), [priceChange(EAN_P, 1999, 2499)]), { dryRun: false });
  assert.equal(client.calls.batchGet, 2);
  assert.equal(client.calls.batchUpsert, 2);
  assert.equal(result.written.length, 1);

  const stubborn = mockClient([variation('VAR-P', 'ITEM-P', 1999)], {
    upsertErrors: [{ statusCode: 409 }, { statusCode: 409 }, { statusCode: 409 }],
  });
  const gaveUp = await applySquareWrites(stubborn, planSquareWrites(linkedBook(), [priceChange(EAN_P, 1999, 2499)]), { dryRun: false });
  assert.equal(stubborn.calls.batchUpsert, 2, 'retries exactly once');
  assert.equal(gaveUp.conflicts.length, 1);
});

test('a value staff changed in Square since the diff is never clobbered', async () => {
  const client = mockClient([variation('VAR-P', 'ITEM-P', 2199), item('ITEM-P', 'Staff Renamed It (Paperback)')]);
  const result = await applySquareWrites(client, planSquareWrites(linkedBook(), [priceChange(EAN_P, 1999, 2499), titleChange]).filter((w) => w.objectId !== 'ITEM-H'), { dryRun: false });
  assert.equal(client.calls.batchUpsert, 0);
  assert.equal(result.conflicts.length, 2);
  assert.equal(client.store.get('VAR-P')!.itemVariationData.priceMoney.amount, 2199n);
});

test('batches never exceed 100 objects', async () => {
  const objects: any[] = [];
  const writes: SquareWrite[] = [];
  for (let i = 0; i < 250; i += 1) {
    objects.push(variation(`VAR-${i}`, `ITEM-${i}`, 1000));
    writes.push({ kind: 'price', objectId: `VAR-${i}`, key: `k${i}`, expected: [1000], next: 1200 });
  }
  const client = mockClient(objects);
  const result = await applySquareWrites(client, writes, { dryRun: false });
  assert.equal(result.written.length, 250);
  assert.ok(client.calls.upsertSizes.every((n) => n <= SQUARE_BATCH_LIMIT));
  assert.equal(client.calls.upsertSizes.length, 3);
});

test('a rename and a price change on the same item travel as one object', async () => {
  const v = variation('VAR-P', 'ITEM-P', 1999);
  const client = mockClient([v, item('ITEM-P', 'Wayward Lives: Beautiful Experiments (Paperback)', [v])]);
  const writes = planSquareWrites(linkedBook(), [priceChange(EAN_P, 1999, 2499), titleChange]).filter((w) => w.objectId !== 'ITEM-H');
  const result = await applySquareWrites(client, writes, { dryRun: false });
  assert.deepEqual(client.calls.upsertSizes, [1]);
  const upserted = client.calls.upserted[0];
  assert.equal(upserted.itemData.name, 'Wayward Lives (Paperback)');
  assert.equal(upserted.itemData.variations[0].itemVariationData.priceMoney.amount, 2499n);
  assert.equal(result.written.length, 2);
});

test('applyEnrichment: Square first, logged; a Square failure means no Payload write', async () => {
  const payload = createFakePayload({ books: [linkedBook()] });
  const client = mockClient([variation('VAR-P', 'ITEM-P', 1999)], { upsertErrors: [Object.assign(new Error('Square is down'), { statusCode: 503 })] });
  await assert.rejects(applyEnrichment(payload as any, linkedBook(), [priceChange(EAN_P, 1999, 2499)], 'run-1', { square: { client } }), /Square is down/);
  assert.equal(payload.all('books')[0].editions[0].pricing.retailPrice, 1999);
  assert.equal(payload.all('ingram-enrichment-log').length, 0);

  const ok = mockClient([variation('VAR-P', 'ITEM-P', 1999)]);
  const payload2 = createFakePayload({ books: [linkedBook()] });
  const result = await applyEnrichment(payload2 as any, linkedBook(), [priceChange(EAN_P, 1999, 2499)], 'run-1', { square: { client: ok } });
  assert.equal(result.squareWritten, 1);
  assert.equal(payload2.all('books')[0].editions[0].pricing.retailPrice, 2499);
  const targets = payload2.all('ingram-enrichment-log').map((l) => l.target).sort();
  // Edition price, derived book-level price, and the Square variation.
  assert.deepEqual(targets, ['payload', 'payload', 'square']);
  const squareLog = payload2.all('ingram-enrichment-log').find((l) => l.target === 'square')!;
  assert.equal(squareLog.squareObjectId, 'VAR-P');
  assert.equal(squareLog.previousValue.value, 1999);
});

test('a Payload failure after a Square success is not retried (the catalog sync converges)', async () => {
  const payload = createFakePayload({ books: [linkedBook()] });
  payload.failOn('update', 'books');
  const client = mockClient([variation('VAR-P', 'ITEM-P', 1999)]);
  await assert.rejects(applyEnrichment(payload as any, linkedBook(), [priceChange(EAN_P, 1999, 2499)], 'run-1', { square: { client } }), /injected update failure/);
  assert.equal(client.calls.batchUpsert, 1);
  assert.equal(client.store.get('VAR-P')!.itemVariationData.priceMoney.amount, 2499n);
  // A rerun diffs Payload's old price against Square's new one: a conflict, not a second write.
  const rerun = await applySquareWrites(client, planSquareWrites(linkedBook(), [priceChange(EAN_P, 1999, 2499)]), { dryRun: false });
  assert.equal(rerun.conflicts.length, 1);
  assert.equal(client.calls.batchUpsert, 1);
});

test('with write-back off, price/title changes on Square-linked books are deferred; Payload-only books still apply', async () => {
  const payload = createFakePayload({ books: [linkedBook()] });
  const result = await applyEnrichment(payload as any, linkedBook(), [priceChange(EAN_P, 1999, 2499), titleChange, subtitleChange], 'run-1');
  assert.equal(result.deferred, 3, 'title blocked takes the subtitle with it');
  assert.equal(payload.all('books')[0].title, 'Wayward Lives: Beautiful Experiments');

  const unlinked = { ...linkedBook(), squareItemId: null, editions: [{ isbn: EAN_P, binding: 'paperback', pricing: { retailPrice: 1999 } }] };
  const payload2 = createFakePayload({ books: [unlinked] });
  const ok = await applyEnrichment(payload2 as any, unlinked, [priceChange(EAN_P, 1999, 2499), titleChange, subtitleChange], 'run-1');
  assert.equal(ok.deferred, 0);
  assert.equal(payload2.all('books')[0].subtitle, 'Beautiful Experiments');
});

test('Square item names carry the binding, and the catalog sync strips it back off', () => {
  assert.equal(squareItemName('Wayward Lives', 'paperback'), 'Wayward Lives (Paperback)');
  assert.equal(squareItemName('Wayward Lives', null), 'Wayward Lives');
  assert.equal(stripBindingSuffix('Wayward Lives (Paperback)'), 'Wayward Lives');
  assert.equal(stripBindingSuffix('Wayward Lives (mass market)'), 'Wayward Lives');
  assert.equal(stripBindingSuffix('Wayward Lives (2nd Edition)'), 'Wayward Lives (2nd Edition)');
  assert.equal(stripBindingSuffix('(Paperback)'), '(Paperback)');

  const mapped = mapSquareItemToBook({
    id: 'ITEM-P',
    itemData: {
      name: 'Wayward Lives (Paperback)',
      variations: [{ id: 'VAR-P', itemVariationData: { sku: EAN_P, priceMoney: { amount: 2499n } } }],
    },
  });
  assert.equal(mapped.kind, 'complete');
  assert.equal((mapped as any).data.title, 'Wayward Lives');
});

// --- Square "Author" fills --------------------------------------------------------------

const AUTHOR_KEY = SQUARE_AUTHOR_ATTRIBUTE_KEY;
const withAuthorValue = (obj: any, value: string) => ({
  ...obj,
  customAttributeValues: { [AUTHOR_KEY]: { name: 'Author', stringValue: value, key: AUTHOR_KEY, type: 'STRING' } },
});
const authorOfObject = (obj: any) => obj?.customAttributeValues?.[AUTHOR_KEY]?.stringValue;

test('squareAuthorValue: trims, drops duplicates, joins, and fits Square\'s 255-character limit', () => {
  assert.equal(squareAuthorValue([' Alice  Faye Duncan ', 'Chris Raschka', 'alice faye duncan', '', null]), 'Alice Faye Duncan, Chris Raschka');
  assert.equal(squareAuthorValue([]), null);
  assert.equal(squareAuthorValue(['  ']), null);
  const long = 'A'.repeat(200);
  assert.equal(squareAuthorValue([long, 'B'.repeat(60), 'Short Name']), `${long}, Short Name`);
  assert.equal(squareAuthorValue(['C'.repeat(300)])?.length, 255);
});

test('planSquareAuthorFills: one fill per Square-linked variation, none without names or links', () => {
  const writes = planSquareAuthorFills(linkedBook(), ['Saidiya Hartman']);
  assert.deepEqual(
    writes.map((w) => [w.kind, w.objectId, w.editionIsbn, w.next, w.attributeKey]),
    [
      ['author', 'VAR-P', EAN_P, 'Saidiya Hartman', AUTHOR_KEY],
      ['author', 'VAR-H', EAN_H, 'Saidiya Hartman', AUTHOR_KEY],
    ],
  );
  assert.deepEqual(planSquareAuthorFills(linkedBook(), []), []);
  assert.deepEqual(planSquareAuthorFills({ id: '2', editions: [{ isbn: EAN_P }] }, ['Someone']), []);
  assert.equal(planSquareAuthorFills(linkedBook(), ['X'], 'Square:other')[0].attributeKey, 'Square:other');
});

test('author fill: writes only an empty Author, keeps staff values, leaves a matching one alone', async () => {
  const otherAttribute = { 'Square:book-category': { stringValue: 'History' } };
  const client = mockClient([
    { ...variation('VAR-EMPTY', 'ITEM-1', 1999), customAttributeValues: otherAttribute },
    withAuthorValue(variation('VAR-SAME', 'ITEM-2', 1999), 'saidiya hartman'),
    withAuthorValue(variation('VAR-STAFF', 'ITEM-3', 1999), 'Staff Typed Name'),
  ]);
  const fill = (id: string): SquareWrite => ({ kind: 'author', objectId: id, key: 'squareAuthor', expected: [''], next: 'Saidiya Hartman', attributeKey: AUTHOR_KEY });

  const dry = await applySquareWrites(client, [fill('VAR-EMPTY')], { dryRun: true });
  assert.equal(client.calls.batchUpsert, 0);
  assert.equal(dry.skipped.length, 1);

  const res = await applySquareWrites(client, ['VAR-EMPTY', 'VAR-SAME', 'VAR-STAFF', 'VAR-GONE'].map(fill), { dryRun: false });
  assert.deepEqual(res.written.map((w) => w.write.objectId), ['VAR-EMPTY']);
  assert.equal(res.written[0].previous, null);
  assert.equal(res.written[0].previousVersion, '1');
  assert.deepEqual(res.unchanged.map((w) => w.objectId), ['VAR-SAME']);
  assert.deepEqual(res.conflicts.map((w) => w.objectId), ['VAR-STAFF']);
  assert.deepEqual(res.skipped.map((w) => w.objectId), ['VAR-GONE']);

  assert.deepEqual(client.calls.upserted.map((o) => o.id), ['VAR-EMPTY'], 'only the empty variation is upserted');
  const written = client.store.get('VAR-EMPTY');
  assert.equal(authorOfObject(written), 'Saidiya Hartman');
  assert.equal(written.customAttributeValues['Square:book-category'].stringValue, 'History', 'other attributes kept');
  assert.equal(written.itemVariationData.priceMoney.amount, 1999n, 'price untouched');
  assert.equal(authorOfObject(client.store.get('VAR-STAFF')), 'Staff Typed Name');
});

test('author fill and price uplift on the same variation travel as one object', async () => {
  const client = mockClient([variation('VAR-P', 'ITEM-P', 1999)]);
  const writes: SquareWrite[] = [
    { kind: 'price', objectId: 'VAR-P', key: `editions.${EAN_P}.pricing.retailPrice`, editionIsbn: EAN_P, expected: [1999], next: 2499 },
    { kind: 'author', objectId: 'VAR-P', key: 'squareAuthor', editionIsbn: EAN_P, expected: [''], next: 'Saidiya Hartman', attributeKey: AUTHOR_KEY },
  ];
  const res = await applySquareWrites(client, writes, { dryRun: false });
  assert.equal(res.written.length, 2);
  assert.deepEqual(client.calls.upsertSizes, [1]);
  const obj = client.store.get('VAR-P');
  assert.equal(obj.itemVariationData.priceMoney.amount, 2499n);
  assert.equal(authorOfObject(obj), 'Saidiya Hartman');
});

test('author fill on a variation whose item is renamed is folded into the nested variation', async () => {
  const nested = variation('VAR-P', 'ITEM-P', 1999);
  const client = mockClient([item('ITEM-P', 'Old Name (Paperback)', [nested]), nested]);
  const writes: SquareWrite[] = [
    { kind: 'name', objectId: 'ITEM-P', key: 'title', expected: ['Old Name (Paperback)'], next: 'New Name (Paperback)' },
    { kind: 'author', objectId: 'VAR-P', key: 'squareAuthor', expected: [''], next: 'Saidiya Hartman', attributeKey: AUTHOR_KEY },
  ];
  const res = await applySquareWrites(client, writes, { dryRun: false });
  assert.equal(res.written.length, 2);
  assert.deepEqual(client.calls.upserted.map((o) => o.id), ['ITEM-P']);
  assert.equal(authorOfObject(client.calls.upserted[0].itemData.variations[0]), 'Saidiya Hartman');
});
