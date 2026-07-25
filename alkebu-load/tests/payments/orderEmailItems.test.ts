/**
 * Order emails: one shared line-item shape feeds both audiences.
 *
 * Staff notification is a pick list — linked title plus the full edition
 * detail (author, edition/binding, ISBN, SKU, publisher) so staff can pull
 * the exact item without opening the admin. Customer confirmation is a
 * retail receipt — author, edition and ISBN, but no SKU/publisher.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOrderEmailLineItems,
  toCustomerLineItems,
} from '../../src/app/utils/orderEmailItems';
import {
  generateOrderConfirmationTemplate,
  generateStaffNotificationTemplate,
} from '../../src/app/utils/emailTemplates';
import type {
  EmailLineItem,
  OrderConfirmationData,
  StaffNotificationData,
} from '../../src/app/utils/emailService';

const address = {
  firstName: 'Test',
  lastName: 'Customer',
  street: '123 Main St',
  city: 'Nashville',
  state: 'TN',
  zip: '37201',
  country: 'US',
};

const staffData = (items: StaffNotificationData['items']): StaffNotificationData => ({
  orderNumber: 'ORD-200',
  orderId: '42',
  customerName: 'Test Customer',
  customerEmail: 'test@example.com',
  items,
  subtotal: 2000,
  tax: 140,
  shipping: 0,
  total: 2140,
  shippingAddress: address,
  source: 'website',
  paymentMethod: 'card',
});

const customerData = (items: OrderConfirmationData['items']): OrderConfirmationData => ({
  orderNumber: 'ORD-200',
  customerName: 'Test Customer',
  customerEmail: 'test@example.com',
  items,
  subtotal: 2000,
  tax: 140,
  shipping: 0,
  total: 2140,
  shippingAddress: address,
});

const bookCartItem = {
  productTitle: 'Things Fall Apart',
  productType: 'books',
  quantity: 2,
  unitPrice: 1599,
  product: {
    relationTo: 'books',
    value: {
      slug: 'things-fall-apart',
      authorsText: [{ name: 'Chinua Achebe' }],
    },
  },
  identifiers: {
    isbn: '9780385474542',
    isbn10: '0385474547',
    sku: 'BK-TFA-PB',
    edition: 'Paperback',
    publisher: 'Anchor Books',
  },
};

// ─── buildOrderEmailLineItems ─────────────────────────────────────────────────

describe('buildOrderEmailLineItems', () => {
  it('maps the identifiers snapshot and populated product into a full line item', () => {
    const [item] = buildOrderEmailLineItems([bookCartItem]);

    assert.equal(item.productTitle, 'Things Fall Apart');
    assert.equal(item.quantity, 2);
    assert.equal(item.unitPrice, 1599);
    assert.equal(item.totalPrice, 3198);
    assert.equal(item.isbn, '9780385474542');
    assert.equal(item.edition, 'Paperback');
    assert.equal(item.sku, 'BK-TFA-PB');
    assert.equal(item.publisher, 'Anchor Books');
    assert.equal(item.author, 'Chinua Achebe');
    assert.equal(item.productUrl, 'https://alkebulanimages.com/shop/books/things-fall-apart');
  });

  it('joins multiple authors with commas', () => {
    const [item] = buildOrderEmailLineItems([{
      ...bookCartItem,
      product: {
        relationTo: 'books',
        value: {
          slug: 'four-hundred-souls',
          authorsText: [{ name: 'Ibram X. Kendi' }, { name: 'Keisha N. Blain' }],
        },
      },
    }]);

    assert.equal(item.author, 'Ibram X. Kendi, Keisha N. Blain');
  });

  it('leaves detail fields undefined when identifiers and product are absent', () => {
    const [item] = buildOrderEmailLineItems([{
      productTitle: 'Mystery Item',
      productType: 'books',
      quantity: 1,
      unitPrice: 500,
      product: 123, // unpopulated bare id
    }]);

    assert.equal(item.productTitle, 'Mystery Item');
    assert.equal(item.totalPrice, 500);
    assert.equal(item.isbn, undefined);
    assert.equal(item.edition, undefined);
    assert.equal(item.sku, undefined);
    assert.equal(item.publisher, undefined);
    assert.equal(item.author, undefined);
    assert.equal(item.productUrl, undefined);
  });
});

// ─── toCustomerLineItems ──────────────────────────────────────────────────────

describe('toCustomerLineItems', () => {
  it('strips SKU and publisher but keeps author, edition, ISBN and link', () => {
    const full = buildOrderEmailLineItems([bookCartItem]);
    const [item] = toCustomerLineItems(full);

    assert.equal(item.sku, undefined);
    assert.equal(item.publisher, undefined);
    assert.equal(item.author, 'Chinua Achebe');
    assert.equal(item.edition, 'Paperback');
    assert.equal(item.isbn, '9780385474542');
    assert.equal(item.productUrl, 'https://alkebulanimages.com/shop/books/things-fall-apart');
  });
});

// ─── Staff notification template ──────────────────────────────────────────────

describe('generateStaffNotificationTemplate – item detail', () => {
  const fullItem: EmailLineItem = {
    productTitle: 'Things Fall Apart',
    quantity: 2,
    unitPrice: 1599,
    totalPrice: 3198,
    isbn: '9780385474542',
    sku: 'BK-TFA-PB',
    edition: 'Paperback',
    publisher: 'Anchor Books',
    author: 'Chinua Achebe',
    productUrl: 'https://alkebulanimages.com/shop/books/things-fall-apart',
  };

  it('links the product title to the storefront page', () => {
    const { html } = generateStaffNotificationTemplate(staffData([fullItem]));
    assert.match(html, /<a href="https:\/\/alkebulanimages\.com\/shop\/books\/things-fall-apart"[^>]*>Things Fall Apart<\/a>/);
  });

  it('shows author, edition, ISBN, SKU and publisher in the HTML body', () => {
    const { html } = generateStaffNotificationTemplate(staffData([fullItem]));
    assert.match(html, /by Chinua Achebe/);
    assert.match(html, /Paperback/);
    assert.match(html, /ISBN: 9780385474542/);
    assert.match(html, /SKU: BK-TFA-PB/);
    assert.match(html, /Anchor Books/);
  });

  it('shows edition detail in the plain-text body', () => {
    const { text } = generateStaffNotificationTemplate(staffData([fullItem]));
    assert.match(text, /ISBN: 9780385474542/);
    assert.match(text, /SKU: BK-TFA-PB/);
    assert.match(text, /Paperback/);
  });

  it('renders a plain unlinked row when detail fields are absent', () => {
    const { html, text } = generateStaffNotificationTemplate(staffData([{
      productTitle: 'Shea Butter',
      quantity: 1,
      unitPrice: 800,
      totalPrice: 800,
    }]));
    assert.match(html, /Shea Butter/);
    assert.doesNotMatch(html, /ISBN:/);
    assert.doesNotMatch(html, /SKU:/);
    assert.doesNotMatch(text, /ISBN:/);
  });

  it('escapes HTML in detail fields', () => {
    const { html } = generateStaffNotificationTemplate(staffData([{
      productTitle: 'Weird Item',
      quantity: 1,
      unitPrice: 100,
      totalPrice: 100,
      sku: '<script>alert(1)</script>',
    }]));
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  });
});

// ─── Customer confirmation template ───────────────────────────────────────────

describe('generateOrderConfirmationTemplate – edition detail', () => {
  it('shows author and edition under the title in HTML and text', () => {
    const { html, text } = generateOrderConfirmationTemplate(customerData([{
      productTitle: 'Things Fall Apart',
      quantity: 1,
      unitPrice: 1599,
      totalPrice: 1599,
      isbn: '9780385474542',
      edition: 'Paperback',
      author: 'Chinua Achebe',
      productUrl: 'https://alkebulanimages.com/shop/books/things-fall-apart',
    }]));

    assert.match(html, /by Chinua Achebe/);
    assert.match(html, /Paperback/);
    assert.match(html, /ISBN: 9780385474542/);
    assert.match(text, /by Chinua Achebe/);
    assert.match(text, /Paperback/);
  });
});
