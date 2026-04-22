import type { Payload } from 'payload';
import Stripe from 'stripe';
import { getEmailRuntimeConfig } from './emailConfig';
import {
  sendOrderConfirmation,
  sendStaffOrderNotification,
  type OrderConfirmationData,
  type StaffNotificationData,
} from './emailService';
import { getCartItems } from './cartOperations';
import { isShippingQuoteExpired } from './shippingQuotes';
import {
  calculateTaxFromSubtotal,
  calculateShipping as calcShipping,
  type TaxCalculation,
  type ShippingCalculation,
  type ShippingAddress,
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

const readString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const splitFullName = (fullName: unknown): { firstName?: string; lastName?: string } => {
  const normalized = readString(fullName);
  if (!normalized) return {};

  const parts = normalized.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0] };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
};

type AddressRecord = Record<string, unknown>;

const getCartItemProductId = (item: any): string | number | undefined => {
  const relation = item?.product;

  if (relation && typeof relation === 'object') {
    if ('value' in relation) {
      const value = relation.value;
      if (value && typeof value === 'object' && 'id' in value) {
        return value.id as string | number | undefined;
      }
      return value as string | number | undefined;
    }

    if ('id' in relation) {
      return relation.id as string | number | undefined;
    }
  }

  return relation as string | number | undefined;
};

export function buildOrderShippingAddress(
  cartShippingAddress: AddressRecord | null | undefined,
  session: any,
) {
  const cartAddress = cartShippingAddress && typeof cartShippingAddress === 'object'
    ? cartShippingAddress
    : {};
  const stripeAddress = session?.shipping_details?.address || session?.customer_details?.address || {};
  const stripeName = splitFullName(session?.shipping_details?.name || session?.customer_details?.name);

  return {
    firstName: readString(cartAddress.firstName) || stripeName.firstName || 'Customer',
    lastName: readString(cartAddress.lastName) || stripeName.lastName || 'Order',
    company: readString(cartAddress.company),
    street: readString(cartAddress.street) || readString(stripeAddress.line1) || '',
    street2: readString(cartAddress.street2) || readString(stripeAddress.line2),
    city: readString(cartAddress.city) || readString(stripeAddress.city) || '',
    state: readString(cartAddress.state) || readString(stripeAddress.state) || '',
    zip: readString(cartAddress.zip) || readString(stripeAddress.postal_code) || '',
    country: readString(cartAddress.country) || readString(stripeAddress.country) || 'US',
    phone: readString(cartAddress.phone) || readString(session?.customer_details?.phone),
  };
}

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

// Lazy-initialize Stripe (avoid crash during Next.js build when env vars are absent)
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
 * Create Stripe checkout session from Payload cart
 */
export async function createCheckoutSession(
  payload: Payload,
  sessionData: CheckoutSessionData
): Promise<{ sessionId: string; checkoutUrl: string }> {
  try {
    // Active cart line items live in cart-items, not cart.items on the cart doc.
    const cart = await payload.findByID({
      collection: 'carts',
      id: sessionData.cartId,
      depth: 0,
    });
    const cartItems = await getCartItems(payload, String(sessionData.cartId), 2);

    if (!cart || !cartItems.length) {
      throw new Error('Cart not found or empty');
    }

    const shippingRateId =
      typeof (cart as any).selectedShippingRateId === 'string'
        ? (cart as any).selectedShippingRateId.trim()
        : '';
    const shippingQuoteExpiresAt = (cart as any).shippingQuoteExpiresAt;
    const shippingQuoteIsExpired = isShippingQuoteExpired(
      shippingQuoteExpiresAt instanceof Date
        ? shippingQuoteExpiresAt
        : typeof shippingQuoteExpiresAt === 'string'
          ? shippingQuoteExpiresAt
          : null,
    );
    const taxAmount = typeof (cart as any).totalTax === 'number' ? (cart as any).totalTax : null;
    const shippingAmount =
      typeof (cart as any).shippingAmount === 'number' ? (cart as any).shippingAmount : null;
    const totalAmount = typeof (cart as any).totalAmount === 'number' ? (cart as any).totalAmount : null;

    if (!shippingRateId || shippingQuoteIsExpired) {
      throw new Error('Shipping quote is missing or expired');
    }

    if (taxAmount === null || shippingAmount === null || totalAmount === null) {
      throw new Error('Cart pricing is incomplete');
    }

    // Build line items from the locked cart pricing
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let subtotalAmount = 0;

    for (const item of cartItems) {
      subtotalAmount += (item.unitPrice || 0) * (item.quantity || 0);
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.productTitle,
            metadata: {
              productId: String(getCartItemProductId(item) || ''),
              productType: item.productType,
            },
          },
          unit_amount: item.unitPrice,
        },
        quantity: item.quantity,
      });
    }

    if (subtotalAmount + taxAmount + shippingAmount !== totalAmount) {
      throw new Error('Cart pricing is out of sync with the locked checkout quote');
    }

    // Add shipping as line item
    if (shippingAmount > 0) {
      const shippingLabelParts = [
        typeof (cart as any).shippingCarrier === 'string' ? (cart as any).shippingCarrier : null,
        typeof (cart as any).shippingService === 'string' ? (cart as any).shippingService : null,
      ].filter(Boolean);

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Shipping - ${shippingLabelParts.join(' ') || (cart as any).shippingMethod || 'Standard'}`,
          },
          unit_amount: shippingAmount,
        },
        quantity: 1,
      });
    }

    // Add tax as line item if applicable
    if (taxAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tennessee Sales Tax',
          },
          unit_amount: taxAmount,
        },
        quantity: 1,
      });
    }

    // Create Stripe checkout session
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: sessionData.successUrl,
      cancel_url: sessionData.cancelUrl,
      customer_email: sessionData.customerEmail,
      metadata: {
        cartId: sessionData.cartId,
        payloadCartId: cart.id,
        shippingRateId,
        shippingMethod: String((cart as any).shippingMethod || 'standard'),
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
  return getStripe().webhooks.constructEvent(body, signature, secret);
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
    const cartItems = await getCartItems(payload, String(cart.id), 2);

    if (!cartItems.length) {
      console.error('Cart items not found for session:', session.id);
      return;
    }

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
    const shippingAmount = typeof (cart as any).shippingAmount === 'number' ? (cart as any).shippingAmount : 0;
    const taxAmount = typeof (cart as any).totalTax === 'number' ? (cart as any).totalTax : 0;
    const totalAmount = typeof (cart as any).totalAmount === 'number' ? (cart as any).totalAmount : 0;
    const subtotalAmount = totalAmount - taxAmount - shippingAmount;
    const normalizedCarrier = (() => {
      const value = String((cart as any).shippingCarrier || '').toLowerCase();
      if (value === 'usps' || value === 'ups' || value === 'fedex') return value;
      return undefined;
    })();
    const customerId =
      cart.user && typeof cart.user === 'object' && 'id' in cart.user
        ? (cart.user as any).id
        : cart.user;

    // Create order from cart
    const emailConfig = getEmailRuntimeConfig();
    const customerEmail = (cart as any).guestEmail || session.customer_details?.email;
    const orderData = {
      orderNumber: `ALK-${Date.now().toString(36).toUpperCase()}`,
      customer: customerId,
      guestEmail: customerId ? undefined : customerEmail,
      status: 'paid',
      items: cartItems.map((item: any) => ({
        product: item.product?.relationTo
          ? { relationTo: item.product.relationTo, value: getCartItemProductId(item) }
          : getCartItemProductId(item),
        productType: item.productType,
        productTitle: item.productTitle,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        stripePriceId: item.stripePriceId,
        customization: item.customization,
      })),
      subtotalAmount,
      taxAmount,
      shippingAmount,
      totalAmount,
      shippingAddress: buildOrderShippingAddress((cart as any).shippingAddress, session),
      payment: {
        provider: 'stripe',
        providerPaymentId: session.id,
        providerCustomerId: session.customer,
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        paymentStatus: 'succeeded',
        paymentMethod: session.payment_method_types?.[0] || 'card',
      },
      fulfillment: {
        shippingMethod: (cart as any).shippingMethod || 'standard',
        shippingService: (cart as any).shippingService,
        shippingRateId: (cart as any).selectedShippingRateId,
        quoteSource: (cart as any).shippingQuoteSource,
        carrier: normalizedCarrier,
      },
      emailNotifications: {
        customerConfirmation: {
          status: customerEmail ? 'pending' : 'skipped',
          recipient: customerEmail,
          provider: emailConfig.provider,
          error: customerEmail ? undefined : 'Customer email missing from checkout session',
        },
        staffNotification: {
          status: 'pending',
          recipient: emailConfig.staffNotificationEmail,
          provider: emailConfig.provider,
        },
      },
      source: 'website',
    };

    const order = await (payload as any).create({
      collection: 'orders',
      data: orderData as any,
    });

    console.log('Order created successfully:', orderData.orderNumber);

    // Decrement inventory for each item
    for (const item of cartItems as any[]) {
      try {
        const productId = getCartItemProductId(item);
        if (productId === undefined || productId === null || productId === '') {
          continue;
        }

        const productRelation = item.product;
        const product = productRelation && typeof productRelation === 'object' && 'value' in productRelation
          ? productRelation.value
          : typeof productRelation === 'object'
            ? productRelation
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
      if (customerEmail) {
        const emailData: OrderConfirmationData = {
          orderNumber: orderData.orderNumber,
          customerName: session.customer_details?.name || 'Customer',
          customerEmail,
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

        const customerEmailResult = await sendOrderConfirmation(emailData);
        await (payload as any).update({
          collection: 'orders',
          id: order.id,
          data: {
            'emailNotifications.customerConfirmation.status': customerEmailResult.success ? 'sent' : 'failed',
            'emailNotifications.customerConfirmation.recipient': customerEmail,
            'emailNotifications.customerConfirmation.provider': customerEmailResult.provider,
            'emailNotifications.customerConfirmation.sentAt': customerEmailResult.success ? new Date().toISOString() : null,
            'emailNotifications.customerConfirmation.error': customerEmailResult.error || null,
          } as any,
        });
      }
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
      await (payload as any).update({
        collection: 'orders',
        id: order.id,
        data: {
          'emailNotifications.customerConfirmation.status': 'failed',
          'emailNotifications.customerConfirmation.recipient': customerEmail,
          'emailNotifications.customerConfirmation.provider': emailConfig.provider,
          'emailNotifications.customerConfirmation.sentAt': null,
          'emailNotifications.customerConfirmation.error': emailError instanceof Error ? emailError.message : 'Unknown email error',
        } as any,
      });
    }

    // Send staff notification email
    try {
      const staffData: StaffNotificationData = {
        orderNumber: orderData.orderNumber,
        orderId: String(order.id),
        customerName: session.customer_details?.name || 'Guest',
        customerEmail: customerEmail || 'Not provided',
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

      const staffEmailResult = await sendStaffOrderNotification(staffData);
      await (payload as any).update({
        collection: 'orders',
        id: order.id,
        data: {
          'emailNotifications.staffNotification.status': staffEmailResult.success ? 'sent' : 'failed',
          'emailNotifications.staffNotification.recipient': emailConfig.staffNotificationEmail,
          'emailNotifications.staffNotification.provider': staffEmailResult.provider,
          'emailNotifications.staffNotification.sentAt': staffEmailResult.success ? new Date().toISOString() : null,
          'emailNotifications.staffNotification.error': staffEmailResult.error || null,
        } as any,
      });
    } catch (staffEmailError) {
      console.error('Error sending staff order notification:', staffEmailError);
      await (payload as any).update({
        collection: 'orders',
        id: order.id,
        data: {
          'emailNotifications.staffNotification.status': 'failed',
          'emailNotifications.staffNotification.recipient': emailConfig.staffNotificationEmail,
          'emailNotifications.staffNotification.provider': emailConfig.provider,
          'emailNotifications.staffNotification.sentAt': null,
          'emailNotifications.staffNotification.error': staffEmailError instanceof Error ? staffEmailError.message : 'Unknown email error',
        } as any,
      });
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
