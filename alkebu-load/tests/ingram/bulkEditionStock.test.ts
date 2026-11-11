// Bulk stock writes: the pure row planner, and the writer against a fake Postgres
// `db.drizzle.execute` (the real SQL is exercised on a disposable PostgreSQL by hand; see
// the plan's 2026-11-11 status).
import assert from 'node:assert/strict';
import test from 'node:test';

import { PgDialect } from 'drizzle-orm/pg-core';

import { editionStockRows, supportsBulkEditionWrites } from '../../src/app/utils/ingram/bulkEditionStock';
import { applyStockSnapshot } from '../../src/app/utils/ingram/refreshCatalogStock';

const NOW = '2026-11-11T11:30:00.000Z';
const OLD = '2026-11-01T11:30:00.000Z';
const EAN_A = '9780000000002';
const EAN_B = '9780000000019';

const edition = (id: string, isbn: string, inventory: Record<string, unknown> = {}) => ({ id, isbn, binding: 'paperback', inventory: { stockLevel: 0, ...inventory } });

test('editionStockRows: one row per changed edition, all four stock columns', () => {
  const book = { id: 7, editions: [edition('e1', EAN_A), edition('e2', EAN_B, { ingramOnHand: 5, ingramAvailable: true, ingramCheckedAt: NOW })] };
  const planned = [
    { ...book.editions[0], inventory: { ...book.editions[0].inventory, ingramOnHand: 40, ingramAvailable: true, ingramCheckedAt: NOW, availableToOrder: true } },
    book.editions[1],
  ];
  assert.deepEqual(editionStockRows(book, planned), [
    { bookId: 7, editionId: 'e1', onHand: 40, available: true, checkedAt: NOW, availableToOrder: true },
  ]);
});

test('editionStockRows: null (use payload.update) for anything beyond the stock columns', () => {
  const book = { id: 1, editions: [edition('e1', EAN_A)] };
  const stamp = (e: any) => ({ ...e, inventory: { ...e.inventory, ingramCheckedAt: NOW } });
  assert.equal(editionStockRows(book, [{ ...stamp(book.editions[0]), binding: 'hardcover' }]), null, 'another field changed');
  assert.equal(editionStockRows(book, [{ ...stamp(book.editions[0]), inventory: { stockLevel: 3, ingramCheckedAt: NOW } }]), null, 'stock level changed');
  assert.equal(editionStockRows({ id: 1, editions: [{ isbn: EAN_A }] }, [{ isbn: EAN_A, inventory: { ingramCheckedAt: NOW } }]), null, 'no row id');
  assert.equal(editionStockRows(book, []), null, 'edition list changed shape');
  assert.equal(editionStockRows(book, [{ ...stamp(book.editions[0]), id: 'other' }]), null, 'row id changed');
});

test('supportsBulkEditionWrites: Postgres with drizzle.execute only', () => {
  assert.equal(supportsBulkEditionWrites({ name: 'postgres', drizzle: { execute: async () => ({ rows: [] }) } }), true);
  assert.equal(supportsBulkEditionWrites({ name: 'sqlite', drizzle: { execute: async () => ({ rows: [] }) } }), false);
  assert.equal(supportsBulkEditionWrites(undefined), false);
});

/** Books on two pages, a fake Postgres that "updates" every edition id it is given except `missing`. */
function fakePostgres(books: any[], opts: { missing?: Set<string>; fail?: boolean } = {}) {
  const dialect = new PgDialect();
  const executed: Array<{ sql: string; params: unknown[] }> = [];
  const updates: any[] = [];
  const payload = {
    find: async ({ page = 1, limit }: any) => {
      const start = (page - 1) * limit;
      return { docs: books.slice(start, start + limit), hasNextPage: start + limit < books.length };
    },
    update: async (args: any) => {
      updates.push(args);
      return {};
    },
    db: {
      name: 'postgres',
      drizzle: {
        execute: async (query: any) => {
          const built = dialect.sqlToQuery(query);
          executed.push({ sql: built.sql, params: built.params });
          if (opts.fail) throw new Error('connection reset');
          // Params come in fives per row: id, on hand, available, checked at, available to order.
          const ids = built.params.filter((_, i) => i % 5 === 0).map(String);
          return { rows: ids.filter((id) => !opts.missing?.has(id)).map((id) => ({ id })) };
        },
      },
    },
  };
  return { payload: payload as any, executed, updates };
}

const stockFor = (eans: string[]) => ({
  stock: Object.fromEntries(eans.map((ean) => [ean, { onHand: 40, available: true }])),
  fullCoverage: true,
});

const manyBooks = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, editions: [edition(`e${i + 1}`, EAN_A, { ingramOnHand: 0, ingramAvailable: false, ingramCheckedAt: OLD })] }));

test('applyStockSnapshot on Postgres: chunked bulk UPDATEs, no per-book writes', async () => {
  const { payload, executed, updates } = fakePostgres(manyBooks(1200));
  const summary = await applyStockSnapshot(payload, stockFor([EAN_A]), { checkedAt: NOW });

  assert.equal(summary.updated, 1200);
  assert.equal(summary.bulk, 1200);
  assert.equal(summary.failed, 0);
  assert.equal(updates.length, 0, 'no payload.update');
  assert.equal(executed.length, 3, '1200 editions in chunks of 500');
  assert.match(executed[0].sql, /UPDATE "books_editions" AS t/);
  assert.match(executed[0].sql, /UPDATE "books" SET "updated_at" = now\(\)/);
  assert.deepEqual(executed[0].params.slice(0, 5), ['e1', 40, true, NOW, false]);
});

test('applyStockSnapshot on Postgres: falls back to payload.update for missed rows and failed chunks', async () => {
  const missed = fakePostgres(manyBooks(3), { missing: new Set(['e2']) });
  const a = await applyStockSnapshot(missed.payload, stockFor([EAN_A]), { checkedAt: NOW });
  assert.deepEqual(missed.updates.map((u) => u.id), [2], 'only the book whose row was missed');
  assert.equal(missed.updates[0].context.ingramStockRefresh, true);
  assert.deepEqual({ updated: a.updated, bulk: a.bulk, failed: a.failed }, { updated: 3, bulk: 2, failed: 0 });

  const broken = fakePostgres(manyBooks(3), { fail: true });
  const b = await applyStockSnapshot(broken.payload, stockFor([EAN_A]), { checkedAt: NOW });
  assert.equal(broken.updates.length, 3, 'every book written the normal way');
  assert.deepEqual({ updated: b.updated, bulk: b.bulk }, { updated: 3, bulk: 0 });
});

test('applyStockSnapshot on Postgres: a book whose plan changes more than stock goes through payload.update', async () => {
  // No row id: can't be addressed in bulk.
  const books = [{ id: 1, editions: [{ isbn: EAN_A, inventory: { ingramCheckedAt: OLD } }] }, ...manyBooks(1).map((b) => ({ ...b, id: 2 }))];
  const { payload, executed, updates } = fakePostgres(books);
  const summary = await applyStockSnapshot(payload, stockFor([EAN_A]), { checkedAt: NOW });
  assert.deepEqual(updates.map((u) => u.id), [1]);
  assert.equal(executed.length, 1);
  assert.equal(summary.updated, 2);
});
