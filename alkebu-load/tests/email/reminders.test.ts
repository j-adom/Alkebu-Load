import assert from 'node:assert';
import test from 'node:test';

process.env.PAYLOAD_SECRET ||= 'test-secret-for-signed-links';

import { createSignedToken, verifySignedToken } from '../../src/app/utils/signedLinks';
import {
  buildCartRecoveryUrl,
  buildUnsubscribeLinks,
  listUnsubscribeHeaders,
  verifyCartRecoveryToken,
  verifyUnsubscribeToken,
} from '../../src/app/utils/marketingEmail';
import { remindAbandonedCart } from '../../src/app/utils/cartOperations';
import { decideQuoteFollowup, MAX_QUOTE_FOLLOWUPS } from '../../src/app/utils/quoteRequestSystem';
import { handleCartRecoveryClaim } from '../../src/app/utils/cartRouteHandlers';
import { handleUnsubscribe } from '../../src/app/utils/unsubscribeHandler';
import {
  generateAbandonedCartTemplate,
  generateQuoteFollowupTemplate,
} from '../../src/app/utils/emailTemplates';

const DAY = 24 * 60 * 60 * 1000;

// ─── Signed links ─────────────────────────────────────────────────────────────

test('signed tokens round-trip and reject tampering, expiry and the wrong purpose', () => {
  const now = Date.now();
  const token = createSignedToken('cart-recovery', '123', DAY, now);
  assert.strictEqual(verifySignedToken('cart-recovery', token, now), '123');

  assert.strictEqual(verifySignedToken('unsubscribe', token, now), null, 'purpose is bound');
  assert.strictEqual(verifySignedToken('cart-recovery', token, now + DAY + 1), null, 'expires');

  const [subject, expires, signature] = token.split('.');
  const otherSubject = Buffer.from('124').toString('base64url');
  assert.strictEqual(verifySignedToken('cart-recovery', `${otherSubject}.${expires}.${signature}`, now), null);
  assert.strictEqual(verifySignedToken('cart-recovery', `${subject}.${Number(expires) + 1}.${signature}`, now), null);
  for (const junk of [undefined, '', 'a.b', 'a.b.c', 42, 'x'.repeat(2000)]) {
    assert.strictEqual(verifySignedToken('cart-recovery', junk, now), null);
  }
});

test('recovery and unsubscribe links point at the storefront with verifiable tokens', () => {
  const recovery = new URL(buildCartRecoveryUrl(55));
  assert.strictEqual(recovery.pathname, '/cart/recover');
  assert.strictEqual(verifyCartRecoveryToken(recovery.searchParams.get('t')), '55');

  const { pageUrl, oneClickUrl } = buildUnsubscribeLinks(' Ada@Example.com ');
  assert.strictEqual(new URL(pageUrl).pathname, '/unsubscribe');
  assert.strictEqual(verifyUnsubscribeToken(new URL(pageUrl).searchParams.get('t')), 'ada@example.com');
  assert.strictEqual(new URL(oneClickUrl).pathname, '/api/email/unsubscribe');

  const headers = listUnsubscribeHeaders('ada@example.com');
  assert.match(headers['List-Unsubscribe'], /^<https:\/\/.+\/api\/email\/unsubscribe\?t=.+>$/);
  assert.strictEqual(headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
});

// ─── Abandoned cart reminders ────────────────────────────────────────────────

const item = { productTitle: 'Kindred', quantity: 2, unitPrice: 1800 };

function reminderDeps(overrides: Partial<Parameters<typeof remindAbandonedCart>[1]> = {}) {
  const calls = { sent: [] as any[], marked: [] as Array<[string, boolean]> };
  const deps: Parameters<typeof remindAbandonedCart>[1] = {
    getItems: async () => [item],
    isSuppressed: async () => false,
    hasOrderSince: async () => false,
    send: async (data) => { calls.sent.push(data); return { success: true }; },
    markAbandoned: async (cartId, emailSent) => { calls.marked.push([cartId, emailSent]); },
    buildRecoveryUrl: (cartId) => `https://alkebulanimages.com/cart/recover?t=${cartId}`,
    buildUnsubscribe: () => ({ pageUrl: 'https://alkebulanimages.com/unsubscribe?t=u', headers: { 'List-Unsubscribe': '<x>' } }),
    ...overrides,
  };
  return { deps, calls };
}

const guestCart = { id: 9, guestEmail: 'ada@example.com', lastActivity: new Date().toISOString(), shippingAddress: { firstName: 'Ada' } };

test('a guest cart left at checkout gets one reminder with a recovery link and unsubscribe', async () => {
  const { deps, calls } = reminderDeps();
  assert.strictEqual(await remindAbandonedCart({ ...guestCart, status: 'checkout' }, deps), 'sent');
  assert.strictEqual(calls.sent.length, 1);
  assert.strictEqual(calls.sent[0].customerName, 'Ada');
  assert.strictEqual(calls.sent[0].subtotal, 3600);
  assert.match(calls.sent[0].recoveryUrl, /\/cart\/recover\?t=9$/);
  assert.ok(calls.sent[0].unsubscribeUrl);
  assert.deepStrictEqual(calls.marked, [['9', true]]);
});

test('reminders are skipped for opt-outs, recent orders, signed-in carts and carts without email', async () => {
  const cases: Array<[string, any, Partial<Parameters<typeof remindAbandonedCart>[1]>]> = [
    ['suppressed', guestCart, { isSuppressed: async () => true }],
    ['already-ordered', guestCart, { hasOrderSince: async () => true }],
    ['signed-in', { ...guestCart, user: 4 }, {}],
    ['no-email', { ...guestCart, guestEmail: '' }, {}],
    ['empty', guestCart, { getItems: async () => [] }],
  ];
  for (const [expected, cart, overrides] of cases) {
    const { deps, calls } = reminderDeps(overrides);
    assert.strictEqual(await remindAbandonedCart(cart, deps), expected);
    assert.strictEqual(calls.sent.length, 0, `${expected}: nothing sent`);
  }
});

test('a failed send leaves the cart untouched so the next run retries', async () => {
  const { deps, calls } = reminderDeps({ send: async () => ({ success: false }) });
  assert.strictEqual(await remindAbandonedCart(guestCart, deps), 'failed');
  assert.deepStrictEqual(calls.marked, []);
});

test('the reminder makes no reservation or availability promises and links to unsubscribe', () => {
  const { html, text, subject } = generateAbandonedCartTemplate({
    customerEmail: 'ada@example.com',
    cartId: '9',
    items: [{ productTitle: 'Incense', quantity: 1, unitPrice: 800, totalPrice: 800 }],
    subtotal: 800,
    recoveryUrl: 'https://alkebulanimages.com/cart/recover?t=abc',
    unsubscribeUrl: 'https://alkebulanimages.com/unsubscribe?t=def',
  });
  for (const body of [html, text]) {
    assert.ok(!/reserved/i.test(body), 'no "reserved" claim');
    assert.ok(!/still available/i.test(body), 'no availability claim');
    assert.ok(body.includes('https://alkebulanimages.com/unsubscribe?t=def'));
  }
  assert.ok(!/books/i.test(subject), 'subject does not assume the cart holds books');
});

// ─── Quote follow-ups ────────────────────────────────────────────────────────

test('quote follow-ups stop after the cap or once the quote expires, and wait a week between sends', () => {
  const now = Date.now();
  const base = { quote: { validUntil: new Date(now + 10 * DAY).toISOString() }, communications: [] as any[] };

  assert.strictEqual(decideQuoteFollowup(base, now), 'send');
  assert.strictEqual(decideQuoteFollowup({ ...base, quote: { validUntil: new Date(now - DAY).toISOString() } }, now), 'expired');
  assert.strictEqual(decideQuoteFollowup({ ...base, lastFollowup: new Date(now - 2 * DAY).toISOString() }, now), 'too-soon');
  const sentMax = Array.from({ length: MAX_QUOTE_FOLLOWUPS }, () => ({ type: 'followup-email' }));
  assert.strictEqual(decideQuoteFollowup({ ...base, communications: sentMax }, now), 'limit-reached');
  assert.strictEqual(
    decideQuoteFollowup({ ...base, communications: [{ type: 'quote-sent' }, { type: 'customer-response' }] }, now),
    'send',
    'only follow-up emails count toward the cap',
  );
});

test('the quote follow-up shows the quote and how to order', () => {
  const { html, text } = generateQuoteFollowupTemplate({
    customerName: 'Ada',
    customerEmail: 'ada@example.com',
    bookTitle: 'The Destruction of Black Civilization',
    author: 'Chancellor Williams',
    quantity: 3,
    pricePerBook: 24.95,
    totalPrice: 74.85,
    validUntil: '2026-12-01T12:00:00.000Z',
    unsubscribeUrl: 'https://alkebulanimages.com/unsubscribe?t=z',
  });
  for (const body of [html, text]) {
    assert.ok(body.includes('$24.95') && body.includes('$74.85'));
    assert.ok(body.includes('December 1, 2026'));
    assert.ok(/reply to this email/i.test(body));
    assert.ok(!body.includes('Alkebulanimages Team'), 'brand name spelled correctly');
  }
});

// ─── Recovery claim + unsubscribe endpoints ──────────────────────────────────

function fakeCartsPayload(cart: Record<string, any> | null) {
  const updates: any[] = [];
  const payload: any = {
    findByID: async () => { if (!cart) throw new Error('not found'); return cart; },
    update: async (args: any) => { updates.push(args); return { ...cart, ...args.data }; },
  };
  return { payload, updates };
}

const claim = (payload: any, token: unknown) =>
  handleCartRecoveryClaim(payload, new Request('http://x/api/cart-recovery/claim', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }),
  }));

test('a valid recovery link reactivates the guest cart and returns its session token', async () => {
  const sessionId = 'ct_' + 'a'.repeat(43);
  const { payload, updates } = fakeCartsPayload({ id: 9, status: 'abandoned', sessionId });
  const token = new URL(buildCartRecoveryUrl(9)).searchParams.get('t');

  const response = await claim(payload, token);
  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { success: true, cartId: '9', sessionId });
  assert.strictEqual(updates[0].data.status, 'active');
  assert.strictEqual(updates[0].data.sessionId, undefined, 'current token is reused, not rotated');
});

test('a legacy cart token is replaced when the cart is recovered', async () => {
  const { payload, updates } = fakeCartsPayload({ id: 9, status: 'checkout', sessionId: '12345' });
  const response = await claim(payload, new URL(buildCartRecoveryUrl(9)).searchParams.get('t'));
  const body = await response.json();
  assert.match(body.sessionId, /^ct_/);
  assert.strictEqual(updates[0].data.sessionId, body.sessionId);
});

test('recovery refuses forged links, purchased carts and account carts', async () => {
  const forged = createSignedToken('unsubscribe', '9', DAY);
  assert.strictEqual((await claim(fakeCartsPayload({ id: 9, status: 'abandoned' }).payload, forged)).status, 410);
  assert.strictEqual((await claim(fakeCartsPayload({ id: 9, status: 'abandoned' }).payload, 'nope')).status, 410);

  const token = new URL(buildCartRecoveryUrl(9)).searchParams.get('t');
  assert.strictEqual((await claim(fakeCartsPayload({ id: 9, status: 'converted' }).payload, token)).status, 410);
  assert.strictEqual((await claim(fakeCartsPayload(null).payload, token)).status, 410);
  assert.strictEqual((await claim(fakeCartsPayload({ id: 9, status: 'abandoned', user: 3 }).payload, token)).status, 409);
});

test('unsubscribe accepts the storefront JSON call and the mail-client one-click POST', async () => {
  const customers: any[] = [];
  const payload: any = {
    find: async () => ({ docs: customers.slice(0, 1) }),
    create: async ({ data }: any) => { customers.push({ id: 1, ...data }); return customers[0]; },
    update: async ({ data }: any) => { Object.assign(customers[0], data); return customers[0]; },
  };
  const { pageUrl, oneClickUrl } = buildUnsubscribeLinks('ada@example.com');
  const token = new URL(pageUrl).searchParams.get('t');

  const viaPage = await handleUnsubscribe(payload, new Request('http://x/api/email/unsubscribe', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }),
  }));
  assert.strictEqual(viaPage.status, 200);
  assert.strictEqual(customers[0].email, 'ada@example.com');
  assert.strictEqual(customers[0].preferences.marketingEmails, false);
  assert.strictEqual(customers[0].lifecycleStatus, 'ghost');

  const oneClick = await handleUnsubscribe(payload, new Request(oneClickUrl, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click',
  }));
  assert.strictEqual(oneClick.status, 200);
  assert.strictEqual(customers.length, 1, 'no duplicate customer');

  const bad = await handleUnsubscribe(payload, new Request('http://x/api/email/unsubscribe?t=forged', { method: 'POST' }));
  assert.strictEqual(bad.status, 400);
});
