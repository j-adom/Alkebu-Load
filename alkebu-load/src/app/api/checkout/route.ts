import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getAdapter } from '@/app/lib/payments/adapters';

/**
 * Validate tax-exempt status against customer/institutional account
 * Returns validated tax-exempt status (true only if verified)
 */
async function validateTaxExemptStatus(
  payload: any,
  userId: number | string | null | undefined,
  requestedTaxExempt: boolean
): Promise<{ valid: boolean; reason?: string }> {
  // If not requesting tax-exempt, no validation needed
  if (!requestedTaxExempt) {
    return { valid: false };
  }

  // Guest users cannot claim tax-exempt status
  if (!userId) {
    return { valid: false, reason: 'Guest users cannot claim tax-exempt status' };
  }

  // Look up customer record
  const customers = await payload.find({
    collection: 'customers',
    where: {
      id: { equals: userId },
    },
    depth: 2,
  });

  if (!customers.docs.length) {
    return { valid: false, reason: 'Customer account not found' };
  }

  const customer = customers.docs[0];

  // Check if customer has tax-exempt status
  if (!customer.accountStatus?.taxExempt) {
    return { valid: false, reason: 'Customer is not marked as tax-exempt' };
  }

  // If linked to an institutional account, verify it's active and verified
  if (customer.accountStatus?.institution) {
    const institution = typeof customer.accountStatus.institution === 'object'
      ? customer.accountStatus.institution
      : await payload.findByID({
        collection: 'institutional-accounts',
        id: customer.accountStatus.institution,
      });

    if (!institution) {
      return { valid: false, reason: 'Linked institutional account not found' };
    }

    if (institution.status !== 'active') {
      return { valid: false, reason: 'Institutional account is not active' };
    }

    if (!institution.taxInfo?.taxExempt) {
      return { valid: false, reason: 'Institutional account is not tax-exempt' };
    }

    // Check if exemption is still valid
    if (institution.taxInfo?.exemptionValidUntil) {
      const expirationDate = new Date(institution.taxInfo.exemptionValidUntil);
      if (expirationDate < new Date()) {
        return { valid: false, reason: 'Tax exemption has expired' };
      }
    }
  }

  return { valid: true };
}

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

    // Validate tax-exempt status against customer/institutional accounts
    const taxExemptValidation = await validateTaxExemptStatus(
      payload,
      typeof cart.user === 'object' && cart.user !== null ? cart.user.id : cart.user,
      !!taxExempt
    );

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
        shippingAddress,
        guestEmail: cart.user ? undefined : customerEmail,
        taxExempt: taxExemptValidation.valid,
      },
    });

    // Create checkout session via selected provider
    const { checkoutUrl, clientSecret, providerPaymentId } = await adapter.initPayment(payload, {
      cartId,
      customerEmail,
      successUrl,
      cancelUrl,
      taxExempt,
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
