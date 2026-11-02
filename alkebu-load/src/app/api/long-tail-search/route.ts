import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

import { getAvailabilityProvider } from '@/app/utils/ingram/AvailabilityProvider';
import { createRateLimiter, handleLongTailSearch } from '@/app/utils/longTail/longTailSearch';
import { getClientIp, verifyTurnstileToken } from '@/app/utils/turnstile';

// Module scope: limits are per server instance, which is one Coolify container today.
const perClient = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });
const global = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.LONG_TAIL_HOURLY_CAP) || 120,
});

/**
 * POST /api/long-tail-search { query, scope?, turnstileToken }
 * The storefront calls this server-to-server; when it authenticates with its API key,
 * the visitor's IP comes from `x-client-ip` (otherwise every visitor would share the
 * storefront's IP and one rate-limit bucket).
 */
export async function POST(request: NextRequest) {
  // Off until the live Ingram provider lands (plan Task 11): the mock would show sample titles.
  if (process.env.LONG_TAIL_SEARCH_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const payload = await getPayload({ config });

  let clientKey = getClientIp(request.headers);
  const forwardedIp = request.headers.get('x-client-ip')?.trim();
  if (forwardedIp) {
    const { user } = await payload.auth({ headers: request.headers }).catch(() => ({ user: null }));
    if (user) clientKey = forwardedIp;
  }

  const body = await request.json().catch(() => null);
  const result = await handleLongTailSearch(body, clientKey, {
    verifyToken: verifyTurnstileToken,
    searchLongTail: (query, scope) => getAvailabilityProvider().searchLongTail(query, scope),
    perClient,
    global,
    logDemand: (query, resultCount) => {
      payload
        .create({
          collection: 'searchAnalytics',
          data: {
            query,
            normalizedQuery: query.toLowerCase(),
            queryType: 'books',
            searchSource: 'api',
            // 'combined' + externalResultCount marks a look-wider search in the log.
            searchEngine: 'combined',
            resultCount,
            internalResultCount: 0,
            externalResultCount: resultCount,
            searchDate: new Date().toISOString(),
          },
        })
        .catch((err: unknown) => console.warn('Long-tail demand log failed:', err));
    },
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
