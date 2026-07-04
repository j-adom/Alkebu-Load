/**
 * TDD tests for HTML-escaping of user-controlled data in email templates.
 * These tests MUST FAIL before the escapeHtml helper is applied, and PASS after.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateOrderConfirmationTemplate,
  generateAbandonedCartTemplate,
  generateRefundNotificationTemplate,
  generateOrderStatusTemplate,
  generateStaffNotificationTemplate,
  generateDailyDigestTemplate,
} from '../../src/app/utils/emailTemplates';

import type {
  OrderConfirmationData,
  AbandonedCartData,
  StaffNotificationData,
  RefundNotificationData,
  DailyDigestData,
} from '../../src/app/utils/emailService';

// ─── helpers ──────────────────────────────────────────────────────────────────

const SCRIPT_PAYLOAD = '<script>alert(1)</script>';
// Attribute-break: the quote+angle-bracket sequence `"><img …>` is the injection
// vector.  After escaping, `"` → `&quot;` and `<` → `&lt;`, so the raw sequences
// `"><img` and `onerror=alert(1)>` (with the unescaped `>`) cannot appear.
const ATTR_BREAK     = '"><img src=x onerror=alert(1)>';

function assertEscaped(html: string, raw: string, label: string) {
  assert.ok(!html.includes(raw), `${label}: raw payload "${raw.slice(0, 40)}" must not appear in HTML`);
}

function assertContains(html: string, escaped: string, label: string) {
  assert.ok(html.includes(escaped), `${label}: escaped form "${escaped.slice(0, 40)}" must appear in HTML`);
}

// The dangerous part of ATTR_BREAK is the `"><img` sequence that breaks out of an
// attribute.  After escaping: `"` → `&quot;`, `<` → `&lt;`.  We check that the raw
// break-out sequence is not present AND that the quote is escaped.
function assertAttrBreakEscaped(html: string, label: string) {
  // The raw `"><img` must not appear (it would break out of an attribute)
  assert.ok(!html.includes('"><img'), `${label}: raw attr-break "><img must not appear`);
  // The `<img` tag must not appear in any form (covered by escaping `<`)
  assert.ok(!html.includes('<img'), `${label}: raw <img tag must not appear`);
}

// ─── ORDER CONFIRMATION ───────────────────────────────────────────────────────

describe('generateOrderConfirmationTemplate – XSS escaping', () => {
  const data: OrderConfirmationData = {
    orderNumber: 'ORD-001',
    customerName: SCRIPT_PAYLOAD,
    customerEmail: 'test@example.com',
    items: [{ productTitle: SCRIPT_PAYLOAD, quantity: 1, unitPrice: 1000, totalPrice: 1000 }],
    subtotal: 1000,
    tax: 70,
    shipping: 500,
    total: 1570,
    shippingAddress: {
      firstName: ATTR_BREAK,
      lastName: 'Smith',
      street: '123 Main St',
      city: 'Nashville',
      state: 'TN',
      zip: '37201',
      country: 'US',
    },
  };

  it('does not leak raw <script> in product title', () => {
    const { html } = generateOrderConfirmationTemplate(data);
    assertEscaped(html, '<script>', 'orderConfirmation/productTitle');
    assertContains(html, '&lt;script&gt;', 'orderConfirmation/productTitle escaped');
  });

  it('does not leak attr-break in address firstName', () => {
    const { html } = generateOrderConfirmationTemplate(data);
    assertAttrBreakEscaped(html, 'orderConfirmation/firstName');
  });
});

// ─── ABANDONED CART ───────────────────────────────────────────────────────────

describe('generateAbandonedCartTemplate – XSS escaping', () => {
  const data: AbandonedCartData = {
    customerName: SCRIPT_PAYLOAD,
    customerEmail: 'test@example.com',
    cartId: 'cart-abc',
    items: [{ productTitle: SCRIPT_PAYLOAD, quantity: 2, unitPrice: 500, totalPrice: 1000 }],
    subtotal: 1000,
    recoveryUrl: 'https://alkebulanimages.com/cart/abc',
  };

  it('does not leak raw <script> in customerName', () => {
    const { html } = generateAbandonedCartTemplate(data);
    assertEscaped(html, '<script>', 'abandonedCart/customerName');
    assertContains(html, '&lt;script&gt;', 'abandonedCart/customerName escaped');
  });

  it('does not leak raw <script> in product title', () => {
    const { html } = generateAbandonedCartTemplate(data);
    assertEscaped(html, '<script>', 'abandonedCart/productTitle');
  });
});

// ─── REFUND NOTIFICATION ──────────────────────────────────────────────────────

describe('generateRefundNotificationTemplate – XSS escaping', () => {
  const data: RefundNotificationData = {
    orderNumber: 'ORD-002',
    customerName: SCRIPT_PAYLOAD,
    customerEmail: 'test@example.com',
    refundAmount: 1500,
    reasonLabel: SCRIPT_PAYLOAD,
    note: ATTR_BREAK,
    items: [{ productTitle: SCRIPT_PAYLOAD, quantity: 1, amount: 1500 }],
    isPartial: false,
  };

  it('does not leak raw <script> in customerName', () => {
    const { html } = generateRefundNotificationTemplate(data);
    assertEscaped(html, '<script>', 'refund/customerName');
    assertContains(html, '&lt;script&gt;', 'refund/customerName escaped');
  });

  it('does not leak raw <script> in product title', () => {
    const { html } = generateRefundNotificationTemplate(data);
    assertEscaped(html, '<script>', 'refund/productTitle');
  });

  it('does not leak raw <script> in reasonLabel', () => {
    const { html } = generateRefundNotificationTemplate(data);
    assertEscaped(html, '<script>', 'refund/reasonLabel');
  });

  it('does not leak attr-break in note', () => {
    const { html } = generateRefundNotificationTemplate(data);
    assertAttrBreakEscaped(html, 'refund/note');
  });
});

// ─── ORDER STATUS ─────────────────────────────────────────────────────────────

describe('generateOrderStatusTemplate – XSS escaping', () => {
  it('does not leak raw <script> in tracking number', () => {
    const { html } = generateOrderStatusTemplate(
      'ORD-003',
      'paid',
      'shipped',
      SCRIPT_PAYLOAD  // tracking number is user-influenced (comes from carrier API + stored)
    );
    assertEscaped(html, '<script>', 'orderStatus/trackingNumber');
    assertContains(html, '&lt;script&gt;', 'orderStatus/trackingNumber escaped');
  });

  it('does not break out of attribute context with tracking number', () => {
    const { html } = generateOrderStatusTemplate(
      'ORD-003',
      'paid',
      'shipped',
      ATTR_BREAK
    );
    assertAttrBreakEscaped(html, 'orderStatus/trackingNumber');
  });
});

// ─── STAFF NOTIFICATION ───────────────────────────────────────────────────────

describe('generateStaffNotificationTemplate – XSS escaping', () => {
  const data: StaffNotificationData = {
    orderNumber: 'ORD-004',
    orderId: 'abc123',
    customerName: SCRIPT_PAYLOAD,
    customerEmail: `${ATTR_BREAK}@example.com`,
    items: [{ productTitle: SCRIPT_PAYLOAD, quantity: 1, unitPrice: 2000, totalPrice: 2000 }],
    subtotal: 2000,
    tax: 140,
    shipping: 0,
    total: 2140,
    shippingAddress: {
      firstName: ATTR_BREAK,
      lastName: 'Test',
      street: '999 Oak Ave',
      city: 'Memphis',
      state: 'TN',
      zip: '38101',
      country: 'US',
    },
    source: 'website',
    paymentMethod: 'card',
  };

  it('does not leak raw <script> in customerName', () => {
    const { html } = generateStaffNotificationTemplate(data);
    assertEscaped(html, '<script>', 'staffNotification/customerName');
    assertContains(html, '&lt;script&gt;', 'staffNotification/customerName escaped');
  });

  it('does not leak raw <script> in product title', () => {
    const { html } = generateStaffNotificationTemplate(data);
    assertEscaped(html, '<script>', 'staffNotification/productTitle');
  });

  it('does not break out of mailto: href with malicious customerEmail', () => {
    const { html } = generateStaffNotificationTemplate(data);
    // The attr-break starts with `"` which would close the href attribute. After safeMailto,
    // the malformed address yields an empty mailto: href (not a valid email pattern).
    // The display text is HTML-escaped so `"><img` cannot appear.
    assertAttrBreakEscaped(html, 'staffNotification/customerEmail href-break');
  });

  it('does not break out of attribute context with firstName addr-break', () => {
    const { html } = generateStaffNotificationTemplate(data);
    assertAttrBreakEscaped(html, 'staffNotification/shippingAddress.firstName');
  });
});

// ─── ctaButton href protocol validation ──────────────────────────────────────
// ctaButton is private, so we test through template call sites:
// - generateAbandonedCartTemplate (recoveryUrl)
// - generateStaffNotificationTemplate (adminUrl built from ORDER_ADMIN_BASE_URL / PAYLOAD_PUBLIC_SERVER_URL)

describe('ctaButton – href protocol guard (defense-in-depth)', () => {
  it('does not emit href="javascript:…" when recoveryUrl uses javascript: protocol', () => {
    const data: AbandonedCartData = {
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      cartId: 'cart-xss',
      items: [{ productTitle: 'Book', quantity: 1, unitPrice: 1000, totalPrice: 1000 }],
      subtotal: 1000,
      recoveryUrl: 'javascript:alert(1)',
    };
    const { html } = generateAbandonedCartTemplate(data);
    assert.ok(
      !html.includes('href="javascript:'),
      'ctaButton must not emit href="javascript:…" for non-http(s) URL'
    );
  });

  it('does not emit href when recoveryUrl is a data: URI', () => {
    const data: AbandonedCartData = {
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      cartId: 'cart-xss2',
      items: [{ productTitle: 'Book', quantity: 1, unitPrice: 500, totalPrice: 500 }],
      subtotal: 500,
      recoveryUrl: 'data:text/html,<script>alert(1)</script>',
    };
    const { html } = generateAbandonedCartTemplate(data);
    assert.ok(
      !html.includes('href="data:'),
      'ctaButton must not emit href="data:…" for non-http(s) URL'
    );
  });

  it('preserves a valid https recoveryUrl in the href', () => {
    const validUrl = 'https://alkebulanimages.com/cart/abc123';
    const data: AbandonedCartData = {
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      cartId: 'cart-ok',
      items: [{ productTitle: 'Book', quantity: 1, unitPrice: 1000, totalPrice: 1000 }],
      subtotal: 1000,
      recoveryUrl: validUrl,
    };
    const { html } = generateAbandonedCartTemplate(data);
    assert.ok(
      html.includes(`href="${validUrl}"`),
      'ctaButton must preserve a valid https URL in the href'
    );
  });
});

// ─── DAILY DIGEST ─────────────────────────────────────────────────────────────

describe('generateDailyDigestTemplate – XSS escaping', () => {
  const data: DailyDigestData = {
    date: 'Saturday, June 28, 2026',
    orders: [
      {
        orderNumber: 'ORD-005',
        customerName: SCRIPT_PAYLOAD,
        status: 'paid',
        totalAmount: 3000,
        itemCount: 2,
        createdAt: new Date().toISOString(),
        ageHours: 2,
      },
    ],
    totalOrderCount: 1,
    totalRevenuePending: 3000,
    adminUrl: 'http://localhost:3000/admin/order-dashboard',
  };

  it('does not leak raw <script> in customerName', () => {
    const { html } = generateDailyDigestTemplate(data);
    assertEscaped(html, '<script>', 'dailyDigest/customerName');
    assertContains(html, '&lt;script&gt;', 'dailyDigest/customerName escaped');
  });

  it('does not leak raw <script> in orderNumber', () => {
    const malicious = { ...data, orders: [{ ...data.orders[0], orderNumber: SCRIPT_PAYLOAD }] };
    const { html } = generateDailyDigestTemplate(malicious);
    assertEscaped(html, '<script>', 'dailyDigest/orderNumber');
  });
});
