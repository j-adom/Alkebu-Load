import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyStockSnapshot,
  loadCatalogEans,
  snapshotIsTrustworthy,
} from '../../src/app/utils/ingram/refreshCatalogStock';

function fakePayload(books: any[]) {
  const updates: any[] = [];
  return {
    updates,
    payload: {
      find: async ({ page = 1, limit }: any) => {
        const start = (page - 1) * limit;
        const docs = books.slice(start, start + limit);
        return { docs, hasNextPage: start + limit < books.length };
      },
      update: async (args: any) => {
        if (args.id === 'boom') throw new Error('write failed');
        updates.push(args);
        return {};
      },
    } as any,
  };
}

const NOW = '2026-10-03T11:30:00.000Z';

test('loadCatalogEans collects valid EANs across pages', async () => {
  const books = Array.from({ length: 3 }, (_, i) => ({ id: i, editions: [{ isbn: '9780000000002' }, { isbn10: '0306406152' }, { isbn: 'junk' }] }));
  const { payload } = fakePayload(books);
  const eans = await loadCatalogEans(payload, 2);
  assert.deepEqual([...eans].sort(), ['9780000000002', '9780306406157']);
});

test('applyStockSnapshot writes only changed books, with the refresh context', async () => {
  const books = [
    { id: 'a', editions: [{ isbn: '9780000000002', inventory: { stockLevel: 1 } }] },
    { id: 'b', editions: [{ isbn: 'no-isbn' }] },
  ];
  const { payload, updates } = fakePayload(books);
  const summary = await applyStockSnapshot(
    payload,
    { stock: { '9780000000002': { onHand: 40, available: true } }, fullCoverage: true },
    { checkedAt: NOW },
  );
  assert.deepEqual(summary, { scanned: 2, updated: 1, failed: 0, protected: 0, bulk: 0 });
  assert.equal(updates[0].id, 'a');
  assert.equal(updates[0].data.editions[0].inventory.ingramOnHand, 40);
  assert.equal(updates[0].context.ingramStockRefresh, true);
  assert.equal(updates[0].context.skipEnrichment, true);
});

test('applyStockSnapshot counts per-book failures and keeps going', async () => {
  const books = [
    { id: 'boom', editions: [{ isbn: '9780000000002' }] },
    { id: 'ok', editions: [{ isbn: '9780000000002' }] },
  ];
  const { payload, updates } = fakePayload(books);
  const summary = await applyStockSnapshot(payload, { stock: {}, fullCoverage: true }, { checkedAt: NOW });
  assert.deepEqual(summary, { scanned: 2, updated: 1, failed: 1, protected: 0, bulk: 0 });
  assert.equal(updates.length, 1);
});

test('snapshotIsTrustworthy rejects a suspiciously short full file', () => {
  assert.equal(snapshotIsTrustworthy({ scannedLines: 10, matched: 0, skippedLines: 0 }, 500_000), false);
  assert.equal(snapshotIsTrustworthy({ scannedLines: 2_000_000, matched: 900, skippedLines: 5 }, 500_000), true);
  // Mostly unreadable lines means the format changed under us.
  assert.equal(snapshotIsTrustworthy({ scannedLines: 2_000_000, matched: 0, skippedLines: 1_500_000 }, 500_000), false);
});

test('applyStockSnapshot never writes request-only or discontinued books', async () => {
  const books = [
    { id: 'ro', availabilityStatus: 'request-only', editions: [{ isbn: '9780000000002' }] },
    { id: 'dc', availabilityStatus: 'discontinued', editions: [{ isbn: '9780000000002' }] },
  ];
  const { payload, updates } = fakePayload(books);
  const summary = await applyStockSnapshot(
    payload,
    { stock: { '9780000000002': { onHand: 40, available: true } }, fullCoverage: true },
    { checkedAt: NOW },
  );
  assert.deepEqual(summary, { scanned: 2, updated: 0, failed: 0, protected: 2, bulk: 0 });
  assert.equal(updates.length, 0);
});
