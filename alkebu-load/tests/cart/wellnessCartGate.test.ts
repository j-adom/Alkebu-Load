import assert from 'node:assert';
import test from 'node:test';

import {
  evaluateWellnessPublishGate,
  evaluateWellnessVariationStock,
} from '../../src/app/utils/cartOperations';

// FIX 2: publishOnline is the human curation gate. Ids are publicly
// enumerable, so this must be enforced at add-to-cart time, not just at read
// time — a leaked unpublished product should never reach a cart, a Stripe
// line item, or a customer confirmation email.
test('unpublished wellness product is rejected at add-to-cart', () => {
  const product = { publishOnline: false };
  const result = evaluateWellnessPublishGate(product, 'wellness-lifestyle');

  assert.strictEqual(result.allowed, false);
  assert.ok(result.error);
});

test('unpublished oils-incense product is rejected at add-to-cart', () => {
  const product = { publishOnline: false };
  const result = evaluateWellnessPublishGate(product, 'oils-incense');

  assert.strictEqual(result.allowed, false);
});

test('published wellness product passes the publish gate', () => {
  const product = { publishOnline: true };
  const result = evaluateWellnessPublishGate(product, 'wellness-lifestyle');

  assert.strictEqual(result.allowed, true);
});

test('publish gate is a no-op for books and fashion-jewelry', () => {
  assert.strictEqual(
    evaluateWellnessPublishGate({ publishOnline: false }, 'books').allowed,
    true,
  );
  assert.strictEqual(
    evaluateWellnessPublishGate({}, 'fashion-jewelry').allowed,
    true,
  );
});

test('publish gate rejects when publishOnline is missing entirely (defaults closed)', () => {
  const result = evaluateWellnessPublishGate({}, 'wellness-lifestyle');
  assert.strictEqual(result.allowed, false);
});

// FIX 7: wellness/oils stock lives at variations[].stock, not
// product.inventory.trackQuantity (which doesn't exist on these collections).
test('a variation with stock: 0 is rejected at add-to-cart', () => {
  const product = {
    publishOnline: true,
    variations: [{ sku: 'SOAP-SMALL', stock: 0, isAvailable: true }],
  };

  const result = evaluateWellnessVariationStock(
    product,
    'wellness-lifestyle',
    undefined,
    1,
  );

  assert.strictEqual(result.allowed, false);
  assert.ok(result.error);
});

test('a variation with sufficient stock is allowed', () => {
  const product = {
    publishOnline: true,
    variations: [{ sku: 'SOAP-SMALL', stock: 12, isAvailable: true }],
  };

  const result = evaluateWellnessVariationStock(
    product,
    'wellness-lifestyle',
    undefined,
    2,
  );

  assert.strictEqual(result.allowed, true);
});

test('requesting more units than in stock is rejected', () => {
  const product = {
    publishOnline: true,
    variations: [{ sku: 'SOAP-SMALL', stock: 3, isAvailable: true }],
  };

  const result = evaluateWellnessVariationStock(
    product,
    'wellness-lifestyle',
    { variationSku: 'SOAP-SMALL' },
    5,
  );

  assert.strictEqual(result.allowed, false);
});

test('a variation explicitly marked unavailable is rejected even with stock', () => {
  const product = {
    publishOnline: true,
    variations: [{ sku: 'SOAP-SMALL', stock: 12, isAvailable: false }],
  };

  const result = evaluateWellnessVariationStock(
    product,
    'wellness-lifestyle',
    { variationSku: 'SOAP-SMALL' },
    1,
  );

  assert.strictEqual(result.allowed, false);
});

test('oils-incense stock is enforced the same way as wellness', () => {
  const product = {
    publishOnline: true,
    variations: [{ sku: 'OIL-1OZ', stock: 0, isAvailable: true }],
  };

  const result = evaluateWellnessVariationStock(
    product,
    'oils-incense',
    { variationSku: 'OIL-1OZ' },
    1,
  );

  assert.strictEqual(result.allowed, false);
});

test('stock check is a no-op for books and fashion-jewelry (different inventory model)', () => {
  const product = { inventory: { trackQuantity: true, stockLevel: 0 } };

  assert.strictEqual(
    evaluateWellnessVariationStock(product, 'books', undefined, 1).allowed,
    true,
  );
  assert.strictEqual(
    evaluateWellnessVariationStock(product, 'fashion-jewelry', undefined, 1).allowed,
    true,
  );
});
