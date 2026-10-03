#!/usr/bin/env tsx
/**
 * Owner-run Ingram availability refresh. Dry-run by default: downloads the stock file,
 * filters it to our EANs and reports what WOULD change. Prints counts only, never
 * Ingram data, so the output can be shared.
 *
 *   tsx scripts/ingram-stock-refresh.ts            # dry run
 *   tsx scripts/ingram-stock-refresh.ts --apply    # write changed books
 *
 * Reads the database in alkebu-load/.env (production, as of 2026-09-23). The dry run
 * only reads it.
 */
import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'
import config from '../src/payload.config.js'
import { applyStockToEditions } from '../src/app/utils/ingram/applyIngramStock'
import { applyStockSnapshot, fetchStockSnapshot } from '../src/app/utils/ingram/refreshCatalogStock'
import { stockFeedFromEnv } from '../src/app/utils/ingram/stockFeeds'

async function main() {
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
