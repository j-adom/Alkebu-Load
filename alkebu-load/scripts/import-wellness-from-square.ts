#!/usr/bin/env tsx
/**
 * Idempotent Square -> Payload importer for the Phase 1 wellness lines.
 *
 * Pulls every catalog item under the Square wellness/oils category tree, classifies
 * each item's NAME via matchProductLine() (Task 3), and upserts ONE Payload document
 * per product line. Many Square items collapse into a single document: 104 "Scented
 * Oil" SKUs become one oils-incense document with 104 scent variations; ~55 "Whipped
 * Shea Butter <scent>" SKUs become one wellness-lifestyle document.
 *
 * The upsert key is `slug` (== the line's lineKey), NOT squareItemId -- squareItemId
 * is a many-to-one relationship here (many Square items -> one Payload doc), so it
 * cannot be the identity. `slug` is set explicitly on every write so the collections'
 * auto-slug-from-name hook never fires (it would slugify the line name, which happens
 * to match lineKey today, but the two are conceptually separate).
 *
 * Prices are copied VERBATIM in cents from Square's price_money.amount (surfaced by
 * the SDK as a bigint; Number() only changes the JS representation, not the value).
 * Never multiplied, never divided -- that conversion is exactly the bug this project
 * exists to kill.
 *
 * publishOnline is never set. It defaults to false and only a human flips it on --
 * Square's wellness tree also contains a djembe drum, a bucket hat, and a line item
 * named "Shipping", so the category tree cannot be trusted as a publish signal.
 *
 * UPDATE PATH IS A MERGE, NOT A REPLACE. Payload array fields do not row-reconcile on
 * update -- setting `variations` in `data` replaces the ENTIRE stored array. Rebuilding
 * it fresh from Square on every run would silently reset `stock` (kept live by the
 * Square inventory webhook), drop `weight` (Shippo mis-rates shipping without it), and
 * wipe any staff `isAvailable` toggle. `mergeVariations()` (src/app/utils/
 * wellnessVariationMerge.ts) fixes this: it starts from the EXISTING row for every
 * variation Square still carries and only overwrites the fields Square owns (price,
 * sku, scent, variantName, squareItemId). Variations gone from Square are kept (never
 * deleted) and reported for human review, never silently dropped.
 *
 * SAME OWNERSHIP SPLIT APPLIES AT THE DOCUMENT LEVEL: Square owns price/stock
 * (via variations[]); Payload owns name, slug, productType, images, and all
 * marketing copy once a document exists. The UPDATE payload (built by
 * buildWellnessLifestyleUpdateDoc / buildOilsIncenseUpdateDoc in
 * src/app/utils/wellnessImportDocs.ts) therefore never includes `name`,
 * `slug`, or `productType` -- only the CREATE path seeds those, once, from
 * Square's item name/category. Sending them on every update would silently
 * revert a staff rename, a hand-edited marketing slug, or a staff correction
 * to a misdetected productType -- and on OilsIncense, productType IS the
 * storefront-section selector (resolveOilsIncenseShopSection), so reverting
 * it flips the URL section and 404s a slug already indexed by Google.
 *
 * Defaults to --dry-run; pass --commit to write. Every skipped item and every orphaned
 * (in Payload, gone from Square) variation is printed in full (never truncated) -- a
 * silently-dropped sellable product or a silently-discarded row would look identical to
 * full coverage otherwise. A failing line is caught, recorded, and does not stop the
 * rest of the run or suppress the summary.
 *
 * The Square-items -> pending-lines matching/grouping logic (fetchWellnessItems,
 * buildImportPlan, buildWellnessLifestyleVariations, buildOilsIncenseVariations) lives
 * in src/app/utils/wellnessImportPlan.ts, shared with
 * scripts/import-wellness-via-rest.ts (the REST-API variant that runs against
 * production, where this script's Local API cannot reach) so the two can never drift.
 */

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import { SquareClient } from 'square'
import {
  fetchWellnessItems,
  buildImportPlan,
  buildWellnessLifestyleVariations,
  buildOilsIncenseVariations,
  type PendingLine,
  type WellnessVariation,
  type OilsIncenseVariation,
} from '../src/app/utils/wellnessImportPlan'
import { mergeVariations } from '../src/app/utils/wellnessVariationMerge'
import {
  buildWellnessLifestyleCreateDoc,
  buildWellnessLifestyleUpdateDoc,
  buildOilsIncenseCreateDoc,
  buildOilsIncenseUpdateDoc,
} from '../src/app/utils/wellnessImportDocs'

// Deliberately NOT importing src/payload-types.ts here. That file's `declare module
// 'payload'` augmentation is ambient/global: once any file in this tsc program
// imports it, Payload's generated collection types apply to EVERY payload.find /
// .create / .update call in every script under scripts/ -- not just this one. Several
// other scripts (e.g. import-square-to-payload.ts) build Lexical `description` objects
// that don't structurally match the strict generated type and would newly fail
// `pnpm check:scripts` as a side effect of a change scoped to this file. The row
// shapes below are hand-written to match the two collections' variations[] schemas
// (WellnessLifestyle.ts / OilsIncense.ts) instead.

dotenv.config({ path: './.env' })

// payload.config.ts reads process.env.PAYLOAD_SECRET at module-evaluation time. ES
// module static imports are hoisted and evaluated before this file's own top-level
// statements run, so a static `import config from '../src/payload.config'` would
// bake in an empty secret regardless of where dotenv.config() appears in this file.
// Importing it dynamically -- after dotenv.config() has actually run -- is the
// pattern already established in scripts/check-import-stats.ts.

const COMMIT = process.argv.includes('--commit')

const squareClient = new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN! })

// name/slug/productType/update-doc ownership split lives in wellnessImportDocs.ts
// (shared, unit-tested pure builders) -- CREATE seeds name/slug/productType once;
// UPDATE sends only the field Square owns on every re-sync (variations).
function buildWellnessLifestyleDoc(lineKey: string, line: PendingLine, variations: WellnessVariation[]) {
  return buildWellnessLifestyleCreateDoc({
    name: line.match.lineName,
    slug: lineKey,
    productType: line.match.productType,
    variations,
  })
}

// CREATE path only -- see buildWellnessLifestyleDoc above.
function buildOilsIncenseDoc(lineKey: string, line: PendingLine, variations: OilsIncenseVariation[]) {
  return buildOilsIncenseCreateDoc({
    name: line.match.lineName,
    slug: lineKey,
    productType: line.match.productType,
    variations,
  })
}

async function main() {
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })

  console.log('Fetching Square wellness/oils catalog…\n')
  const items = await fetchWellnessItems(squareClient)
  console.log(`Fetched ${items.length} items from the Square wellness tree.\n`)

  const { lines, skipped } = buildImportPlan(items)

  let created = 0
  let updated = 0
  let variationCount = 0

  const orphanedReport: Array<{
    lineKey: string
    lineName: string
    orphaned: Array<{ sku: string; scent?: string | null; squareVariationId?: string | null }>
  }> = []

  const failures: Array<{ lineKey: string; lineName: string; error: string }> = []

  for (const [lineKey, line] of lines) {
    variationCount += line.variations.length

    if (!COMMIT) {
      console.log(
        `[dry-run] ${lineKey} (${line.match.collection}) — ${line.variations.length} variations`,
      )
      continue
    }

    // Each line's write is isolated: one failing line (a Payload validation error, a
    // transient DB hiccup) must not throw out of main() and suppress the summary/skip
    // list for every other line. Record it and keep going.
    try {
      if (line.match.collection === 'wellness-lifestyle') {
        const incomingVariations = buildWellnessLifestyleVariations(line)
        const existing = await payload.find({
          collection: 'wellness-lifestyle',
          where: { slug: { equals: lineKey } },
          limit: 1,
          depth: 0,
        })

        if (existing.docs.length > 0) {
          // payload.find()'s return type is only as strict as GeneratedTypes -- which
          // this file deliberately does not import (see the comment above). Casting at
          // this one boundary point to the hand-written row shape keeps the merge logic
          // itself fully typed without pulling that augmentation into the whole program.
          const existingDoc = existing.docs[0] as { id: string | number; variations?: WellnessVariation[] }
          const { merged, orphaned } = mergeVariations(
            existingDoc.variations ?? [],
            incomingVariations,
          )
          const data = buildWellnessLifestyleUpdateDoc({ variations: merged })
          await payload.update({ collection: 'wellness-lifestyle', id: existingDoc.id, data })
          updated++
          if (orphaned.length > 0) {
            orphanedReport.push({ lineKey, lineName: line.match.lineName, orphaned })
          }
        } else {
          const data = buildWellnessLifestyleDoc(lineKey, line, incomingVariations)
          await payload.create({ collection: 'wellness-lifestyle', data })
          created++
        }
      } else {
        const incomingVariations = buildOilsIncenseVariations(line)
        const existing = await payload.find({
          collection: 'oils-incense',
          where: { slug: { equals: lineKey } },
          limit: 1,
          depth: 0,
        })

        if (existing.docs.length > 0) {
          const existingDoc = existing.docs[0] as { id: string | number; variations?: OilsIncenseVariation[] }
          const { merged, orphaned } = mergeVariations(
            existingDoc.variations ?? [],
            incomingVariations,
          )
          const data = buildOilsIncenseUpdateDoc({ variations: merged })
          await payload.update({ collection: 'oils-incense', id: existingDoc.id, data })
          updated++
          if (orphaned.length > 0) {
            orphanedReport.push({ lineKey, lineName: line.match.lineName, orphaned })
          }
        } else {
          const data = buildOilsIncenseDoc(lineKey, line, incomingVariations)
          await payload.create({ collection: 'oils-incense', data })
          created++
        }
      }
    } catch (err) {
      failures.push({
        lineKey,
        lineName: line.match.lineName,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const totalSkipped =
    skipped.unmatched.length +
    skipped.noPrice.length +
    skipped.noPricedVariation.length +
    skipped.malformed.length

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Lines:      ${lines.size}  (created ${created}, updated ${updated}, failed ${failures.length})`)
  console.log(`Variations: ${variationCount}`)
  console.log(
    `Skipped:    ${totalSkipped} (${skipped.unmatched.length} unmatched items, ` +
      `${skipped.noPrice.length} variations with no price, ` +
      `${skipped.noPricedVariation.length} lines with no priced variation` +
      `${skipped.malformed.length ? `, ${skipped.malformed.length} malformed/no id` : ''})`,
  )
  const totalOrphaned = orphanedReport.reduce((sum, entry) => sum + entry.orphaned.length, 0)
  console.log(
    `Orphaned:   ${totalOrphaned} variation(s) across ${orphanedReport.length} line(s) — in Payload but gone from Square`,
  )
  console.log(`${'='.repeat(60)}\n`)

  // Never truncate any of these lists -- a silently-dropped sellable product, a
  // silently-discarded variation, or a silently-suppressed write failure would look
  // identical to full coverage otherwise.
  console.log('UNMATCHED ITEMS (read this list — any sellable product here is a Task 3 bug):')
  for (const name of skipped.unmatched) console.log(`  - ${name}`)

  console.log('\nVARIATIONS WITH NO PRICE:')
  for (const name of skipped.noPrice) console.log(`  - ${name}`)

  console.log('\nLINES WITH NO PRICED VARIATION:')
  for (const name of skipped.noPricedVariation) console.log(`  - ${name}`)

  if (skipped.malformed.length > 0) {
    console.log('\nMALFORMED (missing id from Square):')
    for (const name of skipped.malformed) console.log(`  - ${name}`)
  }

  if (orphanedReport.length > 0) {
    console.log('\nIN PAYLOAD BUT GONE FROM SQUARE (review — possibly discontinued):')
    for (const entry of orphanedReport) {
      console.log(`  ${entry.lineKey} (${entry.lineName}):`)
      for (const v of entry.orphaned) {
        console.log(
          `    - sku ${v.sku}${v.scent ? `, scent ${v.scent}` : ''} (squareVariationId ${v.squareVariationId ?? 'none'})`,
        )
      }
    }
  }

  if (failures.length > 0) {
    console.log('\nFAILED LINES (write error — NOT imported, fix and re-run):')
    for (const f of failures) {
      console.log(`  - ${f.lineKey} (${f.lineName}): ${f.error}`)
    }
  }

  if (!COMMIT) console.log('\nDry run. Nothing was written. Re-run with --commit to persist.')

  process.exit(failures.length > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
