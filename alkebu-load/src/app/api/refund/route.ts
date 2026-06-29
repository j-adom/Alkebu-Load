import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import Stripe from 'stripe';
import { buildRefundPlan, type RefundRequest } from '@/app/utils/refundCalculations';
import { sendRefundNotification } from '@/app/utils/emailService';

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return _stripe;
}

/**
 * Order items store `product` as a polymorphic relationship `{ relationTo, value }`.
 * Depth 1 populates `value` into the full doc; depth 0 leaves it as the id.
 * These helpers normalize both shapes.
 */
function unwrapProduct(rel: any): any {
  if (rel && typeof rel === 'object' && 'value' in rel) return rel.value;
  return rel;
}

function resolveProductId(rel: any): string | number | undefined {
  const value = unwrapProduct(rel);
  if (value && typeof value === 'object') return value.id;
  return value;
}

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
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    if (!body.reason) {
      return NextResponse.json({ error: 'Refund reason is required' }, { status: 400 });
    }

    // Get order (depth 1 so item.product is populated for shipping-weight math)
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 1,
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Stripe-only in v1. Non-Stripe orders are refunded at the register.
    const paymentIntentId = order.payment?.stripePaymentIntentId;
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'This order was not paid via Stripe and cannot be refunded here' },
        { status: 400 }
      );
    }

    // A second partial refund leaves status at partially_refunded, so allow both.
    const payStatus = order.payment?.paymentStatus;
    if (payStatus !== 'succeeded' && payStatus !== 'partially_refunded') {
      return NextResponse.json(
        { error: 'Cannot refund an order that has not been paid' },
        { status: 400 }
      );
    }

    // All validation + money decisions happen in the pure, unit-tested planner.
    // Unwrap each item's polymorphic product so shipping-weight resolution sees
    // the populated doc (pricing/editions) rather than the { relationTo, value } wrapper.
    const orderForPlan = {
      ...order,
      items: (order.items || []).map((item: any) => ({
        ...item,
        product: unwrapProduct(item.product),
      })),
    };
    const refundRequest: RefundRequest = {
      items: body.items,
      reason: body.reason,
      note: body.note,
      amountOverride: body.amountOverride,
      restock: body.restock,
      markOutOfPrint: body.markOutOfPrint,
    };
    const plan = buildRefundPlan(orderForPlan as any, refundRequest);
    if (!plan.ok) {
      return NextResponse.json({ error: plan.error }, { status: plan.status });
    }

    const existingRefunds = order.refunds || [];
    const alreadyRefunded = existingRefunds.reduce(
      (sum: number, r: any) => sum + (r.amount || 0),
      0
    );

    // Record-before-charge safety: an idempotency key keyed on the pre-refund
    // state collapses accidental double-submits while still allowing a deliberate
    // *sequential* partial refund (alreadyRefunded changes once the first persists).
    const selectionKey = plan.itemUpdates
      .map((u) => `${u.itemId}:${u.refundedQuantity}`)
      .sort()
      .join(',');
    const idempotencyKey = `refund_${order.id}_${alreadyRefunded}_${plan.amount}_${selectionKey}`;

    let stripeRefund: Stripe.Refund;
    try {
      stripeRefund = await getStripe().refunds.create(
        {
          payment_intent: paymentIntentId,
          amount: plan.amount,
          reason: 'requested_by_customer',
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            reason: plan.reason,
            processedBy: user.id,
          },
        },
        { idempotencyKey }
      );
    } catch (stripeError: any) {
      console.error('Stripe refund error:', stripeError);
      return NextResponse.json(
        { error: `Stripe refund failed: ${stripeError.message}` },
        { status: 500 }
      );
    }

    // Persist: append the refund record, apply per-line refundedQuantity/doNotShip,
    // and move payment/order status. (Stripe has already succeeded by here.)
    const newRefund = {
      amount: plan.amount,
      reason: plan.reason,
      note: body.note,
      items: plan.refundedItems,
      restock: !!body.restock,
      stripeRefundId: stripeRefund.id,
      processedBy: user.id,
      processedAt: new Date().toISOString(),
    };

    // Re-read at depth 0 so each item's `product` stays in `{ relationTo, value: id }`
    // form. Rewriting the array with depth-1 populated docs would corrupt the relation.
    const rawOrder = await payload.findByID({ collection: 'orders', id: orderId, depth: 0 });
    const updatesById = new Map(plan.itemUpdates.map((u) => [u.itemId, u]));
    const updatedItems = (rawOrder.items || []).map((item: any) => {
      const u = updatesById.get(item.id);
      return u ? { ...item, refundedQuantity: u.refundedQuantity, doNotShip: u.doNotShip } : item;
    });

    const updateData: any = {
      refunds: [...existingRefunds, newRefund],
      items: updatedItems,
      'payment.paymentStatus': plan.paymentStatus,
    };
    if (plan.newOrderStatus) {
      updateData.status = plan.newOrderStatus;
    }

    await payload.update({ collection: 'orders', id: orderId, data: updateData });

    // Optional restock — off by default (out-of-print items must NOT return to stock).
    if (body.restock) {
      for (const ri of plan.refundedItems) {
        const item = (order.items || []).find((i: any) => i.id === ri.itemId);
        if (!item) continue;
        try {
          const productId = resolveProductId(item.product);
          if (!productId) continue;
          const product = await payload.findByID({ collection: item.productType, id: productId });
          if (product?.inventory?.trackQuantity) {
            await payload.update({
              collection: item.productType,
              id: productId,
              data: { 'inventory.stockLevel': (product.inventory.stockLevel || 0) + ri.quantity },
            });
          }
        } catch (e) {
          console.error(`Restock failed for ${ri.productTitle}:`, e);
        }
      }
    }

    // Optional close-the-loop: mark refunded book titles discontinued so they stop selling.
    if (body.markOutOfPrint) {
      for (const ri of plan.refundedItems) {
        const item = (order.items || []).find((i: any) => i.id === ri.itemId);
        if (!item || item.productType !== 'books') continue;
        try {
          const productId = resolveProductId(item.product);
          if (!productId) continue;
          await payload.update({
            collection: 'books',
            id: productId,
            data: { availabilityStatus: 'discontinued' },
          });
        } catch (e) {
          console.error(`Mark-out-of-print failed for ${ri.productTitle}:`, e);
        }
      }
    }

    // Customer email — best-effort. Failure here does NOT reverse the refund.
    const customerEmail = order.guestEmail || (order.customer as any)?.email;
    if (customerEmail) {
      const customerName =
        [order.shippingAddress?.firstName, order.shippingAddress?.lastName]
          .filter(Boolean)
          .join(' ') || 'Customer';
      try {
        const emailResult = await sendRefundNotification({
          orderNumber: order.orderNumber,
          customerName,
          customerEmail,
          refundAmount: plan.amount,
          reasonLabel: plan.reasonLabel,
          note: body.note,
          items: plan.refundedItems.map((ri) => ({
            productTitle: ri.productTitle,
            quantity: ri.quantity,
            amount: ri.amount,
          })),
          isPartial: plan.isPartial,
        });
        await payload.update({
          collection: 'orders',
          id: orderId,
          data: {
            'emailNotifications.refundNotification': {
              status: emailResult.success ? 'sent' : 'failed',
              recipient: customerEmail,
              provider: emailResult.provider,
              sentAt: new Date().toISOString(),
              error: emailResult.success ? undefined : emailResult.error,
            },
          },
        });
      } catch (emailError) {
        console.error('Refund email error (refund itself succeeded):', emailError);
      }
    }

    const totalRefunded = alreadyRefunded + plan.amount;
    console.log(
      `Refund processed by ${user.email}: ${stripeRefund.id} for order ${order.orderNumber}, amount: $${(plan.amount / 100).toFixed(2)} (${plan.paymentStatus})`
    );

    return NextResponse.json({
      success: true,
      refundId: stripeRefund.id,
      amount: plan.amount,
      breakdown: plan.breakdown,
      paymentStatus: plan.paymentStatus,
      totalRefunded,
      remainingAmount: order.totalAmount - totalRefunded,
      isFullyRefunded: !plan.isPartial,
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
