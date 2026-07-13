#!/usr/bin/env tsx
/**
 * Backfills `variations[].weight` (shipped weight in OUNCES, including
 * packaging) on WellnessLifestyle and OilsIncense documents.
 *
 * Shippo mis-rates a shipment without a real weight, and wellness is NOT
 * Media Mail eligible (that default is book-only) -- a mis-rated shipment
 * eats the margin on a $14.99 tub. Square does not carry packaging weight,
 * so defaults are derived from the product line (and, where the line has a
 * size axis, a size signal on the row itself) via
 * src/app/utils/wellnessWeightDefaults.ts.
 *
 * NEVER overwrites a weight that is already set -- a staff-entered weight is
 * authoritative. NEVER touches `publishOnline` -- that is the human
 * curation gate (Task 3/4).
 *
 * Payload does NOT row-reconcile array fields on update -- sending
 * `variations` in `data` REPLACES the entire stored array. This is exactly
 * the bug class that hit Task 4's importer (wiped synced stock and weights)
 * and had to be guarded against again in Task 5. This script avoids it the
 * same way those did: `applyWeightsToVariations` starts from the EXISTING
 * row for every variation and only overwrites `weight` on rows where it is
 * currently unset, preserving every other field (price, stock, sku, scent,
 * isAvailable, squareVariationId, size, packaging, ...) via a spread.
 *
 * A document's lineKey is its `slug` -- the wellness importer
 * (scripts/import-wellness-from-square.ts) always sets `slug` explicitly to
 * the lineKey produced by matchProductLine(), so slug === lineKey for every
 * doc it wrote.
 *
 * Defaults to --dry-run; pass --commit to write. Every line's outcome
 * (filled / already-set / unresolved) is printed, and every unresolved
 * variation is listed with a reason -- an unset weight that is reported is
 * far better than a wrong weight that silently mis-rates shipping.
 */

import dotenv from 'dotenv'

import { applyWeightsToVariations, type WeightableVariation } from '../src/app/utils/wellnessWeightDefaults'

dotenv.config({ path: './.env' })

// Deliberately NOT importing src/payload-types.ts -- see the same comment in
// scripts/import-wellness-from-square.ts. That file's `declare module 'payload'`
// augmentation is ambient/global across the whole check:scripts tsc program;
// this script uses hand-written row shapes instead.

const COMMIT = process.argv.includes('--commit')
const PAGE_SIZE = 100
const WELLNESS_COLLECTIONS = ['wellness-lifestyle', 'oils-incense'] as const
type WellnessCollectionSlug = (typeof WELLNESS_COLLECTIONS)[number]

interface WellnessDoc {
  id: string | number
  slug?: string | null
  name?: string | null
  variations?: WeightableVariation[] | null
}

interface LineSummary {
  collection: WellnessCollectionSlug
  lineKey: string
  lineName: string
  filled: number
  alreadySet: number
  unresolved: number
}

interface UnresolvedEntry {
  collection: WellnessCollectionSlug
  lineKey: string
  lineName: string
  sku?: string | null
  reason: string
}

async function main() {
  // payload.config.ts reads process.env.PAYLOAD_SECRET / DATABASE_URI at
  // module-evaluation time. Static imports are hoisted ahead of this file's
  // own top-level statements, so dotenv.config() above would run too late for
  // a static `import config from '../src/payload.config'`. Importing both
  // payload.config and payload dynamically -- after dotenv has actually run --
  // matches the established pattern in scripts/import-wellness-from-square.ts.
  const { default: config } = await import('../src/payload.config')
  const { getPayload } = await import('payload')
  const payload = await getPayload({ config })

  console.log('WELLNESS SHIPPING WEIGHT BACKFILL')
  console.log(JSON.stringify({ dryRun: !COMMIT }, null, 2))
  console.log()

  let totalFilled = 0
  let totalAlreadySet = 0
  let totalUnresolved = 0
  let docsTouched = 0

  const perLine: LineSummary[] = []
  const unresolvedDetail: UnresolvedEntry[] = []

  for (const collection of WELLNESS_COLLECTIONS) {
    let page = 1

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = (await payload.find({
        collection,
        limit: PAGE_SIZE,
        page,
        depth: 0,
      })) as { docs: WellnessDoc[]; hasNextPage: boolean; nextPage?: number | null }

      for (const doc of result.docs) {
        const lineKey = doc.slug || ''
        const lineName = doc.name || lineKey || `(doc ${doc.id})`
        const variations = Array.isArray(doc.variations) ? doc.variations : []

        if (variations.length === 0) continue

        const { variations: nextVariations, filled, alreadySet, unresolved } = applyWeightsToVariations(
          variations,
          lineKey,
        )

        totalFilled += filled
        totalAlreadySet += alreadySet
        totalUnresolved += unresolved.length

        perLine.push({ collection, lineKey, lineName, filled, alreadySet, unresolved: unresolved.length })

        for (const u of unresolved) {
          unresolvedDetail.push({ collection, lineKey, lineName, sku: u.sku, reason: u.reason })
        }

        if (filled > 0) {
          docsTouched += 1

          if (COMMIT) {
            // publishOnline and every field this script doesn't own are left
            // out of `data` entirely -- only `variations` is sent, and that
            // array is the merged one (existing rows preserved, weight filled
            // only where it was unset), never a freshly rebuilt one.
            await payload.update({ collection, id: doc.id, data: { variations: nextVariations } })
          }
        }
      }

      if (!result.hasNextPage) break
      page = result.nextPage || page + 1
    }
  }

  console.log('='.repeat(70))
  console.log(`Docs ${COMMIT ? 'updated' : 'that would be updated'}: ${docsTouched}`)
  console.log(`Variations filled:      ${totalFilled}`)
  console.log(`Variations already set:  ${totalAlreadySet} (untouched -- staff value preserved)`)
  console.log(`Variations unresolved:   ${totalUnresolved} (no default -- needs a human-supplied weight)`)
  console.log('='.repeat(70))

  console.log('\nBY LINE:')
  for (const line of perLine) {
    console.log(
      `  [${line.collection}] ${line.lineKey} (${line.lineName}): ` +
        `filled ${line.filled}, already-set ${line.alreadySet}, unresolved ${line.unresolved}`,
    )
  }

  if (unresolvedDetail.length > 0) {
    console.log('\nLINES WITH NO DEFAULT APPLIED (review and set a weight manually):')
    const reasonByLine = new Map<string, string>()
    const countByLine = new Map<string, number>()
    for (const u of unresolvedDetail) {
      reasonByLine.set(u.lineKey, u.reason)
      countByLine.set(u.lineKey, (countByLine.get(u.lineKey) || 0) + 1)
    }
    for (const [lineKey, reason] of reasonByLine) {
      console.log(`  - ${lineKey}: ${countByLine.get(lineKey)} variation(s) -- ${reason}`)
    }

    console.log('\nUNRESOLVED VARIATIONS (full list, by sku):')
    for (const u of unresolvedDetail) {
      console.log(`  - [${u.collection}] ${u.lineKey} / sku ${u.sku ?? '(none)'}: ${u.reason}`)
    }
  }

  if (!COMMIT) {
    console.log('\nDry run. Nothing was written. Re-run with --commit to persist.')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
