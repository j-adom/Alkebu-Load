import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import Stripe from 'stripe'

export const maxDuration = 60

let stripeClient: Stripe | null = null
function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil',
    })
  }
  return stripeClient
}

/**
 * Book ID used as a placeholder line item on reconciliation stubs.
 *
 * The Orders.items field is `required: true` with a `relationTo` constraint,
 * so a stub Order needs at least one item pointing at a real product. We
 * deliberately pick a real catalog book (5546) and override the rendered
 * productTitle with a reconciliation-stub message — `internalNotes` and the
 * stub's title make it unmistakable that this isn't a real fulfillable order.
 */
const PLACEHOLDER_BOOK_ID = 5546

type DismissBody = {
  sessionIds?: string[]
  note?: string
  reason?: 'test' | 'data-loss' | 'manual'
}

type DismissResult = {
  sessionId: string
  status: 'dismissed' | 'already-matched' | 'not-found' | 'failed'
  orderId?: number | string
  orderNumber?: string
  guestEmail?: string
  totalAmount?: number
  error?: string
}

/**
 * POST /api/admin/dismiss-stripe-sessions?confirm=true
 * Body: { sessionIds: string[], reason?: 'test' | 'data-loss' | 'manual', note?: string }
 *
 * Creates a stub Order (status='completed') for each given Stripe session ID
 * so the dashboard's Stripe Reconciliation widget matches them and stops
 * surfacing them as unmatched. Used for sessions that can't be cleanly
 * recovered from cart data (cart deleted, items cleared, or known-test
 * transactions like the launch-day test orders).
 *
 * Idempotent — sessions already matched by an existing Order are skipped.
 *
 * Auth:   admin role required.
 * Guard:  ?confirm=true required.
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: request.headers })
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if ((user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  if (request.nextUrl.searchParams.get('confirm') !== 'true') {
    return NextResponse.json(
      { error: 'Confirmation required', hint: 'Add ?confirm=true to apply.' },
      { status: 400 },
    )
  }

  let body: DismissBody = {}
  try {
    body = (await request.json()) as DismissBody
  } catch {
    return NextResponse.json({ error: 'JSON body required' }, { status: 400 })
  }

  const sessionIds = Array.isArray(body.sessionIds) ? body.sessionIds.filter((s) => typeof s === 'string' && s) : []
  if (sessionIds.length === 0) {
    return NextResponse.json(
      { error: 'sessionIds array required in body' },
      { status: 400 },
    )
  }

  const reason: DismissBody['reason'] = body.reason || 'manual'
  const extraNote = typeof body.note === 'string' ? body.note.trim() : ''

  const results: DismissResult[] = []

  for (const sessionId of sessionIds) {
    try {
      // Idempotency: already matched by an existing Payload Order?
      const existing = await payload.find({
        collection: 'orders',
        where: { 'payment.stripeSessionId': { equals: sessionId } },
        depth: 0,
        limit: 1,
      })
      if (existing.docs.length > 0) {
        const o = existing.docs[0] as { id: number | string; orderNumber?: string }
        results.push({
          sessionId,
          status: 'already-matched',
          orderId: o.id,
          orderNumber: o.orderNumber,
        })
        continue
      }

      // Look up the session in Stripe to capture amount / email.
      let session: Stripe.Checkout.Session
      try {
        session = await getStripe().checkout.sessions.retrieve(sessionId, {
          expand: ['payment_intent'],
        })
      } catch (err) {
        results.push({
          sessionId,
          status: 'not-found',
          error: err instanceof Error ? err.message : String(err),
        })
        continue
      }

      const guestEmail = session.customer_details?.email || session.customer_email || ''
      const totalAmount = session.amount_total || 0
      const orderNumber = `ALK-DISMISS-${Date.now().toString(36).toUpperCase()}-${sessionId.slice(-6)}`

      const reasonBlurb =
        reason === 'test'
          ? 'TEST TRANSACTION — launch-day testing, not a real customer order.'
          : reason === 'data-loss'
            ? 'DATA LOSS — Stripe payment is real, but the source cart/items are no longer in Payload. Reconcile manually with customer if needed.'
            : 'MANUAL RECONCILIATION — see operator notes.'
      const internalNotes = [
        `[Reconciliation stub]`,
        reasonBlurb,
        `Stripe session: ${sessionId}`,
        `Stripe amount: ${totalAmount} cents (${session.currency || 'usd'})`,
        extraNote ? `Operator note: ${extraNote}` : null,
        `Dismissed at: ${new Date().toISOString()}`,
      ]
        .filter(Boolean)
        .join('\n')

      const orderData = {
        orderNumber,
        guestEmail: guestEmail || undefined,
        status: 'completed',
        items: [
          {
            product: { relationTo: 'books', value: PLACEHOLDER_BOOK_ID },
            productType: 'books',
            productTitle: '[Reconciliation stub — original cart data unavailable]',
            quantity: 1,
            unitPrice: totalAmount,
            totalPrice: totalAmount,
          },
        ],
        subtotalAmount: totalAmount,
        taxAmount: 0,
        shippingAmount: 0,
        totalAmount,
        payment: {
          provider: 'stripe',
          providerPaymentId: sessionId,
          stripeSessionId: sessionId,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
          paymentStatus: 'succeeded',
          paymentMethod: session.payment_method_types?.[0] || 'card',
        },
        emailNotifications: {
          customerConfirmation: { status: 'skipped', error: 'Reconciliation stub' },
          staffNotification: { status: 'skipped', error: 'Reconciliation stub' },
        },
        internalNotes,
        source: 'website',
      }

      const order = await payload.create({
        collection: 'orders',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: orderData as any,
      })

      results.push({
        sessionId,
        status: 'dismissed',
        orderId: (order as { id: number | string }).id,
        orderNumber,
        guestEmail,
        totalAmount,
      })
    } catch (err) {
      results.push({
        sessionId,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({
    mode: 'APPLIED',
    requested: sessionIds.length,
    dismissed: results.filter((r) => r.status === 'dismissed').length,
    alreadyMatched: results.filter((r) => r.status === 'already-matched').length,
    notFound: results.filter((r) => r.status === 'not-found').length,
    failed: results.filter((r) => r.status === 'failed').length,
    durationMs: Date.now() - startedAt,
    results,
  })
}
