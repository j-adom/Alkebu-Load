import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import Stripe from 'stripe'

let stripeClient: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil',
    })
  }

  return stripeClient
}

async function authenticateRequest(request: NextRequest, allowedRoles: string[]) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (!allowedRoles.includes((user as any).role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  return { payload, user }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, ['admin', 'staff'])
    if (authResult instanceof NextResponse) return authResult

    const { payload } = authResult
    const { searchParams } = new URL(request.url)
    const requestedLimit = Number(searchParams.get('limit') || '40')
    const limit = Math.max(1, Math.min(100, Number.isFinite(requestedLimit) ? requestedLimit : 40))

    const [sessions, payloadOrders] = await Promise.all([
      getStripe().checkout.sessions.list({
        limit,
        expand: ['data.payment_intent'],
      }),
      payload.find({
        collection: 'orders',
        limit: 200,
        sort: '-createdAt',
        depth: 0,
      }),
    ])

    const orderBySessionId = new Map<string, any>()
    const orderByPaymentIntentId = new Map<string, any>()

    for (const order of payloadOrders.docs as any[]) {
      const sessionId = order?.payment?.stripeSessionId
      const paymentIntentId = order?.payment?.stripePaymentIntentId

      if (typeof sessionId === 'string' && sessionId) {
        orderBySessionId.set(sessionId, order)
      }

      if (typeof paymentIntentId === 'string' && paymentIntentId) {
        orderByPaymentIntentId.set(paymentIntentId, order)
      }
    }

    const docs = sessions.data.map((session) => {
      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id
      const matchedOrder = orderBySessionId.get(session.id)
        || (paymentIntentId ? orderByPaymentIntentId.get(paymentIntentId) : undefined)

      return {
        id: session.id,
        created: session.created,
        createdAt: new Date(session.created * 1000).toISOString(),
        amountTotal: session.amount_total || 0,
        currency: session.currency || 'usd',
        customerEmail: session.customer_details?.email || session.customer_email || '',
        customerName: session.customer_details?.name || '',
        paymentStatus: session.payment_status,
        checkoutStatus: session.status,
        livemode: session.livemode,
        paymentIntentId: paymentIntentId || '',
        matchedOrderId: matchedOrder?.id ? String(matchedOrder.id) : null,
        matchedOrderNumber: matchedOrder?.orderNumber || null,
        matchedOrderStatus: matchedOrder?.status || null,
        metadata: {
          cartId: session.metadata?.cartId || '',
          shippingMethod: session.metadata?.shippingMethod || '',
        },
      }
    })

    return NextResponse.json({
      docs,
      totalDocs: docs.length,
      unmatchedCount: docs.filter((doc) => !doc.matchedOrderId && doc.paymentStatus === 'paid').length,
      matchedCount: docs.filter((doc) => doc.matchedOrderId).length,
    })
  } catch (error) {
    console.error('Stripe orders API error:', error)
    return NextResponse.json({ error: 'Failed to fetch Stripe orders' }, { status: 500 })
  }
}
