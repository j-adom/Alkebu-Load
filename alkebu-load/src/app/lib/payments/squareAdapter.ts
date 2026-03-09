import type { PaymentAdapter, InitPaymentParams } from './adapters';
import {
  calculateShipping,
  calculateTax,
  calculateTotalWeight,
  type CartItemForTax,
} from '@/app/utils/taxShippingCalculations';
import crypto from 'node:crypto';

/**
 * Square adapter (hosted checkout via Payment Links).
 *
 * Supports:
 * - Payment link creation for checkout
 * - Webhook validation and handling for order completion
 */
export const squareAdapter = (): PaymentAdapter => {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const isProduction = process.env.SQUARE_ENVIRONMENT === 'production';

  if (!accessToken || !locationId) {
    throw new Error('Square adapter requires SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID');
  }

  const initPayment = async (payload: any, params: InitPaymentParams) => {
    const { SquareClient } = await import('square');
    const client = new SquareClient({
      token: accessToken,
    });

    // Load cart and build line items
    const cart = await payload.findByID({
      collection: 'carts',
      id: params.cartId,
      depth: 2,
    });

    if (!cart || !cart.items?.length) {
      throw new Error('Cart not found or empty');
    }

    // Build line items for Square
    const lineItems = cart.items.map((item: any) => ({
      name: item.productTitle || 'Item',
      quantity: String(item.quantity || 1),
      basePriceMoney: {
        amount: BigInt(item.unitPrice || 0),
        currency: 'USD',
      },
    }));

    // Build tax calculation items
    const taxItems: CartItemForTax[] = cart.items.map((item: any) => ({
      product: typeof item.product === 'object' ? item.product : { pricing: {} },
      productType: item.productType,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    // Calculate shipping
    const totalWeight = calculateTotalWeight(taxItems);
    const shipping = calculateShipping(
      totalWeight,
      'standard',
      cart.shippingAddress?.state || 'TN',
    );

    // Calculate tax (using unified tax calculation with book exemption)
    const taxCalc = calculateTax(
      taxItems,
      cart.shippingAddress,
      cart.taxExempt,
    );

    const idempotencyKey = crypto.randomUUID();

    // Build Square payment link request
    const requestBody = {
      idempotencyKey,
      checkoutOptions: {
        askForShippingAddress: true,
        redirectUrl: params.successUrl,
        merchantSupportEmail: process.env.MERCHANT_SUPPORT_EMAIL,
      },
      order: {
        locationId,
        lineItems,
        taxes: taxCalc.amount > 0
          ? [
            {
              uid: 'sales-tax',
              name: 'Sales Tax',
              type: 'ADDITIVE' as const,
              percentage: String((taxCalc.rate * 100).toFixed(2)),
            },
          ]
          : undefined,
        serviceCharges: shipping.cost > 0
          ? [
            {
              uid: 'shipping',
              name: `Shipping (${shipping.method})`,
              calculationPhase: 'SUBTOTAL_PHASE' as const,
              amountMoney: {
                amount: BigInt(shipping.cost),
                currency: 'USD',
              },
              taxable: false,
            },
          ]
          : undefined,
      },
    };

    const result = await (client.checkout as any).createPaymentLink(requestBody);
    const checkoutUrl = result.paymentLink?.url;
    const providerPaymentId = result.paymentLink?.id;

    if (!checkoutUrl || !providerPaymentId) {
      throw new Error('Failed to create Square checkout link');
    }

    // Store Square payment link ID on cart for webhook reconciliation
    await payload.update({
      collection: 'carts',
      id: params.cartId,
      data: {
        provider: 'square',
        providerPaymentId,
        status: 'checkout',
      },
    });

    return {
      provider: 'square',
      providerPaymentId,
      checkoutUrl,
    };
  };

  const validateWebhook = (rawBody: string, headers: Headers): any => {
    if (!webhookSignatureKey) {
      throw new Error('SQUARE_WEBHOOK_SIGNATURE_KEY not configured');
    }

    const signature = headers.get('x-square-hmacsha256-signature');
    if (!signature) {
      throw new Error('Missing Square webhook signature');
    }

    // Square webhook URL (used in signature verification)
    const webhookUrl = `${process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/payment-webhook/square`;

    // Calculate expected signature
    const hmac = crypto.createHmac('sha256', webhookSignatureKey);
    hmac.update(webhookUrl + rawBody);
    const expectedSignature = hmac.digest('base64');

    if (signature !== expectedSignature) {
      throw new Error('Invalid Square webhook signature');
    }

    return JSON.parse(rawBody);
  };

  const handleWebhook = async (payload: any, event: any): Promise<void> => {
    const eventType = event.type;
    console.log(`Processing Square webhook: ${eventType}`);

    switch (eventType) {
      case 'payment.completed': {
        await handlePaymentCompleted(payload, event.data?.object?.payment);
        break;
      }

      case 'order.fulfillment.updated': {
        await handleFulfillmentUpdated(payload, event.data?.object?.order_fulfillment_updated);
        break;
      }

      case 'checkout.completed': {
        // Checkout link was completed - payment may still be processing
        console.log('Square checkout completed:', event.data?.id);
        break;
      }

      default:
        console.log(`Unhandled Square webhook event: ${eventType}`);
    }
  };

  return {
    slug: 'square',
    initPayment,
    validateWebhook,
    handleWebhook,
  };
};

/**
 * Handle Square payment.completed webhook
 */
async function handlePaymentCompleted(payload: any, payment: any): Promise<void> {
  if (!payment) {
    console.error('No payment data in webhook');
    return;
  }

  const orderId = payment.order_id;
  const paymentId = payment.id;

  console.log(`Square payment completed: ${paymentId} for order ${orderId}`);

  // Find cart by Square payment link ID or order ID
  // Note: Square Payment Links create orders, so we may need to look up by order metadata
  const carts = await payload.find({
    collection: 'carts',
    where: {
      or: [
        { providerPaymentId: { equals: orderId } },
        { providerPaymentId: { equals: paymentId } },
      ],
    },
    depth: 2,
  });

  if (!carts.docs.length) {
    console.log('No cart found for Square payment:', paymentId);
    return;
  }

  const cart = carts.docs[0];

  // Check if order already exists
  const existingOrder = await payload.find({
    collection: 'orders',
    where: {
      'payment.providerPaymentId': {
        equals: paymentId,
      },
    },
  });

  if (existingOrder.docs.length) {
    console.log('Order already exists for Square payment:', paymentId);
    return;
  }

  // Calculate amounts
  const subtotal = cart.items.reduce((sum: number, item: any) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);

  const taxAmount = cart.totalTax || 0;
  const shippingAmount = cart.shippingAmount || 0;
  const totalAmount = payment.amount_money?.amount
    ? Number(payment.amount_money.amount)
    : subtotal + taxAmount + shippingAmount;

  // Create order from cart
  const orderData = {
    orderNumber: `ALK-${Date.now().toString(36).toUpperCase()}`,
    customer: cart.user,
    guestEmail: cart.guestEmail,
    status: 'paid',
    items: cart.items.map((item: any) => ({
      product: typeof item.product === 'object' ? item.product.id : item.product,
      productType: item.productType,
      productTitle: item.productTitle,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
    })),
    subtotalAmount: subtotal,
    taxAmount,
    shippingAmount,
    totalAmount,
    shippingAddress: cart.shippingAddress,
    payment: {
      provider: 'square',
      providerPaymentId: paymentId,
      providerCustomerId: payment.customer_id,
      paymentStatus: 'succeeded',
      paymentMethod: payment.source_type?.toLowerCase() || 'card',
    },
    source: 'website',
    squareOrderId: orderId,
  };

  await payload.create({
    collection: 'orders',
    data: orderData,
  });

  console.log('Order created from Square payment:', orderData.orderNumber);

  // Decrement inventory
  for (const item of cart.items) {
    try {
      const productId = typeof item.product === 'object' ? item.product.id : item.product;
      const product = typeof item.product === 'object'
        ? item.product
        : await payload.findByID({
          collection: item.productType,
          id: productId,
        });

      if (product?.inventory?.trackQuantity) {
        const newStockLevel = Math.max(0, (product.inventory.stockLevel || 0) - item.quantity);
        await payload.update({
          collection: item.productType,
          id: productId,
          data: {
            'inventory.stockLevel': newStockLevel,
          },
        });
      }
    } catch (error) {
      console.error(`Failed to decrement inventory for ${item.productTitle}:`, error);
    }
  }

  // Mark cart as converted
  await payload.update({
    collection: 'carts',
    id: cart.id,
    data: {
      status: 'converted',
    },
  });
}

/**
 * Handle Square order fulfillment updates
 */
async function handleFulfillmentUpdated(payload: any, fulfillmentData: any): Promise<void> {
  if (!fulfillmentData) return;

  const squareOrderId = fulfillmentData.order_id;
  const fulfillmentState = fulfillmentData.fulfillment_update?.new_state;

  // Find order by Square order ID
  const orders = await payload.find({
    collection: 'orders',
    where: {
      squareOrderId: {
        equals: squareOrderId,
      },
    },
  });

  if (!orders.docs.length) {
    console.log('No order found for Square order:', squareOrderId);
    return;
  }

  const order = orders.docs[0];

  // Map Square fulfillment states to our status
  const statusMap: Record<string, string> = {
    'PROPOSED': 'processing',
    'RESERVED': 'processing',
    'PREPARED': 'processing',
    'COMPLETED': 'shipped',
    'CANCELED': 'cancelled',
    'FAILED': 'cancelled',
  };

  const newStatus = statusMap[fulfillmentState];
  if (newStatus && newStatus !== order.status) {
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: {
        status: newStatus,
      },
    });
    console.log(`Updated order ${order.orderNumber} status to ${newStatus}`);
  }
}
