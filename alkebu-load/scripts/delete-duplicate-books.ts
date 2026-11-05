#!/usr/bin/env tsx
/**
 * Deletes the second book of each duplicate pair the 2026-11-04 Square reconcile left
 * unresolved (each pair's Square item matched both books, and both were originals, so
 * square:link-repair would not choose). The owner chose: keep the lower id, delete the
 * higher one.
 *
 *   pnpm books:delete-duplicates              # dry run: shows each pair and its references
 *   pnpm books:delete-duplicates -- --apply   # delete
 *
 * A book referenced by an order is never deleted (the order's line item would lose its
 * product); it is reported instead. Staging rows promoted into the deleted book are
 * pointed at the kept one. Needs DATABASE_URI pointing at production (SSH tunnel, see CLAUDE.md).
 */
import { getProductionPayload } from './lib/productionPayload'

const PAIRS: Array<[keep: number, remove: number]> = [
  [3815, 3816],
  [3889, 3890],
  [4578, 4579],
  [4693, 4694],
  [5679, 5680],
  [7147, 7148],
  [7295, 7296],
  [7308, 7309],
  [7316, 7317],
  [7855, 7856],
]

async function main() {
  const apply = process.argv.includes('--apply')
  const payload = await getProductionPayload('delete-duplicate-books')
  console.log(`[delete-duplicate-books] mode: ${apply ? 'APPLY (deletes)' : 'DRY RUN (no writes)'}`)

  const count = async (collection: any, where: any) =>
    (await payload.count({ collection, where })).totalDocs

  let deleted = 0
  let blocked = 0
  for (const [keepId, removeId] of PAIRS) {
    const [keep, remove] = await Promise.all(
      [keepId, removeId].map((id) => payload.findByID({ collection: 'books', id, depth: 0, disableErrors: true })),
    )
    if (!keep || !remove) {
      console.log(`  ${keepId}/${removeId}: skipped, ${!keep ? keepId : removeId} no longer exists`)
      continue
    }
    const isbns = (book: any) => ((book.editions ?? []) as any[]).map((e) => e?.isbn).filter(Boolean).join(' ')
    console.log(`  keep   ${keepId}: "${keep.title}" square=${keep.squareItemId ?? '-'} isbn=${isbns(keep) || '-'}`)
    console.log(`  delete ${removeId}: "${remove.title}" square=${remove.squareItemId ?? '-'} isbn=${isbns(remove) || '-'}`)

    const orders = await count('orders', {
      and: [{ 'items.product.relationTo': { equals: 'books' } }, { 'items.product.value': { equals: removeId } }],
    })
    if (orders > 0) {
      blocked++
      console.log(`    NOT deleted: ${orders} order(s) reference book ${removeId}; merge it by hand in the admin`)
      continue
    }
    const staging = await payload.find({
      collection: 'square-catalog-staging',
      where: { promotedBook: { equals: removeId } },
      depth: 0,
      limit: 100,
    })
    if (staging.docs.length > 0) console.log(`    ${staging.docs.length} staging row(s) repointed to ${keepId}`)

    if (apply) {
      for (const row of staging.docs) {
        await payload.update({ collection: 'square-catalog-staging', id: row.id, data: { promotedBook: keepId } })
      }
      await payload.delete({ collection: 'books', id: removeId })
    }
    deleted++
    console.log(`    ${apply ? 'deleted' : 'would delete'} ${removeId}`)
  }

  console.log('')
  console.log(`[delete-duplicate-books] ${apply ? 'deleted' : 'would delete'} ${deleted}, blocked by orders ${blocked}`)
  process.exit(0)
}

main().catch((error) => {
  console.error('[delete-duplicate-books] failed:', error)
  process.exit(1)
})
