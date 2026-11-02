#!/usr/bin/env tsx
/**
 * Repairs Books' Square links and folds the duplicates they caused back into the
 * original books. Dry run by default: every change runs in its own transaction and is
 * rolled back after reporting. --apply commits.
 *
 *   pnpm square:link-repair                          # dry run, writes square-link-repair.csv
 *   pnpm square:link-repair -- --apply
 *   pnpm square:link-repair -- --report path/to.csv
 *
 * Why: the March CSV import stored each book's Square variation id as its item id, old
 * manual books carry numeric ids, and the 2026-10-03 edition backfill copied both onto
 * editions. The sync never matched those books, so a Square edit created a coverless
 * duplicate (the sync is fixed in squareBookMatch.ts; this cleans up the data).
 *
 * Reads the whole Square catalog, resolves every Square-linked edition to its real
 * item and variation (by variation id, else by an ISBN Square has exactly once), and
 * plans per real item (squareLinkRepairPlan.ts):
 *   - repair: rewrite the book's and editions' Square ids. Titles, prices and stock
 *     are not touched; the next Square edit syncs those as usual.
 *   - merge: the book was copied by the Square sync. In one transaction per group:
 *     repoint everything that references a copy (orders, carts, reviews, staging rows,
 *     related-book links...) to the original, give the original the copy's cover when
 *     it has none and the copy's Square price and stock when the copy is newer, delete
 *     the copy, then repair the original's ids.
 *   - conflict: several older books on one Square item. Reported, never written.
 *
 * Raw SQL on purpose, like author-merge.ts: thousands of id-only edits shouldn't run
 * the Books hooks. The storefront search snapshot refreshes within five minutes.
 */
import { writeFile } from 'node:fs/promises'

import { argValue, csvCell, getProductionPayload } from './lib/productionPayload'

type Client = { query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>; release: () => void }

async function main() {
  const apply = process.argv.includes('--apply')
  const reportPath = argValue('--report') ?? 'square-link-repair.csv'
  const payload = await getProductionPayload('repair')
  const pool = (payload.db as unknown as { pool: { connect(): Promise<Client> } }).pool
  const { planSquareLinkRepair } = await import('../src/app/utils/squareLinkRepairPlan')
  const { isbnFromVariationData } = await import('../src/app/utils/squareCatalogMapping')
  const { toEan13 } = await import('../src/app/utils/ingram/ean')

  // 1. Square catalog -> variation index.
  const { SquareClient } = await import('square')
  const square = new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN! })
  const variations = new Map<string, { itemId: string; variationId: string }>()
  const byEan = new Map<string, Array<{ itemId: string; variationId: string }>>()
  for await (const obj of await square.catalog.list({ types: 'ITEM' })) {
    const item = obj as any
    if (item?.type !== 'ITEM' || item.isDeleted) continue
    for (const variation of item.itemData?.variations ?? []) {
      if (!variation?.id || variation.isDeleted) continue
      const ref = { itemId: item.id as string, variationId: variation.id as string }
      variations.set(ref.variationId, ref)
      const ean = toEan13(isbnFromVariationData(variation.itemVariationData ?? {}).isbn)
      if (ean) byEan.set(ean, [...(byEan.get(ean) ?? []), ref])
    }
  }
  console.log(`[repair] Square: ${variations.size} variations, ${byEan.size} ISBNs`)

  // 2. Books with their editions.
  const reader = await pool.connect()
  let books: any[]
  let bookFks: Array<{ tbl: string; col: string }>
  try {
    const bookRows = (
      await reader.query(
        `SELECT b.id, b.title, b.created_at, b.updated_at, b.import_source, b.square_item_id, b.slug,
                (EXISTS (SELECT 1 FROM books_images i WHERE i._parent_id = b.id)
                  OR EXISTS (SELECT 1 FROM books_scraped_image_urls s WHERE s._parent_id = b.id AND coalesce(s.url, '') <> '')) AS has_cover
           FROM books b`,
      )
    ).rows
    const editionRows = (
      await reader.query('SELECT id, _parent_id, isbn, square_item_id, square_variation_id FROM books_editions ORDER BY _parent_id, _order')
    ).rows
    const editionsByBook = new Map<number, any[]>()
    for (const e of editionRows) editionsByBook.set(e._parent_id, [...(editionsByBook.get(e._parent_id) ?? []), e])
    books = bookRows.map((b) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      hasCover: b.has_cover,
      createdAt: new Date(b.created_at).toISOString(),
      updatedAt: new Date(b.updated_at).toISOString(),
      importSource: b.import_source,
      squareItemId: b.square_item_id,
      editions: (editionsByBook.get(b.id) ?? []).map((e) => ({
        id: e.id,
        isbn: e.isbn,
        squareItemId: e.square_item_id,
        squareVariationId: e.square_variation_id,
      })),
    }))
    // Every column that references books.id, from the live schema (prod has hand-applied
    // drift, so this is read rather than hard-coded). The books_* tables' own parent
    // columns are the copy's own rows: they go with it on delete.
    bookFks = (
      await reader.query(
        `SELECT c.conrelid::regclass::text AS tbl, a.attname AS col
           FROM pg_constraint c
           JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
          WHERE c.contype = 'f' AND c.confrelid = 'public.books'::regclass`,
      )
    ).rows.filter((fk: { tbl: string; col: string }) => !(fk.tbl.startsWith('books_') && (fk.col === '_parent_id' || fk.col === 'parent_id')))
  } finally {
    reader.release()
  }
  const byId = new Map(books.map((b) => [b.id, b]))

  const plan = planSquareLinkRepair(books, { variations, byEan })
  console.log(`[repair] ${apply ? 'APPLY' : 'dry run'}: ${JSON.stringify(plan.counts)}`)
  console.log(`[repair] references repointed on merge: ${bookFks.map((fk) => `${fk.tbl}.${fk.col}`).join(', ')}`)

  const report: string[] = ['action,book_id,title,square_item_id,detail,admin_url']
  const row = (action: string, id: number, detail: string, itemId: string) =>
    report.push(
      [action, id, byId.get(id)?.title, itemId, detail, `https://payload.alkebulanimages.com/admin/collections/books/${id}`]
        .map(csvCell)
        .join(','),
    )
  for (const c of plan.conflicts) for (const id of c.bookIds) row('conflict', id, c.reason, c.squareItemId)

  const totals = { repaired: 0, merged: 0, referencesRepointed: 0, coversMoved: 0, failed: 0 }
  const failures: string[] = []

  const fixIds = async (client: Client, bookId: number, itemId: string, editions: Array<{ editionId: string; squareItemId: string; squareVariationId: string }>) => {
    await client.query('UPDATE books SET square_item_id = $2, updated_at = now() WHERE id = $1', [bookId, itemId])
    for (const fix of editions) {
      await client.query('UPDATE books_editions SET square_item_id = $2, square_variation_id = $3 WHERE id = $1', [
        fix.editionId,
        fix.squareItemId,
        fix.squareVariationId,
      ])
    }
  }

  const inTransaction = async (label: string, work: (client: Client) => Promise<void>) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query("SET LOCAL lock_timeout = '5s'")
      await work(client)
      await client.query(apply ? 'COMMIT' : 'ROLLBACK')
      return true
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      totals.failed++
      failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`)
      return false
    } finally {
      client.release()
    }
  }

  // 3. Merges first: the copies hold the real item ids the originals need.
  for (const m of plan.merges) {
    const keeper = byId.get(m.keeperId)
    let repointed = 0
    let coverMoved = false
    const ok = await inTransaction(`merge into ${m.keeperId}`, async (client) => {
      for (const dupId of m.duplicateIds) {
        const dup = byId.get(dupId)
        // A related-books link from the original to its copy would become a self-link.
        await client.query('DELETE FROM books_rels WHERE parent_id = $1 AND books_id = $2', [m.keeperId, dupId])
        for (const fk of bookFks) {
          const res = await client.query(`UPDATE ${fk.tbl} SET "${fk.col}" = $1 WHERE "${fk.col}" = $2`, [m.keeperId, dupId])
          repointed += res.rowCount ?? 0
        }
        if (!keeper.hasCover && dup.hasCover && !coverMoved) {
          await client.query('UPDATE books_images SET _parent_id = $1 WHERE _parent_id = $2', [m.keeperId, dupId])
          await client.query('UPDATE books_scraped_image_urls SET _parent_id = $1 WHERE _parent_id = $2', [m.keeperId, dupId])
          coverMoved = true
        }
        // Square-owned values: the copy's when it was synced more recently.
        if (dup.updatedAt > keeper.updatedAt) {
          await client.query(
            `UPDATE books_editions k SET pricing_retail_price = d.pricing_retail_price, inventory_stock_level = d.inventory_stock_level
               FROM books_editions d
              WHERE k._parent_id = $1 AND d._parent_id = $2 AND k.square_variation_id = d.square_variation_id`,
            [m.keeperId, dupId],
          )
          await client.query(
            'UPDATE books k SET pricing_retail_price = d.pricing_retail_price FROM books d WHERE k.id = $1 AND d.id = $2',
            [m.keeperId, dupId],
          )
        }
        await client.query('UPDATE books SET square_item_id = NULL WHERE id = $1', [dupId])
        await client.query('DELETE FROM books WHERE id = $1', [dupId])
      }
      await fixIds(client, m.keeperId, m.squareItemId, m.keeperEditions)
    })
    if (ok) {
      totals.merged += m.duplicateIds.length
      totals.referencesRepointed += repointed
      if (coverMoved) totals.coversMoved++
    }
    for (const dupId of m.duplicateIds) {
      row(ok ? 'merged-away' : 'merge-failed', dupId, `into ${m.keeperId} (slug ${byId.get(dupId)?.slug} stops resolving)`, m.squareItemId)
    }
    row(ok ? 'merged-into' : 'merge-failed', m.keeperId, `${repointed} references repointed${coverMoved ? ', cover taken from copy' : ''}`, m.squareItemId)
  }

  // 4. Id-only repairs.
  for (const r of plan.repairs) {
    const ok = await inTransaction(`repair ${r.bookId}`, (client) => fixIds(client, r.bookId, r.squareItemId, r.editions))
    if (ok) totals.repaired++
    const via = r.editions.some((e) => e.via === 'isbn') ? 'relinked by ISBN' : 'ids corrected'
    row(ok ? 'repaired' : 'repair-failed', r.bookId, via, r.squareItemId)
  }

  await writeFile(reportPath, report.join('\n') + '\n')
  console.log(`[repair] ${apply ? 'committed' : 'would commit'}: ${JSON.stringify(totals)}`)
  console.log(`[repair] review list: ${reportPath}`)
  for (const failure of failures.slice(0, 50)) console.log(`[repair]   FAILED ${failure}`)
  if (failures.length > 50) console.log(`[repair]   ... and ${failures.length - 50} more (see the review list)`)
  process.exit(failures.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
