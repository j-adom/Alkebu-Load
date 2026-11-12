#!/usr/bin/env tsx
/**
 * Ingram termination purge (agreement §6(c); plan Task 22). DRY RUN BY DEFAULT.
 *
 *   pnpm ingram:purge-metadata                                   # counts only
 *   pnpm ingram:purge-metadata -- --apply --square-report sq.csv # purge; list Square changes
 *
 * Restores every Ingram-sourced book field to its pre-Ingram value (when that came from
 * another source) or clears it, then deletes the enrichment log and review rows. If any
 * book fails, the log is kept (it holds the previous values) and the script exits 1.
 *
 * Square is never changed. Price uplifts, title cleanups and Author fills (fieldPath
 * squareAuthor, previous value empty) written to Square are listed
 * in the --square-report CSV (object id, field, previous value, previous version) so the
 * owner can revert them deliberately. Write that report BEFORE --apply deletes the log.
 *
 * Also purge backups (agreement §6(c)) and set INGRAM_ENRICHMENT_ENABLED off first, or the
 * next scheduled run writes the data back.
 *
 * Test on a copy of the database first; confirm one sample book reverses exactly.
 */
import dotenv from 'dotenv'
import { writeFile } from 'node:fs/promises'
dotenv.config({ path: './.env' })

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

const csvCell = (value: unknown) => {
  const s = value === undefined || value === null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function main() {
  const uri = (process.env.DATABASE_URI ?? '').trim().replace(/^(['"])(.*)\1$/, '$2')
  if (!uri.startsWith('postgres')) {
    const seen = uri === '' ? 'empty' : `scheme "${uri.split(':')[0]}"`
    console.error(`[purge] DATABASE_URI is not a Postgres URL (got: ${seen}).`)
    process.exit(1)
  }
  process.env.DATABASE_URI = uri
  ;(process.env as Record<string, string>).NODE_ENV = 'production'
  // Make sure this process never runs an enrichment job.
  delete process.env.INGRAM_ENRICHMENT_ENABLED

  const apply = process.argv.includes('--apply')
  const reportPath = argValue('--square-report')
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')
  const { runPurge } = await import('../src/app/utils/ingram/purgeEnrichment')
  const payload = await getPayload({ config })

  // The dry run collects the Square list too, so the report can be written before --apply.
  const summary = await runPurge(payload, { dryRun: !apply })
  if (reportPath) {
    const rows = [['square_object_id', 'field', 'previous_value', 'previous_version']]
    for (const c of summary.squareChanges) rows.push([c.objectId, c.fieldPath, String(c.previousValue ?? ''), c.previousVersion ?? ''])
    await writeFile(reportPath, rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n')
    console.log(`[purge] Square change list (${summary.squareChanges.length} rows): ${reportPath}`)
  }
  const { squareChanges, ...counts } = summary
  console.log(JSON.stringify({ ...counts, squareChanges: squareChanges.length }, null, 2))
  process.exit(summary.booksFailed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
