/**
 * Fixed-window, in-memory rate limiter for public form routes (contact,
 * quote-request). Per-process only: counts reset on restart and are not
 * shared between instances, which is acceptable for the single-instance
 * deployment and for slowing down abuse, not for hard quotas.
 */
export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return function isRateLimited(key: string, now: number = Date.now()): boolean {
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }

    current.count += 1;
    return current.count > max;
  };
}
