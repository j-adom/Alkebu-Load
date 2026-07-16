/**
 * Order confirmation email: product names link to the storefront product page
 * and books display their ISBN.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { generateOrderConfirmationTemplate } from '../../src/app/utils/emailTemplates';
import { buildProductPageUrl } from '../../src/app/utils/productUrls';
import type { OrderConfirmationData } from '../../src/app/utils/emailService';

const baseData = (items: OrderConfirmationData['items']): OrderConfirmationData => ({
  orderNumber: 'ORD-100',
  customerName: 'Test Customer',
  customerEmail: 'test@example.com',
  items,
  subtotal: 2000,
  tax: 140,
  shipping: 0,
  total: 2140,
  shippingAddress: {
    firstName: 'Test',
    lastName: 'Customer',
    street: '123 Main St',
    city: 'Nashville',
    state: 'TN',
    zip: '37201',
    country: 'US',
  },
});

// ─── buildProductPageUrl ──────────────────────────────────────────────────────

describe('buildProductPageUrl', () => {
  it('maps books to /shop/books/<slug>', () => {
    assert.equal(
      buildProductPageUrl('books', { slug: 'things-fall-apart' }),
      'https://alkebulanimages.com/shop/books/things-fall-apart',
    );
  });

  it('maps wellness-lifestyle to /shop/health-and-beauty/<slug>', () => {
    assert.equal(
      buildProductPageUrl('wellness-lifestyle', { slug: 'shea-butter' }),
      'https://alkebulanimages.com/shop/health-and-beauty/shea-butter',
    );
  });

  it('maps fashion-jewelry to /shop/apparel/<slug>', () => {
    assert.equal(
      buildProductPageUrl('fashion-jewelry', { slug: 'ankh-pendant' }),
      'https://alkebulanimages.com/shop/apparel/ankh-pendant',
    );
  });

  it('maps oils-incense fragrance oils to /shop/health-and-beauty/<slug>', () => {
    assert.equal(
      buildProductPageUrl('oils-incense', { slug: 'egyptian-musk', productType: 'fragrance-oil' }),
      'https://alkebulanimages.com/shop/health-and-beauty/egyptian-musk',
    );
  });

  it('maps other oils-incense products to /shop/home-goods/<slug>', () => {
    assert.equal(
      buildProductPageUrl('oils-incense', { slug: 'white-sage', productType: 'sage-bundle' }),
      'https://alkebulanimages.com/shop/home-goods/white-sage',
    );
  });

  it('returns undefined when slug is missing', () => {
    assert.equal(buildProductPageUrl('books', { title: 'No Slug' }), undefined);
    assert.equal(buildProductPageUrl('books', null), undefined);
    assert.equal(buildProductPageUrl('books', 'raw-id-only'), undefined);
  });

  it('returns undefined for unknown collections', () => {
    assert.equal(buildProductPageUrl('external-books', { slug: 'foo' }), undefined);
  });

  it('percent-encodes unsafe slug characters', () => {
    assert.equal(
      buildProductPageUrl('books', { slug: 'a b?c' }),
      'https://alkebulanimages.com/shop/books/a%20b%3Fc',
    );
  });
});

// ─── HTML rendering ───────────────────────────────────────────────────────────

describe('generateOrderConfirmationTemplate – item links & ISBN', () => {
  it('renders the product title as a link when productUrl is provided', () => {
    const { html } = generateOrderConfirmationTemplate(baseData([
      {
        productTitle: 'Things Fall Apart',
        quantity: 1,
        unitPrice: 2000,
        totalPrice: 2000,
        productUrl: 'https://alkebulanimages.com/shop/books/things-fall-apart',
      },
    ]));
    assert.ok(
      html.includes('<a href="https://alkebulanimages.com/shop/books/things-fall-apart"'),
      'item title must link to the product page',
    );
    assert.ok(html.includes('Things Fall Apart</a>'), 'link text must be the product title');
  });

  it('renders a plain title when productUrl is absent', () => {
    const { html } = generateOrderConfirmationTemplate(baseData([
      { productTitle: 'Mystery Item', quantity: 1, unitPrice: 2000, totalPrice: 2000 },
    ]));
    assert.ok(html.includes('Mystery Item'), 'title still rendered');
    assert.ok(!html.includes('Mystery Item</a>'), 'no link without a productUrl');
  });

  it('does not link non-http(s) productUrls', () => {
    const { html } = generateOrderConfirmationTemplate(baseData([
      {
        productTitle: 'Evil Item',
        quantity: 1,
        unitPrice: 2000,
        totalPrice: 2000,
        productUrl: 'javascript:alert(1)',
      },
    ]));
    assert.ok(!html.includes('javascript:alert(1)'), 'unsafe protocol must be dropped');
    assert.ok(!html.includes('Evil Item</a>'), 'unsafe URL must not produce a link');
  });

  it('shows the ISBN under the title when present', () => {
    const { html, text } = generateOrderConfirmationTemplate(baseData([
      {
        productTitle: 'Things Fall Apart',
        quantity: 1,
        unitPrice: 2000,
        totalPrice: 2000,
        isbn: '9780385474542',
      },
    ]));
    assert.ok(html.includes('ISBN: 9780385474542'), 'HTML must show the ISBN');
    assert.ok(text.includes('ISBN: 9780385474542'), 'plain text must show the ISBN');
  });

  it('omits the ISBN line when not present', () => {
    const { html, text } = generateOrderConfirmationTemplate(baseData([
      { productTitle: 'Shea Butter', quantity: 1, unitPrice: 2000, totalPrice: 2000 },
    ]));
    assert.ok(!html.includes('ISBN:'), 'no ISBN label without an ISBN');
    assert.ok(!text.includes('ISBN:'), 'no ISBN label in text without an ISBN');
  });

  it('escapes HTML in the ISBN value', () => {
    const { html } = generateOrderConfirmationTemplate(baseData([
      {
        productTitle: 'Book',
        quantity: 1,
        unitPrice: 2000,
        totalPrice: 2000,
        isbn: '<script>alert(1)</script>',
      },
    ]));
    assert.ok(!html.includes('<script>'), 'raw script must not appear');
    assert.ok(html.includes('&lt;script&gt;'), 'ISBN must be escaped');
  });

  it('escapes attribute-breaking characters in the productUrl', () => {
    const { html } = generateOrderConfirmationTemplate(baseData([
      {
        productTitle: 'Book',
        quantity: 1,
        unitPrice: 2000,
        totalPrice: 2000,
        productUrl: 'https://alkebulanimages.com/shop/books/x"><img src=x onerror=alert(1)>',
      },
    ]));
    assert.ok(!html.includes('"><img'), 'raw attr-break must not appear');
    assert.ok(!html.includes('<img'), 'raw <img must not appear');
  });

  it('includes the product URL in the plain-text version', () => {
    const { text } = generateOrderConfirmationTemplate(baseData([
      {
        productTitle: 'Things Fall Apart',
        quantity: 1,
        unitPrice: 2000,
        totalPrice: 2000,
        productUrl: 'https://alkebulanimages.com/shop/books/things-fall-apart',
      },
    ]));
    assert.ok(
      text.includes('https://alkebulanimages.com/shop/books/things-fall-apart'),
      'plain text must include the product URL',
    );
  });
});
