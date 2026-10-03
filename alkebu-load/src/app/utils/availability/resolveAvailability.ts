// Single source of truth for a book's customer-facing availability. Pure, so the
// storefront rules and checkout can share it and it can be unit-tested in isolation.

export type AvailabilityState = 'in_stock' | 'special_order' | 'request';

/**
 * - in-store: Square on-hand > 0
 * - ingram: the cached Ingram refresh says Ingram can fulfill it
 * - vendor: staff flagged it as reorderable from a non-Ingram vendor
 * - unchecked: no signal yet, and Ingram has never been checked for this book; sellable
 *   under the pre-Ingram rule (status 'available' is purchasable at zero stock)
 * - none: nothing can fulfill it
 */
export type AvailabilitySource = 'in-store' | 'ingram' | 'vendor' | 'unchecked' | 'none';

export interface ResolvedAvailability {
  state: AvailabilityState;
  source: AvailabilitySource;
  shipEstimate: string;
}

const SHIP_ESTIMATE = 'Ships in 3–8 days';

const result = (state: AvailabilityState, source: AvailabilitySource): ResolvedAvailability => ({
  state,
  source,
  shipEstimate: SHIP_ESTIMATE,
});

export function resolveAvailability(book: any): ResolvedAvailability {
  // Staff decisions win over stock signals.
  const status = String(book?.availabilityStatus || 'available');
  if (status === 'request-only' || status === 'discontinued') return result('request', 'none');

  const editions: any[] = Array.isArray(book?.editions) ? book.editions : [];
  const inventories = editions.map((edition) => edition?.inventory ?? {});

  if (inventories.some((inv) => typeof inv.stockLevel === 'number' && inv.stockLevel > 0)) {
    return result('in_stock', 'in-store');
  }
  if (inventories.some((inv) => inv.ingramAvailable === true)) return result('in_stock', 'ingram');
  if (inventories.some((inv) => inv.availableToOrder === true)) return result('in_stock', 'vendor');
  if (!inventories.some((inv) => inv.ingramCheckedAt)) return result('in_stock', 'unchecked');
  return result('request', 'none');
}
