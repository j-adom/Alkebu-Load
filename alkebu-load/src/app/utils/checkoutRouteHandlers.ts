import { NextResponse } from 'next/server';
import type { Payload } from 'payload';

import { getAdapter } from '@/app/lib/payments/adapters';
import { authorizeCartAccess, readCartSessionToken } from './cartAccess';
import { getCartItems, mapStoredCartItemsForTax } from './cartOperations';
import { issuedToken, readJsonBody } from './cartRouteHandlers';
import {
  buildShippingQuoteFingerprint,
  formatShippingMethodLabel,
  getShippingMethodCode,
  getShippingQuotes,
  isShippingQuoteExpired,
} from './shippingQuotes';
import { validateTaxExemptStatus } from './taxExemptValidation';
import {
  calculateTax,
  type CartItemForTax,
  type ShippingAddress,
} from './taxShippingCalculations';

// Route logic for POST /api/checkout and POST /api/checkout/preview, kept out of the
// route files so the ownership checks can be exercised without booting Payload.

const normalizeShippingAddress = (shippingAddress: Record<string, unknown>): ShippingAddress => ({
  street: typeof shippingAddress.street === 'string' ? shippingAddress.street : undefined,
  city: typeof shippingAddress.city === 'string' ? shippingAddress.city : undefined,
  state: typeof shippingAddress.state === 'string' ? shippingAddress.state.toUpperCase() : undefined,
  zip: typeof shippingAddress.zip === 'string' ? shippingAddress.zip : undefined,
  country:
    typeof shippingAddress.country === 'string' && shippingAddress.country.trim()
      ? shippingAddress.country.toUpperCase()
      : 'US',
});

export async function handleCheckout(
  payload: Payload,
  request: Request,
  deps: { getAdapter?: typeof getAdapter } = {},
): Promise<Response> {
  try {
    const body = await readJsonBody(request);

    const {
      customerEmail,
      successUrl,
      cancelUrl,
      taxExempt,
      provider = 'stripe',
      shippingAddress,
      selectedShippingRateId,
    } = body;

    // Validate required fields
    if (!body.cartId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: cartId, successUrl, cancelUrl' },
        { status: 400 }
      );
    }

    // Enforce US-only shipping with optional Tennessee tax rules downstream
    if (!shippingAddress) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
        { status: 400 }
      );
    }

    if (shippingAddress.country && shippingAddress.country.toUpperCase() !== 'US') {
      return NextResponse.json(
        { error: 'Only US shipping addresses are supported' },
        { status: 400 }
      );
    }

    const adapter = (deps.getAdapter ?? getAdapter)(provider);
    if (!adapter) {
      return NextResponse.json(
        { error: `Unsupported payment provider: ${provider}` },
        { status: 400 }
      );
    }

    // Verify the caller owns the cart (token or signed-in owner), then that it has items.
    // This runs before anything is written to the cart or sent to the provider.
    const access = await authorizeCartAccess(payload, {
      cartId: body.cartId,
      sessionToken: readCartSessionToken(request.headers, body.sessionId),
      headers: request.headers,
    });

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { cart, cartId } = access;

    const cartItems = await getCartItems(payload, cartId, 2);

    if (!cartItems.length) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    const normalizedShippingAddress = normalizeShippingAddress(shippingAddress);
    const addressIsComplete = Boolean(
      normalizedShippingAddress.street &&
      normalizedShippingAddress.city &&
      normalizedShippingAddress.state &&
      normalizedShippingAddress.zip,
    );

    if (!addressIsComplete) {
      return NextResponse.json(
        { error: 'A complete US shipping address is required' },
        { status: 400 },
      );
    }

    // Validate tax-exempt status against customer/institutional accounts
    const taxExemptValidation = await validateTaxExemptStatus(
      payload,
      typeof cart.user === 'object' && cart.user !== null ? cart.user.id : cart.user,
      !!taxExempt
    );

    const taxItems: CartItemForTax[] = mapStoredCartItemsForTax(cartItems);
    const shippingQuoteFingerprint = buildShippingQuoteFingerprint(
      taxItems,
      normalizedShippingAddress,
      taxExemptValidation.valid,
    );
    const lockedShippingRateId =
      typeof selectedShippingRateId === 'string' && selectedShippingRateId.trim()
        ? selectedShippingRateId.trim()
        : typeof (cart as any).selectedShippingRateId === 'string'
          ? (cart as any).selectedShippingRateId
          : null;
    const quoteExpiresAt =
      typeof (cart as any).shippingQuoteExpiresAt === 'string'
        ? (cart as any).shippingQuoteExpiresAt
        : (cart as any).shippingQuoteExpiresAt instanceof Date
          ? (cart as any).shippingQuoteExpiresAt.toISOString()
          : null;
    const quoteIsExpired = isShippingQuoteExpired(quoteExpiresAt);
    const cartTotalAmount = typeof cart.totalAmount === 'number' ? cart.totalAmount : null;
    const cartTaxAmount = typeof (cart as any).totalTax === 'number' ? (cart as any).totalTax : null;
    const cartShippingAmount =
      typeof (cart as any).shippingAmount === 'number' ? (cart as any).shippingAmount : null;

    if (!lockedShippingRateId) {
      return NextResponse.json(
        { error: 'Shipping quote is required. Refresh checkout pricing and try again.' },
        { status: 409 },
      );
    }

    if (
      quoteIsExpired ||
      String((cart as any).selectedShippingRateId || '') !== lockedShippingRateId ||
      String((cart as any).shippingQuoteFingerprint || '') !== shippingQuoteFingerprint ||
      cartTotalAmount === null ||
      cartTaxAmount === null ||
      cartShippingAmount === null
    ) {
      return NextResponse.json(
        { error: 'Shipping quote is stale. Refresh checkout pricing and try again.' },
        { status: 409 },
      );
    }

    // Log if tax-exempt was requested but not validated
    if (taxExempt && !taxExemptValidation.valid) {
      console.log(
        `Tax-exempt request denied for cart ${cartId}: ${taxExemptValidation.reason}`
      );
    }

    // Persist shipping details and validated tax settings on the cart before starting checkout
    await payload.update({
      collection: 'carts',
      id: cartId,
      data: {
        shippingAddress: {
          ...shippingAddress,
          state: normalizedShippingAddress.state,
          country: normalizedShippingAddress.country,
        },
        guestEmail: cart.user ? undefined : customerEmail,
        taxExempt: taxExemptValidation.valid,
        selectedShippingRateId: lockedShippingRateId,
      },
    });

    // Create checkout session via selected provider
    const { checkoutUrl, clientSecret, providerPaymentId } = await adapter.initPayment(payload, {
      cartId,
      customerEmail,
      successUrl,
      cancelUrl,
      taxExempt: taxExemptValidation.valid,
      shippingAddress,
    });

    // Persist provider metadata on cart for later reconciliation
    await payload.update({
      collection: 'carts',
      id: cartId,
      data: {
        provider,
        providerPaymentId,
      },
    });

    return NextResponse.json({
      success: true,
      provider,
      providerPaymentId,
      clientSecret,
      checkoutUrl,
      taxExempt: taxExemptValidation.valid,
      taxExemptDenied: taxExempt && !taxExemptValidation.valid
        ? taxExemptValidation.reason
        : undefined,
      ...issuedToken(access),
    });

  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}


/**
 * POST /api/checkout/preview
 *
 * Returns estimated tax, shipping, and total for a cart + shipping address
 * WITHOUT creating a Stripe session. Used by the frontend to show live
 * cost estimates as the customer fills in their address.
 */
export async function handleCheckoutPreview(
  payload: Payload,
  request: Request,
  deps: { getShippingQuotes?: typeof getShippingQuotes } = {},
): Promise<Response> {
  try {
    const body = await readJsonBody(request);

    const {
      shippingAddress,
      taxExempt = false,
      selectedShippingRateId,
    } = body;

    if (!body.cartId) {
      return NextResponse.json(
        { error: 'cartId is required' },
        { status: 400 },
      );
    }

    if (shippingAddress?.country && shippingAddress.country.toUpperCase() !== 'US') {
      return NextResponse.json(
        { error: 'Only US shipping addresses are supported' },
        { status: 400 },
      );
    }

    // Ownership first: this route overwrites the cart's address and quote and
    // can trigger paid Shippo rate calls.
    const access = await authorizeCartAccess(payload, {
      cartId: body.cartId,
      sessionToken: readCartSessionToken(request.headers, body.sessionId),
      headers: request.headers,
    });

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { cart, cartId } = access;

    // Line items: the cart.items relationship is not the source of truth for
    // active carts in this app; cart-items are.
    const cartItems = await getCartItems(payload, cartId, 2);

    if (!cartItems.length) {
      return NextResponse.json({
        subtotal: 0,
        tax: { rate: 0, amount: 0, exempt: false },
        shipping: { method: 'standard', cost: 0, estimatedDays: 0 },
        shippingOptions: [],
        selectedShippingRateId: null,
        quoteExpiresAt: null,
        total: 0,
        taxExempt: false,
        ...issuedToken(access),
      });
    }

    const taxExemptValidation = await validateTaxExemptStatus(
      payload,
      typeof cart.user === 'object' && cart.user !== null ? cart.user.id : cart.user,
      !!taxExempt,
    );

    // Map cart items to the format expected by calculateOrderTotals
    const taxItems: CartItemForTax[] = mapStoredCartItemsForTax(cartItems);

    const address: ShippingAddress | null = shippingAddress
      ? {
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zip: shippingAddress.zip,
        country: shippingAddress.country || 'US',
      }
      : null;

    const subtotal = taxItems.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice),
      0,
    );

    const addressIsComplete =
      address !== null &&
      Boolean(address.street && address.city && address.state && address.zip);

    if (!addressIsComplete || address === null) {
      return NextResponse.json({
        subtotal,
        tax: { rate: 0, amount: 0, exempt: false },
        shipping: { method: 'standard', cost: 0, estimatedDays: 0 },
        shippingOptions: [],
        selectedShippingRateId: null,
        quoteExpiresAt: null,
        total: subtotal,
        taxExempt: taxExemptValidation.valid,
        taxExemptDenied: taxExempt && !taxExemptValidation.valid
          ? taxExemptValidation.reason
          : undefined,
        ...issuedToken(access),
      });
    }

    const quote = await (deps.getShippingQuotes ?? getShippingQuotes)({
      items: taxItems,
      shippingAddress: address,
      subtotal,
      selectedShippingRateId,
    });
    const tax = calculateTax(taxItems, address, taxExemptValidation.valid);
    const total = subtotal + tax.amount + quote.selectedOption.amount;
    const shippingMethod = getShippingMethodCode(quote.selectedOption);
    const shippingFingerprint = buildShippingQuoteFingerprint(
      taxItems,
      address,
      taxExemptValidation.valid,
    );

    await payload.update({
      collection: 'carts',
      id: cartId,
      data: {
        shippingAddress,
        taxExempt: taxExemptValidation.valid,
        totalAmount: total,
        totalTax: tax.amount,
        shippingAmount: quote.selectedOption.amount,
        selectedShippingRateId: quote.selectedShippingRateId,
        shippingCarrier: quote.selectedOption.carrier,
        shippingService: quote.selectedOption.service,
        shippingMethod,
        shippingQuoteSource: quote.quoteSource,
        shippingQuoteExpiresAt: quote.quoteExpiresAt,
        shippingQuoteFingerprint: shippingFingerprint,
        shippingEstimatedDays: quote.selectedOption.estimatedDays,
      },
    });

    return NextResponse.json({
      subtotal,
      tax,
      shipping: {
        method: shippingMethod,
        label: formatShippingMethodLabel(quote.selectedOption),
        cost: quote.selectedOption.amount,
        estimatedDays: quote.selectedOption.estimatedDays,
        carrier: quote.selectedOption.carrier,
        service: quote.selectedOption.service,
        isMediaMail: quote.selectedOption.isMediaMail,
      },
      shippingOptions: quote.shippingOptions,
      selectedShippingRateId: quote.selectedShippingRateId,
      quoteExpiresAt: quote.quoteExpiresAt,
      total,
      taxExempt: taxExemptValidation.valid,
      taxExemptDenied: taxExempt && !taxExemptValidation.valid
        ? taxExemptValidation.reason
        : undefined,
      ...issuedToken(access),
    });
  } catch (error) {
    console.error('Checkout preview error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate checkout preview' },
      { status: 500 },
    );
  }
}
