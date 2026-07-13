import assert from 'node:assert';
import test from 'node:test';

import {
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
