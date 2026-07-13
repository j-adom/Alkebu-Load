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
 * Defaults to --dry-run; pass --commit to write. Every skipped item is printed in
 * full (never truncated) -- a silently-dropped sellable product would look identical
 * to full coverage otherwise.
 */

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import { SquareClient, type CatalogObject } from 'square'
import { matchProductLine, type ProductLineMatch } from '../src/app/utils/wellnessProductLines'

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
  price: number
  stock: number
  squareItemId: string
  squareVariationId: string
}

interface PendingLine {
  match: ProductLineMatch
  variations: PendingVariation[]
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

// Builds the Payload document for a wellness-lifestyle line. squareItemId is stored
// per-variation because that field exists on WellnessLifestyle.variations[].
function buildWellnessLifestyleDoc(lineKey: string, line: PendingLine) {
  return {
    name: line.match.lineName,
    slug: lineKey,
    productType: line.match.productType as 'body-butter' | 'soap',
    variations: line.variations.map((v) => ({
      sku: v.sku,
      scent: v.scent,
      price: v.price,
      stock: v.stock,
      squareItemId: v.squareItemId,
      squareVariationId: v.squareVariationId,
    })),
  }
}

// Builds the Payload document for an oils-incense line. squareItemId is deliberately
// NOT included: OilsIncense.variations[] has no such field in the schema (only
// squareVariationId). squareVariationId alone is sufficient for the Task 5 stock sync.
function buildOilsIncenseDoc(lineKey: string, line: PendingLine) {
  return {
    name: line.match.lineName,
    slug: lineKey,
    productType: line.match.productType as 'fragrance-oil',
    variations: line.variations.map((v) => ({
      sku: v.sku,
      scent: v.scent,
      price: v.price,
      stock: v.stock,
      squareVariationId: v.squareVariationId,
    })),
  }
}

async function main() {
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })

  console.log('Fetching Square wellness/oils catalog…\n')
  const items = await fetchWellnessItems()
  console.log(`Fetched ${items.length} items from the Square wellness tree.\n`)

  const lines = new Map<string, PendingLine>()
  const skipped: string[] = []

  for (const item of items) {
    const itemId = item.id
    const name = (item.itemData?.name ?? '').trim()

    if (!itemId) {
      skipped.push(`(item with no id, name: "${name}")`)
      continue
    }

    const match = matchProductLine(name)

    if (!match) {
      skipped.push(name || `(unnamed item ${itemId})`)
      continue
    }

    const line: PendingLine = lines.get(match.lineKey) ?? { match, variations: [] }

    for (const variationObj of item.itemData?.variations ?? []) {
      if (!isCatalogItemVariation(variationObj)) continue

      const variationId = variationObj.id
      if (!variationId) {
        skipped.push(`${name} (a variation with no id)`)
        continue
      }

      const price = centsVerbatim(variationObj.itemVariationData?.priceMoney?.amount)
      if (price === undefined) {
        skipped.push(`${name} (variation ${variationId}: no price)`)
        continue
      }

      const sizeLabel = variationObj.itemVariationData?.name ?? ''

      line.variations.push({
        sku:
          variationObj.itemVariationData?.sku ||
          `${match.lineKey}-${slugify(match.variantLabel)}-${slugify(sizeLabel)}`.replace(/-+$/, ''),
        scent: match.variantAxis === 'scent' ? match.variantLabel : undefined,
        price,
        stock: 0, // The inventory webhook (Task 5) is the live source of truth.
        squareItemId: itemId,
        squareVariationId: variationId,
      })
    }

    lines.set(match.lineKey, line)
  }

  let created = 0
  let updated = 0
  let variationCount = 0

  for (const [lineKey, line] of lines) {
    if (line.variations.length === 0) {
      // Matched a Phase 1 line, but every variation on every Square item for that
      // line lacked a price. minRows: 1 on variations[] would reject this document
      // anyway -- surface it as a skip instead of a create/update failure.
      skipped.push(
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

    if (line.match.collection === 'wellness-lifestyle') {
      const data = buildWellnessLifestyleDoc(lineKey, line)
      const existing = await payload.find({
        collection: 'wellness-lifestyle',
        where: { slug: { equals: lineKey } },
        limit: 1,
        depth: 0,
      })

      if (existing.docs.length > 0) {
        await payload.update({ collection: 'wellness-lifestyle', id: existing.docs[0].id, data })
        updated++
      } else {
        await payload.create({ collection: 'wellness-lifestyle', data })
        created++
      }
    } else {
      const data = buildOilsIncenseDoc(lineKey, line)
      const existing = await payload.find({
        collection: 'oils-incense',
        where: { slug: { equals: lineKey } },
        limit: 1,
        depth: 0,
      })

      if (existing.docs.length > 0) {
        await payload.update({ collection: 'oils-incense', id: existing.docs[0].id, data })
        updated++
      } else {
        await payload.create({ collection: 'oils-incense', data })
        created++
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Lines:      ${lines.size}  (created ${created}, updated ${updated})`)
  console.log(`Variations: ${variationCount}`)
  console.log(`Skipped:    ${skipped.length}`)
  console.log(`${'='.repeat(60)}\n`)

  // Never truncate this silently -- a sellable product hiding in the skip list is
  // a mapping-table bug, and printing only a count would conceal it.
  console.log('SKIPPED ITEMS (read this list — any sellable product here is a Task 3 bug):')
  for (const name of skipped) console.log(`  - ${name}`)

  if (!COMMIT) console.log('\nDry run. Nothing was written. Re-run with --commit to persist.')

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
