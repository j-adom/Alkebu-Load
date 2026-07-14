import type { Payload } from 'payload';

/**
 * Detects schema drift: a collection registered in the running Payload config
 * whose database table doesn't exist (or is otherwise broken). This is the
 * exact failure mode that caused the PartnershipInquiries incident on July 8,
 * 2026 — the collection was registered in the app, but its Postgres table was
 * never created, so every write 500'd for six days with no signal to staff.
 *
 * The slug list is derived from the live Payload config, never hardcoded —
 * a hardcoded list would silently go stale as collections are added/removed.
 */
export interface SchemaDriftResult {
  ok: boolean;
  missing: string[];
}

export async function checkSchemaDrift(payload: Payload): Promise<SchemaDriftResult> {
  const collections = payload?.config?.collections ?? [];
  const missing: string[] = [];

  for (const collection of collections) {
    const slug = collection?.slug;
    if (!slug) continue;

    try {
      // Cheapest possible read: count with no filters. Any collection whose
      // table is missing or broken throws here. Slug comes from the live
      // config, so it's a dynamic string — cast matches the established
      // pattern for dynamic collection slugs elsewhere in this codebase
      // (e.g. squareSync, stripeHelpers, cartOperations).
      await payload.count({ collection: slug as any });
    } catch {
      // Caught per-collection so one broken table never aborts the sweep.
      missing.push(slug);
    }
  }

  return { ok: missing.length === 0, missing };
}
