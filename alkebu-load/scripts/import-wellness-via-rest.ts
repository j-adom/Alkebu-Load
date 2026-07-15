#!/usr/bin/env tsx
/**
 * Idempotent Square -> Payload importer for the Phase 1 wellness lines -- REST-API
 * variant of scripts/import-wellness-from-square.ts.
 *
 * WHY THIS EXISTS: the production Payload instance runs as a PRUNED container build
 * with no scripts/ source, so the Local-API importer (which calls getPayload() and
 * payload.find/create/update directly) cannot run there. This dev machine also cannot
 * reach prod Postgres over Tailscale. This script instead writes over the PUBLIC REST
 * API (HTTPS), so it can run from anywhere -- at the cost of `payload.find/create/
 * update` becoming authenticated `fetch()` calls against `/api/<collection>`.
 *
 * Behavior is IDENTICAL to import-wellness-from-square.ts: same Square fetch, same
 * matchProductLine-based grouping (via the shared src/app/utils/wellnessImportPlan.ts
 * module -- see that file's header for why this logic must not be duplicated), same
 * mergeVariations() merge-not-replace update path, same CREATE/UPDATE ownership split
 * (buildWellnessLifestyleCreateDoc/UpdateDoc, buildOilsIncenseCreateDoc/UpdateDoc),
 * same skip categorization, same orphaned-variation handling, same per-line try/catch,
 * same dry-run-default / --commit gating, same exit codes. Read that script's header
 * top to bottom for the full rationale -- it is the spec this one implements.
 *
 * HARDCODED BASE URL -- NOT CONFIGURABLE BY ENV, ON PURPOSE. This host also serves a
 * DIFFERENT client's Payload instance (admin.smoqesignals.com) with its own database.
 * A configurable base URL is exactly how you'd accidentally write Alkebu-Lan Images'
 * wellness catalog into someone else's production data. This script is structurally
 * incapable of targeting anything but the alkebulanimages prod API.
 *
 * AUTH: standard Payload login -> JWT (this backend does NOT have useAPIKey enabled).
 * Reads PAYLOAD_EMAIL / PAYLOAD_PASSWORD from env and POSTs to /api/users/login, or --
 * if PAYLOAD_TOKEN is set -- uses that token directly and skips login entirely. Either
 * way, an auth probe (GET /api/users/me) runs BEFORE any write and the run aborts,
 * unauthenticated and with nothing written, unless the resolved user's role is admin
 * or staff. The dry-run path never calls any of this -- it only reads Square and
 * prints the plan, so it needs no credentials at all.
 *
 * The password and the token are never printed, in any log line, on any path.
 */

import dotenv from 'dotenv'
import { SquareClient } from 'square'
import {
  fetchWellnessItems,
  buildImportPlan,
  buildWellnessLifestyleVariations,
  buildOilsIncenseVariations,
  type PendingLine,
  type WellnessVariation,
  type OilsIncenseVariation,
} from '../src/app/utils/wellnessImportPlan'
import { mergeVariations } from '../src/app/utils/wellnessVariationMerge'
import {
  buildWellnessLifestyleCreateDoc,
  buildWellnessLifestyleUpdateDoc,
  buildOilsIncenseCreateDoc,
  buildOilsIncenseUpdateDoc,
} from '../src/app/utils/wellnessImportDocs'

// Deliberately NOT importing src/payload-types.ts here -- see the identical comment in
// import-wellness-from-square.ts. This script uses no Payload runtime types at all;
// REST response shapes are hand-written below.

dotenv.config({ path: './.env' })

// HARDCODED. Do not make this an env var -- see the header comment above. This is the
// one line in the whole script that decides which company's data gets written to.
const BASE = 'https://payload.alkebulanimages.com'

const COMMIT = process.argv.includes('--commit')

const squareClient = new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN! })

// -- REST plumbing -----------------------------------------------------------------

interface PayloadErrorBody {
  errors?: Array<{ message?: string }>
}

function extractErrorMessage(body: unknown): string | undefined {
  const errors = (body as PayloadErrorBody | undefined)?.errors
  if (!Array.isArray(errors) || errors.length === 0) return undefined
  const messages = errors.map((e) => e?.message).filter((m): m is string => !!m)
  return messages.length > 0 ? messages.join('; ') : undefined
}

async function readJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return undefined
  }
}

async function loginForToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await readJsonSafe(res)
  if (!res.ok) {
    throw new Error(extractErrorMessage(body) ?? `login failed with status ${res.status}`)
  }
  const token = (body as { token?: string } | undefined)?.token
  if (!token) throw new Error('login response had no token')
  return token
}

interface AuthProbeUser {
  email?: string
  role?: string
}

async function probeAuth(token: string): Promise<AuthProbeUser | null> {
  const res = await fetch(`${BASE}/api/users/me`, {
    headers: { Authorization: `JWT ${token}` },
  })
  const body = await readJsonSafe(res)
  if (!res.ok) {
    throw new Error(extractErrorMessage(body) ?? `auth probe failed with status ${res.status}`)
  }
  return (body as { user?: AuthProbeUser | null } | undefined)?.user ?? null
}

interface RestDoc {
  id: string | number
  variations?: unknown[]
}

async function restFindBySlug(
  collection: string,
  slug: string,
  token: string,
): Promise<RestDoc | undefined> {
  const url = `${BASE}/api/${collection}?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=0`
  const res = await fetch(url, { headers: { Authorization: `JWT ${token}` } })
  const body = await readJsonSafe(res)
  if (!res.ok) {
    throw new Error(extractErrorMessage(body) ?? `GET ${collection} failed with status ${res.status}`)
  }
  const docs = (body as { docs?: RestDoc[] } | undefined)?.docs
  return docs?.[0]
}

async function restCreate(collection: string, data: unknown, token: string): Promise<RestDoc> {
  const res = await fetch(`${BASE}/api/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(data),
  })
  const body = await readJsonSafe(res)
  if (!res.ok) {
    throw new Error(extractErrorMessage(body) ?? `POST ${collection} failed with status ${res.status}`)
  }
  const doc = (body as { doc?: RestDoc } | undefined)?.doc
  if (!doc) throw new Error(`POST ${collection} succeeded but response had no doc`)
  return doc
}

async function restUpdate(
  collection: string,
  id: string | number,
  data: unknown,
  token: string,
): Promise<RestDoc> {
  const res = await fetch(`${BASE}/api/${collection}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(data),
  })
  const body = await readJsonSafe(res)
  if (!res.ok) {
    throw new Error(extractErrorMessage(body) ?? `PATCH ${collection}/${id} failed with status ${res.status}`)
  }
  const doc = (body as { doc?: RestDoc } | undefined)?.doc
  if (!doc) throw new Error(`PATCH ${collection}/${id} succeeded but response had no doc`)
  return doc
}

// name/slug/productType/update-doc ownership split lives in wellnessImportDocs.ts
// (shared, unit-tested pure builders) -- CREATE seeds name/slug/productType once;
// UPDATE sends only the field Square owns on every re-sync (variations).
function buildWellnessLifestyleDoc(lineKey: string, line: PendingLine, variations: WellnessVariation[]) {
  return buildWellnessLifestyleCreateDoc({
    name: line.match.lineName,
    slug: lineKey,
    productType: line.match.productType,
    variations,
  })
}

// CREATE path only -- see buildWellnessLifestyleDoc above.
function buildOilsIncenseDoc(lineKey: string, line: PendingLine, variations: OilsIncenseVariation[]) {
  return buildOilsIncenseCreateDoc({
    name: line.match.lineName,
    slug: lineKey,
    productType: line.match.productType,
    variations,
  })
}

async function main() {
  console.log('Fetching Square wellness/oils catalog…\n')
  const items = await fetchWellnessItems(squareClient)
  console.log(`Fetched ${items.length} items from the Square wellness tree.\n`)

  const { lines, skipped } = buildImportPlan(items)

  // Auth happens ONLY on the --commit path. Dry-run reads Square and prints the plan;
  // it must never require credentials.
  let token: string | undefined

  if (COMMIT) {
    const envToken = process.env.PAYLOAD_TOKEN
    if (envToken) {
      token = envToken
    } else {
      const email = process.env.PAYLOAD_ADMIN_EMAIL
      const password = process.env.PAYLOAD_ADMIN_PASSWORD
      if (!email || !password) {
        console.error(
          'Missing credentials: set PAYLOAD_ADMIN_EMAIL and PAYLOAD_ADMIN_PASSWORD (or PAYLOAD_TOKEN) in the environment. Nothing was written.',
        )
        process.exit(1)
        return
      }
      try {
        token = await loginForToken(email, password)
      } catch (err) {
        console.error(
          `Login to ${BASE} failed: ${err instanceof Error ? err.message : String(err)}. Nothing was written.`,
        )
        process.exit(1)
        return
      }
    }

    let user: AuthProbeUser | null
    try {
      user = await probeAuth(token)
    } catch (err) {
      console.error(
        `Auth probe against ${BASE} failed: ${err instanceof Error ? err.message : String(err)}. Nothing was written.`,
      )
      process.exit(1)
      return
    }

    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      console.error(
        `Auth probe against ${BASE} did not return an admin/staff user (got role: ${user?.role ?? 'none -- unauthenticated'}). Nothing was written.`,
      )
      process.exit(1)
      return
    }

    console.log(`Writing to ${BASE} as ${user.email ?? '(no email on user)'} (role: ${user.role}).\n`)
  }

  let created = 0
  let updated = 0
  let variationCount = 0

  const orphanedReport: Array<{
    lineKey: string
    lineName: string
    orphaned: Array<{ sku: string; scent?: string | null; squareVariationId?: string | null }>
  }> = []

  const failures: Array<{ lineKey: string; lineName: string; error: string }> = []

  for (const [lineKey, line] of lines) {
    variationCount += line.variations.length

    if (!COMMIT) {
      console.log(
        `[dry-run] ${lineKey} (${line.match.collection}) — ${line.variations.length} variations`,
      )
      continue
    }

    // Each line's write is isolated: one failing line (a Payload validation error, a
    // transient network hiccup) must not throw out of main() and suppress the
    // summary/skip list for every other line. Record it and keep going.
    try {
      // COMMIT === true is only reachable after the auth block above has assigned a
      // token or already exited the process -- safe to assert non-null here.
      const authToken = token!

      if (line.match.collection === 'wellness-lifestyle') {
        const incomingVariations = buildWellnessLifestyleVariations(line)
        const existingDoc = await restFindBySlug('wellness-lifestyle', lineKey, authToken)

        if (existingDoc) {
          const { merged, orphaned } = mergeVariations(
            (existingDoc.variations ?? []) as WellnessVariation[],
            incomingVariations,
          )
          const data = buildWellnessLifestyleUpdateDoc({ variations: merged })
          await restUpdate('wellness-lifestyle', existingDoc.id, data, authToken)
          updated++
          if (orphaned.length > 0) {
            orphanedReport.push({ lineKey, lineName: line.match.lineName, orphaned })
          }
        } else {
          const data = buildWellnessLifestyleDoc(lineKey, line, incomingVariations)
          await restCreate('wellness-lifestyle', data, authToken)
          created++
        }
      } else {
        const incomingVariations = buildOilsIncenseVariations(line)
        const existingDoc = await restFindBySlug('oils-incense', lineKey, authToken)

        if (existingDoc) {
          const { merged, orphaned } = mergeVariations(
            (existingDoc.variations ?? []) as OilsIncenseVariation[],
            incomingVariations,
          )
          const data = buildOilsIncenseUpdateDoc({ variations: merged })
          await restUpdate('oils-incense', existingDoc.id, data, authToken)
          updated++
          if (orphaned.length > 0) {
            orphanedReport.push({ lineKey, lineName: line.match.lineName, orphaned })
          }
        } else {
          const data = buildOilsIncenseDoc(lineKey, line, incomingVariations)
          await restCreate('oils-incense', data, authToken)
          created++
        }
      }
    } catch (err) {
      failures.push({
        lineKey,
        lineName: line.match.lineName,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const totalSkipped =
    skipped.unmatched.length +
    skipped.noPrice.length +
    skipped.noPricedVariation.length +
    skipped.malformed.length

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Lines:      ${lines.size}  (created ${created}, updated ${updated}, failed ${failures.length})`)
  console.log(`Variations: ${variationCount}`)
  console.log(
    `Skipped:    ${totalSkipped} (${skipped.unmatched.length} unmatched items, ` +
      `${skipped.noPrice.length} variations with no price, ` +
      `${skipped.noPricedVariation.length} lines with no priced variation` +
      `${skipped.malformed.length ? `, ${skipped.malformed.length} malformed/no id` : ''})`,
  )
  const totalOrphaned = orphanedReport.reduce((sum, entry) => sum + entry.orphaned.length, 0)
  console.log(
    `Orphaned:   ${totalOrphaned} variation(s) across ${orphanedReport.length} line(s) — in Payload but gone from Square`,
  )
  console.log(`${'='.repeat(60)}\n`)

  // Never truncate any of these lists -- a silently-dropped sellable product, a
  // silently-discarded variation, or a silently-suppressed write failure would look
  // identical to full coverage otherwise.
  console.log('UNMATCHED ITEMS (read this list — any sellable product here is a Task 3 bug):')
  for (const name of skipped.unmatched) console.log(`  - ${name}`)

  console.log('\nVARIATIONS WITH NO PRICE:')
  for (const name of skipped.noPrice) console.log(`  - ${name}`)

  console.log('\nLINES WITH NO PRICED VARIATION:')
  for (const name of skipped.noPricedVariation) console.log(`  - ${name}`)

  if (skipped.malformed.length > 0) {
    console.log('\nMALFORMED (missing id from Square):')
    for (const name of skipped.malformed) console.log(`  - ${name}`)
  }

  if (orphanedReport.length > 0) {
    console.log('\nIN PAYLOAD BUT GONE FROM SQUARE (review — possibly discontinued):')
    for (const entry of orphanedReport) {
      console.log(`  ${entry.lineKey} (${entry.lineName}):`)
      for (const v of entry.orphaned) {
        console.log(
          `    - sku ${v.sku}${v.scent ? `, scent ${v.scent}` : ''} (squareVariationId ${v.squareVariationId ?? 'none'})`,
        )
      }
    }
  }

  if (failures.length > 0) {
    console.log('\nFAILED LINES (write error — NOT imported, fix and re-run):')
    for (const f of failures) {
      console.log(`  - ${f.lineKey} (${f.lineName}): ${f.error}`)
    }
  }

  if (!COMMIT) console.log('\nDry run. Nothing was written. Re-run with --commit to persist.')

  process.exit(failures.length > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
