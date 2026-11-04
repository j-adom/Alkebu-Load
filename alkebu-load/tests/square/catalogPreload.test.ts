import assert from 'node:assert';
import test from 'node:test';

import { createPreloadedCatalogPayload, matchesSimpleWhere } from '../../src/app/utils/squareCatalogPreload';
import { isNoopBookUpdate } from '../../src/app/utils/squareCatalogSync';
import { bookUpdateForSquareItem } from '../../src/app/utils/squareBookMatch';

const book = {
  id: 7,
  title: 'Kindred',
  squareItemId: 'ITEM_K',
  importSource: 'csv-import',
  pricing: { retailPrice: 1700 },
  editions: [{ id: 'e1', isbn: '9780807083697', squareItemId: 'ITEM_K', squareVariationId: 'VAR_K', pricing: { retailPrice: 1700 }, isAvailable: true }],
};

test('matchesSimpleWhere answers the lookups the catalog sync makes', () => {
  assert.equal(matchesSimpleWhere(book, { squareItemId: { equals: 'ITEM_K' } }), true);
  assert.equal(matchesSimpleWhere(book, { 'editions.squareItemId': { equals: 'ITEM_K' } }), true);
  assert.equal(matchesSimpleWhere(book, { 'editions.squareVariationId': { in: ['X', 'VAR_K'] } }), true);
  assert.equal(matchesSimpleWhere(book, { 'editions.isbn': { in: ['9780000000000'] } }), false);
  assert.equal(matchesSimpleWhere({ id: 1, squareItemId: null }, { squareItemId: { equals: null } }), false);
  assert.equal(matchesSimpleWhere(book, { and: [] } as any), undefined, 'unknown shapes fall back to the database');
});

test('the preloaded payload answers finds from memory and refreshes after writes', async () => {
  const calls: string[] = [];
  const stored = new Map<any, any>([[7, book]]);
  const real: any = {
    find: async ({ collection, where, page }: any) => {
      calls.push(`find ${collection}${where ? ' where' : ''}`);
      if (where) return { docs: [] };
      return { docs: page === 1 && collection === 'books' ? [...stored.values()] : [], hasNextPage: false };
    },
    findByID: async ({ id }: any) => stored.get(id),
    update: async ({ id, data }: any) => {
      stored.set(id, { ...stored.get(id), ...data });
      return stored.get(id);
    },
    create: async ({ data }: any) => {
      const doc = { id: 8, ...data };
      stored.set(8, doc);
      return doc;
    },
    config: { name: 'real' },
  };

  const payload: any = await createPreloadedCatalogPayload(real, () => {});
  calls.length = 0;

  const hit = await payload.find({ collection: 'books', where: { 'editions.squareItemId': { equals: 'ITEM_K' } }, limit: 10 });
  assert.deepStrictEqual(hit.docs.map((d: any) => d.id), [7]);
  assert.deepStrictEqual(calls, [], 'no database query');

  await payload.create({ collection: 'books', data: { squareItemId: 'ITEM_NEW', editions: [] } });
  const created = await payload.find({ collection: 'books', where: { squareItemId: { equals: 'ITEM_NEW' } } });
  assert.deepStrictEqual(created.docs.map((d: any) => d.id), [8]);

  await payload.update({ collection: 'books', id: 7, data: { squareItemId: 'ITEM_K2' } });
  const moved = await payload.find({ collection: 'books', where: { squareItemId: { equals: 'ITEM_K2' } } });
  assert.deepStrictEqual(moved.docs.map((d: any) => d.id), [7]);

  await payload.find({ collection: 'orders', where: { id: { equals: 1 } } });
  assert.deepStrictEqual(calls, ['find orders where'], 'other collections still hit the database');
  assert.equal(payload.config.name, 'real');
});

test('isNoopBookUpdate: a Square item that agrees with its book writes nothing', () => {
  const update = bookUpdateForSquareItem(book, 'ITEM_K', {
    title: 'KINDRED - by Octavia Butler (Paperback)',
    squareItemId: 'ITEM_K',
    pricing: { retailPrice: 1700 },
    editions: [{ isbn: '9780807083697', squareItemId: 'ITEM_K', squareVariationId: 'VAR_K', pricing: { retailPrice: 1700 }, isAvailable: true }],
    importSource: 'square-webhook',
    lastSyncedAt: '2026-11-04T00:00:00.000Z',
  });
  assert.equal('importSource' in update, false, 'an update never rewrites where the book came from');
  assert.equal(isNoopBookUpdate(book, update), true);
});

test('isNoopBookUpdate: price, edition and link changes still write', () => {
  assert.equal(isNoopBookUpdate(book, { pricing: { retailPrice: 1800 } }), false);
  assert.equal(isNoopBookUpdate(book, { squareItemId: 'ITEM_OTHER' }), false);
  assert.equal(
    isNoopBookUpdate(book, { editions: [{ ...book.editions[0], squareVariationId: 'VAR_NEW' }] }),
    false,
  );
  assert.equal(isNoopBookUpdate(book, { editions: [...book.editions, { isbn: '9780807083680' }] }), false);
  assert.equal(isNoopBookUpdate(book, { scrapedImageUrls: [{ url: 'https://example.com/c.jpg' }] }), false);
});
