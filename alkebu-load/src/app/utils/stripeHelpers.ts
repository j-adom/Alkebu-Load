import type { Payload } from 'payload';
import Stripe from 'stripe';
import { sendOrderConfirmation, sendOrderStatusUpdate, sendStaffOrderNotification, type OrderConfirmationData, type StaffNotificationData } from './emailService';
import {
  calculateTax,
  calculateTaxFromSubtotal,
  calculateShipping as calcShipping,
  calculateTotalWeight,
  calculateOrderTotals,
  type TaxCalculation,
  type ShippingCalculation,
  type ShippingAddress,
  type CartItemForTax,
} from './taxShippingCalculations';

export interface CheckoutSessionData {
  cartId: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  taxExempt?: boolean;
}

// Re-export types for backwards compatibility
export type { TaxCalculation, ShippingCalculation };

/**
 * Calculate sales tax based on shipping address
 * @deprecated Use calculateTax or calculateTaxFromSubtotal from taxShippingCalculations
 */
export function calculateTaxForAddress(
  subtotal: number,
  shippingAddress: ShippingAddress | null | undefined,
  taxExempt: boolean = false
): TaxCalculation {
  return calculateTaxFromSubtotal(subtotal, shippingAddress, taxExempt);
}

/**
 * Calculate shipping cost based on weight and method
 * @deprecated Use calculateShipping from taxShippingCalculations
 */
export function calculateShipping(
  totalWeight: number,
  method: string = 'standard',
  state: string = 'TN'
): ShippingCalculation {
  return calcShipping(totalWeight, method, state);
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});

/**
 * Create Stripe checkout session from Payload cart
 */
export async function createCheckoutSession(
  payload: Payload,
  sessionData: CheckoutSessionData
): Promise<{ sessionId: string; checkoutUrl: string }> {
  try {
    // Get cart with items
    const cart = await payload.findByID({
      collection: 'carts',
      id: sessionData.cartId,
      depth: 2,
    });

    if (!cart || !cart.items?.length) {
      throw new Error('Cart not found or empty');
    }

    // Build line items and prepare for tax calculation
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const taxItems: CartItemForTax[] = [];

    for (const item of (cart.items as any[])) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.productTitle,
            metadata: {
              productId: typeof item.product === 'object' ? item.product.id : item.product,
              productType: item.productType,
            },
          },
          unit_amount: item.unitPrice,
        },
        quantity: item.quantity,
      });

      taxItems.push({
        product: typeof item.product === 'object' ? item.product : { pricing: {} },
        productType: item.productType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }

    // Calculate totals using unified calculation (with book tax exemption)
    const shippingAddress = (cart as any).shippingAddress;
    const totals = calculateOrderTotals(taxItems, shippingAddress as any, {
      taxExempt: (cart as any).taxExempt || false,
      shippingMethod: 'standard',
    });

    // Add shipping as line item
    if (totals.shipping.cost > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Shipping - ${totals.shipping.method}`,
          },
          unit_amount: totals.shipping.cost,
        },
        quantity: 1,
      });
    }

    // Add tax as line item if applicable
    // Note: Books are tax-exempt in Tennessee, so tax only applies to non-book items
    if (totals.tax.amount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tennessee Sales Tax',
            description: totals.tax.breakdown
              ? `State: $${(totals.tax.breakdown.stateTax / 100).toFixed(2)}, Local: $${(totals.tax.breakdown.localTax / 100).toFixed(2)}`
              : undefined,
          },
          unit_amount: totals.tax.amount,
        },
        quantity: 1,
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: sessionData.successUrl,
      cancel_url: sessionData.cancelUrl,
      customer_email: sessionData.customerEmail,
      metadata: {
        cartId: sessionData.cartId,
        payloadCartId: cart.id,
      },
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true,
      },
      custom_fields: [
        {
          key: 'special_instructions',
          label: {
            type: 'custom',
            custom: 'Special Instructions',
          },
          type: 'text',
          optional: true,
        },
      ],
    });

    // Update cart with session info
    await payload.update({
      collection: 'carts',
      id: sessionData.cartId,
      data: {
        status: 'checkout',
        totalAmount: totals.total,
        totalTax: totals.tax.amount,
        shippingAmount: totals.shipping.cost,
        stripeSessionId: session.id,
      },
    });

    return {
      sessionId: session.id,
      checkoutUrl: session.url || '',
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyStripeWebhook(
  body: string,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(body, signature, secret);
}

/**
 * Process Stripe webhook events
 */
export async function processStripeWebhook(
  payload: Payload,
  event: Stripe.Event
): Promise<void> {
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(payload, event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(payload, event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(payload, event.data.object);
        break;

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    throw error;
  }
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutCompleted(payload: Payload, session: any): Promise<void> {
  try {
    // Find the cart associated with this session
    const carts = await payload.find({
      collection: 'carts',
      where: {
        stripeSessionId: {
          equals: session.id,
        },
      },
      depth: 2,
    });

    if (!carts.docs.length) {
      console.error('Cart not found for session:', session.id);
      return;
    }

    const cart = carts.docs[0];

    // Prevent duplicate order creation
    const existingOrder = await payload.find({
      collection: 'orders',
      where: {
        'payment.stripeSessionId': {
          equals: session.id,
        },
      },
    });
    if (existingOrder.docs.length) {
      console.log('Order already exists for session', session.id);
      return;
    }

    // Calculate shipping amount from cart (or recalculate)
    const shippingAmount = (cart as any).shippingAmount || 0;
    const subtotalAmount = ((cart as any).totalAmount || 0) - ((cart as any).totalTax || 0) - shippingAmount;

    // Create order from cart
    const orderData = {
      orderNumber: `ALK-${Date.now().toString(36).toUpperCase()}`,
      customer: cart.user,
      guestEmail: cart.user ? undefined : session.customer_details?.email,
      status: 'paid',
      items: (cart.items || []).map((item: any) => ({
        product: typeof item.product === 'object' ? item.product.id : item.product,
        productType: item.productType,
        productTitle: item.productTitle,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        stripePriceId: item.stripePriceId,
        customization: item.customization,
      })),
      subtotalAmount,
      taxAmount: cart.totalTax || 0,
      shippingAmount,
      totalAmount: cart.totalAmount,
      shippingAddress: cart.shippingAddress,
      payment: {
        provider: 'stripe',
        providerPaymentId: session.id,
        providerCustomerId: session.customer,
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        paymentStatus: 'succeeded',
        paymentMethod: session.payment_method_types?.[0] || 'card',
      },
      source: 'website',
    };

    const order = await (payload as any).create({
      collection: 'orders',
      data: orderData as any,
    });

    console.log('Order created successfully:', orderData.orderNumber);

    // Decrement inventory for each item
    for (const item of (cart.items || []) as any[]) {
      try {
        const productId = typeof item.product === 'object' ? item.product.id : item.product;
        const product = typeof item.product === 'object'
          ? item.product
          : await payload.findByID({
            collection: item.productType as any,
            id: productId,
          });

        if (product?.inventory?.trackQuantity) {
          const newStockLevel = Math.max(0, (product.inventory.stockLevel || 0) - item.quantity);
          await (payload as any).update({
            collection: item.productType as any,
            id: productId,
            data: {
              'inventory.stockLevel': newStockLevel,
            } as any,
          });
          console.log(`Decremented ${item.quantity} units of "${item.productTitle}" (new stock: ${newStockLevel})`);
        }
      } catch (inventoryError) {
        console.error(`Failed to decrement inventory for ${item.productTitle}:`, inventoryError);
        // Don't throw - order was created, inventory sync is best-effort
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

    // Send order confirmation email
    try {
      const emailData: OrderConfirmationData = {
        orderNumber: orderData.orderNumber,
        customerName: session.customer_details?.name || 'Customer',
        customerEmail: orderData.guestEmail || session.customer_details?.email,
        items: orderData.items.map((item: any) => ({
          productTitle: item.productTitle,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        subtotal: orderData.subtotalAmount,
        tax: orderData.taxAmount,
        shipping: orderData.shippingAmount,
        total: orderData.totalAmount || 0,
        shippingAddress: orderData.shippingAddress,
      };

      await sendOrderConfirmation(emailData);
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
      // Don't throw - order creation succeeded even if email failed
    }

    // Send staff notification email
    try {
      const staffData: StaffNotificationData = {
        orderNumber: orderData.orderNumber,
        orderId: String(order.id),
        customerName: session.customer_details?.name || 'Guest',
        customerEmail: orderData.guestEmail || session.customer_details?.email,
        items: orderData.items.map((item: any) => ({
          productTitle: item.productTitle,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        subtotal: orderData.subtotalAmount || 0,
        tax: orderData.taxAmount || 0,
        shipping: orderData.shippingAmount || 0,
        total: orderData.totalAmount || 0,
        shippingAddress: orderData.shippingAddress,
        source: 'website',
        paymentMethod: session.payment_method_types?.[0] || 'card',
      };

      await sendStaffOrderNotification(staffData);
    } catch (staffEmailError) {
      console.error('Error sending staff order notification:', staffEmailError);
      // Non-blocking - order creation succeeded
    }
  } catch (error) {
    console.error('Error handling checkout completion:', error);
    throw error;
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(payload: Payload, paymentIntent: any): Promise<void> {
  try {
    // Update order payment status
    const orders = await payload.find({
      collection: 'orders',
      where: {
        'payment.stripePaymentIntentId': {
          equals: paymentIntent.id,
        },
      },
    });

    if (orders.docs.length) {
      await (payload as any).update({
        collection: 'orders',
        id: orders.docs[0].id,
        data: {
          'payment.provider': 'stripe',
          'payment.providerPaymentId': paymentIntent.id,
          'payment.paymentStatus': 'succeeded',
          status: 'processing',
        } as any,
      });
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(payload: Payload, paymentIntent: any): Promise<void> {
  try {
    // Update order payment status
    const orders = await payload.find({
      collection: 'orders',
      where: {
        'payment.stripePaymentIntentId': {
          equals: paymentIntent.id,
        },
      },
    });

    if (orders.docs.length) {
      await (payload as any).update({
        collection: 'orders',
        id: orders.docs[0].id,
        data: {
          'payment.paymentStatus': 'failed',
          status: 'cancelled',
        } as any,
      });
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}

/**
 * Generate unique order number
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `ALK-${timestamp}-${random}`;
}
