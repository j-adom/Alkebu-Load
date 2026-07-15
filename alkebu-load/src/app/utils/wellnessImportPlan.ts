/**
 * Shared "Square catalog items -> pending Payload lines" logic for the wellness/oils
 * importer. Both scripts/import-wellness-from-square.ts (Local API, runs against a
 * dev/staging DB that has Payload source available) and
 * scripts/import-wellness-via-rest.ts (public REST API, runs against production from
 * anywhere -- prod is a PRUNED container build with no scripts/ source, so the
 * Local-API importer physically cannot run there) import from here so the matching,
 * grouping, and skip-categorization logic can never drift between the two.
 *
 * Everything below is PURE with respect to Square/Payload I/O except
 * fetchWellnessItems(), which is the one paginated network call both importers share.
 * buildImportPlan() takes an array of already-fetched catalog items and returns a plan
 * -- it makes no network or DB calls, which is what makes it unit-testable without a
 * live Square client or Payload instance (see tests/import/wellnessImportPlan.test.ts).
 */

import { SquareClient, type CatalogObject } from 'square'
import { matchProductLine, type ProductLineMatch } from './wellnessProductLines'

// The Square wellness/oils category tree. Verified live against the production
// Square account (July 2026) -- each id below resolved to the name in the comment
// via `catalog.list({ types: 'CATEGORY' })`.
export const CATEGORY_IDS = [
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

export type CatalogItemObject = Extract<CatalogObject, { type: 'ITEM' }>
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

export interface PendingVariation {
  sku: string
  scent?: string
  variantName?: string
  price: number
  stock: number
  squareItemId: string
  squareVariationId: string
}

export interface PendingLine {
  match: ProductLineMatch
  variations: PendingVariation[]
}

// Matches WellnessLifestyle.ts's variations[] fields that this importer reads or
// writes. Other schema fields (size, packaging, concentration, color) are never
// touched by this script -- mergeVariations() preserves them via `...match` untyped.
export interface WellnessVariation {
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
export interface OilsIncenseVariation {
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

// Categorized rather than one flat list -- a bare "Skipped: N" header conflated three
// very different situations. Each list is printed in FULL, never truncated, by the
// calling script.
export interface SkippedLines {
  unmatched: string[] // Square item name didn't match any Phase 1 line
  noPrice: string[] // a matched item's variation carried no price
  noPricedVariation: string[] // matched line, but every variation on it lacked a price
  malformed: string[] // defensive: item/variation with no id from Square (should be rare/never)
}

export interface ImportPlan {
  lines: Map<string, PendingLine>
  skipped: SkippedLines
}

export async function fetchWellnessItems(squareClient: SquareClient): Promise<CatalogItemObject[]> {
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

// PURE grouping loop: classifies each item's NAME via matchProductLine() and upserts
// it into ONE pending line per lineKey. Many Square items collapse into a single line
// (104 "Scented Oil" SKUs -> one oils-incense line with 104 scent variations). Makes
// no network or DB calls -- see tests/import/wellnessImportPlan.test.ts.
export function buildImportPlan(items: CatalogItemObject[]): ImportPlan {
  const lines = new Map<string, PendingLine>()

  const skipped: SkippedLines = {
    unmatched: [],
    noPrice: [],
    noPricedVariation: [],
    malformed: [],
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

  // A line that matched a Phase 1 product but ended up with zero priced variations
  // (every Square item/variation for it lacked a price) would fail minRows: 1 on
  // variations[] anyway -- surface it as a skip here instead of a create/update
  // failure downstream, and keep it out of the pending-lines map entirely.
  const pendingLines = new Map<string, PendingLine>()
  for (const [lineKey, line] of lines) {
    if (line.variations.length === 0) {
      skipped.noPricedVariation.push(
        `${line.match.lineName} (lineKey "${lineKey}"): matched but zero priced variations -- no document written`,
      )
      continue
    }
    pendingLines.set(lineKey, line)
  }

  return { lines: pendingLines, skipped }
}

// Incoming (Square-sourced) variation rows for a wellness-lifestyle line. `stock: 0`
// and no `weight` here are only ever used for a genuinely NEW row -- mergeVariations()
// preserves the existing row's stock/weight/isAvailable/etc. for everything else.
export function buildWellnessLifestyleVariations(line: PendingLine): WellnessVariation[] {
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

// OilsIncense.variations[] has no squareItemId field in the schema (only
// squareVariationId) -- deliberately omitted here so the merge's `'squareItemId' in
// inc` check correctly leaves it untouched.
export function buildOilsIncenseVariations(line: PendingLine): OilsIncenseVariation[] {
  return line.variations.map((v) => ({
    sku: v.sku,
    scent: v.scent,
    variantName: v.variantName,
    price: v.price,
    stock: v.stock,
    squareVariationId: v.squareVariationId,
  }))
}
