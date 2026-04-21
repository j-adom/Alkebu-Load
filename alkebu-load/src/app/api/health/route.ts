import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getEmailRuntimeConfig } from '@/app/utils/emailConfig';

/**
 * Health check endpoint for Coolify/Docker
 * Returns 200 if app and database are healthy
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

    const email = getEmailRuntimeConfig();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      email: {
        provider: email.provider,
        configured: email.configured,
        host: email.host,
        port: email.port,
        fromEmail: email.fromEmail,
        staffNotificationEmail: email.staffNotificationEmail,
        missing: email.missing,
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
