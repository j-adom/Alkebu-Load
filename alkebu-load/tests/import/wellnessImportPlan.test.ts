import assert from 'node:assert';
import test from 'node:test';

import { buildImportPlan, type CatalogItemObject } from '../../src/app/utils/wellnessImportPlan';

// Pure over its input array -- no live DB or network required. Synthetic catalog item
// objects match the CatalogItemObject shape the code actually reads:
// { id, itemData: { name, variations: [{ type: 'ITEM_VARIATION', id, itemVariationData:
// { sku, name, priceMoney: { amount } } }] } }.
function makeItem(
  id: string,
  name: string,
  variations: Array<{ id: string; sku?: string; sizeLabel?: string; amount?: bigint }>,
): CatalogItemObject {
  return {
    type: 'ITEM',
    id,
    itemData: {
      name,
      variations: variations.map((v) => ({
        type: 'ITEM_VARIATION',
        id: v.id,
        itemVariationData: {
          sku: v.sku,
          name: v.sizeLabel,
          priceMoney: v.amount === undefined ? undefined : { amount: v.amount, currency: 'USD' },
        },
      })),
    },
  } as CatalogItemObject;
}

test('a Whipped Shea Butter item with 3 scent variations collapses into one whipped-shea-butter line with 3 variations, prices copied verbatim, scent from the item name', () => {
  const item = makeItem('item-wsb', 'Whipped Shea Butter Lavender', [
    { id: 'var-1', sku: 'WSB-LAV-1', amount: 1200n },
    { id: 'var-2', sku: 'WSB-LAV-2', amount: 1500n },
    { id: 'var-3', sku: 'WSB-LAV-3', amount: 1800n },
  ]);

  const { lines, skipped } = buildImportPlan([item]);

  assert.strictEqual(lines.size, 1);
  const line = lines.get('whipped-shea-butter');
  assert.ok(line, 'expected a whipped-shea-butter line');
  assert.strictEqual(line?.match.collection, 'wellness-lifestyle');
  assert.strictEqual(line?.variations.length, 3);

  // Prices copied VERBATIM in cents -- never multiplied or divided.
  assert.deepStrictEqual(
    line?.variations.map((v) => v.price).sort((a, b) => a - b),
    [1200, 1500, 1800],
  );

  // Scent set from the item name (the variant axis for this line).
  for (const v of line?.variations ?? []) {
    assert.strictEqual(v.scent, 'Lavender');
  }

  assert.strictEqual(skipped.unmatched.length, 0);
  assert.strictEqual(skipped.noPrice.length, 0);
  assert.strictEqual(skipped.noPricedVariation.length, 0);
  assert.strictEqual(skipped.malformed.length, 0);
});

test('an unmatched item (e.g. "Mali Djembe") lands in skipped.unmatched and produces no line', () => {
  const item = makeItem('item-djembe', 'Mali Djembe', [{ id: 'var-1', sku: 'DJ-1', amount: 5000n }]);

  const { lines, skipped } = buildImportPlan([item]);

  assert.strictEqual(lines.size, 0);
  assert.deepStrictEqual(skipped.unmatched, ['Mali Djembe']);
  assert.strictEqual(skipped.noPrice.length, 0);
  assert.strictEqual(skipped.noPricedVariation.length, 0);
});

test('a matched item whose variation has no price lands in skipped.noPrice', () => {
  const item = makeItem('item-oil', 'Egyptian Musk Scented Oil', [
    { id: 'var-1', sku: 'EM-OIL-1' /* no amount -- no price */ },
  ]);

  const { lines, skipped } = buildImportPlan([item]);

  // The line matched but has zero priced variations -- no document is written for it,
  // and it's surfaced as noPricedVariation, not silently dropped.
  assert.strictEqual(lines.size, 0);
  assert.strictEqual(skipped.noPrice.length, 1);
  assert.match(skipped.noPrice[0], /Egyptian Musk Scented Oil/);
  assert.strictEqual(skipped.noPricedVariation.length, 1);
  assert.match(skipped.noPricedVariation[0], /scented-oil/);
});

test('two different Square items on the same line key merge into ONE line accumulating both sets of variations', () => {
  const itemA = makeItem('item-oil-a', 'Egyptian Musk Scented Oil', [
    { id: 'var-a1', sku: 'EM-1', amount: 500n },
  ]);
  const itemB = makeItem('item-oil-b', 'Mr. Obama type', [{ id: 'var-b1', sku: 'MO-1', amount: 550n }]);

  const { lines, skipped } = buildImportPlan([itemA, itemB]);

  assert.strictEqual(lines.size, 1);
  const line = lines.get('scented-oil');
  assert.ok(line, 'expected a scented-oil line');
  assert.strictEqual(line?.variations.length, 2);

  const skus = line?.variations.map((v) => v.sku).sort();
  assert.deepStrictEqual(skus, ['EM-1', 'MO-1']);

  const squareItemIds = line?.variations.map((v) => v.squareItemId).sort();
  assert.deepStrictEqual(squareItemIds, ['item-oil-a', 'item-oil-b']);

  assert.strictEqual(skipped.unmatched.length, 0);
  assert.strictEqual(skipped.noPrice.length, 0);
  assert.strictEqual(skipped.noPricedVariation.length, 0);
});
