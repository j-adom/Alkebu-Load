// Search demand counter: each logged search carries how many times its normalized query
// has been searched so far. This accumulates the "most wanted, not carried" signal that
// long-tail discovery and later merchandising decisions read.
import type { Payload } from 'payload';

export const POPULAR_THRESHOLD = 5;

export function nextFrequency(priorMax: number): { queryFrequency: number; popularQuery: boolean } {
  const queryFrequency = (Number.isFinite(priorMax) ? priorMax : 0) + 1;
  return { queryFrequency, popularQuery: queryFrequency >= POPULAR_THRESHOLD };
}

/** Never throws: a failed lookup must not block logging the search itself. */
export async function frequencyForNewSearch(
  payload: Pick<Payload, 'find'>,
  normalizedQuery: string,
): Promise<{ queryFrequency: number; popularQuery: boolean }> {
  try {
    const prior = await payload.find({
      collection: 'searchAnalytics',
      where: { normalizedQuery: { equals: normalizedQuery } },
      sort: '-queryFrequency',
      limit: 1,
      depth: 0,
      pagination: false,
    });
    return nextFrequency(Number(prior.docs[0]?.queryFrequency ?? 0));
  } catch (error) {
    console.warn('Search demand lookup failed:', error);
    return nextFrequency(0);
  }
}
