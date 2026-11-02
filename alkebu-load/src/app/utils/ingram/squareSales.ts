// In-store sales history from Square: which catalog variations sold in a completed order
// since a date, and when each last sold. Used once, to keep titles we've recently sold
// buyable even when Ingram can't supply them (we got them somewhere before).

const LOCATIONS_PER_SEARCH = 10; // Square SearchOrders accepts at most 10 location ids
const PAGE_SIZE = 500;

export async function fetchSoldVariationIds(
  client: any,
  sinceIso: string,
): Promise<{ sold: Map<string, string>; orders: number; locations: number }> {
  const locationsResponse = await client.locations.list();
  const locationIds: string[] = (locationsResponse?.locations ?? []).map((l: any) => l.id).filter(Boolean);
  const sold = new Map<string, string>();
  let orders = 0;

  for (let i = 0; i < locationIds.length; i += LOCATIONS_PER_SEARCH) {
    const batch = locationIds.slice(i, i + LOCATIONS_PER_SEARCH);
    let cursor: string | undefined;
    do {
      const response = await client.orders.search({
        locationIds: batch,
        query: {
          filter: {
            stateFilter: { states: ['COMPLETED'] },
            dateTimeFilter: { closedAt: { startAt: sinceIso } },
          },
          sort: { sortField: 'CLOSED_AT', sortOrder: 'ASC' },
        },
        limit: PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
      });
      for (const order of response?.orders ?? []) {
        orders += 1;
        const closedAt: string = order.closedAt ?? order.createdAt ?? '';
        for (const item of order.lineItems ?? []) {
          const id = item?.catalogObjectId;
          if (!id) continue;
          const previous = sold.get(id);
          if (!previous || closedAt > previous) sold.set(id, closedAt);
        }
      }
      cursor = response?.cursor || undefined;
    } while (cursor);
  }

  return { sold, orders, locations: locationIds.length };
}
