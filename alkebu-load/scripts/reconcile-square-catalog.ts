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
 * - Fast: every book and staging row is read once up front (squareCatalogPreload.ts)
 *   instead of several queries per item, and books that already agree with Square are
 *   not rewritten. An interrupted --commit can simply be run again.
 */
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { argValue, csvCell, getProductionPayload } from './lib/productionPayload'

async function main() {
  const commit = process.argv.includes('--commit')
  const reportPath = resolve(argValue('--report') ?? 'square-reconcile-report.csv')

  const realPayload = await getProductionPayload('square-reconcile')
  const { listSquareCatalog, processCatalogItems } = await import('../src/app/utils/squareCatalogSync')
  const { createPreloadedCatalogPayload } = await import('../src/app/utils/squareCatalogPreload')

  console.log(`[square-reconcile] mode: ${commit ? 'COMMIT (writes)' : 'DRY RUN (no writes)'}`)
  const { items, imageUrlsById } = await listSquareCatalog()
  console.log(`[square-reconcile] Square catalog items: ${items.length}`)
  // One read of every book and staging row instead of several queries per item.
  const payload = await createPreloadedCatalogPayload(realPayload, (m) => console.log(`[square-reconcile] ${m}`))

  const outcomes: { squareItemId: string; name: string; outcome: string; reason: string; detail?: string }[] = []
  let processed = 0
  const startedAt = Date.now()
  const result = await processCatalogItems(payload, items, imageUrlsById, new Date(), {
    dryRun: !commit,
    onOutcome: (o) => {
      outcomes.push(o)
      processed++
      if (processed % 500 === 0) {
        console.log(`[square-reconcile] ${processed}/${items.length} items, ${Math.round((Date.now() - startedAt) / 1000)}s`)
      }
    },
  })

  const header = ['outcome', 'squareItemId', 'name', 'reason', 'detail']
  const rows = outcomes
    .slice()
    .sort((a, b) => a.outcome.localeCompare(b.outcome) || a.name.localeCompare(b.name))
    .map((o) => [o.outcome, o.squareItemId, o.name, o.reason, o.detail ?? ''])
  await writeFile(reportPath, [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n')

  const tallyBy = (filter: (o: (typeof outcomes)[number]) => boolean, keyOf: (o: (typeof outcomes)[number]) => string) => {
    const counts = new Map<string, number>()
    for (const o of outcomes) {
      if (!filter(o)) continue
      const key = keyOf(o)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }
  // Group by the first issue without its free-text detail, so per-item values don't split buckets.
  const stageKey = (o: (typeof outcomes)[number]) => o.reason.split(';')[0].split(' - ')[0].slice(0, 90)
  const reasonCounts = tallyBy((o) => !['create', 'update', 'unchanged'].includes(o.outcome), (o) =>
    o.outcome === 'stage' ? `stage: ${stageKey(o)}` : `${o.outcome}: ${o.reason.slice(0, 90)}`)
  const fieldCounts = new Map<string, number>()
  for (const o of outcomes) {
    const prefix = /^(would change|changed) /.exec(o.reason)?.[0]
    if (o.outcome !== 'update' || !prefix) continue
    for (const field of o.reason.slice(prefix.length).split(', ')) {
      fieldCounts.set(field, (fieldCounts.get(field) ?? 0) + 1)
    }
  }

  console.log('')
  console.log(`[square-reconcile] ${commit ? 'Done' : 'Would do'}:`)
  console.log(`  created (new books)       ${result.created}`)
  console.log(`  updated (existing books)  ${result.updated}`)
  console.log(`  unchanged, no write       ${result.unchanged}`)
  console.log(`  staged (review queue)     ${result.staged}`)
  console.log(`  skipped, rejected         ${outcomes.filter((o) => o.outcome === 'skip-rejected').length}`)
  console.log(`  skipped, not a book       ${result.skippedNonBook}`)
  console.log(`  unresolved (errors)       ${result.unresolved}`)
  console.log('')
  console.log(`[square-reconcile] Fields the updates ${commit ? 'changed' : 'would change'} (books can count in several rows):`)
  for (const [field, count] of [...fieldCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(5)}  ${field}`)
  }
  console.log('')
  console.log('[square-reconcile] Ten most common non-write reasons:')
  for (const [reason, count] of reasonCounts.slice(0, 10)) {
    console.log(`  ${String(count).padStart(5)}  ${reason}`)
  }
  console.log('')
  console.log('[square-reconcile] The CSV lists every item; sort by outcome, then reason. The detail column')
  console.log('  shows current vs Square title and price for every update that changes them.')
  console.log('')
  console.log(`[square-reconcile] Per-item report: ${reportPath}`)

  process.exit(result.unresolved > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('[square-reconcile] failed:', error)
  process.exit(1)
})
