import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'

export const maxDuration = 60

type SqlResult = { rows?: unknown[] } | unknown[]

function extractRows(r: SqlResult): unknown[] {
  if (Array.isArray(r)) return r
  if (r && typeof r === 'object' && 'rows' in r && Array.isArray((r as { rows?: unknown[] }).rows)) {
    return (r as { rows: unknown[] }).rows
  }
  return []
}

// POST /api/admin/db-fix-phase6?confirm=true
//
// One-shot idempotent remediation for the Phase 6 schema. The prod
// payload_migrations table contains a single ('dev', batch=-1) sentinel
// from when the DB was schema-pushed in dev mode, which causes
// payload.db.migrate() to silently no-op. As a result the Phase 6
// migration never ran in prod: the customers table is missing both
// `source` and `lifecycle_status` (and their enum types).
//
// This route applies just the missing pieces, idempotently. It does NOT
// modify payload_migrations — the 'dev' sentinel is the contract Payload
// expects for this DB, and a separate refactor should decide whether to
// keep pushing or switch to true migrations.
//
// Auth: admin role required.
// Guard: ?confirm=true required.
export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: request.headers })
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if ((user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  if (request.nextUrl.searchParams.get('confirm') !== 'true') {
    return NextResponse.json(
      { error: 'Confirmation required', hint: 'Add ?confirm=true to apply.' },
      { status: 400 },
    )
  }

  try {
    const adapter = payload.db as unknown as {
      drizzle: { execute: (q: unknown) => Promise<SqlResult> }
    }
    const db = adapter.drizzle

    // Idempotent enum creation. CREATE TYPE has no IF NOT EXISTS in PG,
    // so the existence check is wrapped in a DO block.
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_customers_source') THEN
          CREATE TYPE "public"."enum_customers_source" AS ENUM('ecom', 'pos', 'imported', 'manual');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_customers_lifecycle_status') THEN
          CREATE TYPE "public"."enum_customers_lifecycle_status" AS ENUM('ghost', 'invited', 'active');
        END IF;
      END $$;
    `)

    // Column adds. ADD COLUMN IF NOT EXISTS is native and safe; the
    // NOT NULL DEFAULT backfills any existing rows.
    await db.execute(sql`
      ALTER TABLE "customers"
        ADD COLUMN IF NOT EXISTS "source" "enum_customers_source" NOT NULL DEFAULT 'manual';
    `)
    await db.execute(sql`
      ALTER TABLE "customers"
        ADD COLUMN IF NOT EXISTS "lifecycle_status" "enum_customers_lifecycle_status" NOT NULL DEFAULT 'ghost';
    `)

    // Report the post-state so the caller can verify in one round-trip.
    const customersColumnsAfter = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'customers'
        AND column_name IN ('source', 'lifecycle_status')
      ORDER BY column_name
    `)

    const enumsAfter = await db.execute(sql`
      SELECT t.typname AS enum_name
      FROM pg_type t
      WHERE t.typname IN ('enum_customers_source', 'enum_customers_lifecycle_status')
      ORDER BY t.typname
    `)

    return NextResponse.json({
      ok: true,
      message: 'Phase 6 schema applied idempotently.',
      durationMs: Date.now() - startedAt,
      verifyColumns: extractRows(customersColumnsAfter),
      verifyEnums: extractRows(enumsAfter),
    })
  } catch (err) {
    console.error('Admin db-fix-phase6 route failed:', err)
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startedAt,
      },
      { status: 500 },
    )
  }
}
