import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getAdapter } from '@/app/lib/payments/adapters';
import {
  buildShippingQuoteFingerprint,
  isShippingQuoteExpired,
} from '@/app/utils/shippingQuotes';
import { validateTaxExemptStatus } from '@/app/utils/taxExemptValidation';
import type { CartItemForTax, ShippingAddress } from '@/app/utils/taxShippingCalculations';

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

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const body = await request.json();

    const {
      cartId,
      customerEmail,
      successUrl,
      cancelUrl,
      taxExempt,
      provider = 'stripe',
      shippingAddress,
      selectedShippingRateId,
    } = body;

    // Validate required fields
    if (!cartId || !successUrl || !cancelUrl) {
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

    const adapter = getAdapter(provider);
    if (!adapter) {
      return NextResponse.json(
        { error: `Unsupported payment provider: ${provider}` },
        { status: 400 }
      );
    }

    // Verify cart exists and has items
    const cart = await payload.findByID({
      collection: 'carts',
      id: cartId,
      depth: 2,
    });

    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    if (!cart.items || cart.items.length === 0) {
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

    const taxItems: CartItemForTax[] = (cart.items as any[]).map((item) => ({
      product: typeof item.product === 'object' ? item.product : { pricing: {} },
      productType: item.productType,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
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
    });

  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // Find cart by session ID
    const carts = await payload.find({
      collection: 'carts',
      where: {
        stripeSessionId: {
          equals: sessionId,
        },
      },
    });

    if (!carts.docs.length) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const cart = carts.docs[0];

    // Check if order was created
    const orders = await payload.find({
      collection: 'orders',
      where: {
        'payment.stripeSessionId': {
          equals: sessionId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      cartStatus: cart.status,
      orderCreated: orders.docs.length > 0,
      orderNumber: orders.docs[0]?.orderNumber,
    });

  } catch (error) {
    console.error('Checkout status API error:', error);
    return NextResponse.json(
      { error: 'Failed to check checkout status' },
      { status: 500 }
    );
  }
}
