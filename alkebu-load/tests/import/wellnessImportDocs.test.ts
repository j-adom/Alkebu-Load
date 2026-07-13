import assert from 'node:assert';
import test from 'node:test';

import {
  buildWellnessLifestyleCreateDoc,
  buildWellnessLifestyleUpdateDoc,
  buildOilsIncenseCreateDoc,
  buildOilsIncenseUpdateDoc,
} from '../../src/app/utils/wellnessImportDocs';

// FIX 4: Square owns price/stock/variations (and productType); Payload owns
// name, slug, images, and marketing copy once a document exists. The CREATE
// doc seeds name/slug once; the UPDATE doc must NEVER include them, or a
// staff-renamed product (and its marketing slug) gets silently reverted on
// every re-import -- and a reverted slug 404s a URL already indexed by Google.

test('wellness-lifestyle CREATE doc includes name and slug', () => {
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

test('wellness-lifestyle UPDATE doc omits name and slug entirely', () => {
  const doc: Record<string, unknown> = buildWellnessLifestyleUpdateDoc({
    productType: 'body-butter',
    variations: [{ sku: 'WSB-1', price: 1300 }],
  });

  assert.strictEqual('name' in doc, false);
  assert.strictEqual('slug' in doc, false);
  assert.strictEqual(doc.productType, 'body-butter');
  assert.deepStrictEqual(doc.variations, [{ sku: 'WSB-1', price: 1300 }]);
});

test('oils-incense CREATE doc includes name and slug', () => {
  const doc = buildOilsIncenseCreateDoc({
    name: 'Scented Oil',
    slug: 'scented-oil',
    productType: 'fragrance-oil',
    variations: [{ sku: 'SO-1', price: 500 }],
  });

  assert.strictEqual(doc.name, 'Scented Oil');
  assert.strictEqual(doc.slug, 'scented-oil');
});

test('oils-incense UPDATE doc omits name and slug entirely', () => {
  const doc: Record<string, unknown> = buildOilsIncenseUpdateDoc({
    productType: 'fragrance-oil',
    variations: [{ sku: 'SO-1', price: 550 }],
  });

  assert.strictEqual('name' in doc, false);
  assert.strictEqual('slug' in doc, false);
  assert.strictEqual(doc.productType, 'fragrance-oil');
});

test('a staff-edited name/slug is never part of the update payload regardless of what Square sends', () => {
  // Simulates a staff renaming "Whipped Shea Butter" -> "Shea Butter Cream (Staff Renamed)"
  // and re-slugging it in admin, then Square re-syncing the same line: the update
  // payload must be structurally incapable of carrying Square's original name/slug.
  const updateDoc: Record<string, unknown> = buildWellnessLifestyleUpdateDoc({
    productType: 'body-butter',
    variations: [{ sku: 'WSB-1', price: 1400 }],
  });

  assert.deepStrictEqual(Object.keys(updateDoc).sort(), ['productType', 'variations']);
});
