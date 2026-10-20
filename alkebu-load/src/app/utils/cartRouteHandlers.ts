import type { Payload } from 'payload';

import {
  authorizeCartAccess,
  generateCartSessionToken,
  readCartSessionToken,
  type CartAccessGranted,
  type CartAccessResult,
} from './cartAccess';
import {
  addToCart,
  clearCart,
  getCartItems,
  getCartSummary,
  removeFromCart,
  updateCartItemQuantity,
  type CartItem,
} from './cartOperations';

// Route logic for /api/cart/* and /api/cart-recovery, kept out of the route files
// so the ownership checks can be exercised without booting Payload.

export const readJsonBody = async (request: Request): Promise<Record<string, any>> => {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
};

export const accessDeniedResponse = (access: Exclude<CartAccessResult, CartAccessGranted>) =>
  Response.json({ success: false, error: access.error }, { status: access.status });

/** Hand a newly issued token back to the holder (the storefront moves it into an httpOnly cookie). */
export const issuedToken = (access: CartAccessGranted) =>
  access.issuedSessionId ? { sessionId: access.issuedSessionId } : {};

const CLOSED_CART_STATUSES = new Set(['converted', 'expired']);

const authorizeFromBody = (payload: Payload, request: Request, body: Record<string, any>) =>
  authorizeCartAccess(payload, {
    cartId: body.cartId,
    sessionToken: readCartSessionToken(request.headers, body.sessionId),
    headers: request.headers,
  });

const summaryResponse = async (
  payload: Payload,
  cartId: string,
  issuedSessionId?: string,
) => {
  const summary = await getCartSummary(payload, cartId);

  if (!summary) {
    return Response.json(
      { success: false, error: 'Unable to load cart summary' },
      { status: 500 },
    );
  }

  return Response.json({
    success: true,
    cart: summary,
    cartId,
    ...(issuedSessionId ? { sessionId: issuedSessionId } : {}),
  });
};

export async function handleCartSummary(payload: Payload, request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const access = await authorizeCartAccess(payload, {
      cartId: searchParams.get('cartId'),
      sessionToken: readCartSessionToken(request.headers, searchParams.get('sessionId')),
      headers: request.headers,
    });

    if (!access.ok) return accessDeniedResponse(access);

    return summaryResponse(payload, access.cartId, access.issuedSessionId);
  } catch (error) {
    console.error('Cart summary API error:', error);
    return Response.json(
      { success: false, error: 'Failed to load cart summary' },
      { status: 500 },
    );
  }
}

export async function handleCartAdd(payload: Payload, request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const {
      productId,
      productType = 'books',
      quantity = 1,
      customization,
    } = body;

    if (!productId || !productType) {
      return Response.json(
        { success: false, error: 'productId and productType are required' },
        { status: 400 },
      );
    }

    // Resolves from cartId, the cart token, or the signed-in owner's open cart.
    const access = await authorizeFromBody(payload, request, body);
    const owned =
      access.ok && !CLOSED_CART_STATUSES.has(String(access.cart?.status)) ? access : null;

    // A cart the caller can't prove they own (or one that no longer exists or
    // already checked out) is never touched; adding starts a fresh cart with a
    // fresh token instead. The token is always minted here, never adopted from
    // the request.
    const targetCartId = owned ? owned.cartId : '';
    const newCartToken = owned ? undefined : generateCartSessionToken();

    const item: CartItem = {
      productId,
      productType,
      quantity,
      customization,
    };

    const result = await addToCart(payload, targetCartId, item, newCartToken);

    if (!result.success || !result.cartItem) {
      return Response.json(
        {
          success: false,
          error: result.error || 'Unable to add item to cart',
        },
        { status: 400 },
      );
    }

    const createdCartId =
      typeof result.cartItem.cart === 'object' && result.cartItem.cart !== null
        ? result.cartItem.cart.id
        : result.cartItem.cart;

    if (!createdCartId) {
      return Response.json(
        { success: false, error: 'Cart identifier missing after add' },
        { status: 500 },
      );
    }

    return summaryResponse(
      payload,
      String(createdCartId),
      owned ? owned.issuedSessionId : newCartToken,
    );
  } catch (error) {
    console.error('Cart add API error:', error);
    return Response.json(
      { success: false, error: 'Failed to add item to cart' },
      { status: 500 },
    );
  }
}

export async function handleCartUpdate(payload: Payload, request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const { cartItemId, quantity } = body;

    if (!cartItemId || typeof quantity !== 'number') {
      return Response.json(
        {
          success: false,
          error: 'cartItemId and quantity are required',
        },
        { status: 400 },
      );
    }

    const access = await authorizeFromBody(payload, request, body);
    if (!access.ok) return accessDeniedResponse(access);

    const result = await updateCartItemQuantity(payload, access.cartId, cartItemId, quantity);

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error || 'Failed to update item' },
        { status: 400 },
      );
    }

    return summaryResponse(payload, access.cartId, access.issuedSessionId);
  } catch (error) {
    console.error('Cart update API error:', error);
    return Response.json(
      { success: false, error: 'Failed to update cart item' },
      { status: 500 },
    );
  }
}

export async function handleCartRemove(payload: Payload, request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const { cartItemId } = body;

    if (!cartItemId) {
      return Response.json(
        { success: false, error: 'cartItemId is required' },
        { status: 400 },
      );
    }

    const access = await authorizeFromBody(payload, request, body);
    if (!access.ok) return accessDeniedResponse(access);

    const result = await removeFromCart(payload, access.cartId, cartItemId);

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error || 'Failed to remove item' },
        { status: 400 },
      );
    }

    return summaryResponse(payload, access.cartId, access.issuedSessionId);
  } catch (error) {
    console.error('Cart remove API error:', error);
    return Response.json(
      { success: false, error: 'Failed to remove cart item' },
      { status: 500 },
    );
  }
}

export async function handleCartClear(payload: Payload, request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const access = await authorizeFromBody(payload, request, body);
    if (!access.ok) return accessDeniedResponse(access);

    const result = await clearCart(payload, access.cartId);

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error || 'Failed to clear cart' },
        { status: 400 },
      );
    }

    return summaryResponse(payload, access.cartId, access.issuedSessionId);
  } catch (error) {
    console.error('Cart clear API error:', error);
    return Response.json(
      { success: false, error: 'Failed to clear cart' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cart-recovery?cart_id=N — reactivate the caller's own abandoned cart.
 */
export async function handleCartRecoveryGet(payload: Payload, request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const cartId = searchParams.get('cart_id');

    if (!cartId) {
      return Response.json({ error: 'Cart ID required' }, { status: 400 });
    }

    const access = await authorizeCartAccess(payload, {
      cartId,
      sessionToken: readCartSessionToken(request.headers, searchParams.get('sessionId')),
      headers: request.headers,
    });
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });

    // Only allow recovery of abandoned carts
    if (access.cart.status !== 'abandoned') {
      return Response.json(
        { error: 'Cart is not available for recovery' },
        { status: 400 },
      );
    }

    const items = await getCartItems(payload, access.cartId, 2);

    const reactivatedCart = await payload.update({
      collection: 'carts',
      id: access.cartId,
      data: {
        status: 'active',
        lastActivity: new Date().toISOString(),
      },
    });

    return Response.json({
      success: true,
      cart: {
        id: reactivatedCart.id,
        itemCount: items.length,
        totalAmount: reactivatedCart.totalAmount,
        // Never echo the populated parent cart (guestEmail, shippingAddress, token) on each item.
        items: items.map(({ cart: itemCart, ...item }) => ({
          ...item,
          cart: typeof itemCart === 'object' && itemCart !== null ? itemCart.id : itemCart,
        })),
      },
      ...issuedToken(access),
    });
  } catch (error) {
    console.error('Cart recovery API error:', error);
    return Response.json({ error: 'Failed to recover cart' }, { status: 500 });
  }
}

/**
 * POST /api/cart-recovery — set the guest email used for abandoned-cart recovery
 * on the caller's own cart.
 */
export async function handleCartRecoveryPost(payload: Payload, request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    const { cartId, email } = body;

    if (!cartId || !email) {
      return Response.json(
        { error: 'Cart ID and email are required' },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || !emailRegex.test(email)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const access = await authorizeFromBody(payload, request, body);
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });

    await payload.update({
      collection: 'carts',
      id: access.cartId,
      data: {
        guestEmail: email,
        lastActivity: new Date().toISOString(),
      },
    });

    return Response.json({
      success: true,
      message: 'Email updated for cart recovery',
      ...issuedToken(access),
    });
  } catch (error) {
    console.error('Cart recovery email update error:', error);
    return Response.json(
      { error: 'Failed to update cart email' },
      { status: 500 },
    );
  }
}
