#!/usr/bin/env tsx
/**
 * Owner-run Ingram availability refresh. Dry-run by default: downloads the stock file,
 * filters it to our EANs, and reports how each book's buy button would change. Prints
 * counts only, never Ingram data, so the output can be shared.
 *
 *   pnpm ingram:stock-refresh                                  # dry run
 *   pnpm ingram:stock-refresh -- --apply                       # write changed books
 *   pnpm ingram:stock-refresh -- --apply --only-rescues        # write only sales-rescued books
 *   pnpm ingram:stock-refresh -- --sold-since-years 3          # sales window (default 4; 0 = off)
 *   pnpm ingram:stock-refresh -- --report path/to/review.csv   # review list location
 *   pnpm ingram:stock-refresh -- --fresh                       # ignore the cached snapshot
 *   pnpm ingram:stock-refresh -- --legacy-orders orders.csv    # also count pre-Payload Snipcart sales
 *
 * A successful download is cached as a compact snapshot (our EANs only: on-hand and
 * orderable) in .ingram-stock-snapshot.json for 24 h, so reruns skip the ~15-minute
 * download. The SFTP feed is licensed for storing in our systems; the file is gitignored.
 *
 * Rules (src/app/utils/ingram/availabilityPlan.ts):
 *   - request-only / discontinued books are never touched;
 *   - a book that would go from buyable to "Request" but sold in store (Square) or on the
 *     website within the window is kept buyable by flagging its sold edition(s)
 *     available-to-order.
 *
 * The review CSV lists every book that would change, from our own catalog plus a reason.
 *
 * Over an SSH tunnel each book write costs dozens of round trips, so a full apply takes
 * hours. --only-rescues writes just the books only this script can save (the nightly job
 * has no sales data); the nightly job then writes the rest next to the database.
 *
 * (Run through the pnpm script: it adds the CSS stub loader the Payload config needs.)
 */
import dotenv from 'dotenv'
import { readFile, writeFile } from 'node:fs/promises'
import type { StockSnapshotInput } from '../src/app/utils/ingram/refreshCatalogStock'
import { resolve } from 'node:path'
dotenv.config({ path: './.env' })

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

const SNAPSHOT_CACHE = resolve('.ingram-stock-snapshot.json')
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** Retries transient network failures (e.g. after the laptop slept mid-run). */
async function withRetries<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= attempts) throw error
      const waitMs = 5000 * attempt
      console.warn(`[refresh] ${label} failed (${error instanceof Error ? error.message : error}); retry ${attempt}/${attempts - 1} in ${waitMs / 1000}s`)
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }
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
  const { parseSnipcartOrders } = await import('../src/app/utils/ingram/legacyOrders')

  const apply = process.argv.includes('--apply')
  const onlyRescues = process.argv.includes('--only-rescues')
  const soldSinceYears = Number(argValue('--sold-since-years') ?? 4)
  const reportPath = resolve(argValue('--report') ?? 'ingram-availability-review.csv')
  const payload = await getPayload({ config })
  // Over a tunnel, idle pooled connections get cut. pg emits that on the pool, and with no
  // listener it kills the process; the pool already discards the dead client on its own.
  ;(payload.db as any).pool?.on('error', (error: Error) => console.warn(`[refresh] idle database connection dropped (${error.message}); continuing`))
  const feed = stockFeedFromEnv()
  const checkedAt = new Date().toISOString()

  console.log(`[refresh] feed ${feed.name}: ${feed.remotePath} (${apply ? (onlyRescues ? 'APPLY, rescues only' : 'APPLY') : 'dry run'})`)
  const started = Date.now()
  let cached: { savedAt: string; input: StockSnapshotInput; counts: Record<string, number> } | null = null
  if (!process.argv.includes('--fresh')) {
    try {
      cached = JSON.parse(await readFile(SNAPSHOT_CACHE, 'utf8'))
      if (!cached || Date.now() - Date.parse(cached.savedAt) > SNAPSHOT_MAX_AGE_MS) cached = null
    } catch {
      cached = null
    }
  }
  const { input, counts } = cached
    ? cached
    : await fetchStockSnapshot(payload, {
        remotePath: feed.remotePath,
        format: feed.createFormat(),
        minLines: feed.minLines,
        threshold: Number(process.env.INGRAM_STOCK_THRESHOLD) || 10,
      })
  if (cached) {
    console.log(`[refresh] using cached snapshot from ${cached.savedAt} (pass --fresh to re-download):`, counts)
  } else {
    await writeFile(SNAPSHOT_CACHE, JSON.stringify({ savedAt: new Date().toISOString(), input, counts }))
    console.log(`[refresh] fetched in ${Math.round((Date.now() - started) / 1000)} s:`, counts)
  }
  const available = Object.values(input.stock).filter((s) => s.available).length
  console.log(`[refresh] matched EANs: ${counts.matched} (${available} available, ${counts.matched - available} not)`)

  let soldVariationIds: Map<string, string> | undefined
  let onlineSales: Awaited<ReturnType<typeof fetchOnlineSales>>['sales'] | undefined
  let soldEans: Map<string, string> | undefined
  if (soldSinceYears > 0) {
    const since = new Date()
    since.setFullYear(since.getFullYear() - soldSinceYears)
    const { SquareClient } = await import('square')
    const square = new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN! })
    const sales = await withRetries('Square sales lookup', () => fetchSoldVariationIds(square, since.toISOString()))
    soldVariationIds = sales.sold
    console.log(
      `[refresh] Square sales since ${since.toISOString().slice(0, 10)}: ${sales.orders} orders, ` +
        `${sales.sold.size} distinct variations, ${sales.locations} location(s)`,
    )
    const web = await withRetries('website sales lookup', () => fetchOnlineSales(payload, since.toISOString()))
    onlineSales = web.sales
    console.log(`[refresh] website sales since ${since.toISOString().slice(0, 10)}: ${web.orders} orders, ${web.sales.size} distinct books`)
    const legacyPath = argValue('--legacy-orders')
    if (legacyPath) {
      const legacy = parseSnipcartOrders(await readFile(legacyPath, 'utf8'), since.toISOString())
      soldEans = legacy.sold
      console.log(
        `[refresh] Snipcart sales since ${since.toISOString().slice(0, 10)}: ${legacy.counted} book lines, ${legacy.sold.size} distinct ISBNs ` +
          `(skipped: ${legacy.cancelled} cancelled, ${legacy.outsideWindow} before the window, ${legacy.notABook} non-book)`,
      )
    }
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
        soldEans,
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

      if (apply && plan.changed && (!onlyRescues || plan.transition === 'rescued-by-sales')) {
        try {
          await payload.update({
            collection: 'books',
            id: book.id,
            data: { editions: plan.editions },
            depth: 0,
            context: { skipEnrichment: true, ingramStockRefresh: true },
          })
          written += 1
          if (written % 25 === 0) console.log(`[refresh] written ${written} (at book ${books} of ~${result.totalDocs})`)
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
