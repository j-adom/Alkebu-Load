import assert from 'node:assert/strict';
import test from 'node:test';
import { isInStock, resolveDefaultVariation, sizeKey, sizeOptions } from '../src/lib/utils/variant.ts';

const row = (sku, scent, variantName, price, stock) => ({ sku, scent, variantName, price, stock });

test('Square names that repeat the scent or say "Regular" are not sizes', () => {
  const shea = [
    row('a', 'Almond', 'Almond', 1399, 3),
    row('b', 'Baccarat Rouge 540', 'Regular', 1399, 12),
    row('c', 'Money', null, 1399, 0),
  ];
  assert.deepEqual(shea.map(sizeKey), ['', '', '']);
  assert.deepEqual(sizeOptions(shea), []);
  assert.equal(resolveDefaultVariation(shea)?.sku, 'a');
});

test('sizes are case-folded and ordered by price, keeping the first spelling', () => {
  const oil = [
    row('1', 'Amber', '2 oz', 2500, 1),
    row('2', 'Amber', 'Roll-on', 800, 1),
    row('3', 'Musk', 'Roll-On', 800, 1),
    row('4', 'Amber', '1/4 oz', 500, 1),
  ];
  assert.deepEqual(sizeOptions(oil), [
    { key: '1/4 oz', label: '1/4 oz' },
    { key: 'roll-on', label: 'Roll-on' },
    { key: '2 oz', label: '2 oz' },
  ]);
});

test('a sized product defaults to the cheapest in-stock size of the first in-stock scent', () => {
  const oil = [
    row('1', 'Amber', '1/4 oz', 500, 0),
    row('2', 'Amber', '1 oz', 1200, 4),
    row('3', 'Zest', '1/4 oz', 500, 9),
  ];
  assert.equal(resolveDefaultVariation(oil)?.sku, '2');
});

test('an unsized scent on a sized product still resolves to its own row', () => {
  const oil = [row('1', 'Amber', '1 oz', 1200, 0), row('2', 'Jimmy Choo', null, 200, 5)];
  assert.equal(resolveDefaultVariation(oil)?.sku, '2');
});

test('isInStock: untracked variations ignore stock, isAvailable still decides', () => {
  assert.equal(isInStock({ sku: 'a', price: 500, stock: 0, trackInventory: false }), true);
  assert.equal(isInStock({ sku: 'a', price: 500, stock: 0, trackInventory: false, isAvailable: true }), true);
  assert.equal(isInStock({ sku: 'a', price: 500, stock: 0, trackInventory: false, isAvailable: false }), false);
  assert.equal(isInStock({ sku: 'a', price: 500, stock: 4, trackInventory: true }), true);
  assert.equal(isInStock({ sku: 'a', price: 500, stock: 0, trackInventory: true }), false);
  // Rows written before the field existed are tracked.
  assert.equal(isInStock({ sku: 'a', price: 500, stock: 0 }), false);
  assert.equal(isInStock({ sku: 'a', price: 500, stock: 3, isAvailable: false }), false);
  assert.equal(isInStock(null), false);
});

test('an untracked, available scent is picked as the default over a sold-out tracked one', () => {
  const oil = [
    { ...row('1', 'Amber', null, 500, 0), trackInventory: true },
    { ...row('2', 'Musk', null, 500, 0), trackInventory: false },
  ];
  assert.equal(resolveDefaultVariation(oil)?.sku, '2');
});
