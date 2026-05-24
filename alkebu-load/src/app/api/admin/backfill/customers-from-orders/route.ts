import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { upsertCustomerForOrder } from '@/app/utils/customerUpsert'
import { computeCustomerRollups } from '@/app/utils/customerRollups'

export const maxDuration = 300

const PAGE_SIZE = 100
const DEFAULT_LINK_LIMIT = 200
const DEFAULT_WALL_TIMEOUT_MS = 60_000
const PER_ORDER_TIMEOUT_MS = 10_000

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * POST /api/admin/backfill/customers-from-orders
 *
 * Walks orders missing a customer link, upserts a Customers row from
 * each order's guestEmail (or linked customer ref), back-links the
 * order, and finally recomputes rollups once per touched customer.
 *
 * Designed to be called after the Phase 6 migration nulls existing
 * orders.customer_id values, but is also idempotent for normal use:
 * orders already linked are skipped.
 *
 * Bounded + resumable — matches the author-publisher-links pattern.
 * Call repeatedly until `done: true`.
 *
 * Auth: admin role required.
 * Query params:
 *   - dryRun=true       no writes
 *   - limit=N           max orders to LINK per call (default 200)
 *   - timeoutMs=M       wall-clock budget (default 60000)
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: request.headers })
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if ((user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const dryRun = params.get('dryRun') === 'true'
  const linkLimit = Math.max(1, parseInt(params.get('limit') || `${DEFAULT_LINK_LIMIT}`, 10))
  const wallTimeoutMs = Math.max(5_000, parseInt(params.get('timeoutMs') || `${DEFAULT_WALL_TIMEOUT_MS}`, 10))
  const deadline = startedAt + wallTimeoutMs

  let scanned = 0
  let linked = 0
  let alreadyLinked = 0
  let skippedNoEmail = 0
  let failed = 0
  let totalDocs = 0
  let stoppedReason: 'completed' | 'wallTimeout' | 'linkLimit' = 'completed'
  const touchedCustomerIds = new Set<number | string>()

  let page = 1
  try {
    paginate: while (true) {
      if (Date.now() >= deadline) { stoppedReason = 'wallTimeout'; break }

      // depth: 0 — we only need guestEmail + shippingAddress + raw customer FK.
      // sort: 'id' — stable monotonic key. Phase 4 lesson: default sort
      // (effectively -updatedAt) shifts the iteration window once we start
      // writing back, leaving rows in the tail unreachable.
      const result = await payload.find({
        collection: 'orders',
        depth: 0,
        sort: 'id',
        limit: PAGE_SIZE,
        page,
      })
      totalDocs = result.totalDocs

      if (result.docs.length === 0) break

      for (const order of result.docs as any[]) {
        if (Date.now() >= deadline) { stoppedReason = 'wallTimeout'; break paginate }
        if (linked >= linkLimit) { stoppedReason = 'linkLimit'; break paginate }
        scanned++

        if (order.customer) {
          alreadyLinked++
          touchedCustomerIds.add(
            typeof order.customer === 'object' ? order.customer.id : order.customer,
          )
          continue
        }

        if (!order.guestEmail) {
          skippedNoEmail++
          continue
        }

        if (dryRun) {
          linked++
          continue
        }

        try {
          const customerId = await withTimeout(
            upsertCustomerForOrder(payload as any, order),
            PER_ORDER_TIMEOUT_MS,
            `upsert:${order.id}`,
          )
          if (!customerId) {
            skippedNoEmail++
            continue
          }
          await withTimeout(
            payload.update({
              collection: 'orders',
              id: order.id,
              data: { customer: customerId } as any,
              context: { disableHooks: true } as any,
            }),
            PER_ORDER_TIMEOUT_MS,
            `link:${order.id}`,
          )
          touchedCustomerIds.add(customerId)
          linked++
        } catch (err) {
          failed++
          console.error(`Backfill: order ${order.id} failed:`, err)
        }
      }

      if (page * PAGE_SIZE >= result.totalDocs) break
      page++
    }

    // Recompute rollups for every customer touched this call. We do this
    // after pagination rather than per-order so each customer's rollups
    // are computed once, not N times. Skip in dry-run.
    let rollupsComputed = 0
    let rollupsFailed = 0
    if (!dryRun) {
      for (const cid of touchedCustomerIds) {
        if (Date.now() >= deadline) { stoppedReason = 'wallTimeout'; break }
        try {
          await withTimeout(
            computeCustomerRollups(payload as any, cid),
            PER_ORDER_TIMEOUT_MS,
            `rollup:${cid}`,
          )
          rollupsComputed++
        } catch (err) {
          rollupsFailed++
          console.error(`Backfill: rollup recompute failed for customer ${cid}:`, err)
        }
      }
    }

    const done = stoppedReason === 'completed' && scanned >= totalDocs

    return NextResponse.json({
      mode: dryRun ? 'DRY_RUN' : 'APPLIED',
      scanned,
      linked,
      alreadyLinked,
      skippedNoEmail,
      failed,
      totalDocs,
      customersTouched: touchedCustomerIds.size,
      rollupsComputed,
      rollupsFailed,
      done,
      stoppedReason,
      durationMs: Date.now() - startedAt,
    })
  } catch (err) {
    console.error('Backfill: fatal error', err)
    return NextResponse.json(
      {
        error: 'Backfill aborted',
        message: err instanceof Error ? err.message : String(err),
        partial: {
          mode: dryRun ? 'DRY_RUN' : 'APPLIED',
          scanned,
          linked,
          alreadyLinked,
          skippedNoEmail,
          failed,
          totalDocs,
          customersTouched: touchedCustomerIds.size,
          durationMs: Date.now() - startedAt,
        },
      },
      { status: 500 },
    )
  }
}
