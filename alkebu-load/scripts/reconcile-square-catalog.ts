#!/usr/bin/env tsx
/**
 * Square catalog reconciliation backfill (Square catalog staging plan, Task 9).
 *
 * The live square-catalog-sync job only looks at items changed since its checkpoint
 * (24 h on first run). This walks the WHOLE Square catalog once, through exactly the
 * same per-item decisions as the live job (processCatalogItems), to pick up books added
 * in Square that never reached Payload.
 *
 *   pnpm square:reconcile                        # dry run (default): reads only
 *   pnpm square:reconcile -- --commit            # write books / staging rows
 *   pnpm square:reconcile -- --report out.csv    # report path (default square-reconcile-report.csv)
 *
 * Needs DATABASE_URI pointing at production Postgres (SSH tunnel, see CLAUDE.md) and
 * SQUARE_ACCESS_TOKEN. Boots Payload in production mode, so no schema push.
 *
 * - Dry run writes nothing and makes no ISBNdb/Google Books calls; it still reads Square
 *   and Payload to decide what each item would do.
 * - Repeat-safe: books are keyed by the unique squareItemId, staging rows by item id,
 *   and rejected staging rows stay rejected.
 * - Never touches the squareSyncState checkpoint or counters; the live job owns those.
 */
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { argValue, csvCell, getProductionPayload } from './lib/productionPayload'

async function main() {
  const commit = process.argv.includes('--commit')
  const reportPath = resolve(argValue('--report') ?? 'square-reconcile-report.csv')

  const payload = await getProductionPayload('square-reconcile')
  const { listSquareCatalog, processCatalogItems } = await import('../src/app/utils/squareCatalogSync')

  console.log(`[square-reconcile] mode: ${commit ? 'COMMIT (writes)' : 'DRY RUN (no writes)'}`)
  const { items, imageUrlsById } = await listSquareCatalog()
  console.log(`[square-reconcile] Square catalog items: ${items.length}`)

  const outcomes: { squareItemId: string; name: string; outcome: string; reason: string }[] = []
  const result = await processCatalogItems(payload, items, imageUrlsById, new Date(), {
    dryRun: !commit,
    onOutcome: (o) => outcomes.push(o),
  })

  const header = ['outcome', 'squareItemId', 'name', 'reason']
  const rows = outcomes
    .slice()
    .sort((a, b) => a.outcome.localeCompare(b.outcome) || a.name.localeCompare(b.name))
    .map((o) => [o.outcome, o.squareItemId, o.name, o.reason])
  await writeFile(reportPath, [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n')

  const reasonCounts = new Map<string, number>()
  for (const o of outcomes) {
    if (o.outcome === 'create' || o.outcome === 'update') continue
    // Group by the reason's leading phrase so per-item details don't split buckets.
    const key = `${o.outcome}: ${o.reason.split(';')[0].slice(0, 90)}`
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1)
  }

  console.log('')
  console.log(`[square-reconcile] ${commit ? 'Done' : 'Would do'}:`)
  console.log(`  created (new books)       ${result.created}`)
  console.log(`  updated (existing books)  ${result.updated}`)
  console.log(`  staged (review queue)     ${result.staged}`)
  console.log(`  skipped, rejected         ${outcomes.filter((o) => o.outcome === 'skip-rejected').length}`)
  console.log(`  skipped, not a book       ${result.skippedNonBook}`)
  console.log(`  unresolved (errors)       ${result.unresolved}`)
  console.log('')
  console.log('[square-reconcile] Ten most common non-write reasons:')
  for (const [reason, count] of [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${String(count).padStart(5)}  ${reason}`)
  }
  console.log('')
  console.log(`[square-reconcile] Per-item report: ${reportPath}`)

  process.exit(result.unresolved > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('[square-reconcile] failed:', error)
  process.exit(1)
})
