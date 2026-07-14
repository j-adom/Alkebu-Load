import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { buildPublicHealthResponse } from '@/app/utils/healthResponse';
import { checkSchemaDrift } from '@/app/utils/schemaDrift';

const STAFF_ROLES = ['admin', 'staff'];

/**
 * Health check endpoint for Coolify/Docker. PUBLIC — deliberately redacted so
 * anonymous callers never see internal detail (see the sitemap/health
 * hardening pass). The public response only ever exposes a coarse
 * "schema": "ok" | "drift" flag; the list of missing collection slugs is
 * only included for an authenticated admin/staff request.
 */
export async function GET(request: NextRequest) {
  try {
    // Check if Payload can connect to database
    const payload = await getPayload({ config });

    // Simple database connectivity test
    await payload.find({
      collection: 'users',
      limit: 1,
    });

    // Schema drift probe must never itself take the health check down —
    // default to "ok" if the probe machinery throws unexpectedly.
    const drift = await checkSchemaDrift(payload).catch((err) => {
      console.error('Health check: schema drift probe failed:', err);
      return { ok: true, missing: [] as string[] };
    });

    let isStaff = false;
    try {
      const { user } = await payload.auth({ headers: request.headers });
      isStaff = !!user && STAFF_ROLES.includes((user as { role?: string }).role ?? '');
    } catch {
      isStaff = false;
    }

    const body: Record<string, unknown> = {
      ...buildPublicHealthResponse({ database: 'connected' }),
      schema: drift.ok ? 'ok' : 'drift',
    };

    if (isStaff && !drift.ok) {
      body.schemaMissing = drift.missing;
    }

    return NextResponse.json(body);
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      { ...buildPublicHealthResponse({ database: 'disconnected' }), schema: 'unknown' },
      { status: 503 }
    );
  }
}
