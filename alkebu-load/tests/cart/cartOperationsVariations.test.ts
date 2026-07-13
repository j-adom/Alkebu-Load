import assert from 'node:assert';
import test from 'node:test';

import { addToCart, updateCartItemQuantity } from '../../src/app/utils/cartOperations';

/**
 * Minimal in-memory Payload mock covering exactly the collections/operations
 * cartOperations.ts touches (carts, cart-items, and product lookups). Follows
 * the makePayloadMock pattern used in tests/customers/*.test.ts.
 */
function makeCartPayloadMock(products: Record<string, any>) {
  const cartItems: any[] = [];
  const carts: any[] = [{ id: 'cart_1', sessionId: 's1', status: 'active', totalAmount: 0 }];
  let nextCartItemId = 1;

  const key = (collection: string, id: unknown) => `${collection}:${id}`;

  const api = {
    findByID: async ({ collection, id, depth }: any) => {
      if (collection === 'cart-items') {
        const item = cartItems.find((i) => String(i.id) === String(id));
        if (!item) return null;
        if (depth && depth > 0 && item.product) {
          return {
            ...item,
            product: {
              relationTo: item.product.relationTo,
              value: products[key(item.product.relationTo, item.product.value)],
            },
          };
        }
        return item;
      }
      if (collection === 'carts') {
        return carts.find((c) => String(c.id) === String(id)) || null;
      }
      // Product collections (books, wellness-lifestyle, fashion-jewelry, oils-incense)
      return products[key(collection, id)] || null;
    },
    find: async ({ collection, where }: any) => {
      if (collection === 'cart-items') {
        const cid = where?.cart?.equals;
        const docs = cartItems.filter((i) => String(i.cart) === String(cid));
        return { docs, totalDocs: docs.length };
      }
      // vendors/publishers lookups used by the backorder path -- never
      // exercised by these tests, but must not throw if hit.
      return { docs: [], totalDocs: 0 };
    },
    create: async ({ collection, data }: any) => {
      if (collection === 'cart-items') {
        const doc = { id: nextCartItemId++, ...data };
        cartItems.push(doc);
        return doc;
      }
      if (collection === 'carts') {
        const doc = { id: `cart_${carts.length + 1}`, ...data };
        carts.push(doc);
        return doc;
      }
      throw new Error(`Unexpected create on collection "${collection}"`);
    },
    update: async ({ collection, id, data }: any) => {
      if (collection === 'cart-items') {
        const idx = cartItems.findIndex((i) => String(i.id) === String(id));
        if (idx === -1) throw new Error('cart item not found');
        cartItems[idx] = { ...cartItems[idx], ...data };
        return cartItems[idx];
      }
      if (collection === 'carts') {
        const idx = carts.findIndex((c) => String(c.id) === String(id));
        if (idx === -1) throw new Error('cart not found');
        carts[idx] = { ...carts[idx], ...data };
        return carts[idx];
      }
      throw new Error(`Unexpected update on collection "${collection}"`);
    },
  };

  return { cartItems, carts, products, api };
}

const scentedOil = {
  id: 'wl_oil_1',
  publishOnline: true,
  name: 'Egyptian Musk Oil',
  variations: [
    { sku: 'OIL-EGYPTIANMUSK-QTR', scent: 'Egyptian Musk', price: 500, stock: 10 },
    { sku: 'OIL-EGYPTIANMUSK-2OZ', scent: 'Egyptian Musk', price: 2500, stock: 10 },
  ],
};

// FIX A(a): a DIFFERENT variation must never merge into the existing line at
// the old price/sku -- it must become its own cart line.
test('adding two different wellness variations creates two lines with their own price and sku', async () => {
  const mock = makeCartPayloadMock({ 'wellness-lifestyle:wl_oil_1': scentedOil });

  const first = await addToCart(mock.api as any, 'cart_1', {
    productId: 'wl_oil_1',
    productType: 'wellness-lifestyle',
    quantity: 1,
    customization: { variationSku: 'OIL-EGYPTIANMUSK-QTR' },
  });
  const second = await addToCart(mock.api as any, 'cart_1', {
    productId: 'wl_oil_1',
    productType: 'wellness-lifestyle',
    quantity: 1,
    customization: { variationSku: 'OIL-EGYPTIANMUSK-2OZ' },
  });

  assert.strictEqual(first.success, true);
  assert.strictEqual(second.success, true);
  assert.strictEqual(mock.cartItems.length, 2);

  const quarterOz = mock.cartItems.find((i) => i.identifiers?.sku === 'OIL-EGYPTIANMUSK-QTR');
  const twoOz = mock.cartItems.find((i) => i.identifiers?.sku === 'OIL-EGYPTIANMUSK-2OZ');

  assert.ok(quarterOz, 'expected a separate line for the 1/4oz variation');
  assert.ok(twoOz, 'expected a separate line for the 2oz variation');
  assert.strictEqual(quarterOz.unitPrice, 500);
  assert.strictEqual(quarterOz.quantity, 1);
  assert.strictEqual(twoOz.unitPrice, 2500);
  assert.strictEqual(twoOz.quantity, 1);
});

// FIX A(b): re-adding the SAME variation must still merge (not fragment into
// duplicate lines for the same product+variation).
test('adding the same wellness variation twice merges into one line with quantity 2', async () => {
  const mock = makeCartPayloadMock({ 'wellness-lifestyle:wl_oil_1': scentedOil });

  await addToCart(mock.api as any, 'cart_1', {
    productId: 'wl_oil_1',
    productType: 'wellness-lifestyle',
    quantity: 1,
    customization: { variationSku: 'OIL-EGYPTIANMUSK-QTR' },
  });
  const second = await addToCart(mock.api as any, 'cart_1', {
    productId: 'wl_oil_1',
    productType: 'wellness-lifestyle',
    quantity: 1,
    customization: { variationSku: 'OIL-EGYPTIANMUSK-QTR' },
  });

  assert.strictEqual(second.success, true);
  assert.strictEqual(mock.cartItems.length, 1);
  assert.strictEqual(mock.cartItems[0].quantity, 2);
  assert.strictEqual(mock.cartItems[0].unitPrice, 500);
  assert.strictEqual(mock.cartItems[0].identifiers.sku, 'OIL-EGYPTIANMUSK-QTR');
});

// FIX B: updateCartItemQuantity must enforce the SELECTED variation's stock,
// not just the (nonexistent, for wellness/oils) product.inventory.trackQuantity.
test('updating a wellness cart line above the variation stock is rejected', async () => {
  const limitedSoap = {
    id: 'wl_soap_1',
    publishOnline: true,
    name: 'Yadain Bar Soap',
    variations: [{ sku: 'YADAIN-BAR', price: 899, stock: 3 }],
  };
  const mock = makeCartPayloadMock({ 'wellness-lifestyle:wl_soap_1': limitedSoap });

  const added = await addToCart(mock.api as any, 'cart_1', {
    productId: 'wl_soap_1',
    productType: 'wellness-lifestyle',
    quantity: 1,
  });
  assert.strictEqual(added.success, true);

  const cartItemId = mock.cartItems[0].id;
  const result = await updateCartItemQuantity(mock.api as any, 'cart_1', String(cartItemId), 50);

  assert.strictEqual(result.success, false);
  assert.ok(result.error);
  assert.match(result.error as string, /Only 3/);
  // Rejected update must not have mutated the stored quantity.
  assert.strictEqual(mock.cartItems[0].quantity, 1);
});

test('updating a wellness cart line within the variation stock is accepted', async () => {
  const soap = {
    id: 'wl_soap_2',
    publishOnline: true,
    name: 'Shea Bar Soap',
    variations: [{ sku: 'SHEA-BAR', price: 799, stock: 12 }],
  };
  const mock = makeCartPayloadMock({ 'wellness-lifestyle:wl_soap_2': soap });

  await addToCart(mock.api as any, 'cart_1', {
    productId: 'wl_soap_2',
    productType: 'wellness-lifestyle',
    quantity: 1,
  });

  const cartItemId = mock.cartItems[0].id;
  const result = await updateCartItemQuantity(mock.api as any, 'cart_1', String(cartItemId), 5);

  assert.strictEqual(result.success, true);
  assert.strictEqual(mock.cartItems[0].quantity, 5);
});

// Regression: books have no `variations[]` (they use `editions[]`), so
// identifiers.sku resolves to undefined on both sides and the dedupe key
// falls back to the pre-fix productId+productType match -- re-adding the same
// book (regardless of edition selection) must still merge into one line,
// exactly as before this fix.
test('regression: adding the same book twice still merges into one line', async () => {
  const book = {
    id: 'book_1',
    title: 'The Will to Change',
    availabilityStatus: 'available',
    pricing: { retailPrice: 1799 },
  };
  const mock = makeCartPayloadMock({ 'books:book_1': book });

  await addToCart(mock.api as any, 'cart_1', {
    productId: 'book_1',
    productType: 'books',
    quantity: 1,
  });
  const second = await addToCart(mock.api as any, 'cart_1', {
    productId: 'book_1',
    productType: 'books',
    quantity: 2,
  });

  assert.strictEqual(second.success, true);
  assert.strictEqual(mock.cartItems.length, 1);
  assert.strictEqual(mock.cartItems[0].quantity, 3);
  assert.strictEqual(mock.cartItems[0].unitPrice, 1799);
});

// Regression: fashion-jewelry keeps working with dollar pricing and its
// variations[] array. A DIFFERENT variation now correctly gets its own line
// too (same underlying bug class as wellness), while the SAME variation
// still merges.
test('regression: apparel variations behave like wellness -- same merges, different separates', async () => {
  const tee = {
    id: 'fj_1',
    name: 'Black Lives Matter Tee',
    variations: [
      { sku: 'BLM-TEE-M', size: 'M', price: 25 },
      { sku: 'BLM-TEE-XL', size: 'XL', price: 30 },
    ],
  };
  const mock = makeCartPayloadMock({ 'fashion-jewelry:fj_1': tee });

  await addToCart(mock.api as any, 'cart_1', {
    productId: 'fj_1',
    productType: 'fashion-jewelry',
    quantity: 1,
    customization: { variationSku: 'BLM-TEE-M' },
  });
  await addToCart(mock.api as any, 'cart_1', {
    productId: 'fj_1',
    productType: 'fashion-jewelry',
    quantity: 1,
    customization: { variationSku: 'BLM-TEE-M' },
  });
  await addToCart(mock.api as any, 'cart_1', {
    productId: 'fj_1',
    productType: 'fashion-jewelry',
    quantity: 1,
    customization: { variationSku: 'BLM-TEE-XL' },
  });

  assert.strictEqual(mock.cartItems.length, 2);
  const medium = mock.cartItems.find((i) => i.identifiers?.sku === 'BLM-TEE-M');
  const xl = mock.cartItems.find((i) => i.identifiers?.sku === 'BLM-TEE-XL');
  assert.strictEqual(medium.quantity, 2);
  assert.strictEqual(medium.unitPrice, 2500); // dollars -> cents
  assert.strictEqual(xl.quantity, 1);
  assert.strictEqual(xl.unitPrice, 3000);
});
