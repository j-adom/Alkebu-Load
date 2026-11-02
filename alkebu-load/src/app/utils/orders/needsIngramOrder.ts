// Pure helpers that tag each order line with where staff should fulfill it from, so the
// dashboard can flag orders that need a manual Ingram Direct-to-Home order in iPage.

export type FulfillmentSource = 'in-store' | 'ingram' | 'vendor';

export function orderNeedsIngram(order: { items?: Array<{ fulfillmentSource?: string | null }> | null }): boolean {
  return (order.items ?? []).some((item) => item?.fulfillmentSource === 'ingram');
}

/** The edition matching the purchased ISBN, else the primary (or first) edition. */
export function pickOrderedEdition(book: any, identifiers: { isbn?: string | null } | null | undefined): any {
  const editions: any[] = Array.isArray(book?.editions) ? book.editions : [];
  const isbn = identifiers?.isbn?.trim();
  return (
    (isbn && editions.find((edition) => edition?.isbn === isbn)) ||
    editions.find((edition) => edition?.isPrimary) ||
    editions[0]
  );
}

/**
 * Read at order creation, before the webhook decrements stock. A store shelf that
 * covers the whole quantity wins; otherwise Ingram, then a non-Ingram vendor.
 */
export function classifyLineFulfillment(edition: any, quantity: number): FulfillmentSource | undefined {
  const inventory = edition?.inventory ?? {};
  if (typeof inventory.stockLevel === 'number' && inventory.stockLevel >= quantity) return 'in-store';
  if (inventory.ingramAvailable === true) return 'ingram';
  if (inventory.availableToOrder === true) return 'vendor';
  return undefined;
}
