import type { Payload } from 'payload'
import type Stripe from 'stripe'
import { getCartItems } from './cartOperations'
import { buildOrderShippingAddress } from './stripeHelpers'
import { getEmailRuntimeConfig } from './emailConfig'

/**
 * Per-session result returned from recoverStripeSessionAsOrder.
 *
 * - `recovered`       — order was created (or would be, in dryRun)
 * - `already-exists`  — order with this stripeSessionId is already in Payload (idempotent)
 * - `no-cart`         — no cart with this stripeSessionId; can't reconstruct
 * - `no-items`        — cart exists but its line items are gone
 * - `not-paid`        — session is in a non-paid state; refuse to recover
 * - `failed`          — exception during create
 */
export type RecoveryResult = {
  sessionId: string
  status: 'recovered' | 'already-exists' | 'no-cart' | 'no-items' | 'not-paid' | 'failed'
  orderId?: number | string
  orderNumber?: string
  cartId?: number | string
  itemCount?: number
  totalAmount?: number
  guestEmail?: string
  error?: string
  // dry-run only:
  preview?: Record<string, unknown>
}

const getCartItemProductId = (item: any): string | number | undefined => {
  if (!item || typeof item !== 'object') return undefined
  if (item.product && typeof item.product === 'object') {
    if ('value' in item.product) {
      const v = (item.product as any).value
      return typeof v === 'object' && v?.id ? v.id : v
    }
    if ('id' in item.product) return (item.product as any).id
  }
  return item.product
}

/**
 * Recover a single Stripe checkout session as a Payload Order.
 *
 * Mirrors handleCheckoutCompleted's order-creation logic in stripeHelpers.ts,
 * with three deliberate differences:
 *
 *   1. NO confirmation/staff emails are sent. emailNotifications.* is recorded
 *      as 'skipped' with a "Historical recovery" reason so it's auditable.
 *   2. NO inventory decrement. These orders are weeks-to-months old; current
 *      stock levels reflect downstream Square sync, so decrementing now would
 *      be incorrect.
 *   3. Cart is marked 'converted' (matches webhook behavior) but only if not
 *      already converted, so reruns are safe.
 *
 * Idempotent by `payment.stripeSessionId` — calling repeatedly with the same
 * session ID short-circuits at the existence check.
 */
export async function recoverStripeSessionAsOrder(
  payload: Payload,
  session: Stripe.Checkout.Session,
  options: { dryRun?: boolean } = {},
): Promise<RecoveryResult> {
  const sessionId = session.id

  if (session.payment_status !== 'paid') {
    return { sessionId, status: 'not-paid' }
  }

  // 1. Idempotency: order with this sessionId already?
  const existing = await payload.find({
    collection: 'orders',
    where: { 'payment.stripeSessionId': { equals: sessionId } },
    depth: 0,
    limit: 1,
  })
  if (existing.docs.length > 0) {
    const o = existing.docs[0] as any
    return {
      sessionId,
      status: 'already-exists',
      orderId: o.id,
      orderNumber: o.orderNumber,
    }
  }

  // 2. Find the cart that recorded this session
  const carts = await payload.find({
    collection: 'carts',
    where: { stripeSessionId: { equals: sessionId } },
    depth: 2,
    limit: 1,
  })
  if (!carts.docs.length) {
    return { sessionId, status: 'no-cart' }
  }
  const cart = carts.docs[0] as any

  // 3. Pull line items from CartItems collection
  const cartItems = await getCartItems(payload, String(cart.id), 2)
  if (!cartItems.length) {
    return { sessionId, status: 'no-items', cartId: cart.id }
  }

  // 4. Amounts: prefer the cart-stored quote (canonical, customer-confirmed)
  const shippingAmount = typeof cart.shippingAmount === 'number' ? cart.shippingAmount : 0
  const taxAmount = typeof cart.totalTax === 'number' ? cart.totalTax : 0
  const totalAmount = typeof cart.totalAmount === 'number' ? cart.totalAmount : 0
  const subtotalAmount = totalAmount - taxAmount - shippingAmount

  const normalizedCarrier = (() => {
    const value = String(cart.shippingCarrier || '').toLowerCase()
    if (value === 'usps' || value === 'ups' || value === 'fedex') return value
    return undefined
  })()

  const customerId = cart.user && typeof cart.user === 'object' && 'id' in cart.user
    ? (cart.user as any).id
    : cart.user
  const customerEmail = cart.guestEmail || session.customer_details?.email || ''

  if (options.dryRun) {
    return {
      sessionId,
      status: 'recovered',
      cartId: cart.id,
      itemCount: cartItems.length,
      totalAmount,
      guestEmail: customerEmail,
      preview: {
        wouldCreateOrderNumber: `(generated at apply time)`,
        subtotalAmount,
        taxAmount,
        shippingAmount,
        totalAmount,
        itemTitles: cartItems.map((it: any) => it.productTitle),
      },
    }
  }

  // 5. Build the order. Note `emailNotifications.*` status is 'skipped' for
  //    recovery — the live confirmation never sent and won't be sent now.
  const emailConfig = getEmailRuntimeConfig()
  const orderNumber = `ALK-${Date.now().toString(36).toUpperCase()}-R`
  const recoveryNote = `Historical recovery from Stripe session ${sessionId} on ${new Date().toISOString()}`

  const orderData: Record<string, unknown> = {
    orderNumber,
    customer: customerId || undefined,
    guestEmail: customerId ? undefined : customerEmail,
    status: 'paid',
    items: cartItems.map((item: any) => ({
      product: item.product?.relationTo
        ? { relationTo: item.product.relationTo, value: getCartItemProductId(item) }
        : getCartItemProductId(item),
      productType: item.productType,
      productTitle: item.productTitle,
      identifiers: item.identifiers,
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
    shippingAddress: buildOrderShippingAddress(cart.shippingAddress, session as any),
    payment: {
      provider: 'stripe',
      providerPaymentId: sessionId,
      providerCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      stripeSessionId: sessionId,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id,
      paymentStatus: 'succeeded',
      paymentMethod: session.payment_method_types?.[0] || 'card',
    },
    fulfillment: {
      shippingMethod: cart.shippingMethod || 'standard',
      shippingService: cart.shippingService,
      shippingRateId: cart.selectedShippingRateId,
      quoteSource: cart.shippingQuoteSource,
      carrier: normalizedCarrier,
    },
    emailNotifications: {
      customerConfirmation: {
        status: 'skipped',
        recipient: customerEmail || undefined,
        provider: emailConfig.provider,
        error: recoveryNote,
      },
      staffNotification: {
        status: 'skipped',
        recipient: emailConfig.staffNotificationEmail,
        provider: emailConfig.provider,
        error: recoveryNote,
      },
    },
    internalNotes: recoveryNote,
    source: 'website',
  }

  try {
    const order = await payload.create({
      collection: 'orders',
      data: orderData as any,
    })

    // Mark cart converted (idempotent on already-converted carts).
    if (cart.status !== 'converted') {
      await payload.update({
        collection: 'carts',
        id: cart.id,
        data: { status: 'converted' } as any,
      })
    }

    return {
      sessionId,
      status: 'recovered',
      orderId: (order as any).id,
      orderNumber,
      cartId: cart.id,
      itemCount: cartItems.length,
      totalAmount,
      guestEmail: customerEmail,
    }
  } catch (err) {
    return {
      sessionId,
      status: 'failed',
      cartId: cart.id,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
