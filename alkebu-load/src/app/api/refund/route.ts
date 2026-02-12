import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});

/**
 * Authenticate request and return user with role check
 */
async function authenticateRequest(
  request: NextRequest,
  allowedRoles: string[]
): Promise<{ user: any; payload: any } | NextResponse> {
  const payload = await getPayload({ config });

  const { user } = await payload.auth({ headers: request.headers });

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (!allowedRoles.includes((user as any).role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  return { user, payload };
}

/**
 * POST /api/refund
 *
 * Create a refund for an order. Supports full or partial refunds.
 * Requires admin role.
 *
 * Request body:
 * - orderId: string (required) - The Payload order ID
 * - amount: number (optional) - Amount in cents to refund. If not provided, refunds the full remaining amount.
 * - reason: string (required) - Reason for the refund
 *
 * Response:
 * - success: boolean
 * - refundId: string - Stripe refund ID
 * - amount: number - Amount refunded in cents
 */
export async function POST(request: NextRequest) {
  try {
    // Admin-only access for processing refunds
    const authResult = await authenticateRequest(request, ['admin']);
    if (authResult instanceof NextResponse) return authResult;
    const { user, payload } = authResult;

    const body = await request.json();

    const { orderId, amount, reason } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Refund reason is required' },
        { status: 400 }
      );
    }

    // Get order
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 1,
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify order has a Stripe payment
    const paymentIntentId = order.payment?.stripePaymentIntentId;
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Order does not have a Stripe payment intent' },
        { status: 400 }
      );
    }

    // Check if payment was successful
    if (order.payment?.paymentStatus !== 'succeeded') {
      return NextResponse.json(
        { error: 'Cannot refund an order that has not been paid' },
        { status: 400 }
      );
    }

    // Calculate already refunded amount
    const existingRefunds = order.refunds || [];
    const alreadyRefunded = existingRefunds.reduce(
      (sum: number, refund: any) => sum + (refund.amount || 0),
      0
    );

    // Determine refund amount
    const maxRefundable = order.totalAmount - alreadyRefunded;
    const refundAmount = amount ? Math.min(amount, maxRefundable) : maxRefundable;

    if (refundAmount <= 0) {
      return NextResponse.json(
        { error: 'No refundable amount remaining' },
        { status: 400 }
      );
    }

    // Create Stripe refund
    let stripeRefund: Stripe.Refund;
    try {
      stripeRefund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: refundAmount,
        reason: 'requested_by_customer',
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason,
          processedBy: user.id,
        },
      });
    } catch (stripeError: any) {
      console.error('Stripe refund error:', stripeError);
      return NextResponse.json(
        { error: `Stripe refund failed: ${stripeError.message}` },
        { status: 500 }
      );
    }

    // Record refund in order with processedBy
    const newRefund = {
      amount: refundAmount,
      reason,
      stripeRefundId: stripeRefund.id,
      processedBy: user.id,
      processedAt: new Date().toISOString(),
    };

    const updatedRefunds = [...existingRefunds, newRefund];
    const totalRefunded = alreadyRefunded + refundAmount;
    const isFullyRefunded = totalRefunded >= order.totalAmount;

    // Update order
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        refunds: updatedRefunds,
        'payment.paymentStatus': isFullyRefunded ? 'refunded' : 'succeeded',
        status: isFullyRefunded ? 'returned' : order.status,
      },
    });

    console.log(
      `Refund processed by ${user.email}: ${stripeRefund.id} for order ${order.orderNumber}, amount: $${(refundAmount / 100).toFixed(2)}`
    );

    return NextResponse.json({
      success: true,
      refundId: stripeRefund.id,
      amount: refundAmount,
      totalRefunded,
      remainingAmount: order.totalAmount - totalRefunded,
      isFullyRefunded,
    });

  } catch (error) {
    console.error('Refund API error:', error);
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/refund?orderId=...
 *
 * Get refund status for an order.
 * Requires admin or staff role.
 */
export async function GET(request: NextRequest) {
  try {
    // Admin and staff can view refund status
    const authResult = await authenticateRequest(request, ['admin', 'staff']);
    if (authResult instanceof NextResponse) return authResult;
    const { payload } = authResult;

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const refunds = order.refunds || [];
    const totalRefunded = refunds.reduce(
      (sum: number, refund: any) => sum + (refund.amount || 0),
      0
    );

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      totalRefunded,
      remainingAmount: order.totalAmount - totalRefunded,
      isFullyRefunded: totalRefunded >= order.totalAmount,
      refunds: refunds.map((refund: any) => ({
        amount: refund.amount,
        reason: refund.reason,
        stripeRefundId: refund.stripeRefundId,
        processedBy: refund.processedBy,
        processedAt: refund.processedAt,
      })),
    });

  } catch (error) {
    console.error('Refund status API error:', error);
    return NextResponse.json(
      { error: 'Failed to get refund status' },
      { status: 500 }
    );
  }
}
