#!/usr/bin/env tsx
/**
 * Merges duplicate author records from the reviewed author-duplicates-review.csv.
 * Dry run by default: every group runs in its own transaction and is rolled back after
 * reporting what it would change. --apply commits.
 *
 *   pnpm authors:merge -- --from author-duplicates-review.csv
 *   pnpm authors:merge -- --from author-duplicates-review.csv --apply
 *
 * Only groups whose rows all say action=merge are touched (see authorMergePlan.ts for
 * the CSV rules). Per group, in one transaction:
 *   1. refuse if any record is missing or no longer has the name in the CSV (stale list);
 *   2. move every link to the duplicates onto the KEEP record: book author links
 *      (books_rels, deduped per book), publisher notable authors, site settings, and the
 *      duplicates' genres/awards/notable works; drop their edit locks;
 *   3. verify nothing still points at a duplicate, then delete the duplicates (book links
 *      cascade on delete, which is why step 3 checks first);
 *   4. give KEEP the final name (and its slug, if free);
 *   5. rewrite every book's author TEXT that exactly matches one of the group's spellings
 *      to the final name. Storefront author pages are built from that text, so this is
 *      what gives each author one page.
 */
import { readFile } from 'node:fs/promises'
import { parse } from 'csv-parse/sync'

import { argValue, getProductionPayload } from './lib/productionPayload'

async function main() {
  const from = argValue('--from')
  if (!from) {
    console.error('[merge] --from <author-duplicates-review.csv> is required')
    process.exit(1)
  }
  const apply = process.argv.includes('--apply')
  const rows = parse(await readFile(from, 'utf8'), { columns: true, skip_empty_lines: true }) as Record<string, string>[]

  const { planAuthorMerges, authorSlug } = await import('../src/app/utils/authorMergePlan')
  const plan = planAuthorMerges(rows)
  console.log(`[merge] ${apply ? 'APPLY' : 'dry run'}: ${plan.groups.length} groups to merge, ${plan.skipped.length} skipped`)

  const payload = await getProductionPayload('merge')
  const pool = (payload.db as unknown as { pool: { connect(): Promise<any> } }).pool

  const totals = { groups: 0, deleted: 0, linksMoved: 0, linksDeduped: 0, renamed: 0, textRenamed: 0, booksTouched: 0 }
  const failures: string[] = []

  for (const g of plan.groups) {
    const client = await pool.connect()
    const keepId = g.keep.id
    const dupIds = g.merge.map((m) => m.id)
    const allIds = [keepId, ...dupIds]
    const variants = [...new Set([g.keep.name, ...g.merge.map((m) => m.name)])]
    try {
      await client.query('BEGIN')
      await client.query("SET LOCAL lock_timeout = '5s'")

      // 1. Stale-list guard.
      const current = await client.query('SELECT id, name FROM authors WHERE id = ANY($1::int[]) FOR UPDATE', [allIds])
      const names = new Map(current.rows.map((r: { id: number; name: string }) => [r.id, r.name]))
      for (const a of [g.keep, ...g.merge]) {
        if (names.get(a.id) !== a.name) {
          throw new Error(`author ${a.id} is ${names.has(a.id) ? `now "${names.get(a.id)}"` : 'gone'}, CSV says "${a.name}"`)
        }
      }

      // 2. Move links.
      const deduped = await client.query(
        `DELETE FROM books_rels d USING books_rels k
          WHERE d.authors_id = ANY($1::int[]) AND k.authors_id = $2
            AND k.parent_id = d.parent_id AND k.path = d.path`,
        [dupIds, keepId],
      )
      // Two duplicates on the same book: keep one row per (book, path).
      const dedupedAmongDups = await client.query(
        `DELETE FROM books_rels d USING books_rels o
          WHERE d.authors_id = ANY($1::int[]) AND o.authors_id = ANY($1::int[])
            AND o.parent_id = d.parent_id AND o.path = d.path AND o.id < d.id`,
        [dupIds],
      )
      const touched = await client.query(
        'SELECT DISTINCT parent_id FROM books_rels WHERE authors_id = ANY($1::int[])',
        [dupIds],
      )
      const moved = await client.query('UPDATE books_rels SET authors_id = $2 WHERE authors_id = ANY($1::int[])', [dupIds, keepId])
      await client.query('UPDATE publishers_notable_authors SET author_id = $2 WHERE author_id = ANY($1::int[])', [dupIds, keepId])
      await client.query('UPDATE site_settings SET author_id = $2 WHERE author_id = ANY($1::int[])', [dupIds, keepId])
      await client.query(
        `DELETE FROM authors_genres d USING authors_genres k
          WHERE d.parent_id = ANY($1::int[]) AND k.parent_id = $2 AND k.value = d.value`,
        [dupIds, keepId],
      )
      await client.query('UPDATE authors_genres SET parent_id = $2 WHERE parent_id = ANY($1::int[])', [dupIds, keepId])
      await client.query('UPDATE authors_awards SET _parent_id = $2 WHERE _parent_id = ANY($1::int[])', [dupIds, keepId])
      await client.query('UPDATE authors_notable_works SET _parent_id = $2 WHERE _parent_id = ANY($1::int[])', [dupIds, keepId])
      await client.query('DELETE FROM payload_locked_documents_rels WHERE authors_id = ANY($1::int[])', [dupIds])

      // 3. Verify, then delete.
      const left = await client.query('SELECT count(*)::int AS n FROM books_rels WHERE authors_id = ANY($1::int[])', [dupIds])
      if (left.rows[0].n !== 0) throw new Error(`${left.rows[0].n} book link(s) still point at a duplicate`)
      const deleted = await client.query('DELETE FROM authors WHERE id = ANY($1::int[])', [dupIds])

      // 4. Final name on KEEP (unique; the duplicates holding variant names are gone now).
      let renamed = 0
      if (g.finalName !== g.keep.name) {
        const taken = await client.query('SELECT id FROM authors WHERE name = $1 AND id <> $2', [g.finalName, keepId])
        if (taken.rowCount > 0) throw new Error(`final name "${g.finalName}" belongs to author ${taken.rows[0].id}`)
        const slug = authorSlug(g.finalName)
        const slugTaken = await client.query('SELECT 1 FROM authors WHERE slug = $1 AND id <> $2', [slug, keepId])
        await client.query(
          `UPDATE authors SET name = $2, ${slugTaken.rowCount === 0 ? 'slug = $3,' : ''} updated_at = now() WHERE id = $1`,
          slugTaken.rowCount === 0 ? [keepId, g.finalName, slug] : [keepId, g.finalName],
        )
        renamed = 1
      }

      // 5. Book author text -> final name, for every spelling in the group.
      const textBooks = await client.query(
        'SELECT DISTINCT _parent_id FROM books_authors_text WHERE name = ANY($1::text[]) AND name <> $2',
        [variants, g.finalName],
      )
      const text = await client.query(
        'UPDATE books_authors_text SET name = $2 WHERE name = ANY($1::text[]) AND name <> $2',
        [variants, g.finalName],
      )
      const bookIds = [
        ...new Set([...touched.rows.map((r: any) => r.parent_id), ...textBooks.rows.map((r: any) => r._parent_id)]),
      ]
      if (bookIds.length > 0) await client.query('UPDATE books SET updated_at = now() WHERE id = ANY($1::int[])', [bookIds])

      await client.query(apply ? 'COMMIT' : 'ROLLBACK')
      totals.groups += 1
      totals.deleted += deleted.rowCount
      totals.linksMoved += moved.rowCount
      totals.linksDeduped += deduped.rowCount + dedupedAmongDups.rowCount
      totals.renamed += renamed
      totals.textRenamed += text.rowCount
      totals.booksTouched += bookIds.length
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      failures.push(`group ${g.group} (keep ${keepId} "${g.keep.name}"): ${error instanceof Error ? error.message : error}`)
    } finally {
      client.release()
    }
  }

  console.log(`[merge] ${apply ? 'merged' : 'would merge'}:`, totals)
  for (const s of plan.skipped.filter((s) => s.reason !== 'action is not merge')) {
    console.log(`[merge]   skipped group ${s.group}: ${s.reason}`)
  }
  console.log(`[merge] review groups left for later: ${plan.skipped.filter((s) => s.reason === 'action is not merge').length}`)
  for (const f of failures) console.log(`[merge]   FAILED ${f}`)
  process.exit(failures.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
