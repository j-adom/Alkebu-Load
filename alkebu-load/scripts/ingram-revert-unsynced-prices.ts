#!/usr/bin/env tsx
/**
 * Undo one enrichment run's price uplifts that reached Payload but not Square. DRY RUN BY
 * DEFAULT; prints counts only.
 *
 *   pnpm ingram:revert-unsynced-prices -- --run ingram-2026-11-17-870112a2
 *   pnpm ingram:revert-unsynced-prices -- --run ingram-2026-11-17-870112a2 --apply
 *
 * Why: before the legacy-link guard, a price change on a Square-linked edition with no
 * real variation id went to Payload alone, so the website and the POS disagreed. This puts
 * those editions back to the price the run logged as previous (only where the price is
 * still the run's new value), removes their Ingram provenance and log rows, and re-derives
 * the book price. The next run, after `pnpm square:link-repair`, proposes the uplift again
 * and writes Square first. Payload-only editions and Square-synced changes are untouched.
 *
 * DATABASE_URI must point at production Postgres (over the tunnel). See
 * src/app/utils/ingram/revertUnsyncedPrices.ts.
 */
import { argValue, getProductionPayload } from './lib/productionPayload'

async function main() {
  const runId = argValue('--run')
  if (!runId) {
    console.error('[revert] --run <runId> is required (the "runId" from the enrichment summary)')
    process.exit(1)
  }
  // Make sure this process never runs an enrichment job.
  delete process.env.INGRAM_ENRICHMENT_ENABLED
  const apply = process.argv.includes('--apply')
  const payload = await getProductionPayload('revert')
  const { revertUnsyncedPrices } = await import('../src/app/utils/ingram/revertUnsyncedPrices')
  const summary = await revertUnsyncedPrices(payload as any, runId, { dryRun: !apply })
  console.log(JSON.stringify(summary, null, 2))
  process.exit(summary.booksFailed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
