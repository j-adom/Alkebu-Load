#!/usr/bin/env tsx
/**
 * Owner-run Ingram catalog enrichment (plan Phase 3, Task 21). DRY RUN BY DEFAULT: it
 * downloads the Ingram files, filters them to our EANs, diffs every book against the field
 * policy, and prints COUNTS ONLY (no titles or values), so the output can be shared.
 *
 *   pnpm ingram:enrich                                   # dry run, weekly files (Titles Basic + Catalog Stock)
 *   pnpm ingram:enrich -- --job descriptions             # dry run, monthly description files
 *   pnpm ingram:enrich -- --job descriptions --backfill  # full backlist description files
 *   pnpm ingram:enrich -- --apply --limit 50             # write the first 50 changed books (Payload only)
 *   pnpm ingram:enrich -- --apply --limit 50 --square    # ...and write price/title changes to Square first
 *   pnpm ingram:enrich -- --local titles=/path/ttl.zip   # use a local copy instead of SFTP (any kind)
 *
 * Without --square, price and title changes on Square-linked books are deferred (counted as
 * "deferred"): writing them to Payload alone would be reverted by the next Square sync.
 * --square changes IN-STORE prices: tell staff before a full run.
 *
 * The weekly job downloads Titles Basic and the ~195 MB Catalog Stock file (allow ~20 min).
 *
 * Needs the production database (Postgres), e.g. through the SSH tunnel in CLAUDE.md:
 *   DATABASE_URI='postgresql://…@localhost:55433/alkebulan' pnpm ingram:enrich
 * Apply scripts/add-ingram-enrichment-schema.sql first.
 *
 * Agreement §2(c): never paste Ingram data into an AI tool. Share only the printed counts.
 */
import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

function argValues(name: string): string[] {
  const out: string[] = []
  process.argv.forEach((arg, i) => {
    if (arg === name && process.argv[i + 1]) out.push(process.argv[i + 1])
  })
  return out
}

async function main() {
  const uri = (process.env.DATABASE_URI ?? '').trim().replace(/^(['"])(.*)\1$/, '$2')
  if (!uri.startsWith('postgres')) {
    const seen = uri === '' ? 'empty' : `scheme "${uri.split(':')[0]}"`
    console.error(
      `[enrich] DATABASE_URI is not a Postgres URL (got: ${seen}). Run against the production database, e.g.\n` +
        "  DATABASE_URI='postgresql://…' pnpm ingram:enrich",
    )
    process.exit(1)
  }
  process.env.DATABASE_URI = uri
  // Never let Payload's dev-mode schema push run: an SSH tunnel makes production look local.
  ;(process.env as Record<string, string>).NODE_ENV = 'production'

  const apply = process.argv.includes('--apply')
  const job = (argValue('--job') ?? 'titles') as 'titles' | 'descriptions'
  if (job !== 'titles' && job !== 'descriptions') throw new Error('--job must be titles or descriptions')
  const limitArg = argValue('--limit')
  const limit = limitArg === undefined ? undefined : Number(limitArg)
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) throw new Error('--limit must be a positive integer')
  if (process.argv.includes('--square')) {
    if (!apply) throw new Error('--square only makes sense with --apply')
    process.env.INGRAM_ENRICHMENT_SQUARE_WRITEBACK = 'true'
  } else {
    delete process.env.INGRAM_ENRICHMENT_SQUARE_WRITEBACK
  }
  const local: Record<string, string> = {}
  for (const pair of argValues('--local')) {
    const [kind, ...rest] = pair.split('=')
    if (!kind || rest.length === 0) throw new Error(`--local expects kind=path, got "${pair}"`)
    local[kind] = rest.join('=')
  }

  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')
  const { runScheduledEnrichment } = await import('../src/app/utils/ingram/scheduledEnrichment')
  const payload = await getPayload({ config })

  console.log(
    `[enrich] job ${job}${process.argv.includes('--backfill') ? ' (backfill)' : ''}: ` +
      `${apply ? `APPLY${process.argv.includes('--square') ? ' + Square write-back' : ' (Payload only)'}` : 'dry run'}` +
      `${limit ? `, limit ${limit} books` : ''}`,
  )
  const result = await runScheduledEnrichment(
    payload,
    job,
    { dryRun: !apply, limit, backfill: process.argv.includes('--backfill'), force: true },
    { local },
  )
  console.log(JSON.stringify(result, null, 2))
  const failed = 'booksFailed' in result ? result.booksFailed : 0
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
