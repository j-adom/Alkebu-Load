import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const maxDuration = 300

/**
 * POST /api/admin/migrate?confirm=true
 *
 * Runs any pending Payload migrations against the live database.
 * Exists because the Next.js standalone runtime container ships
 * without `pnpm` / `tsx` / the `payload` CLI binary — so the only
 * way to apply migrations on prod is from inside the running app.
 *
 * Auth: admin role required.
 * Guard: `?confirm=true` required to prevent accidental triggering.
 *
 * On success, returns `{ ok: true, durationMs }`. On failure,
 * returns 500 with the error message. The Payload logger emits
 * per-migration progress to the container's stdout — watch the
 * Coolify logs for `Migrating: <name>` / `Migrated: <name>` lines.
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now()

  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: request.headers })
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if ((user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  if (request.nextUrl.searchParams.get('confirm') !== 'true') {
    return NextResponse.json(
      {
        error: 'Confirmation required',
        hint: 'Add ?confirm=true to actually run pending migrations.',
      },
      { status: 400 },
    )
  }

  try {
    await payload.db.migrate()
    return NextResponse.json({
      ok: true,
      message: 'Pending migrations applied. Check container logs for the per-migration entries.',
      durationMs: Date.now() - startedAt,
    })
  } catch (err) {
    console.error('Admin migrate route failed:', err)
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
