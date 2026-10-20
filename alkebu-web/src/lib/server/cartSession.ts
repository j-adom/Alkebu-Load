import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getPayloadAuthHeader } from '$lib/server/payloadEnv';

/**
 * The guest cart's secret token lives only in an httpOnly cookie and is sent to
 * Payload in the `x-cart-session` header. Payload checks it (or the signed-in
 * user) on every cart and checkout route; the numeric cart ID is just a selector.
 * Browser code never sees the token.
 */
export const CART_SESSION_COOKIE = 'cart_session';
const CART_SESSION_HEADER = 'x-cart-session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const cookieOptions = {
  path: '/',
  httpOnly: true,
  secure: !dev,
  sameSite: 'lax' as const,
};

export const getCartSessionToken = (cookies: Cookies): string | undefined =>
  cookies.get(CART_SESSION_COOKIE) || undefined;

/**
 * Headers for a Payload cart/checkout call: the cart token, plus the shopper's
 * own Payload login (so Payload can verify ownership of a user's cart).
 */
export function cartRequestHeaders(
  cookies: Cookies,
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = { ...getPayloadAuthHeader(), ...extra };
  const userToken = cookies.get('payload-token');
  if (userToken) {
    headers.Authorization = `JWT ${userToken}`;
  }
  const cartToken = getCartSessionToken(cookies);
  if (cartToken) {
    headers[CART_SESSION_HEADER] = cartToken;
  }
  return headers;
}

const depopulateItems = (cart: any) => {
  if (!cart || !Array.isArray(cart.items)) return cart;
  return {
    ...cart,
    items: cart.items.map((item: any) =>
      item?.cart && typeof item.cart === 'object' ? { ...item, cart: item.cart.id } : item,
    ),
  };
};

/**
 * Move a token Payload just issued (new cart or rotated legacy token) into the
 * httpOnly cookie, and return the response body with every copy of it removed.
 */
export function takeCartSession(cookies: Cookies, data: any, responseOk: boolean): any {
  if (!data || typeof data !== 'object') return data;

  const { sessionId, ...rest } = data;
  if (responseOk && typeof sessionId === 'string' && sessionId) {
    cookies.set(CART_SESSION_COOKIE, sessionId, { ...cookieOptions, maxAge: COOKIE_MAX_AGE });
  }

  if (rest.cart) rest.cart = depopulateItems(rest.cart);
  return depopulateItems(rest);
}

export function clearCartSession(cookies: Cookies): void {
  cookies.delete(CART_SESSION_COOKIE, cookieOptions);
}

/** Drop any client-supplied identity fields; identity comes from cookies only. */
export function withoutClientIdentity<T extends Record<string, any>>(body: T): T {
  const { sessionId: _sessionId, userId: _userId, ...rest } = body ?? {};
  return rest as T;
}
