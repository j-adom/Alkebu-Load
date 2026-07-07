import type { Payload } from 'payload'
import Stripe from 'stripe'
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

// ─── Scheduled reconciliation ───────────────────────────────────────────

export type RecoveryCandidateOptions = {
  /** Skip sessions younger than this — the webhook may still be retrying. */
  minAgeMinutes?: number
  /** Injectable clock (ms since epoch) for tests. */
  now?: number
}

/**
 * Filter recent Stripe sessions down to paid sessions that have no matching
 * Payload order (by session id or payment intent id) and are old enough that
 * normal webhook delivery/retries have had a chance to run.
 *
 * Dismissed sessions are excluded automatically: dismissal creates a stub
 * Order carrying the session id, so they arrive here already "matched".
 */
export function selectRecoveryCandidates(
  sessions: Stripe.Checkout.Session[],
  existingOrders: Array<{ payment?: { stripeSessionId?: string | null; stripePaymentIntentId?: string | null } }>,
  options: RecoveryCandidateOptions = {},
): Stripe.Checkout.Session[] {
  const { minAgeMinutes = 30, now = Date.now() } = options

  const matchedSessionIds = new Set<string>()
  const matchedPaymentIntentIds = new Set<string>()
  for (const order of existingOrders) {
    if (order?.payment?.stripeSessionId) matchedSessionIds.add(order.payment.stripeSessionId)
    if (order?.payment?.stripePaymentIntentId) {
      matchedPaymentIntentIds.add(order.payment.stripePaymentIntentId)
    }
  }

  const maxCreated = Math.floor(now / 1000) - minAgeMinutes * 60

  return sessions.filter((session) => {
    if (session.payment_status !== 'paid') return false
    if (session.created > maxCreated) return false
    if (matchedSessionIds.has(session.id)) return false
    const pi =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id
    if (pi && matchedPaymentIntentIds.has(pi)) return false
    return true
  })
}

let scheduledStripeClient: Stripe | null = null
function getScheduledStripe(): Stripe {
  if (!scheduledStripeClient) {
    scheduledStripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil',
    })
  }
  return scheduledStripeClient
}

/**
 * Hourly reconciliation backstop for the Stripe webhook (see the
 * `recover-stripe-orders` job in payload.config.ts).
 *
 * Lists recent Stripe sessions, recovers any paid session that has no
 * matching Payload order, and emails staff when something was recovered —
 * recovery deliberately does not email customers, so a human must follow up.
 */
export async function runScheduledStripeRecovery(
  payload: Payload,
  options: { limit?: number; minAgeMinutes?: number } = {},
): Promise<{ scanned: number; candidates: number; recovered: RecoveryResult[]; failed: RecoveryResult[] }> {
  const limit = options.limit ?? 40

  const stripeSessions = await getScheduledStripe().checkout.sessions.list({
    limit,
    expand: ['data.payment_intent'],
  })

  const payloadOrders = await payload.find({
    collection: 'orders',
    limit: 200,
    sort: '-createdAt',
    depth: 0,
  })

  const candidates = selectRecoveryCandidates(
    stripeSessions.data,
    payloadOrders.docs as any[],
    { minAgeMinutes: options.minAgeMinutes },
  )

  const results: RecoveryResult[] = []
  for (const session of candidates) {
    results.push(await recoverStripeSessionAsOrder(payload, session))
  }

  const recovered = results.filter((r) => r.status === 'recovered')
  const failed = results.filter((r) => r.status === 'failed')

  if (recovered.length > 0) {
    try {
      const { sendRecoveryAlert } = await import('./emailService')
      await sendRecoveryAlert({
        recovered: recovered.map((r) => ({
          orderNumber: r.orderNumber,
          totalAmount: r.totalAmount,
          guestEmail: r.guestEmail,
        })),
        scanned: stripeSessions.data.length,
        adminUrl: `${process.env.ORDER_ADMIN_BASE_URL || process.env.PAYLOAD_PUBLIC_SERVER_URL || ''}/admin/order-dashboard`,
      })
    } catch (err) {
      // Alerting must never fail the recovery itself.
      console.error('Stripe recovery: staff alert email failed:', err)
    }
  }

  if (results.length > 0) {
    console.log(
      `Stripe recovery job: scanned=${stripeSessions.data.length} candidates=${candidates.length} recovered=${recovered.length} failed=${failed.length}`,
    )
  }

  return { scanned: stripeSessions.data.length, candidates: candidates.length, recovered, failed }
}
