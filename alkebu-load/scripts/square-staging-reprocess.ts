#!/usr/bin/env tsx
/**
 * Re-checks Square catalog staging rows against the current mapping rules (ISBN from
 * sku/upc/gtin; non-Books reporting categories are non-books). Dry run by default.
 *
 *   pnpm square:staging-reprocess                 # dry run + review list
 *   pnpm square:staging-reprocess -- --apply      # write the new statuses
 *
 * Never promotes: rows that now map cleanly become 'ready'. Non-books become 'rejected'
 * (sticky, so the sync stops re-staging them). The review list
 * (square-staging-review.csv) has every row that would become ready, flagged when a
 * Book with the same ISBN already exists. Delete rows you don't want, then run
 * `pnpm square:staging-promote -- --from square-staging-review.csv`.
 */
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { argValue, csvCell, getProductionPayload } from './lib/productionPayload'

async function main() {
  const payload = await getProductionPayload('reprocess')
  const { reassessStagingRow } = await import('../src/app/utils/squareStagingWorkflow')
  const { fromJsonSafe } = await import('../src/app/utils/jsonSafe')
  const apply = process.argv.includes('--apply')
  const reportPath = resolve(argValue('--report') ?? 'square-staging-review.csv')

  const tally: Record<string, number> = {}
  const rows: string[][] = []
  for (let page = 1; ; page += 1) {
    const result = await payload.find({
      collection: 'square-catalog-staging',
      where: { reviewStatus: { in: ['needs-review', 'ready'] } },
      page,
      limit: 100,
      depth: 0,
      sort: 'id',
    })
    for (const row of result.docs as any[]) {
      const r = reassessStagingRow(row)
      const key = r.action === 'update' ? r.reviewStatus : r.action
      tally[key] = (tally[key] ?? 0) + 1

      if (r.action === 'update' && r.reviewStatus === 'ready') {
        const dupes = r.proposedIsbn
          ? await payload.find({ collection: 'books', where: { 'editions.isbn': { equals: r.proposedIsbn } }, limit: 5, depth: 0 })
          : { docs: [] as any[] }
        const item: any = fromJsonSafe(row.rawItem)
        const amount = item?.itemData?.variations?.[0]?.itemVariationData?.priceMoney?.amount
        rows.push([
          String(row.id),
          row.squareItemId,
          row.proposedTitle ?? item?.itemData?.name ?? '',
          r.proposedIsbn ?? '',
          amount !== undefined ? (Number(amount) / 100).toFixed(2) : '',
          dupes.docs.map((b: any) => b.id).join(' '),
          dupes.docs.map((b: any) => b.title).join(' | '),
          `https://payload.alkebulanimages.com/admin/collections/square-catalog-staging/${row.id}`,
        ])
      }

      if (apply) {
        if (r.action === 'reject-non-book') {
          await payload.update({ collection: 'square-catalog-staging', id: row.id, data: { reviewStatus: 'rejected' } })
        } else if (r.action === 'update') {
          await payload.update({
            collection: 'square-catalog-staging',
            id: row.id,
            data: { reviewStatus: r.reviewStatus, validationIssues: r.validationIssues, proposedIsbn: r.proposedIsbn ?? null },
          })
        }
      }
    }
    if (!result.hasNextPage) break
  }

  const header = ['staging_id', 'square_item_id', 'title', 'isbn', 'price', 'existing_book_ids_same_isbn', 'existing_titles', 'admin_url']
  await writeFile(reportPath, [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n')
  console.log(`[reprocess] ${apply ? 'APPLIED' : 'dry run'}:`, tally)
  console.log(`[reprocess] would become ready: ${rows.length}; already in catalog by ISBN: ${rows.filter((r) => r[5]).length}`)
  console.log(`[reprocess] review list: ${reportPath}`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
