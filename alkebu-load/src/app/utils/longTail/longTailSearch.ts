// "Look wider" search: a deliberate, bot-gated search beyond our shelves. Results are
// returned for display only and never persisted or indexed (Ingram Web Service terms).
// Dependencies are injected so the gate, limits and validation are unit-testable.
import type { LongTailResult, LongTailScope } from '../ingram/AvailabilityProvider';

const SCOPES: readonly LongTailScope[] = ['title', 'author', 'topic'];
const MIN_QUERY = 2;
const MAX_QUERY = 120;

export interface RateLimiter {
  /** Counts one use of `key`; false once the key is over its limit for the window. */
  take(key: string): boolean;
}

export function createRateLimiter(opts: { windowMs: number; max: number; now?: () => number }): RateLimiter {
  const now = opts.now ?? Date.now;
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    take(key) {
      const t = now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= t) {
        buckets.set(key, { count: 1, resetAt: t + opts.windowMs });
        return true;
      }
      bucket.count += 1;
      return bucket.count <= opts.max;
    },
  };
}

export interface LongTailDeps {
  verifyToken(token: string, clientKey: string): Promise<{ success: boolean; error?: string }>;
  searchLongTail(query: string, scope?: LongTailScope): Promise<LongTailResult[]>;
  /** Per visitor, so one person can't drain the Ingram request allowance. */
  perClient: RateLimiter;
  /** Across everyone, so total Ingram volume stays inside the subscription. */
  global: RateLimiter;
  /** Fire-and-forget demand signal: the query only, never Ingram data. */
  logDemand(query: string, resultCount: number): void;
}

type Response = { status: number; body: { results: LongTailResult[] } | { error: string } };
const error = (status: number, message: string): Response => ({ status, body: { error: message } });

export async function handleLongTailSearch(input: unknown, clientKey: string, deps: LongTailDeps): Promise<Response> {
  const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const query = typeof body.query === 'string' ? body.query.trim().replace(/\s+/g, ' ') : '';
  const scope = body.scope === undefined || body.scope === null || body.scope === '' ? undefined : body.scope;
  const token = typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : '';

  if (query.length < MIN_QUERY || query.length > MAX_QUERY) {
    return error(400, `Search for something between ${MIN_QUERY} and ${MAX_QUERY} characters.`);
  }
  if (scope !== undefined && !SCOPES.includes(scope as LongTailScope)) {
    return error(400, 'Choose title, author or topic.');
  }
  if (!token) return error(400, 'Please complete the bot check and try again.');

  // Limits come before the bot check so a flood can't burn Turnstile verifications.
  if (!deps.perClient.take(clientKey) || !deps.global.take('global')) {
    return error(429, 'Too many searches right now. Please try again in a few minutes.');
  }

  const verified = await deps.verifyToken(token, clientKey);
  if (!verified.success) return error(403, verified.error || 'Bot check failed.');

  let results: LongTailResult[];
  try {
    results = await deps.searchLongTail(query, scope as LongTailScope | undefined);
  } catch (err) {
    console.error('Long-tail search failed:', err);
    return error(502, "We couldn't search the wider catalog just now. Please try again shortly.");
  }

  deps.logDemand(query, results.length);
  return { status: 200, body: { results } };
}
