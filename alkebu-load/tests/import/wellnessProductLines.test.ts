import assert from 'node:assert';
import test from 'node:test';

import { matchProductLine } from '../../src/app/utils/wellnessProductLines';

test('whipped shea butter SKUs collapse to one line with the scent as the variant', () => {
  const match = matchProductLine('Whipped Shea Butter Black Woman');
  assert.strictEqual(match?.lineKey, 'whipped-shea-butter');
  assert.strictEqual(match?.collection, 'wellness-lifestyle');
  assert.strictEqual(match?.variantAxis, 'scent');
  assert.strictEqual(match?.variantLabel, 'Black Woman');

  assert.strictEqual(match?.productType, 'body-butter'); // required on the collection; importer needs it
  assert.strictEqual(matchProductLine('Whipped Shea Butter Mango Butter')?.lineKey, 'whipped-shea-butter');
  assert.strictEqual(matchProductLine('Whipped Shea Butter Pink Sugar')?.variantLabel, 'Pink Sugar');
});

test('scented oils collapse to one line, including the "type" naming convention', () => {
  assert.strictEqual(matchProductLine('Egyptian Musk Scented Oil')?.lineKey, 'scented-oil');
  assert.strictEqual(matchProductLine('Egyptian Musk Scented Oil')?.variantLabel, 'Egyptian Musk');
  assert.strictEqual(matchProductLine('Egyptian Musk Scented Oil')?.collection, 'oils-incense');

  // The top seller (2,259 units) uses the bare "<scent> type" convention.
  assert.strictEqual(matchProductLine('Mr. Obama type')?.lineKey, 'scented-oil');
  assert.strictEqual(matchProductLine('Mr. Obama type')?.variantLabel, 'Mr. Obama');
  // oils-incense.productType has only 4 valid options; fragrance-oil is the only fit.
  assert.strictEqual(matchProductLine('Egyptian Musk Scented Oil')?.productType, 'fragrance-oil');
});

test('soaps are distinct products, not scent variants of one soap', () => {
  const yadain = matchProductLine('Yadain Bar Soap');
  const sunaroma = matchProductLine('Sunaroma with Shea Butter & Vitamin E Oil Soap Bar 8 oz');

  assert.strictEqual(yadain?.variantAxis, 'none');
  assert.strictEqual(yadain?.productType, 'soap');
  assert.notStrictEqual(yadain?.lineKey, sunaroma?.lineKey);
});

test('same soap in two sizes is one product with a size variant', () => {
  const lb = matchProductLine('Raw Black Soap LB');
  const halfLb = matchProductLine('Raw Black Soap 1/2 LB');

  assert.strictEqual(lb?.lineKey, halfLb?.lineKey);
  assert.strictEqual(lb?.variantAxis, 'size');
  assert.strictEqual(lb?.variantLabel, '1 lb');
  assert.strictEqual(halfLb?.variantLabel, '1/2 lb');
});

test('ingredient words in a Phase 1 product name do not trigger exclusion', () => {
  // Regression: an earlier draft excluded /\bhoney\b/ to keep Phase 2 tonics out, which
  // silently dropped this $2,572/yr soap — the #2 soap by revenue. Exclude by product
  // shape, never by ingredient.
  const bar = matchProductLine('Turmeric, Lemon, Honey & Kojic Facial Bar');
  assert.strictEqual(bar?.lineKey, 'turmeric-kojic-facial-bar');
  assert.strictEqual(bar?.variantAxis, 'none');
});

test('a size-suffixed soap is not eaten by the bulk guard', () => {
  // Regression: "Raw Black Soap 1/2 LB" contains "2 LB", which the bulk guard's
  // \d+\s*lb pattern matches. Anchored allow-list entries must be checked BEFORE the guard.
  assert.strictEqual(matchProductLine('Raw Black Soap 1/2 LB')?.lineKey, 'raw-black-soap');
  assert.strictEqual(matchProductLine('Raw Black Soap 1/2 LB')?.variantLabel, '1/2 lb');
});

test('bulk supply, packaging, and miscategorized items are excluded', () => {
  // Bulk / raw materials the store blends with — never sellable online.
  assert.strictEqual(matchProductLine('25lb Box Shea Butter'), null);
  assert.strictEqual(matchProductLine('1 lb Fragrance Oil'), null);
  assert.strictEqual(matchProductLine('5 Gallon BPA Free Bottle w/no Spout'), null);
  assert.strictEqual(matchProductLine('1oz Oil Bottle Diamond Cut - 2 Dozen'), null);

  // Genuinely miscategorized in Square, found during the catalog audit.
  assert.strictEqual(matchProductLine('Mali Djembe'), null);
  assert.strictEqual(matchProductLine('Mud Cloth Bucket Hat'), null);
  assert.strictEqual(matchProductLine('Shipping'), null);

  // Phase 2 — deferred deliberately (perishable / regulatory).
  assert.strictEqual(matchProductLine('Seamoss World Gel'), null);
  assert.strictEqual(matchProductLine('AIH Blood Pressure'), null);
});
