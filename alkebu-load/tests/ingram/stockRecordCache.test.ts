import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import type { IngramStock } from '../../src/app/utils/ingram/parseStockResponse';
import { loadStockRecords, saveStockRecords } from '../../src/app/utils/ingram/stockRecordCache';

const SOURCE = 'Inventory/Catalog_Stock/cat_ing_stock.zip';
const record = (ean: string): IngramStock => ({ ean, backorder: false, mediaMail: true, pubListPrice: 24.99, dcs: {} });

test('saved records load back while fresh, for the same source file only', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'stock-cache-'));
  try {
    const path = join(dir, 'cache.json');
    const saved = await saveStockRecords(new Map([['9780000000019', record('9780000000019')], ['9780000000002', record('9780000000002')]]), SOURCE, {
      path,
      now: new Date('2026-11-10T11:35:00Z'),
    });
    const loaded = await loadStockRecords(SOURCE, { path, now: new Date('2026-11-10T14:00:00Z') });
    assert.ok(loaded);
    assert.equal(loaded.checksum, saved.checksum);
    assert.deepEqual(Object.keys(loaded.records), ['9780000000002', '9780000000019']);

    assert.equal(await loadStockRecords(SOURCE, { path, now: new Date('2026-11-11T12:00:00Z') }), null, 'older than a day');
    assert.equal(await loadStockRecords('Inventory/other.zip', { path, now: new Date('2026-11-10T14:00:00Z') }), null, 'another file');
    assert.equal(await loadStockRecords(SOURCE, { path: join(dir, 'missing.json') }), null);

    const again = await saveStockRecords(new Map([['9780000000002', record('9780000000002')], ['9780000000019', record('9780000000019')]]), SOURCE, { path });
    assert.equal(again.checksum, saved.checksum, 'checksum ignores insertion order');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
