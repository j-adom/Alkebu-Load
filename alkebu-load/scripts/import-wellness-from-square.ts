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
 * Defaults to --dry-run; pass --commit to write. Every skipped item and every orphaned
 * (in Payload, gone from Square) variation is printed in full (never truncated) -- a
 * silently-dropped sellable product or a silently-discarded row would look identical to
 * full coverage otherwise. A failing line is caught, recorded, and does not stop the
 * rest of the run or suppress the summary.
 */

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import { SquareClient, type CatalogObject } from 'square'
import { matchProductLine, type ProductLineMatch } from '../src/app/utils/wellnessProductLines'
import { mergeVariations } from '../src/app/utils/wellnessVariationMerge'

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

// The Square wellness/oils category tree. Verified live against the production
// Square account (July 2026) -- each id below resolved to the name in the comment
// via `catalog.list({ types: 'CATEGORY' })`.
const CATEGORY_IDS = [
  '6LSVL2XWVFKVKMIHJUZGVI35', // Health & Wellness
  'MLL5J7VLSPWJRT4OX5SZ4Z5V', // Nutrition
  'KVKKAD53DMSLVTMVH4CFL7LU', // Hair & Skincare
  'OYJXH3GRV6BAOFFD36YBP6UB', // Skincare
  'A4EKDSWHNJTNU35SHTFIIQNK', // Shea Butter
  'XLJ6GDZ225D2XENLZSM2QTGM', // Soaps
  'TLA45UGMDFF47DWXMSIMXCYN', // Lotions
  'ONNOCCEW6JQ3KJJZXSK3EMZZ', // Body Butters & Oils
  'DYGPHUQUGYTWXRIDXWFFCKY4', // Hair Products
  'HOTU26XFEIY5AZ4M22JPR7CE', // Incense & Oils
]

const COMMIT = process.argv.includes('--commit')

const squareClient = new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN! })

type CatalogItemObject = Extract<CatalogObject, { type: 'ITEM' }>
type CatalogItemVariationObject = Extract<CatalogObject, { type: 'ITEM_VARIATION' }>

const isCatalogItem = (obj: CatalogObject): obj is CatalogItemObject =>
  obj.type === 'ITEM' && !!obj.itemData

const isCatalogItemVariation = (obj: CatalogObject): obj is CatalogItemVariationObject =>
  obj.type === 'ITEM_VARIATION' && !!obj.itemVariationData

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// Money.amount comes back as a bigint from the SDK. Number() only changes the JS
// representation of the same integer value -- it is not a magnitude conversion.
// Cents amounts here are always small enough to round-trip through Number exactly.
const centsVerbatim = (amount: bigint | null | undefined): number | undefined =>
  amount === null || amount === undefined ? undefined : Number(amount)

interface PendingVariation {
  sku: string
  scent?: string
  variantName?: string
  price: number
  stock: number
  squareItemId: string
  squareVariationId: string
}

interface PendingLine {
  match: ProductLineMatch
  variations: PendingVariation[]
}

// Matches WellnessLifestyle.ts's variations[] fields that this importer reads or
// writes. Other schema fields (size, packaging, concentration, color) are never
// touched by this script -- mergeVariations() preserves them via `...match` untyped.
interface WellnessVariation {
  sku: string
  scent?: string
  variantName?: string
  price: number
  stock?: number
  squareItemId?: string
  squareVariationId?: string
  weight?: number
  isAvailable?: boolean
  id?: string
}

// Matches OilsIncense.ts's variations[] fields. No squareItemId -- that field does not
// exist on this collection's schema.
interface OilsIncenseVariation {
  sku: string
  scent?: string
  variantName?: string
  price: number
  stock?: number
  squareVariationId?: string
  weight?: number
  isAvailable?: boolean
  id?: string
}

async function fetchWellnessItems(): Promise<CatalogItemObject[]> {
  const items: CatalogItemObject[] = []
  let cursor: string | undefined

  do {
    const response = await squareClient.catalog.searchItems({
      categoryIds: CATEGORY_IDS,
      limit: 100,
      cursor,
    })

    for (const obj of response.items ?? []) {
      if (isCatalogItem(obj)) items.push(obj)
    }

    cursor = response.cursor
  } while (cursor)

  return items
}

// Incoming (Square-sourced) variation rows for a wellness-lifestyle line. `stock: 0`
// and no `weight` here are only ever used for a genuinely NEW row -- mergeVariations()
// preserves the existing row's stock/weight/isAvailable/etc. for everything else.
function buildWellnessLifestyleVariations(line: PendingLine): WellnessVariation[] {
  return line.variations.map((v) => ({
    sku: v.sku,
    scent: v.scent,
    variantName: v.variantName,
    price: v.price,
    stock: v.stock,
    squareItemId: v.squareItemId,
    squareVariationId: v.squareVariationId,
  }))
}

function buildWellnessLifestyleDoc(lineKey: string, line: PendingLine, variations: WellnessVariation[]) {
  return {
    name: line.match.lineName,
    slug: lineKey,
    productType: line.match.productType,
    variations,
  }
}

// OilsIncense.variations[] has no squareItemId field in the schema (only
// squareVariationId) -- deliberately omitted here so the merge's `'squareItemId' in
// inc` check correctly leaves it untouched.
function buildOilsIncenseVariations(line: PendingLine): OilsIncenseVariation[] {
  return line.variations.map((v) => ({
    sku: v.sku,
    scent: v.scent,
    variantName: v.variantName,
    price: v.price,
    stock: v.stock,
    squareVariationId: v.squareVariationId,
  }))
}

function buildOilsIncenseDoc(lineKey: string, line: PendingLine, variations: OilsIncenseVariation[]) {
  return {
    name: line.match.lineName,
    slug: lineKey,
    productType: line.match.productType,
    variations,
  }
}

async function main() {
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })

  console.log('Fetching Square wellness/oils catalog…\n')
  const items = await fetchWellnessItems()
  console.log(`Fetched ${items.length} items from the Square wellness tree.\n`)

  const lines = new Map<string, PendingLine>()

  // Categorized rather than one flat list -- a bare "Skipped: N" header conflated three
  // very different situations. Each list below is still printed in FULL, never truncated.
  const skipped = {
    unmatched: [] as string[], // Square item name didn't match any Phase 1 line
    noPrice: [] as string[], // a matched item's variation carried no price
    noPricedVariation: [] as string[], // matched line, but every variation on it lacked a price
    malformed: [] as string[], // defensive: item/variation with no id from Square (should be rare/never)
  }

  for (const item of items) {
    const itemId = item.id
    const name = (item.itemData?.name ?? '').trim()

    if (!itemId) {
      skipped.malformed.push(`(item with no id, name: "${name}")`)
      continue
    }

    const match = matchProductLine(name)

    if (!match) {
      skipped.unmatched.push(name || `(unnamed item ${itemId})`)
      continue
    }

    const line: PendingLine = lines.get(match.lineKey) ?? { match, variations: [] }

    for (const variationObj of item.itemData?.variations ?? []) {
      if (!isCatalogItemVariation(variationObj)) continue

      const variationId = variationObj.id
      if (!variationId) {
        skipped.malformed.push(`${name} (a variation with no id)`)
        continue
      }

      const price = centsVerbatim(variationObj.itemVariationData?.priceMoney?.amount)
      if (price === undefined) {
        skipped.noPrice.push(`${name} (variation ${variationId}: no price)`)
        continue
      }

      // Square's item_variation_data.name carries the size/option label (e.g. "1 oz",
      // "1/4 oz", "Roll-on") for scent-axis and no-axis lines -- this is the size signal
      // that wellnessWeightDefaults.ts needs and that was previously discarded entirely
      // (the bug this importer exists to fix).
      //
      // For size-axis lines (raw-black-soap, round-black-soap) the size distinction is
      // NOT reliably on the variation -- verified live: Raw Black Soap's variation name
      // is blank, but Round Black Soap's variation name is populated with something else
      // entirely unrelated to size ("Black", the soap's color; "Regular", Square's own
      // generic default) that would silently mask the real "Small" distinction if used
      // here. The size axis for these two lines lives on the SQUARE ITEM name --
      // matchProductLine() already parses it into `variantLabel` ("1 lb"/"1/2 lb",
      // "Small"/"Regular") -- so that is the source of truth for variantName on these
      // lines, unconditionally, never Square's per-variation name.
      const sizeLabel = variationObj.itemVariationData?.name ?? ''
      const variantName =
        (match.variantAxis === 'size' ? match.variantLabel : sizeLabel) || undefined

      line.variations.push({
        sku:
          variationObj.itemVariationData?.sku ||
          `${match.lineKey}-${slugify(match.variantLabel)}-${slugify(sizeLabel)}`.replace(/-+$/, ''),
        scent: match.variantAxis === 'scent' ? match.variantLabel : undefined,
        variantName,
        price,
        stock: 0, // Only used for a genuinely new row -- see mergeVariations().
        squareItemId: itemId,
        squareVariationId: variationId,
      })
    }

    lines.set(match.lineKey, line)
  }

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
    if (line.variations.length === 0) {
      // Matched a Phase 1 line, but every variation on every Square item for that
      // line lacked a price. minRows: 1 on variations[] would reject this document
      // anyway -- surface it as a skip instead of a create/update failure.
      skipped.noPricedVariation.push(
        `${line.match.lineName} (lineKey "${lineKey}"): matched but zero priced variations -- no document written`,
      )
      continue
    }

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
          const data = buildWellnessLifestyleDoc(lineKey, line, merged)
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
          const data = buildOilsIncenseDoc(lineKey, line, merged)
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
