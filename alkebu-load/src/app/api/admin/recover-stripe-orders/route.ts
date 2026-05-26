import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import Stripe from 'stripe'
import { recoverStripeSessionAsOrder, type RecoveryResult } from '@/app/utils/stripeRecovery'

export const maxDuration = 120

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
 * POST /api/admin/recover-stripe-orders?dryRun=true|false&confirm=true&limit=N
 *
 * Recovers paid Stripe checkout sessions that have no corresponding Payload
 * Order. Mirrors the dashboard's reconciliation view (`/api/stripe-orders`):
 * fetches recent Stripe sessions, matches against existing Payload orders by
 * stripeSessionId / stripePaymentIntentId, and for each paid-but-unmatched
 * session, calls `recoverStripeSessionAsOrder` to build a Payload Order from
 * the captured Cart data.
 *
 * Idempotent — re-running is safe; sessions already matched short-circuit.
 *
 * Auth:    admin role required.
 * Guards:  ?confirm=true required for apply (not for dryRun=true).
 *
 * Behaviour summary:
 *   - emails NOT sent (customers already have their orders months ago)
 *   - inventory NOT decremented (current stock has moved on)
 *   - carts marked converted on success
 *   - Phase 6 Orders.afterChange handles customer auto-link + rollups
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

  const params = request.nextUrl.searchParams
  const dryRun = params.get('dryRun') === 'true'
  if (!dryRun && params.get('confirm') !== 'true') {
    return NextResponse.json(
      { error: 'Confirmation required', hint: 'Add ?confirm=true (or ?dryRun=true).' },
      { status: 400 },
    )
  }
  const limit = Math.max(1, Math.min(100, Number(params.get('limit') || '40')))

  try {
    // 1. Fetch recent Stripe sessions
    const stripeSessions = await getStripe().checkout.sessions.list({
      limit,
      expand: ['data.payment_intent'],
    })

    // 2. Fetch existing Payload orders to find already-matched sessions
    const payloadOrders = await payload.find({
      collection: 'orders',
      limit: 200,
      sort: '-createdAt',
      depth: 0,
    })
    const matchedSessionIds = new Set<string>()
    const matchedPaymentIntentIds = new Set<string>()
    for (const order of payloadOrders.docs as any[]) {
      if (order?.payment?.stripeSessionId) matchedSessionIds.add(order.payment.stripeSessionId)
      if (order?.payment?.stripePaymentIntentId) matchedPaymentIntentIds.add(order.payment.stripePaymentIntentId)
    }

    // 3. Identify recovery candidates
    const candidates: Stripe.Checkout.Session[] = []
    for (const session of stripeSessions.data) {
      if (session.payment_status !== 'paid') continue
      if (matchedSessionIds.has(session.id)) continue
      const pi =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id
      if (pi && matchedPaymentIntentIds.has(pi)) continue
      candidates.push(session)
    }

    // 4. Process each candidate
    const results: RecoveryResult[] = []
    for (const session of candidates) {
      const result = await recoverStripeSessionAsOrder(payload, session, { dryRun })
      results.push(result)
    }

    const summary = {
      mode: dryRun ? 'DRY_RUN' : 'APPLIED',
      scannedStripeSessions: stripeSessions.data.length,
      candidates: candidates.length,
      recovered: results.filter((r) => r.status === 'recovered').length,
      alreadyExisted: results.filter((r) => r.status === 'already-exists').length,
      skippedNoCart: results.filter((r) => r.status === 'no-cart').length,
      skippedNoItems: results.filter((r) => r.status === 'no-items').length,
      failed: results.filter((r) => r.status === 'failed').length,
      durationMs: Date.now() - startedAt,
    }

    return NextResponse.json({
      ...summary,
      results,
    })
  } catch (err) {
    console.error('Stripe recovery route failed:', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startedAt,
      },
      { status: 500 },
    )
  }
}
