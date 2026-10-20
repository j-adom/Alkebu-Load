import assert from 'node:assert';
import test from 'node:test';

import {
  CART_SESSION_HEADER,
  authorizeCartAccess,
  generateCartSessionToken,
  isCurrentCartSessionToken,
} from '../../src/app/utils/cartAccess';
import {
  handleCartAdd,
  handleCartClear,
  handleCartRecoveryGet,
  handleCartRecoveryPost,
  handleCartRemove,
  handleCartSummary,
  handleCartUpdate,
} from '../../src/app/utils/cartRouteHandlers';
import {
  handleCheckout,
  handleCheckoutPreview,
} from '../../src/app/utils/checkoutRouteHandlers';

/**
 * Cart IDs are sequential, so a bare cartId must never be enough to read or
 * change a cart. These tests drive the real route handlers against an in-memory
 * Payload: the owner (cart token or signed-in owner) gets through, everyone
 * else gets 403/404 and the cart is left untouched.
 */

type Doc = Record<string, any>;

const matches = (doc: Doc, where: any): boolean => {
  if (!where) return true;
  if (Array.isArray(where.and)) return where.and.every((w: any) => matches(doc, w));
  if (Array.isArray(where.or)) return where.or.some((w: any) => matches(doc, w));
  return Object.entries(where).every(([field, cond]: [string, any]) => {
    const raw = doc[field];
    const value = raw && typeof raw === 'object' && 'id' in raw ? raw.id : raw;
    if ('equals' in cond) return String(value) === String(cond.equals);
    if ('in' in cond) return cond.in.map(String).includes(String(value));
    if ('exists' in cond) return cond.exists ? value != null : value == null;
    throw new Error(`Unsupported where on ${field}: ${JSON.stringify(cond)}`);
  });
};

function makePayload() {
  const db: Record<string, Doc[]> = {
    carts: [],
    'cart-items': [],
    books: [{ id: 'book_1', title: 'The Souls of Black Folk', price: 1500 }],
    users: [
      { id: 'user_1', role: 'customer' },
      { id: 'user_2', role: 'customer' },
    ],
  };
  const jwtUsers: Record<string, Doc> = { 'jwt-user-1': db.users[0], 'jwt-user-2': db.users[1] };
  let nextId = 100;
  const calls: { shippo: number; providerInit: any[] } = { shippo: 0, providerInit: [] };

  const table = (collection: string) => {
    if (!db[collection]) db[collection] = [];
    return db[collection];
  };
  const notFound = () => Object.assign(new Error('Not Found'), { status: 404 });

  // Reads return copies, as a real database does.
  const populate = (doc: Doc, depth = 0): Doc => {
    const out = { ...doc };
    if (!depth) return out;
    if (out.cart !== undefined && typeof out.cart !== 'object') {
      out.cart = table('carts').find((c) => String(c.id) === String(out.cart)) ?? out.cart;
    }
    if (out.product?.relationTo) {
      out.product = {
        relationTo: out.product.relationTo,
        value: table(out.product.relationTo).find((p) => String(p.id) === String(out.product.value)),
      };
    }
    return out;
  };

  const api: any = {
    auth: async ({ headers }: { headers: Headers }) => {
      const match = /^JWT (.+)$/.exec(headers.get('authorization') ?? '');
      return { user: match ? jwtUsers[match[1]] ?? null : null };
    },
    findByID: async ({ collection, id, depth }: any) => {
      const doc = table(collection).find((d) => String(d.id) === String(id));
      if (!doc) throw notFound();
      return populate(doc, depth);
    },
    find: async ({ collection, where, depth, sort }: any) => {
      let docs = table(collection).filter((d) => matches(d, where));
      if (sort === '-updatedAt') {
        docs = [...docs].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      }
      return { docs: docs.map((d) => populate(d, depth)), totalDocs: docs.length };
    },
    create: async ({ collection, data }: any) => {
      const now = new Date().toISOString();
      const doc = { id: nextId++, createdAt: now, updatedAt: now, ...data };
      table(collection).push(doc);
      return doc;
    },
    update: async ({ collection, id, where, data }: any) => {
      const targets =
        id !== undefined
          ? table(collection).filter((d) => String(d.id) === String(id))
          : table(collection).filter((d) => matches(d, where));
      if (id !== undefined && !targets.length) throw notFound();
      for (const doc of targets) Object.assign(doc, data, { updatedAt: new Date().toISOString() });
      return id !== undefined ? targets[0] : { docs: targets, errors: [] };
    },
    delete: async ({ collection, id }: any) => {
      const rows = table(collection);
      const idx = rows.findIndex((d) => String(d.id) === String(id));
      if (idx === -1) throw notFound();
      return rows.splice(idx, 1)[0];
    },
  };

  const deps = {
    getShippingQuotes: async () => {
      calls.shippo += 1;
      const option = {
        id: 'rate_media',
        carrier: 'USPS',
        service: 'Media Mail',
        amount: 499,
        estimatedDays: 5,
        isDefault: true,
        isMediaMail: true,
        method: 'media_mail',
      };
      return {
        shippingOptions: [option],
        selectedShippingRateId: option.id,
        selectedOption: option,
        quoteExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        quoteSource: 'shippo' as const,
      };
    },
    getAdapter: (slug: string) =>
      slug === 'stripe'
        ? ({
            slug: 'stripe',
            initPayment: async (_payload: unknown, params: any) => {
              calls.providerInit.push(params);
              return {
                checkoutUrl: 'https://checkout.stripe.test/c/pay/cs_test_1',
                providerPaymentId: 'cs_test_1',
              };
            },
          } as any)
        : undefined,
  };

  return { api, db, calls, deps };
}

const BASE = 'https://payload.test';

const request = (
  method: string,
  path: string,
  opts: { body?: unknown; token?: string; jwt?: string } = {},
) => {
  const headers = new Headers();
  if (opts.body !== undefined) headers.set('content-type', 'application/json');
  if (opts.token) headers.set(CART_SESSION_HEADER, opts.token);
  if (opts.jwt) headers.set('authorization', `JWT ${opts.jwt}`);
  return new Request(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
};

const ADDRESS = {
  firstName: 'Ada',
  lastName: 'Guest',
  street: '2721 Jefferson St',
  city: 'Nashville',
  state: 'TN',
  zip: '37208',
  country: 'US',
};

/** Seed a guest cart through the real add handler; returns its id + token. */
async function seedGuestCart(env: ReturnType<typeof makePayload>) {
  const res = await handleCartAdd(
    env.api,
    request('POST', '/api/cart/add', { body: { productId: 'book_1', productType: 'books', quantity: 1 } }),
  );
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(isCurrentCartSessionToken(data.sessionId), 'new carts get a strong token');
  const cart = env.db.carts.find((c) => String(c.id) === String(data.cartId))!;
  cart.guestEmail = 'owner@example.com';
  const itemId = String(env.db['cart-items'].find((i) => String(i.cart) === String(cart.id))!.id);
  return { cartId: String(data.cartId), token: data.sessionId as string, itemId, cart };
}

const wrongTokens = (cartId: string) => [
  { label: 'no token', opts: {} },
  { label: 'a wrong token', opts: { token: generateCartSessionToken() } },
  { label: 'the cart id as the token', opts: { token: cartId } },
  { label: 'a different signed-in user', opts: { jwt: 'jwt-user-2' } },
];

const assertDenied = async (res: Response, label: string) => {
  assert.ok([403, 404].includes(res.status), `${label}: expected 403/404, got ${res.status}`);
  const body = await res.json();
  assert.ok(!('cart' in body && body.cart?.items), `${label}: must not return cart contents`);
  assert.ok(!('sessionId' in body), `${label}: must not return a token`);
};

test('tokens: new tokens are prefixed 32-byte random values', () => {
  const a = generateCartSessionToken();
  const b = generateCartSessionToken();
  assert.ok(isCurrentCartSessionToken(a));
  assert.notStrictEqual(a, b);
  assert.ok(!isCurrentCartSessionToken('a'.repeat(32)), 'legacy hex tokens are not current');
  assert.ok(!isCurrentCartSessionToken('42'));
});

test('summary: bare cartId, wrong token, or another user is refused and leaks nothing', async () => {
  const env = makePayload();
  const { cartId } = await seedGuestCart(env);

  for (const { label, opts } of wrongTokens(cartId)) {
    await assertDenied(
      await handleCartSummary(env.api, request('GET', `/api/cart/summary?cartId=${cartId}`, opts)),
      label,
    );
  }

  // The old unauthenticated lookup by userId is gone.
  const byUser = await handleCartSummary(env.api, request('GET', '/api/cart/summary?userId=user_1'));
  assert.strictEqual(byUser.status, 404);
});

test('summary: the token holder gets the cart, without the token or parent cart echoed back', async () => {
  const env = makePayload();
  const { cartId, token } = await seedGuestCart(env);

  for (const path of [`/api/cart/summary?cartId=${cartId}`, '/api/cart/summary']) {
    const res = await handleCartSummary(env.api, request('GET', path, { token }));
    assert.strictEqual(res.status, 200, path);
    const body = await res.json();
    assert.strictEqual(body.cartId, cartId);
    assert.strictEqual(body.cart.itemCount, 1);
    assert.ok(!('sessionId' in body), 'a lookup never returns the token');
    assert.doesNotMatch(JSON.stringify(body), new RegExp(token), 'token appears nowhere in the body');
    assert.doesNotMatch(JSON.stringify(body), /owner@example\.com/, 'parent cart PII is not embedded');
  }
});

test('add: cannot add to someone else\'s cart; a fresh cart is started instead', async () => {
  const env = makePayload();
  const victim = await seedGuestCart(env);

  for (const { label, opts } of wrongTokens(victim.cartId)) {
    const res = await handleCartAdd(
      env.api,
      request('POST', '/api/cart/add', {
        ...opts,
        body: { productId: 'book_1', productType: 'books', quantity: 3, cartId: victim.cartId },
      }),
    );
    assert.strictEqual(res.status, 200, label);
    const body = await res.json();
    assert.notStrictEqual(body.cartId, victim.cartId, `${label}: must not land in the victim cart`);
    assert.ok(isCurrentCartSessionToken(body.sessionId));
    assert.notStrictEqual(body.sessionId, victim.token);
  }

  const victimItems = env.db['cart-items'].filter((i) => String(i.cart) === victim.cartId);
  assert.deepStrictEqual(victimItems.map((i) => i.quantity), [1], 'victim cart untouched');
});

test('add: the token holder adds to their own cart and is not issued a new token', async () => {
  const env = makePayload();
  const { cartId, token } = await seedGuestCart(env);

  const res = await handleCartAdd(
    env.api,
    request('POST', '/api/cart/add', {
      token,
      body: { productId: 'book_1', productType: 'books', quantity: 2, cartId },
    }),
  );
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.cartId, cartId);
  assert.strictEqual(body.cart.itemCount, 3);
  assert.ok(!('sessionId' in body));
});

test('add: a client-chosen token is never adopted for a new cart', async () => {
  const env = makePayload();
  const chosen = generateCartSessionToken();
  const res = await handleCartAdd(
    env.api,
    request('POST', '/api/cart/add', {
      token: chosen,
      body: { productId: 'book_1', productType: 'books', quantity: 1 },
    }),
  );
  const body = await res.json();
  assert.notStrictEqual(body.sessionId, chosen);
  assert.ok(isCurrentCartSessionToken(body.sessionId));
});

test('update / remove / clear: wrong or missing token is refused and the cart is untouched', async () => {
  const env = makePayload();
  const { cartId, itemId } = await seedGuestCart(env);

  for (const { label, opts } of wrongTokens(cartId)) {
    await assertDenied(
      await handleCartUpdate(
        env.api,
        request('POST', '/api/cart/update', { ...opts, body: { cartId, cartItemId: itemId, quantity: 9 } }),
      ),
      `update with ${label}`,
    );
    await assertDenied(
      await handleCartRemove(
        env.api,
        request('DELETE', '/api/cart/remove', { ...opts, body: { cartId, cartItemId: itemId } }),
      ),
      `remove with ${label}`,
    );
    await assertDenied(
      await handleCartClear(env.api, request('POST', '/api/cart/clear', { ...opts, body: { cartId } })),
      `clear with ${label}`,
    );
  }

  const items = env.db['cart-items'].filter((i) => String(i.cart) === cartId);
  assert.deepStrictEqual(items.map((i) => i.quantity), [1]);
});

test('update / remove / clear: the token holder can change their cart', async () => {
  const env = makePayload();
  const { cartId, token, itemId } = await seedGuestCart(env);

  const updated = await handleCartUpdate(
    env.api,
    request('POST', '/api/cart/update', { token, body: { cartId, cartItemId: itemId, quantity: 4 } }),
  );
  assert.strictEqual(updated.status, 200);
  assert.strictEqual((await updated.json()).cart.itemCount, 4);

  const removed = await handleCartRemove(
    env.api,
    request('DELETE', '/api/cart/remove', { token, body: { cartId, cartItemId: itemId } }),
  );
  assert.strictEqual(removed.status, 200);
  assert.strictEqual((await removed.json()).cart.itemCount, 0);

  await seedGuestCart(env); // unrelated cart must survive the clear below
  const cleared = await handleCartClear(env.api, request('POST', '/api/cart/clear', { token, body: { cartId } }));
  assert.strictEqual(cleared.status, 200);
  assert.strictEqual(env.db['cart-items'].length, 1);
});

test('cart-recovery: GET reactivation and POST email rewrite require ownership', async () => {
  const env = makePayload();
  const { cartId, token, cart } = await seedGuestCart(env);
  cart.status = 'abandoned';

  for (const { label, opts } of wrongTokens(cartId)) {
    await assertDenied(
      await handleCartRecoveryGet(env.api, request('GET', `/api/cart-recovery?cart_id=${cartId}`, opts)),
      `recovery GET with ${label}`,
    );
    await assertDenied(
      await handleCartRecoveryPost(
        env.api,
        request('POST', '/api/cart-recovery', { ...opts, body: { cartId, email: 'attacker@example.com' } }),
      ),
      `recovery POST with ${label}`,
    );
  }
  assert.strictEqual(cart.status, 'abandoned');
  assert.strictEqual(cart.guestEmail, 'owner@example.com', 'recovery email not redirected');

  const reactivated = await handleCartRecoveryGet(
    env.api,
    request('GET', `/api/cart-recovery?cart_id=${cartId}`, { token }),
  );
  assert.strictEqual(reactivated.status, 200);
  const body = await reactivated.json();
  assert.strictEqual(body.cart.items[0].cart, cart.id, 'items carry the cart id, not the cart');
  assert.strictEqual(cart.status, 'active');

  const emailed = await handleCartRecoveryPost(
    env.api,
    request('POST', '/api/cart-recovery', { token, body: { cartId, email: 'new@example.com' } }),
  );
  assert.strictEqual(emailed.status, 200);
  assert.strictEqual(cart.guestEmail, 'new@example.com');
});

test('checkout preview: refused before any address write or Shippo call', async () => {
  const env = makePayload();
  const { cartId, cart } = await seedGuestCart(env);

  for (const { label, opts } of wrongTokens(cartId)) {
    await assertDenied(
      await handleCheckoutPreview(
        env.api,
        request('POST', '/api/checkout/preview', { ...opts, body: { cartId, shippingAddress: ADDRESS } }),
        env.deps,
      ),
      `preview with ${label}`,
    );
  }
  assert.strictEqual(env.calls.shippo, 0, 'no paid rate calls for non-owners');
  assert.strictEqual(cart.shippingAddress, undefined, 'address not overwritten');
});

test('checkout: refused before the cart is rewritten or a payment session is created', async () => {
  const env = makePayload();
  const { cartId, token, cart } = await seedGuestCart(env);

  // Owner locks a quote first so the only thing standing in the way is ownership.
  const preview = await handleCheckoutPreview(
    env.api,
    request('POST', '/api/checkout/preview', { token, body: { cartId, shippingAddress: ADDRESS } }),
    env.deps,
  );
  assert.strictEqual(preview.status, 200);
  const { selectedShippingRateId } = await preview.json();

  for (const { label, opts } of wrongTokens(cartId)) {
    await assertDenied(
      await handleCheckout(
        env.api,
        request('POST', '/api/checkout', {
          ...opts,
          body: {
            cartId,
            customerEmail: 'attacker@example.com',
            successUrl: 'https://alkebulanimages.test/checkout/success',
            cancelUrl: 'https://alkebulanimages.test/checkout/cancel',
            shippingAddress: { ...ADDRESS, street: '1 Attacker Way' },
            selectedShippingRateId,
          },
        }),
        env.deps,
      ),
      `checkout with ${label}`,
    );
  }
  assert.strictEqual(env.calls.providerInit.length, 0);
  assert.strictEqual(cart.guestEmail, 'owner@example.com');
  assert.strictEqual(cart.shippingAddress.street, ADDRESS.street);
});

test('checkout: happy path — the token holder previews then checks out', async () => {
  const env = makePayload();
  const { cartId, token, cart } = await seedGuestCart(env);

  const preview = await handleCheckoutPreview(
    env.api,
    request('POST', '/api/checkout/preview', { token, body: { cartId, shippingAddress: ADDRESS } }),
    env.deps,
  );
  assert.strictEqual(preview.status, 200);
  const quote = await preview.json();
  assert.strictEqual(quote.shipping.cost, 499);
  assert.strictEqual(env.calls.shippo, 1);

  const res = await handleCheckout(
    env.api,
    request('POST', '/api/checkout', {
      token,
      body: {
        cartId,
        customerEmail: 'owner@example.com',
        successUrl: 'https://alkebulanimages.test/checkout/success',
        cancelUrl: 'https://alkebulanimages.test/checkout/cancel',
        shippingAddress: ADDRESS,
        selectedShippingRateId: quote.selectedShippingRateId,
      },
    }),
    env.deps,
  );
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.checkoutUrl, 'https://checkout.stripe.test/c/pay/cs_test_1');
  assert.strictEqual(env.calls.providerInit.length, 1);
  assert.strictEqual(String(env.calls.providerInit[0].cartId), cartId);
  assert.strictEqual(cart.providerPaymentId, 'cs_test_1');
});

test('signed-in owner: a user-owned cart opens with their auth, not with a token or another login', async () => {
  const env = makePayload();
  const { cartId, token, cart } = await seedGuestCart(env);
  cart.user = 'user_1';

  const asOwner = await handleCartSummary(env.api, request('GET', '/api/cart/summary', { jwt: 'jwt-user-1' }));
  assert.strictEqual(asOwner.status, 200);
  assert.strictEqual((await asOwner.json()).cartId, cartId);

  const added = await handleCartAdd(
    env.api,
    request('POST', '/api/cart/add', {
      jwt: 'jwt-user-1',
      body: { productId: 'book_1', productType: 'books', quantity: 1 },
    }),
  );
  assert.strictEqual((await added.json()).cartId, cartId, 'owner adds to their open cart');

  for (const opts of [{ token }, { jwt: 'jwt-user-2' }, {}]) {
    const res = await handleCartSummary(
      env.api,
      request('GET', `/api/cart/summary?cartId=${cartId}`, opts),
    );
    assert.strictEqual(res.status, 403, JSON.stringify(opts));
  }
});

test('migration: a legacy token is honoured once, rotated, and then dead', async () => {
  const env = makePayload();
  const { cartId, cart } = await seedGuestCart(env);
  const legacy = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'; // the old randomUUID-hex format
  cart.sessionId = legacy;

  const first = await handleCartSummary(env.api, request('GET', '/api/cart/summary', { token: legacy }));
  assert.strictEqual(first.status, 200, 'the cookie holder is not stranded');
  const { sessionId: rotated, cartId: foundId } = await first.json();
  assert.strictEqual(foundId, cartId);
  assert.ok(isCurrentCartSessionToken(rotated), 'a strong token is issued');
  assert.strictEqual(cart.sessionId, rotated);

  const replay = await handleCartSummary(
    env.api,
    request('GET', `/api/cart/summary?cartId=${cartId}`, { token: legacy }),
  );
  assert.strictEqual(replay.status, 403, 'the old token no longer works');

  const next = await handleCartSummary(env.api, request('GET', '/api/cart/summary', { token: rotated }));
  assert.strictEqual(next.status, 200);
  assert.ok(!('sessionId' in (await next.json())), 'no further rotation');
});

test('migration: rotation can happen on any route, e.g. the first touch is a checkout preview', async () => {
  const env = makePayload();
  const { cartId, cart } = await seedGuestCart(env);
  cart.sessionId = 'f'.repeat(32);

  const res = await handleCheckoutPreview(
    env.api,
    request('POST', '/api/checkout/preview', { token: 'f'.repeat(32), body: { cartId, shippingAddress: ADDRESS } }),
    env.deps,
  );
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(isCurrentCartSessionToken(body.sessionId));
  assert.strictEqual(cart.sessionId, body.sessionId);
});

test('migration: short legacy tokens need the cart id, and stale legacy carts are not revived', async () => {
  const env = makePayload();
  const { cartId, cart } = await seedGuestCart(env);
  cart.sessionId = '42'; // carts once took an older cart id as their sessionId

  const tokenOnly = await handleCartSummary(env.api, request('GET', '/api/cart/summary', { token: '42' }));
  assert.strictEqual(tokenOnly.status, 404, 'guessable tokens cannot be used to search');

  const withId = await authorizeCartAccess(env.api, {
    cartId,
    sessionToken: '42',
    headers: new Headers(),
    now: Date.parse(cart.lastActivity ?? cart.updatedAt) + 31 * 24 * 60 * 60 * 1000,
  });
  assert.deepStrictEqual(withId.ok ? 'granted' : withId.status, 403, 'idle past the cookie lifetime');

  const fresh = await handleCartSummary(
    env.api,
    request('GET', `/api/cart/summary?cartId=${cartId}`, { token: '42' }),
  );
  assert.strictEqual(fresh.status, 200);
  assert.ok(isCurrentCartSessionToken((await fresh.json()).sessionId));
});

test('migration: concurrent first touches do not mint two different tokens', async () => {
  const env = makePayload();
  const { cartId, cart } = await seedGuestCart(env);
  const legacy = 'b'.repeat(32);
  cart.sessionId = legacy;

  const [a, b] = await Promise.all([
    authorizeCartAccess(env.api, { cartId, sessionToken: legacy, headers: new Headers() }),
    authorizeCartAccess(env.api, { cartId, sessionToken: legacy, headers: new Headers() }),
  ]);
  assert.ok(a.ok && b.ok, 'both in-flight requests succeed');
  const issued = [a, b].map((r) => (r.ok ? r.issuedSessionId : undefined)).filter(Boolean);
  assert.strictEqual(issued.length, 1, 'exactly one token issued');
  assert.strictEqual(cart.sessionId, issued[0]);
});
