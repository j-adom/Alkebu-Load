#!/usr/bin/env tsx
/**
 * Owner-run Ingram availability refresh. Dry-run by default: downloads the stock file,
 * filters it to our EANs and reports what WOULD change. Prints counts only, never
 * Ingram data, so the output can be shared.
 *
 *   pnpm ingram:stock-refresh                # dry run
 *   pnpm ingram:stock-refresh -- --apply     # write changed books
 *
 * (Run through the pnpm script: it adds the CSS stub loader the Payload config needs.)
 *
 * Reads the database in alkebu-load/.env (production, as of 2026-09-23). The dry run
 * only reads it.
 */
import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

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
  const { applyStockToEditions } = await import('../src/app/utils/ingram/applyIngramStock')
  const { applyStockSnapshot, fetchStockSnapshot } = await import('../src/app/utils/ingram/refreshCatalogStock')
  const { stockFeedFromEnv } = await import('../src/app/utils/ingram/stockFeeds')

  const apply = process.argv.includes('--apply')
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

  if (apply) {
    console.log('[refresh] applied:', await applyStockSnapshot(payload, input, { checkedAt }))
  } else {
    const stock = new Map(Object.entries(input.stock))
    let books = 0
    let wouldUpdate = 0
    for (let page = 1; ; page += 1) {
      const result = await payload.find({ collection: 'books', page, limit: 200, depth: 0, sort: 'id' })
      for (const book of result.docs) {
        books += 1
        if (applyStockToEditions((book as any).editions ?? [], stock, { checkedAt, fullCoverage: true }).changed) {
          wouldUpdate += 1
        }
      }
      if (!result.hasNextPage) break
    }
    console.log(`[refresh] dry run: ${wouldUpdate} of ${books} books would be updated`)
  }
  process.exit(0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
