import assert from 'node:assert';
import test from 'node:test';

import {
  resolveCartProductIdentifiers,
  resolveCartProductTitle,
  resolveCartProductUnitPrice,
  resolveCartStripePriceId,
} from '../../src/app/utils/cartProductDetails';

test('book cart details use the requested edition binding', () => {
  const product = {
    title: 'The Will to Change',
    pricing: { retailPrice: 1799 },
    editions: [
      {
        binding: 'hardcover',
        pricing: { retailPrice: 2599 },
        stripePriceId: 'price_hardcover',
      },
      {
        binding: 'paperback',
        pricing: { retailPrice: 1799 },
        stripePriceId: 'price_paperback',
      },
    ],
  };

  const customization = { binding: 'paperback' };

  assert.strictEqual(resolveCartProductTitle(product, customization), 'The Will to Change');
  assert.strictEqual(resolveCartProductUnitPrice(product, 'books', customization), 1799);
  assert.strictEqual(resolveCartStripePriceId(product, customization), 'price_paperback');
});

test('apparel cart details fall back to name and convert dollar prices to cents', () => {
  const product = {
    name: 'Black Lives Matter Tee',
    price: 25,
  };

  assert.strictEqual(resolveCartProductTitle(product), 'Black Lives Matter Tee');
  assert.strictEqual(resolveCartProductUnitPrice(product, 'fashion-jewelry'), 2500);
});

test('apparel prices are always dollars, even when the number looks cents-sized', () => {
  // This is the inverse of the old bug: the magnitude heuristic treated any
  // value >= 1000 as already-cents, so a $2500.00 item priced at 2500 (dollars)
  // was silently priced as a $25.00 line item. Apparel is declared dollars-only now.
  const product = {
    name: 'Imported Apparel',
    price: 2500,
  };

  assert.strictEqual(resolveCartProductUnitPrice(product, 'fashion-jewelry'), 250000);
});

test('cart title falls back to fragrance-style product names', () => {
  const product = {
    baseScent: 'Egyptian Musk',
  };

  assert.strictEqual(resolveCartProductTitle(product), 'Egyptian Musk');
});

test('wellness cart details resolve the chosen scent variation and keep cents', () => {
  const product = {
    id: 'wl_1',
    name: 'Whipped Shea Butter',
    variations: [
      { sku: 'WSB-BLACKWOMAN-4OZ', scent: 'Black Woman', price: 1499, squareVariationId: 'SQ_A' },
      { sku: 'WSB-MANGO-4OZ', scent: 'Mango Butter', price: 1499, squareVariationId: 'SQ_B' },
      { sku: 'WSB-PINKSUGAR-8OZ', scent: 'Pink Sugar', price: 2499, squareVariationId: 'SQ_C' },
    ],
  };

  assert.strictEqual(
    resolveCartProductUnitPrice(product, 'wellness-lifestyle', { variationSku: 'WSB-PINKSUGAR-8OZ' }),
    2499,
  );
  // Selection by Square variation id also works.
  assert.strictEqual(
    resolveCartProductUnitPrice(product, 'wellness-lifestyle', { squareVariationId: 'SQ_A' }),
    1499,
  );
});

test('single-variation wellness products need no explicit selection', () => {
  const product = {
    id: 'wl_2',
    name: 'Gye Nyame Blackseed Soap',
    variations: [{ sku: 'GYENYAME-BAR', price: 899, squareVariationId: 'SQ_Y' }],
  };

  assert.strictEqual(resolveCartProductUnitPrice(product, 'wellness-lifestyle'), 899);
});

test('an unmatched wellness variation throws instead of pricing at zero', () => {
  const product = {
    id: 'wl_3',
    name: 'Scented Oil',
    variations: [
      { sku: 'OIL-EGYPTIANMUSK-1OZ', price: 1299, squareVariationId: 'SQ_M' },
      { sku: 'OIL-PINKSUGAR-1OZ', price: 1299, squareVariationId: 'SQ_P' },
    ],
  };

  assert.throws(
    () => resolveCartProductUnitPrice(product, 'wellness-lifestyle', { variationSku: 'NOPE' }),
    /Cannot resolve price/,
  );
  // The pre-fix behavior — silently returning 0 — must never come back.
  assert.throws(() => resolveCartProductUnitPrice(product, 'wellness-lifestyle'), /Cannot resolve price/);
});

test('wellness cart title names the chosen scent, omitting a size every variation shares', () => {
  const product = {
    name: 'Whipped Shea Butter',
    variations: [
      { sku: 'WSB-BLACKWOMAN-4OZ', scent: 'Black Woman', variantName: '4 oz', price: 1499 },
      { sku: 'WSB-PINKSUGAR-4OZ', scent: 'Pink Sugar', variantName: '4 oz', price: 1499 },
    ],
  };

  assert.strictEqual(
    resolveCartProductTitle(product, { variationSku: 'WSB-PINKSUGAR-4OZ' }, 'wellness-lifestyle'),
    'Whipped Shea Butter — Pink Sugar',
  );
  // Non-wellness callers keep the bare title.
  assert.strictEqual(
    resolveCartProductTitle(product, { variationSku: 'WSB-PINKSUGAR-4OZ' }),
    'Whipped Shea Butter',
  );
});

test('wellness cart title includes the size when sizes differ', () => {
  const product = {
    name: 'Body Oil',
    variations: [
      { sku: 'OIL-MUSK-1OZ', scent: 'Egyptian Musk', variantName: '1 oz', price: 999 },
      { sku: 'OIL-MUSK-4OZ', scent: 'Egyptian Musk', variantName: '4 oz', price: 2499 },
      { sku: 'OIL-AMBER-4OZ', scent: 'Amber', variantName: '4 oz', price: 2499 },
    ],
  };

  assert.strictEqual(
    resolveCartProductTitle(product, { variationSku: 'OIL-MUSK-4OZ' }, 'wellness-lifestyle'),
    'Body Oil — Egyptian Musk, 4 oz',
  );
});

test('single-variation wellness titles get no variation suffix', () => {
  const product = {
    name: 'Gye Nyame Blackseed Soap',
    variations: [{ sku: 'GYENYAME-BAR', scent: 'Blackseed', price: 899 }],
  };

  assert.strictEqual(
    resolveCartProductTitle(product, undefined, 'wellness-lifestyle'),
    'Gye Nyame Blackseed Soap',
  );
});

test('wellness identifiers record the selected variation, not the first one', () => {
  const product = {
    name: 'Whipped Shea Butter',
    variations: [
      { sku: 'WSB-BLACKWOMAN-4OZ', scent: 'Black Woman', price: 1499, squareVariationId: 'SQ_A' },
      { sku: 'WSB-PINKSUGAR-8OZ', scent: 'Pink Sugar', price: 2499, squareVariationId: 'SQ_C' },
    ],
  };

  const identifiers = resolveCartProductIdentifiers(product, 'wellness-lifestyle', {
    squareVariationId: 'SQ_C',
  });

  assert.strictEqual(identifiers.sku, 'WSB-PINKSUGAR-8OZ');
  assert.strictEqual(identifiers.squareVariationId, 'SQ_C');
});

test('wellness title ignores Square variation names that just repeat the scent or say Regular', () => {
  // Shape of the production Whipped Shea Butter variations.
  const product = {
    name: 'Whipped Shea Butter',
    variations: [
      { sku: '210000011102', scent: 'Baby Powder', variantName: 'Baby Powder', price: 1399 },
      { sku: '4686697', scent: 'Black Coconut', variantName: 'Regular', price: 1399 },
      { sku: '210000007870', scent: 'Amber White', variantName: 'Amber White', price: 1399 },
    ],
  };

  assert.strictEqual(
    resolveCartProductTitle(product, { variationSku: '210000011102' }, 'wellness-lifestyle'),
    'Whipped Shea Butter — Baby Powder',
  );
  assert.strictEqual(
    resolveCartProductTitle(product, { variationSku: '4686697' }, 'wellness-lifestyle'),
    'Whipped Shea Butter — Black Coconut',
  );
});
