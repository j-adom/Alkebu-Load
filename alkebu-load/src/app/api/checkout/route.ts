import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { handleCheckout } from '@/app/utils/checkoutRouteHandlers';

// Ownership (cart token or signed-in owner) is enforced in handleCheckout.
export async function POST(request: NextRequest) {
  return handleCheckout(await getPayload({ config }), request);
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
