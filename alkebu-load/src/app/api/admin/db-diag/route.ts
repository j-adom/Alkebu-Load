import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { sql } from '@payloadcms/db-postgres'

export const maxDuration = 30

// GET /api/admin/db-diag
//
// Read-only diagnostic. Returns column metadata for the `customers` table
// and the contents of Payload's migrations bookkeeping table. Added to
// debug a post-migration state where /api/customers returns 500 even
// though POST /api/admin/migrate reported `ok:true` — there is no way
// from the existing route to tell "applied N migrations" apart from
// "no pending migrations, did nothing."
//
// Auth: admin role required.
export async function GET(request: NextRequest) {
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: request.headers })
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if ((user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  try {
    const db: any = payload.db as any

    const customersColumns: any = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'customers'
      ORDER BY ordinal_position
    `)

    const migrations: any = await db.execute(sql`
      SELECT * FROM payload_migrations ORDER BY id
    `)

    const enums: any = await db.execute(sql`
      SELECT t.typname AS enum_name, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname LIKE 'enum_customers_%'
      GROUP BY t.typname
    `)

    const ordersCustomerFk: any = await db.execute(sql`
      SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conrelid = 'public.orders'::regclass
        AND contype = 'f'
        AND conname LIKE '%customer%'
    `)

    return NextResponse.json({
      customersColumns: customersColumns.rows ?? customersColumns,
      payloadMigrations: migrations.rows ?? migrations,
      customersEnums: enums.rows ?? enums,
      ordersCustomerForeignKeys: ordersCustomerFk.rows ?? ordersCustomerFk,
    })
  } catch (err) {
    console.error('Admin db-diag route failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
