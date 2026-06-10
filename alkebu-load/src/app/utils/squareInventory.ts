// Pure helpers for mapping Square inventory.count.updated events onto Payload book editions.
// Kept dependency-free so it can be unit-tested without loading the Payload/Stripe module graph.

export interface SquareInventoryCount {
  catalog_object_id?: string
  catalog_object_type?: string
  state?: string
  location_id?: string
  quantity?: string
  calculated_at?: string
}

/**
 * Return a new editions array with the matching edition's `inventory.stockLevel` set to `quantity`.
 * Square POS is the source of truth for stock, so this overwrites the existing value.
 * Non-matching editions are returned unchanged (same reference).
 */
export function applyInventoryCountToEditions(
  editions: any[],
  squareVariationId: string,
  quantity: number,
): any[] {
  return editions.map((edition) =>
    edition?.squareVariationId === squareVariationId
      ? { ...edition, inventory: { ...(edition.inventory || {}), stockLevel: quantity } }
      : edition,
  )
}
