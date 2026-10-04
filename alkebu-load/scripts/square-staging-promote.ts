#!/usr/bin/env tsx
/**
 * Promotes reviewed Square staging rows into Books. Dry run by default.
 *
 *   pnpm square:staging-promote -- --from square-staging-review.csv
 *   pnpm square:staging-promote -- --from square-staging-review.csv --as you@alkebulanimages.com --apply
 *
 * --from: the review list from square:staging-reprocess, after deleting rows you don't
 *         want promoted (first column = staging_id).
 * --as:   the admin/staff user the promotion is recorded under (required with --apply).
 * Uses promoteStagedItem, so each row must still be 'ready' and still map cleanly; a
 * row that changed since review is refused, not forced.
 */
import { readFile } from 'node:fs/promises'

import { argValue, getProductionPayload } from './lib/productionPayload'

async function main() {
  const from = argValue('--from')
  if (!from) {
    console.error('[promote] --from <review.csv> is required')
    process.exit(1)
  }
  const apply = process.argv.includes('--apply')
  const ids = (await readFile(from, 'utf8'))
    .split('\n')
    .slice(1)
    .map((line) => line.split(',')[0]?.trim())
    .filter((id): id is string => !!id && /^\d+$/.test(id))

  const payload = await getProductionPayload('promote')
  const { promoteStagedItem } = await import('../src/app/utils/squareStagingWorkflow')

  let user: unknown = null
  if (apply) {
    const email = argValue('--as')
    const users = email ? await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0 }) : null
    user = users?.docs[0] ?? null
    if (!user) {
      console.error('[promote] --as <email> must name an existing admin or staff user')
      process.exit(1)
    }
  }

  let promoted = 0
  let wouldPromote = 0
  const refused: string[] = []
  for (const id of ids) {
    const row: any = await payload.findByID({ collection: 'square-catalog-staging', id, depth: 0 }).catch(() => null)
    if (!row || row.reviewStatus !== 'ready') {
      refused.push(`${id}: ${row ? `status ${row.reviewStatus}` : 'not found'}`)
      continue
    }
    if (!apply) {
      wouldPromote += 1
      continue
    }
    try {
      await promoteStagedItem(payload as any, id, user)
      promoted += 1
    } catch (error) {
      refused.push(`${id}: ${error instanceof Error ? error.message : error}`)
    }
  }

  console.log(`[promote] rows in list: ${ids.length}; ${apply ? `promoted: ${promoted}` : `would promote: ${wouldPromote}`}; refused: ${refused.length}`)
  for (const line of refused.slice(0, 20)) console.log(`[promote]   refused ${line}`)
  process.exit(refused.length > 0 && apply ? 1 : 0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
