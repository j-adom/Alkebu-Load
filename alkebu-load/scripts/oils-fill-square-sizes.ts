#!/usr/bin/env tsx
/**
 * Adds the missing standard bottle sizes to every "<Scent> Scented Oil" item in Square.
 * Dry run by default (reads Square, prints the plan); --apply creates the variations.
 *
 *   pnpm oils:fill-square-sizes
 *   pnpm oils:fill-square-sizes -- --apply
 *
 * Oils are poured to order, so any scent can go into any bottle, but on 2026-11-02 only
 * 77 of 123 scent items had all five sizes, priced: 106 sizes were missing and 49 had no
 * price (the website importer skips those). New variations get the standard price for their size, untracked, at the
 * item's own locations (oilSizeFill.ts). A standard size entered without a price gets the
 * standard price; nothing else on it changes. Odd names and other off-standard prices are
 * only reported.
 *
 * Square only: no database. Afterwards run `pnpm oils:poured-to-order` to bring the new
 * sizes onto the website.
 */
import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'

dotenv.config({ path: './.env' })

async function main() {
  const apply = process.argv.includes('--apply')
  if (!process.env.SQUARE_ACCESS_TOKEN) {
    console.error('[fill] SQUARE_ACCESS_TOKEN is not set')
    process.exit(1)
  }
  const { SquareClient, SquareEnvironment } = await import('square')
  const { planOilSizeFill, squarePriceFixFor, squareVariationFor } = await import('../src/app/utils/oilSizeFill')
  const square = new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'sandbox' ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
  })

  const items: any[] = []
  for await (const obj of await square.catalog.list({ types: 'ITEM' })) {
    if ((obj as any)?.type === 'ITEM') items.push(obj)
  }
  // Most scent items use the shared "Volume" item option, which Square requires on every
  // variation: index its values by name.
  const optionIds = [...new Set(items.flatMap((i) => (i.itemData?.itemOptions ?? []).map((o: any) => o.itemOptionId)).filter(Boolean))]
  const optionValues = new Map<string, Map<string, string>>()
  if (optionIds.length > 0) {
    for (const option of ((await square.catalog.batchGet({ objectIds: optionIds })).objects ?? []) as any[]) {
      const values = new Map<string, string>()
      for (const value of option.itemOptionData?.values ?? []) {
        const name = String(value.itemOptionValueData?.name ?? '').trim().toLowerCase()
        if (name && value.id && !values.has(name)) values.set(name, value.id)
      }
      optionValues.set(option.id, values)
    }
  }
  const plan = planOilSizeFill(items, optionValues)
  console.log(`[fill] ${apply ? 'APPLY' : 'dry run'}: ${JSON.stringify(plan.counts)}`)
  for (const f of plan.priceFixes) console.log(`[fill]   no price -> standard ${f.cents}¢: ${f.itemName} ${f.size}`)
  for (const m of plan.priceMismatches) console.log(`[fill]   off-standard price (left alone): ${m.itemName} ${m.size} = ${m.cents}¢, standard ${m.standard}¢`)
  for (const n of plan.nonStandard) console.log(`[fill]   non-standard variation (left alone): ${n.itemName} "${n.name}"`)
  for (const name of plan.skippedNoOptionValue) console.log(`[fill]   skipped, its size option lacks a standard size: ${name}`)
  for (const name of plan.skippedNoTemplate) console.log(`[fill]   skipped, no variation to copy settings from: ${name}`)

  if (!apply) {
    console.log('[fill] Dry run. Nothing was written. Re-run with --apply to create the variations.')
    return
  }

  // One batch per item keeps each scent all-or-nothing; Square allows 1,000 objects a batch.
  const byItem = new Map<string, { name: string; objects: any[]; added: number; priced: number }>()
  const entry = (itemId: string, name: string) => {
    if (!byItem.has(itemId)) byItem.set(itemId, { name, objects: [], added: 0, priced: 0 })
    return byItem.get(itemId)!
  }
  plan.additions.forEach((a, i) => {
    const e = entry(a.itemId, a.itemName)
    e.objects.push(squareVariationFor(a, `#new-${i}`))
    e.added++
  })
  for (const f of plan.priceFixes) {
    const e = entry(f.variation.itemVariationData?.itemId, f.itemName)
    e.objects.push(squarePriceFixFor(f))
    e.priced++
  }
  let created = 0
  let priced = 0
  const failures: string[] = []
  for (const e of byItem.values()) {
    try {
      await square.catalog.batchUpsert({ idempotencyKey: randomUUID(), batches: [{ objects: e.objects }] })
      created += e.added
      priced += e.priced
    } catch (error) {
      const details = (error as any)?.body?.errors?.map((x: any) => x.detail).join(' | ')
      failures.push(`${e.name}: ${details ?? (error instanceof Error ? error.message : String(error))}`)
    }
  }
  console.log(`[fill] created ${created}/${plan.additions.length} sizes and priced ${priced}/${plan.priceFixes.length} across ${byItem.size} items`)
  for (const failure of failures) console.log(`[fill]   FAILED ${failure}`)
  console.log('[fill] Next: pnpm oils:poured-to-order (dry run first) to bring them onto the website.')
  process.exit(failures.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
