#!/usr/bin/env tsx
/**
 * Owner-run fix for wellness/oils variations Square doesn't track inventory for. Dry run
 * by default.
 *
 *   pnpm wellness:untracked-availability                          # dry run
 *   pnpm wellness:untracked-availability -- --apply               # write changed products
 *   pnpm wellness:untracked-availability -- --months 12           # sales window (default 6)
 *   pnpm wellness:untracked-availability -- --report review.csv   # review list location
 *
 * Square has track_inventory off for most Scented Oil variations, so it never sends counts
 * and their stock stays at 0: the storefront showed every scent sold out. For every
 * wellness-lifestyle and oils-incense variation this reads track_inventory from the Square
 * catalog (our SQUARE_LOCATION_ID override wins) and then:
 *   - untracked: trackInventory = false, isAvailable = sold in a COMPLETED Square order
 *     (any location) closed within the window;
 *   - tracked: trackInventory = true, nothing else touched;
 *   - not in Square (no squareVariationId, or deleted there): untouched.
 * The review CSV lists every untracked variation (product, scent, size, sku, last sold
 * date, new isAvailable) so the owner can flip the rest by hand in the admin.
 *
 * Needs the production Postgres URL in DATABASE_URI (see CLAUDE.md for the SSH tunnel)
 * and scripts/add-wellness-track-inventory-schema.sql applied first. Prints counts only.
 * (Run through the pnpm script: it adds the CSS stub loader the Payload config needs.)
 */
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { argValue, csvCell, getProductionPayload } from './lib/productionPayload'

const COLLECTIONS = ['wellness-lifestyle', 'oils-incense'] as const

async function main() {
  const apply = process.argv.includes('--apply')
  const months = Number(argValue('--months') ?? 6)
  if (!Number.isFinite(months) || months <= 0) {
    console.error('[untracked] --months must be a positive number')
    process.exit(1)
  }
  const reportPath = resolve(argValue('--report') ?? 'wellness-untracked-review.csv')

  const payload = await getProductionPayload('untracked')
  const { SquareClient, SquareEnvironment } = await import('square')
  const { fetchSoldVariationIds, fetchVariationTracking, planUntrackedAvailability } = await import(
    '../src/app/utils/wellnessUntrackedAvailability'
  )

  if (!process.env.SQUARE_ACCESS_TOKEN) {
    console.error('[untracked] SQUARE_ACCESS_TOKEN is not set')
    process.exit(1)
  }
  const square = new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'sandbox' ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
  })

  const docs: Array<{ collection: (typeof COLLECTIONS)[number]; doc: any }> = []
  for (const collection of COLLECTIONS) {
    const result = await payload.find({ collection, limit: 0, pagination: false, depth: 0 })
    for (const doc of result.docs) docs.push({ collection, doc })
  }
  const variationIds = docs.flatMap(({ doc }) =>
    (doc.variations ?? []).map((v: any) => v?.squareVariationId).filter(Boolean),
  )
  console.log(
    `[untracked] ${apply ? 'APPLY' : 'dry run'}: ${docs.length} products, ${variationIds.length} variations with a Square id`,
  )

  const tracking = await fetchVariationTracking(square, variationIds, process.env.SQUARE_LOCATION_ID)
  const since = new Date()
  since.setMonth(since.getMonth() - months)
  const sales = await fetchSoldVariationIds(square, since.toISOString())
  console.log(
    `[untracked] Square: ${tracking.size} variations found; sales since ${since.toISOString().slice(0, 10)}: ` +
      `${sales.orders} orders, ${sales.sold.size} distinct variations, ${sales.locations} location(s)`,
  )

  const totals = { tracked: 0, untracked: 0, soldAvailable: 0, unsoldUnavailable: 0, notInSquare: 0, unchanged: 0 }
  const review: string[] = ['product,scent,size,sku,last_sold,new_is_available']
  let changedProducts = 0
  let written = 0
  const failures: string[] = []

  for (const { collection, doc } of docs) {
    const plan = planUntrackedAvailability(collection, doc, tracking, sales.sold)
    for (const key of Object.keys(totals) as Array<keyof typeof totals>) totals[key] += plan.counts[key]
    for (const row of plan.review) {
      review.push(
        [row.product, row.scent, row.size, row.sku, row.lastSold, row.isAvailable].map(csvCell).join(','),
      )
    }

    const c = plan.counts
    console.log(
      `[untracked] ${collection}/${doc.slug ?? doc.id}: ${c.variations} variations; untracked ${c.untracked} ` +
        `(sold -> available ${c.soldAvailable}, unsold -> unavailable ${c.unsoldUnavailable}); tracked ${c.tracked}; ` +
        `not in Square ${c.notInSquare}; unchanged ${c.unchanged}`,
    )
    if (!plan.changed) continue
    changedProducts += 1
    if (!apply) continue

    try {
      // One write per product. The full array goes back with each row's id, so Payload
      // keeps the rows; only trackInventory/isAvailable differ from what is stored.
      await payload.update({
        collection,
        id: doc.id,
        data: { variations: plan.variations } as any,
        depth: 0,
        context: { disableHooks: true },
      })
      written += 1
    } catch (error) {
      failures.push(`${collection}/${doc.slug ?? doc.id}: ${error instanceof Error ? error.message : error}`)
    }
  }

  await writeFile(reportPath, `${review.join('\n')}\n`)
  console.log(
    `[untracked] totals: untracked ${totals.untracked} (sold -> available ${totals.soldAvailable}, ` +
      `unsold -> unavailable ${totals.unsoldUnavailable}); tracked ${totals.tracked}; ` +
      `not in Square ${totals.notInSquare}; unchanged ${totals.unchanged}`,
  )
  console.log(
    `[untracked] products ${apply ? `written: ${written}/${changedProducts}` : `that would change: ${changedProducts}`}; ` +
      `review list (${review.length - 1} rows): ${reportPath}`,
  )
  for (const line of failures) console.log(`[untracked]   failed ${line}`)
  if (!apply) console.log('[untracked] Dry run. Nothing was written. Re-run with --apply to persist.')
  process.exit(failures.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
