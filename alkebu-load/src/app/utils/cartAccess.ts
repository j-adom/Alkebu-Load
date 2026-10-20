import { randomBytes, timingSafeEqual } from 'crypto';
import type { Payload } from 'payload';

/**
 * Cart ownership.
 *
 * Cart IDs are sequential integers, so a cart ID is a selector, never proof of
 * ownership. Every cart and checkout route must establish ownership with either:
 *   - the cart's secret session token (`sessionId` on the cart), sent by the
 *     storefront proxy in the `x-cart-session` header from its httpOnly cookie, or
 *   - an authenticated Payload user who owns the cart (`cart.user`).
 *
 * The token is only ever returned to a caller that just proved ownership AND
 * needs a new one (cart created, or a legacy token rotated). Lookups never echo it.
 */

export const CART_SESSION_HEADER = 'x-cart-session';

const CURRENT_TOKEN_PREFIX = 'ct_';
const CURRENT_TOKEN_PATTERN = /^ct_[A-Za-z0-9_-]{43}$/;

// Token-only lookups (no cartId) are refused for short legacy tokens: some old
// carts were created with a numeric cart ID as their sessionId, which is guessable.
const MIN_LOOKUP_TOKEN_LENGTH = 32;

// Legacy tokens are honoured (and rotated) only on carts touched within the
// storefront cookie's lifetime; older carts cannot have a live cookie anyway.
const LEGACY_TOKEN_MAX_IDLE_MS = 30 * 24 * 60 * 60 * 1000;

const LOOKUP_STATUSES = ['active', 'checkout', 'abandoned'];

export function generateCartSessionToken(): string {
  return `${CURRENT_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
}

/**
 * Tokens minted before ownership checks existed were either guessable (numeric
 * cart IDs, `user_<id>_<timestamp>`) or exposed by `GET /api/cart/summary?cartId=N`,
 * so every token without the current prefix is treated as legacy and rotated.
 */
export function isCurrentCartSessionToken(value: unknown): value is string {
  return typeof value === 'string' && CURRENT_TOKEN_PATTERN.test(value);
}

const normalizeString = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const relationId = (value: unknown): string | null => {
  if (value && typeof value === 'object' && 'id' in value) {
    return normalizeString((value as { id: unknown }).id);
  }
  return normalizeString(value);
};

const tokensMatch = (provided: string, stored: string): boolean => {
  const a = Buffer.from(provided);
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * The cart token from the proxy header, falling back to a `sessionId` field in
 * the body or query (used by direct API callers and the pre-header storefront).
 */
export function readCartSessionToken(
  headers: Headers,
  fallback?: unknown,
): string | null {
  return normalizeString(headers.get(CART_SESSION_HEADER)) ?? normalizeString(fallback);
}

export async function getRequestUser(
  payload: Payload,
  headers: Headers,
): Promise<{ id: string | number } | null> {
  try {
    const { user } = await payload.auth({ headers });
    return user && (user as { id?: unknown }).id !== undefined ? (user as any) : null;
  } catch {
    return null;
  }
}

export type CartAccessGranted = {
  ok: true;
  cart: any;
  cartId: string;
  via: 'session' | 'user';
  /** Set only when a new token was issued; the caller must hand it to the holder. */
  issuedSessionId?: string;
};

export type CartAccessDenied = {
  ok: false;
  status: 403 | 404;
  error: string;
};

export type CartAccessResult = CartAccessGranted | CartAccessDenied;

const deny = (status: CartAccessDenied['status'], error: string): CartAccessDenied => ({
  ok: false,
  status,
  error,
});

const NOT_YOURS = 'You do not have access to this cart';

async function findCartById(payload: Payload, cartId: string): Promise<any | null> {
  try {
    return (await payload.findByID({ collection: 'carts', id: cartId, depth: 0 })) ?? null;
  } catch {
    return null;
  }
}

async function findLatestCart(payload: Payload, where: Record<string, unknown>): Promise<any | null> {
  const result = await payload.find({
    collection: 'carts',
    where: { and: [where, { status: { in: LOOKUP_STATUSES } }] } as any,
    sort: '-updatedAt',
    limit: 1,
    depth: 0,
  });
  return result.docs[0] ?? null;
}

const legacyTokenIsUsable = (cart: any, now: number): boolean => {
  const lastTouched = Date.parse(String(cart.lastActivity ?? cart.updatedAt ?? ''));
  return Number.isFinite(lastTouched) && now - lastTouched <= LEGACY_TOKEN_MAX_IDLE_MS;
};

/**
 * Replace a legacy token. The update is conditional on the old token so two
 * concurrent requests from the same browser don't mint two different tokens;
 * the loser is still granted (it held the valid token a moment ago) but gets
 * no new token, so it cannot overwrite the winner's cookie.
 */
async function rotateLegacyToken(
  payload: Payload,
  cart: any,
  oldToken: string,
): Promise<string | undefined> {
  const nextToken = generateCartSessionToken();
  const result = await payload.update({
    collection: 'carts',
    where: {
      and: [{ id: { equals: cart.id } }, { sessionId: { equals: oldToken } }],
    },
    data: { sessionId: nextToken },
  } as any);
  return (result as any)?.docs?.length ? nextToken : undefined;
}

async function checkOwnership(
  payload: Payload,
  cart: any,
  token: string | null,
  user: { id: string | number } | null,
  now: number,
): Promise<CartAccessResult> {
  const cartId = String(cart.id);
  const ownerId = relationId(cart.user);

  if (ownerId !== null) {
    return user && String(user.id) === ownerId
      ? { ok: true, cart, cartId, via: 'user' }
      : deny(403, NOT_YOURS);
  }

  const stored = normalizeString(cart.sessionId);
  if (!token || !stored || !tokensMatch(token, stored)) {
    return deny(403, NOT_YOURS);
  }

  if (isCurrentCartSessionToken(stored)) {
    return { ok: true, cart, cartId, via: 'session' };
  }

  if (!legacyTokenIsUsable(cart, now)) {
    return deny(403, NOT_YOURS);
  }

  const issuedSessionId = await rotateLegacyToken(payload, cart, stored);
  return {
    ok: true,
    cart: issuedSessionId ? { ...cart, sessionId: issuedSessionId } : cart,
    cartId,
    via: 'session',
    issuedSessionId,
  };
}

export async function authorizeCartAccess(
  payload: Payload,
  args: {
    cartId?: unknown;
    sessionToken?: string | null;
    headers: Headers;
    now?: number;
  },
): Promise<CartAccessResult> {
  const now = args.now ?? Date.now();
  const cartId = normalizeString(args.cartId);
  const token = normalizeString(args.sessionToken);
  const user = await getRequestUser(payload, args.headers);

  if (cartId) {
    const cart = await findCartById(payload, cartId);
    if (!cart) return deny(404, 'Cart not found');
    return checkOwnership(payload, cart, token, user, now);
  }

  // No cartId: the token or the signed-in user identifies the cart.
  if (token && token.length >= MIN_LOOKUP_TOKEN_LENGTH) {
    const cart = await findLatestCart(payload, { sessionId: { equals: token } });
    if (cart) return checkOwnership(payload, cart, token, user, now);
  }

  if (user) {
    const cart = await findLatestCart(payload, { user: { equals: user.id } });
    if (cart) return { ok: true, cart, cartId: String(cart.id), via: 'user' };
  }

  return deny(404, 'Cart not found');
}
