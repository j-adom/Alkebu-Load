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
  assert.strictEqual(resolveCartProductUnitPrice(product, customization), 1799);
  assert.strictEqual(resolveCartStripePriceId(product, customization), 'price_paperback');
});

test('apparel cart details fall back to name and convert dollar prices to cents', () => {
  const product = {
    name: 'Black Lives Matter Tee',
    price: 25,
  };

  assert.strictEqual(resolveCartProductTitle(product), 'Black Lives Matter Tee');
  assert.strictEqual(resolveCartProductUnitPrice(product), 2500);
});

test('cart pricing preserves cent-based prices without double conversion', () => {
  const product = {
    name: 'Imported Apparel',
    price: 2500,
  };

  assert.strictEqual(resolveCartProductUnitPrice(product), 2500);
});

test('cart title falls back to fragrance-style product names', () => {
  const product = {
    baseScent: 'Egyptian Musk',
  };

  assert.strictEqual(resolveCartProductTitle(product), 'Egyptian Musk');
});
