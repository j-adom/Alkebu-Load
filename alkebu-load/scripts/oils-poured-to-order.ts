#!/usr/bin/env tsx
/**
 * Brings Scented Oil up to date from Square and turns on poured-to-order availability.
 * Dry run by default; --apply writes.
 *
 *   pnpm oils:poured-to-order
 *   pnpm oils:poured-to-order -- --apply
 *   pnpm oils:poured-to-order -- --months 6      # sales window for the first-run seed
 *
 * Run after `pnpm oils:fill-square-sizes -- --apply`. In one write to the scented-oil
 * product it:
 *   1. re-imports its variations from Square (the same plan and merge as the wellness
 *      importer), so the sizes just added in Square appear;
 *   2. drops stray rows with no bottle size that Square no longer has (the $2 "<scent>
 *      type" Madina incense packs the importer used to fold in);
 *   3. turns on pouredToOrder. The first time only, it seeds "Out-of-stock scents" with
 *      every scent no size of which sold in a completed Square order in the window. Once
 *      on, the staff-edited lists are left alone.
 * The OilsIncense hook then derives every untracked variation's isAvailable from the
 * lists (pouredToOrder.ts).
 *
 * Needs the production Postgres URL in DATABASE_URI (SSH tunnel, see CLAUDE.md) and
 * scripts/add-poured-to-order-schema.sql applied, with the backend deployed.
 */
import { argValue, getProductionPayload } from './lib/productionPayload'

const LINE = 'scented-oil'

async function main() {
  const apply = process.argv.includes('--apply')
  const months = Number(argValue('--months') ?? 6)
  if (!Number.isFinite(months) || months <= 0) {
    console.error('[poured] --months must be a positive number')
    process.exit(1)
  }

  const payload = await getProductionPayload('poured')
  const { SquareClient, SquareEnvironment } = await import('square')
  const { buildImportPlan, buildOilsIncenseVariations, fetchWellnessItems } = await import('../src/app/utils/wellnessImportPlan')
  const { mergeVariations } = await import('../src/app/utils/wellnessVariationMerge')
  const { fetchSoldVariationIds } = await import('../src/app/utils/wellnessUntrackedAvailability')
  const { applyPouredAvailability, pouredSizeKey } = await import('../src/app/utils/pouredToOrder')

  const square = new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN!,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'sandbox' ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
  })

  const existing = await payload.find({ collection: 'oils-incense', where: { slug: { equals: LINE } }, limit: 1, depth: 0 })
  const doc = existing.docs[0] as any
  if (!doc) {
    console.error(`[poured] no oils-incense product with slug "${LINE}"`)
    process.exit(1)
  }

  // 1. Re-import from Square.
  const { lines } = buildImportPlan(await fetchWellnessItems(square), { locationId: process.env.SQUARE_LOCATION_ID })
  const line = lines.get(LINE)
  if (!line) {
    console.error(`[poured] Square has no "${LINE}" line; refusing to touch the product`)
    process.exit(1)
  }
  const { merged, added, orphaned } = mergeVariations(doc.variations ?? [], buildOilsIncenseVariations(line) as any[])

  // 2. Drop orphaned rows that have no bottle size: they can never be poured.
  const dropped = orphaned.filter((row: any) => pouredSizeKey(row) === '')
  const variations = merged.filter((row) => !dropped.includes(row))

  // 3. Lists: seed the first time only.
  const key = (s: string) => s.trim().toLowerCase()
  let unavailableScents = doc.unavailableScents ?? []
  const unavailableSizes = doc.unavailableSizes ?? []
  if (doc.pouredToOrder !== true) {
    const since = new Date()
    since.setMonth(since.getMonth() - months)
    const { sold } = await fetchSoldVariationIds(square, since.toISOString())
    const soldScents = new Set(variations.filter((v: any) => v.squareVariationId && sold.has(v.squareVariationId)).map((v: any) => key(v.scent ?? '')))
    const allScents = new Map<string, string>()
    for (const v of variations as any[]) if (v.scent && !allScents.has(key(v.scent))) allScents.set(key(v.scent), v.scent.trim())
    unavailableScents = [...allScents].filter(([k]) => !soldScents.has(k)).map(([, scent]) => ({ scent })).sort((a, b) => a.scent.localeCompare(b.scent))
    console.log(`[poured] first run: seeding out-of-stock scents from sales since ${since.toISOString().slice(0, 10)}`)
  } else {
    console.log('[poured] poured-to-order already on: keeping the staff-edited lists')
  }

  const after = applyPouredAvailability(variations as any[], { unavailableScents, unavailableSizes })
  const scents = new Set(after.map((v: any) => key(v.scent ?? '')).filter(Boolean))
  const sizes = new Set(after.map(pouredSizeKey).filter(Boolean))
  console.log(
    `[poured] ${apply ? 'APPLY' : 'dry run'}: ${doc.variations?.length ?? 0} -> ${after.length} variations ` +
      `(+${added} from Square, -${dropped.length} stray unsized rows; ${orphaned.length - dropped.length} other rows Square no longer has, kept)`,
  )
  console.log(`[poured] ${scents.size} scents x ${sizes.size} sizes; available after: ${after.filter((v: any) => v.isAvailable).length}`)
  console.log(`[poured] out-of-stock scents (${unavailableScents.length}): ${unavailableScents.map((s: any) => s.scent).join(', ')}`)
  console.log(`[poured] out-of-stock sizes (${unavailableSizes.length}): ${unavailableSizes.map((s: any) => s.size).join(', ') || '(none)'}`)
  if (dropped.length) console.log(`[poured] dropping: ${dropped.map((v: any) => `${v.scent} ${v.price}¢`).join(', ')}`)

  if (!apply) {
    console.log('[poured] Dry run. Nothing was written. Re-run with --apply to persist.')
    process.exit(0)
  }
  await payload.update({
    collection: 'oils-incense',
    id: doc.id,
    data: { variations, pouredToOrder: true, unavailableScents, unavailableSizes } as any,
    depth: 0,
  })
  console.log('[poured] written. Purge the scented-oil page in Cloudflare (or wait 5 minutes) to see it.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
