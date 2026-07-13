import assert from 'node:assert';
import test from 'node:test';

import { mergeVariations } from '../../src/app/utils/wellnessVariationMerge';

test('an existing row keeps synced stock and a backfilled weight when Square resends it with a changed price', () => {
  const existing = [
    {
      id: 'row-1',
      sku: 'SKU-1',
      price: 1000,
      scent: 'Peppermint',
      squareVariationId: 'SQ-VAR-1',
      squareItemId: 'SQ-ITEM-1',
      stock: 42,
      weight: 6,
      isAvailable: true,
    },
  ];
  const incoming = [
    {
      sku: 'SKU-1',
      price: 1200,
      scent: 'Peppermint',
      squareVariationId: 'SQ-VAR-1',
      squareItemId: 'SQ-ITEM-1',
      stock: 0,
    },
  ];

  const { merged, added, updated, orphaned } = mergeVariations(existing, incoming);

  assert.strictEqual(added, 0);
  assert.strictEqual(updated, 1);
  assert.strictEqual(orphaned.length, 0);
  assert.strictEqual(merged.length, 1);
  assert.strictEqual(merged[0].stock, 42); // preserved -- NOT clobbered back to the incoming 0
  assert.strictEqual(merged[0].weight, 6); // preserved -- Shippo mis-rates without it
  assert.strictEqual(merged[0].price, 1200); // Square DOES own price -- it must update
});

test('variantName is Square-owned: it is overwritten on merge, never preserved from the existing row', () => {
  const existing = [
    {
      id: 'row-1',
      sku: 'SKU-1',
      price: 1500,
      scent: '5th Ave',
      variantName: '1 oz',
      squareVariationId: 'SQ-VAR-1',
      squareItemId: 'SQ-ITEM-1',
      stock: 10,
      weight: 3,
      isAvailable: true,
    },
  ];
  const incoming = [
    {
      sku: 'SKU-1',
      price: 1500,
      scent: '5th Ave',
      variantName: '2 oz', // Square renamed/reclassified this variation's size
      squareVariationId: 'SQ-VAR-1',
      squareItemId: 'SQ-ITEM-1',
      stock: 0,
    },
  ];

  const { merged } = mergeVariations(existing, incoming);

  assert.strictEqual(merged[0].variantName, '2 oz'); // Square owns it -- must update, not preserve '1 oz'
  assert.strictEqual(merged[0].stock, 10); // still preserved -- variantName ownership doesn't leak into stock
});

test('a brand-new Square variation is inserted fresh with stock: 0', () => {
  const existing: ReturnType<typeof Array> = [];
  const incoming = [
    {
      sku: 'SKU-NEW',
      price: 500,
      scent: 'Rose',
      squareVariationId: 'SQ-VAR-NEW',
      squareItemId: 'SQ-ITEM-NEW',
      stock: 0,
    },
  ];

  const { merged, added, updated, orphaned } = mergeVariations(existing, incoming);

  assert.strictEqual(added, 1);
  assert.strictEqual(updated, 0);
  assert.strictEqual(orphaned.length, 0);
  assert.strictEqual(merged.length, 1);
  assert.strictEqual(merged[0].stock, 0);
  assert.strictEqual(merged[0].squareVariationId, 'SQ-VAR-NEW');
});

test('a row present in Payload but absent from Square is preserved (not deleted) and reported as orphaned', () => {
  const existing = [
    {
      id: 'row-gone',
      sku: 'SKU-GONE',
      price: 900,
      scent: 'Discontinued Scent',
      squareVariationId: 'SQ-VAR-GONE',
      stock: 5,
      weight: 3,
      isAvailable: true,
    },
  ];
  const incoming: typeof existing = []; // Square no longer carries this variation at all

  const { merged, added, updated, orphaned } = mergeVariations(existing, incoming);

  assert.strictEqual(added, 0);
  assert.strictEqual(updated, 0);
  assert.strictEqual(orphaned.length, 1);
  assert.strictEqual(orphaned[0].squareVariationId, 'SQ-VAR-GONE');

  // Still present in the array that gets written back to Payload -- never silently deleted.
  assert.strictEqual(merged.length, 1);
  assert.strictEqual(merged[0].sku, 'SKU-GONE');
  assert.strictEqual(merged[0].stock, 5);
});

test('a staff-set isAvailable: false survives a re-import', () => {
  const existing = [
    {
      id: 'row-off',
      sku: 'SKU-OFF',
      price: 800,
      scent: 'Sandalwood',
      squareVariationId: 'SQ-VAR-OFF',
      stock: 10,
      weight: 4,
      isAvailable: false,
    },
  ];
  const incoming = [
    {
      sku: 'SKU-OFF',
      price: 850,
      scent: 'Sandalwood',
      squareVariationId: 'SQ-VAR-OFF',
      stock: 0,
    },
  ];

  const { merged } = mergeVariations(existing, incoming);

  assert.strictEqual(merged[0].isAvailable, false); // staff toggle survives
  assert.strictEqual(merged[0].price, 850); // price still updates from Square
});

test('a mixed run updates one row, adds one row, and orphans one row -- nothing deleted', () => {
  const existing = [
    {
      id: 'row-keep',
      sku: 'SKU-KEEP',
      price: 1000,
      scent: 'Vanilla',
      squareVariationId: 'SQ-KEEP',
      stock: 12,
      weight: 2,
      isAvailable: true,
    },
    {
      id: 'row-gone',
      sku: 'SKU-GONE',
      price: 700,
      scent: 'Retired',
      squareVariationId: 'SQ-GONE',
      stock: 3,
      weight: 1,
      isAvailable: true,
    },
  ];
  const incoming = [
    { sku: 'SKU-KEEP', price: 1100, scent: 'Vanilla', squareVariationId: 'SQ-KEEP', stock: 0 },
    { sku: 'SKU-NEW', price: 400, scent: 'Mango', squareVariationId: 'SQ-NEW', stock: 0 },
  ];

  const { merged, added, updated, orphaned } = mergeVariations(existing, incoming);

  assert.strictEqual(added, 1);
  assert.strictEqual(updated, 1);
  assert.strictEqual(orphaned.length, 1);
  assert.strictEqual(merged.length, 3); // updated + new + orphaned -- nothing deleted
  assert.strictEqual(orphaned[0].sku, 'SKU-GONE');

  const keptRow = merged.find((v) => v.squareVariationId === 'SQ-KEEP');
  assert.strictEqual(keptRow?.stock, 12);
  assert.strictEqual(keptRow?.price, 1100);
});

test('a row missing squareVariationId on both sides is never matched, treated as new and never orphaned into a false match', () => {
  const existing = [
    { id: 'row-legacy', sku: 'SKU-LEGACY-NO-ID', price: 300, stock: 7, weight: 1, isAvailable: true },
  ];
  const incoming = [{ sku: 'SKU-LEGACY-NO-ID', price: 350, stock: 0 }];

  const { merged, added, updated, orphaned } = mergeVariations(existing, incoming);

  // Neither side has a squareVariationId to key on, so they can't be matched to each
  // other -- the incoming row is treated as new, and the existing row is orphaned.
  assert.strictEqual(added, 1);
  assert.strictEqual(updated, 0);
  assert.strictEqual(orphaned.length, 1);
  assert.strictEqual(merged.length, 2);
});
