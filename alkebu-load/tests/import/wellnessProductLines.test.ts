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

test('sea moss is only excluded as a perishable, never by the ingredient word', () => {
  // Sea moss GEL/raw moss/capsules are refrigerated perishables deferred to Phase 2 —
  // they must stay null. But "Sea Moss and Manuka Honey Bar Soap" is a shelf-stable,
  // house-made soap that happens to contain sea moss as an ingredient — it's Phase 1
  // and must match. A naive /sea ?moss/ exclusion would wrongly drop this sellable
  // product, exactly like the /\bhoney\b/ trap documented above. Exclude by product
  // shape (soap vs. perishable), never by ingredient word.
  const soap = matchProductLine('Sea Moss and Manuka Honey Bar Soap');
  assert.strictEqual(soap?.lineKey, 'sea-moss-manuka-honey-bar-soap');
  assert.strictEqual(soap?.productType, 'soap');

  assert.strictEqual(matchProductLine('Seamoss World Gel'), null);
  assert.strictEqual(matchProductLine('Seamoss World Raw Moss'), null);
  assert.strictEqual(matchProductLine('Sea Moss Capsules'), null);
  assert.strictEqual(matchProductLine('NaturalZing Sea Moss 16oz'), null);
});

test('whipped shea butter matches both the "Butter" and shortened naming conventions', () => {
  // Square uses "Whipped Shea Butter <scent>" and, for some SKUs, the shortened
  // "Whipped Shea <scent>" (no "Butter"). Both must collapse to the same line.
  const withButter = matchProductLine('Whipped Shea Peppermint');
  assert.strictEqual(withButter?.lineKey, 'whipped-shea-butter');
  assert.strictEqual(withButter?.variantAxis, 'scent');
  assert.strictEqual(withButter?.variantLabel, 'Peppermint');

  const rihannaRiri = matchProductLine('Whipped Shea Rihanna Riri');
  assert.strictEqual(rihannaRiri?.lineKey, 'whipped-shea-butter');
  assert.strictEqual(rihannaRiri?.variantAxis, 'scent');
  assert.strictEqual(rihannaRiri?.variantLabel, 'Rihanna Riri');
});

test('round black soap size/naming variants all collapse to one line', () => {
  const regular = matchProductLine('Round Black Soap');
  const small = matchProductLine('Small Round Black Soap');
  const smallAltOrder = matchProductLine('Small Black Round Soap');

  assert.strictEqual(regular?.lineKey, 'round-black-soap');
  assert.strictEqual(regular?.variantAxis, 'size');
  assert.strictEqual(regular?.variantLabel, 'Regular');

  assert.strictEqual(small?.lineKey, 'round-black-soap');
  assert.strictEqual(small?.variantLabel, 'Small');

  assert.strictEqual(smallAltOrder?.lineKey, 'round-black-soap');
  assert.strictEqual(smallAltOrder?.variantLabel, 'Small');
});

test('honey-named soaps confirmed 3 more times still match, distinct from Phase 2 honey/bitters', () => {
  // Same ingredient-word trap as the Turmeric/Kojic regression above, now confirmed
  // with 3 more soap names that contain "Honey". Meanwhile a genuine Phase 2
  // honey/bitters product (AIH tonic line) must still return null.
  const buttermilk = matchProductLine('Buttermilk & Manuka Honey Soap');
  assert.strictEqual(buttermilk?.lineKey, 'buttermilk-manuka-honey-soap');
  assert.strictEqual(buttermilk?.productType, 'soap');

  const blackSeed = matchProductLine('Honey & Black Seed Soap');
  assert.strictEqual(blackSeed?.lineKey, 'honey-black-seed-soap');
  assert.strictEqual(blackSeed?.productType, 'soap');

  assert.strictEqual(matchProductLine('AIH A to Z Honey'), null);
  assert.strictEqual(matchProductLine('AIH Blood Pressure'), null);
});

test('a representative sample of the Step 5 dry-run additions match with a valid productType', () => {
  const soapNames = [
    'Neem Soap',
    'Activated Charcoal Soap',
    'Nubian Heritage Bar Soap',
    'Egyptian Musk Soap',
    'Peppermint Soap',
    'Moringa Soap with Chia Seeds',
  ];
  for (const itemName of soapNames) {
    const match = matchProductLine(itemName);
    assert.notStrictEqual(match, null, `expected a match for "${itemName}"`);
    assert.strictEqual(match?.productType, 'soap', `expected soap productType for "${itemName}"`);
  }

  const rawButterNames = ['Raw Cocoa Butter', 'Sunaroma Mango Butter 1lb'];
  for (const itemName of rawButterNames) {
    const match = matchProductLine(itemName);
    assert.notStrictEqual(match, null, `expected a match for "${itemName}"`);
    assert.strictEqual(match?.productType, 'body-butter', `expected body-butter productType for "${itemName}"`);
  }
});
