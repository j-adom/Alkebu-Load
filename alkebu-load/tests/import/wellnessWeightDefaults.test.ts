import assert from 'node:assert';
import test from 'node:test';

import { applyWeightsToVariations, resolveVariationWeight } from '../../src/app/utils/wellnessWeightDefaults';

test('a variation with an existing weight is NOT overwritten, even if it looks wrong', () => {
  const variations = [
    { id: 'row-1', sku: 'SKU-1', price: 1499, stock: 10, weight: 999, scent: 'Peppermint' },
  ];

  const { variations: next, filled, alreadySet, unresolved } = applyWeightsToVariations(
    variations,
    'whipped-shea-butter',
  );

  assert.strictEqual(alreadySet, 1);
  assert.strictEqual(filled, 0);
  assert.strictEqual(unresolved.length, 0);
  assert.strictEqual(next[0].weight, 999); // staff-entered value is authoritative -- survives
});

test('other fields on the row (price, stock, sku, isAvailable, scent, size, packaging, variantName) survive the weight write', () => {
  const variations = [
    {
      id: 'row-1',
      sku: 'SKU-SOAP-1',
      price: 899,
      stock: 12,
      isAvailable: true,
      squareVariationId: 'SQ-VAR-1',
      scent: 'Peppermint',
      size: { volume: 6, unit: 'oz' },
      packaging: 'bar',
      variantName: 'Bar',
    },
  ];

  const { variations: next, filled } = applyWeightsToVariations(variations, 'neem-soap');

  assert.strictEqual(filled, 1);
  assert.strictEqual(next[0].weight, 6); // bar soap default
  assert.strictEqual(next[0].sku, 'SKU-SOAP-1');
  assert.strictEqual(next[0].price, 899);
  assert.strictEqual(next[0].stock, 12);
  assert.strictEqual(next[0].isAvailable, true);
  assert.strictEqual(next[0].squareVariationId, 'SQ-VAR-1');
  assert.strictEqual(next[0].scent, 'Peppermint');
  assert.deepStrictEqual(next[0].size, { volume: 6, unit: 'oz' });
  assert.strictEqual(next[0].packaging, 'bar');
  assert.strictEqual(next[0].variantName, 'Bar');
});

test('other rows in the array are untouched (same reference) when only one row needs a weight', () => {
  const alreadyWeighted = { id: 'row-a', sku: 'SKU-A', price: 500, weight: 4 };
  const needsWeight = { id: 'row-b', sku: 'SKU-B', price: 500 };
  const variations = [alreadyWeighted, needsWeight];

  const { variations: next, filled, alreadySet } = applyWeightsToVariations(variations, 'neem-soap');

  assert.strictEqual(filled, 1);
  assert.strictEqual(alreadySet, 1);
  assert.strictEqual(next[0], alreadyWeighted); // untouched -- same object reference
  assert.notStrictEqual(next[1], needsWeight); // this one changed (new object with weight set)
  assert.strictEqual(next[1].weight, 6);
  assert.strictEqual(next[1].sku, 'SKU-B');
});

test('a liquid/wash soap line has no bar-soap default and returns null rather than a guessed number', () => {
  const liquid = resolveVariationWeight('african-liquid-black-soap', { sku: 'SKU-LIQUID' });
  assert.strictEqual(liquid.weight, null);
  assert.ok(liquid.reason && liquid.reason.length > 0);

  const wash = resolveVariationWeight('yoni-soap-acv', { sku: 'SKU-WASH' });
  assert.strictEqual(wash.weight, null);
  assert.ok(wash.reason && wash.reason.length > 0);
});

test('an unknown lineKey (defensive) returns null with a reason instead of guessing', () => {
  const result = resolveVariationWeight('not-a-real-line', { sku: 'SKU-X' });
  assert.strictEqual(result.weight, null);
  assert.ok(result.reason?.includes('not-a-real-line'));
});

test('raw black soap defaults to the full 1 lb weight unless a half-lb signal is present', () => {
  const full = resolveVariationWeight('raw-black-soap', { sku: 'raw-black-soap-1-lb' });
  assert.strictEqual(full.weight, 18);

  // The importer's own slugify('1/2 lb') produces "1-2-lb" (slashes never survive
  // slugification), so the half-lb detector must match that form, not just "1/2 lb".
  const halfSlugified = resolveVariationWeight('raw-black-soap', { sku: 'raw-black-soap-1-2-lb' });
  assert.strictEqual(halfSlugified.weight, 10);

  const halfTyped = resolveVariationWeight('raw-black-soap', { sku: 'SKU-X', scent: '1/2 lb' });
  assert.strictEqual(halfTyped.weight, 10);
});

test('whipped shea butter is a single 4oz tub shipping at 0.5 lb, regardless of scent', () => {
  // Owner-confirmed 2026-07-13: one tub, 4 oz by volume, 0.5 lb (8 oz) shipped incl. container.
  // Square records no size on these rows precisely BECAUSE there is only one size -- so the
  // absence of a size signal is expected here and must resolve, not report unresolved.
  // This covers all 67 variations of the $30k/yr top line.
  assert.strictEqual(resolveVariationWeight('whipped-shea-butter', { scent: 'Rihanna Riri' }).weight, 8);
  assert.strictEqual(resolveVariationWeight('whipped-shea-butter', { scent: 'Black Woman' }).weight, 8);
  assert.strictEqual(
    resolveVariationWeight('whipped-shea-butter', { sku: 'whipped-shea-4oz-peppermint' }).weight,
    8,
  );

  // No row in this line is left without a weight -- an unset weight makes Shippo mis-rate.
  assert.strictEqual(resolveVariationWeight('whipped-shea-butter', {}).reason, undefined);
});

test('scented oil defaults to the 1oz weight (documented dominant size) when no size signal exists at all', () => {
  const noSignal = resolveVariationWeight('scented-oil', { scent: 'Egyptian Musk' });
  assert.strictEqual(noSignal.weight, 3);
});

test('scented oil resolves every defined bottle size from variantName, Square\'s real per-variation label', () => {
  const quarterOz = resolveVariationWeight('scented-oil', { variantName: '1/4 oz', scent: '5th Ave' });
  assert.strictEqual(quarterOz.weight, 2);

  const rollOn = resolveVariationWeight('scented-oil', { variantName: 'Roll-on', scent: '5th Ave' });
  assert.strictEqual(rollOn.weight, 2);

  const halfOz = resolveVariationWeight('scented-oil', { variantName: '1/2 oz', scent: '5th Ave' });
  assert.strictEqual(halfOz.weight, 3);

  const oneOz = resolveVariationWeight('scented-oil', { variantName: '1 oz', scent: '5th Ave' });
  assert.strictEqual(oneOz.weight, 3);

  const twoOz = resolveVariationWeight('scented-oil', { variantName: '2 oz', scent: '5th Ave' });
  assert.strictEqual(twoOz.weight, 5);
});

test('scented oil resolves the legacy OilsIncense size-select slugs the same way as real variantName labels', () => {
  const oneOz = resolveVariationWeight('scented-oil', { size: '1-oz-bottle', scent: 'Egyptian Musk' });
  assert.strictEqual(oneOz.weight, 3);

  const twoOz = resolveVariationWeight('scented-oil', { size: '2-oz-bottle', scent: 'Egyptian Musk' });
  assert.strictEqual(twoOz.weight, 5);
});

test('scented oil reports unresolved (never guesses) when a size signal exists but matches no defined bottle size', () => {
  const unknownSize = resolveVariationWeight('scented-oil', { variantName: '5 oz', scent: 'Egyptian Musk' });
  assert.strictEqual(unknownSize.weight, null);
  assert.ok(unknownSize.reason?.includes('5 oz'));
});

test('round black soap resolves the Regular default but reports Small as unresolved rather than reusing a known-wrong guess', () => {
  const regular = resolveVariationWeight('round-black-soap', { variantName: 'Regular', sku: 'round-black-soap-regular' });
  assert.strictEqual(regular.weight, 6);

  const noSignal = resolveVariationWeight('round-black-soap', { sku: 'round-black-soap-regular' });
  assert.strictEqual(noSignal.weight, 6);

  const small = resolveVariationWeight('round-black-soap', { variantName: 'Small', sku: 'round-black-soap-small' });
  assert.strictEqual(small.weight, null);
  assert.ok(small.reason?.toLowerCase().includes('small'));
});

test('raw shea butter gets its own 18oz default, distinct from the 10oz cocoa/mango bucket', () => {
  assert.strictEqual(resolveVariationWeight('raw-shea-butter', { sku: 'SKU-1' }).weight, 18);
  assert.strictEqual(resolveVariationWeight('raw-cocoa-butter', { sku: 'SKU-2' }).weight, 10);
  assert.strictEqual(resolveVariationWeight('natural-raw-mango-butter', { sku: 'SKU-3' }).weight, 10);
});

test('a mixed batch: unresolved rows are reported by sku and the resolved rows still get their weight', () => {
  const variations = [
    { id: 'row-1', sku: 'SKU-RESOLVED', price: 500 }, // neem-soap -> 6oz
    { id: 'row-2', sku: 'SKU-ALREADY', price: 500, weight: 7 }, // untouched
  ];

  const { filled, alreadySet, unresolved } = applyWeightsToVariations(variations, 'neem-soap');
  assert.strictEqual(filled, 1);
  assert.strictEqual(alreadySet, 1);
  assert.strictEqual(unresolved.length, 0);

  const liquidVariations = [{ id: 'row-3', sku: 'SKU-LIQUID', price: 500 }];
  const liquidResult = applyWeightsToVariations(liquidVariations, 'african-liquid-black-soap');
  assert.strictEqual(liquidResult.filled, 0);
  assert.strictEqual(liquidResult.unresolved.length, 1);
  assert.strictEqual(liquidResult.unresolved[0].sku, 'SKU-LIQUID');
});
