import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { buildPublicHealthResponse } from '@/app/utils/healthResponse';

/**
 * Health check endpoint for Coolify/Docker.
 * Public response is intentionally minimal so configuration details stay private.
 */
export async function GET() {
  try {
    // Check if Payload can connect to database
    const payload = await getPayload({ config });

    // Simple database connectivity test
    await payload.find({
      collection: 'users',
      limit: 1,
    });

    return NextResponse.json(buildPublicHealthResponse({ database: 'connected' }));
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      buildPublicHealthResponse({ database: 'disconnected' }),
      { status: 503 }
    );
  }
}
