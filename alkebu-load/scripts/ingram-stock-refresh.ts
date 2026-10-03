#!/usr/bin/env tsx
/**
 * Owner-run Ingram availability refresh. Dry-run by default: downloads the stock file,
 * filters it to our EANs, and reports how each book's buy button would change. Prints
 * counts only, never Ingram data, so the output can be shared.
 *
 *   pnpm ingram:stock-refresh                                  # dry run
 *   pnpm ingram:stock-refresh -- --apply                       # write changed books
 *   pnpm ingram:stock-refresh -- --sold-since-years 3          # sales window (default 4; 0 = off)
 *   pnpm ingram:stock-refresh -- --report path/to/review.csv   # review list location
 *
 * Rules (src/app/utils/ingram/availabilityPlan.ts):
 *   - request-only / discontinued books are never touched;
 *   - a book that would go from buyable to "Request" but sold in store (Square) or on the
 *     website within the window is kept buyable by flagging its sold edition(s)
 *     available-to-order.
 *
 * The review CSV lists every book that would change, from our own catalog plus a reason.
 *
 * (Run through the pnpm script: it adds the CSS stub loader the Payload config needs.)
 */
import dotenv from 'dotenv'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
dotenv.config({ path: './.env' })

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

const csvCell = (value: unknown) => {
  const s = value === undefined || value === null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Dynamic imports: static ones are hoisted above dotenv.config(), and payload.config reads
// DATABASE_URI and PAYLOAD_SECRET at module load.
async function main() {
  // Only meaningful (and only safe) against Postgres. On a SQLite file:… URI, Payload's
  // dev-mode schema push rewrites the local database, and the counts would describe a
  // stale local catalog. For Postgres, the config only allows dev push to local hosts.
  const uri = (process.env.DATABASE_URI ?? '').trim().replace(/^(['"])(.*)\1$/, '$2')
  if (!uri.startsWith('postgres')) {
    // Report only what kind of value arrived, never the value itself.
    const seen = uri === '' ? 'empty' : `scheme "${uri.split(':')[0]}"`
    console.error(
      `[refresh] DATABASE_URI is not a Postgres URL (got: ${seen}). Run against the production database, e.g.\n` +
        "  DATABASE_URI='postgresql://…' pnpm ingram:stock-refresh",
    )
    process.exit(1)
  }
  process.env.DATABASE_URI = uri
  // Never let Payload's dev-mode schema push run from this script. It is allowed for
  // localhost, and an SSH tunnel makes production look like localhost:<port>.
  ;(process.env as Record<string, string>).NODE_ENV = 'production'

  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')
  const { fetchStockSnapshot } = await import('../src/app/utils/ingram/refreshCatalogStock')
  const { stockFeedFromEnv } = await import('../src/app/utils/ingram/stockFeeds')
  const { planBookAvailability } = await import('../src/app/utils/ingram/availabilityPlan')
  const { fetchSoldVariationIds } = await import('../src/app/utils/ingram/squareSales')
  const { fetchOnlineSales } = await import('../src/app/utils/ingram/onlineSales')

  const apply = process.argv.includes('--apply')
  const soldSinceYears = Number(argValue('--sold-since-years') ?? 4)
  const reportPath = resolve(argValue('--report') ?? 'ingram-availability-review.csv')
  const payload = await getPayload({ config })
  const feed = stockFeedFromEnv()
  const checkedAt = new Date().toISOString()

  console.log(`[refresh] feed ${feed.name}: ${feed.remotePath} (${apply ? 'APPLY' : 'dry run'})`)
  const started = Date.now()
  const { input, counts } = await fetchStockSnapshot(payload, {
    remotePath: feed.remotePath,
    format: feed.createFormat(),
    minLines: feed.minLines,
    threshold: Number(process.env.INGRAM_STOCK_THRESHOLD) || 10,
  })
  console.log(`[refresh] fetched in ${Math.round((Date.now() - started) / 1000)} s:`, counts)
  const available = Object.values(input.stock).filter((s) => s.available).length
  console.log(`[refresh] matched EANs: ${counts.matched} (${available} available, ${counts.matched - available} not)`)

  let soldVariationIds: Map<string, string> | undefined
  let onlineSales: Awaited<ReturnType<typeof fetchOnlineSales>>['sales'] | undefined
  if (soldSinceYears > 0) {
    const since = new Date()
    since.setFullYear(since.getFullYear() - soldSinceYears)
    const { SquareClient } = await import('square')
    const square = new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN! })
    const sales = await fetchSoldVariationIds(square, since.toISOString())
    soldVariationIds = sales.sold
    console.log(
      `[refresh] Square sales since ${since.toISOString().slice(0, 10)}: ${sales.orders} orders, ` +
        `${sales.sold.size} distinct variations, ${sales.locations} location(s)`,
    )
    const web = await fetchOnlineSales(payload, since.toISOString())
    onlineSales = web.sales
    console.log(`[refresh] website sales since ${since.toISOString().slice(0, 10)}: ${web.orders} orders, ${web.sales.size} distinct books`)
  }

  const tally: Record<string, number> = {}
  const reasons: Record<string, number> = {}
  const rows: string[][] = []
  let books = 0
  let written = 0
  let failed = 0
  const stock = new Map(Object.entries(input.stock))

  for (let page = 1; ; page += 1) {
    const result = await payload.find({ collection: 'books', page, limit: 200, depth: 0, sort: 'id' })
    for (const book of result.docs as any[]) {
      books += 1
      const plan = planBookAvailability(book, stock, {
        checkedAt,
        fullCoverage: input.fullCoverage,
        soldVariationIds,
        onlineSales,
      })
      tally[plan.transition] = (tally[plan.transition] ?? 0) + 1
      if (plan.reason) reasons[plan.reason] = (reasons[plan.reason] ?? 0) + 1

      if (plan.transition === 'buyable-to-request' || plan.transition === 'rescued-by-sales' || plan.transition === 'request-to-buyable') {
        const editions: any[] = book.editions ?? []
        rows.push([
          String(book.id),
          book.title ?? '',
          editions.map((e) => e?.isbn || e?.isbn10).filter(Boolean).join(' '),
          String(editions.reduce((sum, e) => sum + (Number(e?.inventory?.stockLevel) || 0), 0)),
          plan.transition,
          plan.reason ?? '',
          plan.lastSoldAt?.slice(0, 10) ?? '',
          plan.saleSource ?? '',
          `https://payload.alkebulanimages.com/admin/collections/books/${book.id}`,
        ])
      }

      if (apply && plan.changed) {
        try {
          await payload.update({
            collection: 'books',
            id: book.id,
            data: { editions: plan.editions },
            depth: 0,
            context: { skipEnrichment: true, ingramStockRefresh: true },
          })
          written += 1
        } catch (error) {
          failed += 1
          console.error(`[refresh] failed to update book ${book.id}:`, error instanceof Error ? error.message : error)
        }
      }
    }
    if (!result.hasNextPage) break
  }

  const header = ['book_id', 'title', 'isbns', 'store_stock', 'change', 'reason', 'last_sale', 'sale_source', 'admin_url']
  await writeFile(reportPath, [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n')

  console.log(`[refresh] books: ${books}`)
  console.log('[refresh] buy-button changes:', tally)
  console.log('[refresh] reasons for buyable -> Request:', reasons)
  console.log(`[refresh] review list (${rows.length} books): ${reportPath}`)
  if (apply) console.log(`[refresh] written: ${written}, failed: ${failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
