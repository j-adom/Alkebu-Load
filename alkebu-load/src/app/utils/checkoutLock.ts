import type { Payload } from 'payload';

import { expireOpenCheckoutSession } from './stripeHelpers';

/**
 * A cart with an open Stripe Checkout session is locked: the session was priced
 * from the cart as it stood, and the webhook builds the order from the cart when
 * that session is paid. Letting the cart change while the session stays payable
 * means the customer can pay the old amount for the new contents.
 *
 * Every route that changes a cart (items, address, quote, or a new checkout)
 * calls `releaseCheckoutLock` first. It expires the open session in Stripe, so
 * the old payment page can no longer be paid, and only then lets the change
 * through. If the session has already been paid the cart must not change at all.
 */

export type CheckoutLockRelease =
  | { released: true }
  | { released: false; reason: 'paid' | 'unavailable' };

export type CheckoutLockDeps = {
  expireSession?: typeof expireOpenCheckoutSession;
};

const CLOSED_STATUSES = new Set(['converted', 'expired']);

export async function releaseCheckoutLock(
  payload: Payload,
  cart: { id: string | number; status?: string | null; stripeSessionId?: string | null } | null | undefined,
  deps: CheckoutLockDeps = {},
): Promise<CheckoutLockRelease> {
  const sessionId = typeof cart?.stripeSessionId === 'string' ? cart.stripeSessionId.trim() : '';

  // No Stripe session was ever opened (or it was already released). Closed carts
  // are handled by the callers' own status checks.
  if (!cart || !sessionId || CLOSED_STATUSES.has(String(cart.status))) {
    return { released: true };
  }

  let outcome: 'expired' | 'paid';
  try {
    outcome = await (deps.expireSession ?? expireOpenCheckoutSession)(sessionId);
  } catch (error) {
    // Fail closed: if Stripe can't confirm the session is dead, it may still be payable.
    console.error(`Could not release checkout lock for cart ${cart.id} (session ${sessionId}):`, error);
    return { released: false, reason: 'unavailable' };
  }

  if (outcome === 'paid') return { released: false, reason: 'paid' };

  await payload.update({
    collection: 'carts',
    id: cart.id,
    data: {
      status: cart.status === 'checkout' ? 'active' : cart.status,
      stripeSessionId: null,
    } as any,
  });

  return { released: true };
}

export const CHECKOUT_LOCK_ERRORS = {
  paid: {
    status: 409,
    code: 'cart_paid',
    error: 'This cart has already been paid for. Your order is being processed.',
  },
  unavailable: {
    status: 503,
    code: 'checkout_lock_unavailable',
    error: 'A payment page is still open for this cart and we could not close it. Please try again in a moment.',
  },
} as const;

export const checkoutLockResponse = (result: Extract<CheckoutLockRelease, { released: false }>) => {
  const { status, code, error } = CHECKOUT_LOCK_ERRORS[result.reason];
  return Response.json({ success: false, error, code }, { status });
};
