import assert from 'node:assert';
import test from 'node:test';

import {
  buildWellnessLifestyleCreateDoc,
  buildWellnessLifestyleUpdateDoc,
  buildOilsIncenseCreateDoc,
  buildOilsIncenseUpdateDoc,
} from '../../src/app/utils/wellnessImportDocs';

// FIX 4 / final-review FIX D: Square owns price/stock/variations; Payload
// owns name, slug, productType, images, and marketing copy once a document
// exists. The CREATE doc seeds name/slug/productType once; the UPDATE doc
// must NEVER include any of them, or a staff-renamed product (and its
// marketing slug), or a staff-corrected productType, gets silently reverted
// on every re-import. On OilsIncense productType is the storefront-section
// selector, so reverting it 404s a slug already indexed by Google -- same
// failure mode as the name/slug revert.

test('wellness-lifestyle CREATE doc includes name, slug, and productType', () => {
  const doc = buildWellnessLifestyleCreateDoc({
    name: 'Whipped Shea Butter',
    slug: 'whipped-shea-butter',
    productType: 'body-butter',
    variations: [{ sku: 'WSB-1', price: 1200 }],
  });

  assert.strictEqual(doc.name, 'Whipped Shea Butter');
  assert.strictEqual(doc.slug, 'whipped-shea-butter');
  assert.strictEqual(doc.productType, 'body-butter');
  assert.deepStrictEqual(doc.variations, [{ sku: 'WSB-1', price: 1200 }]);
});

test('wellness-lifestyle UPDATE doc omits name, slug, and productType entirely', () => {
  const doc: Record<string, unknown> = buildWellnessLifestyleUpdateDoc({
    variations: [{ sku: 'WSB-1', price: 1300 }],
  });

  assert.strictEqual('name' in doc, false);
  assert.strictEqual('slug' in doc, false);
  assert.strictEqual('productType' in doc, false);
  assert.deepStrictEqual(doc.variations, [{ sku: 'WSB-1', price: 1300 }]);
});

test('oils-incense CREATE doc includes name, slug, and productType', () => {
  const doc = buildOilsIncenseCreateDoc({
    name: 'Scented Oil',
    slug: 'scented-oil',
    productType: 'fragrance-oil',
    variations: [{ sku: 'SO-1', price: 500 }],
  });

  assert.strictEqual(doc.name, 'Scented Oil');
  assert.strictEqual(doc.slug, 'scented-oil');
  assert.strictEqual(doc.productType, 'fragrance-oil');
});

test('oils-incense UPDATE doc omits name, slug, and productType entirely', () => {
  const doc: Record<string, unknown> = buildOilsIncenseUpdateDoc({
    variations: [{ sku: 'SO-1', price: 550 }],
  });

  assert.strictEqual('name' in doc, false);
  assert.strictEqual('slug' in doc, false);
  assert.strictEqual('productType' in doc, false);
});

test('a staff-edited name/slug/productType is never part of the update payload regardless of what Square sends', () => {
  // Simulates a staff renaming "Whipped Shea Butter" -> "Shea Butter Cream (Staff Renamed)"
  // and re-slugging it in admin, then Square re-syncing the same line: the update
  // payload must be structurally incapable of carrying Square's original name/slug/productType.
  const updateDoc: Record<string, unknown> = buildWellnessLifestyleUpdateDoc({
    variations: [{ sku: 'WSB-1', price: 1400 }],
  });

  assert.deepStrictEqual(Object.keys(updateDoc).sort(), ['variations']);
});

test('a staff-corrected oils-incense productType survives re-import (the FIX D regression case)', () => {
  // matchProductLine() misdetected this line as fragrance-oil; staff corrected
  // it to sage-bundle in admin. The next import's UPDATE payload must not be
  // able to flip it back -- that would silently 404 an indexed
  // /shop/home-goods/<slug> URL by routing it to health-and-beauty again.
  const updateDoc: Record<string, unknown> = buildOilsIncenseUpdateDoc({
    variations: [{ sku: 'SO-1', price: 600 }],
  });

  assert.strictEqual('productType' in updateDoc, false);
});
