// Website sales history from our own Orders: which books sold online since a date, the
// ISBNs bought, and when each book last sold. Counts paid-or-later orders only.
import type { Payload } from 'payload';

import type { OnlineSales } from './availabilityPlan';

const SOLD_STATUSES = ['paid', 'processing', 'shipped', 'delivered', 'completed'];

export async function fetchOnlineSales(
  payload: Pick<Payload, 'find'>,
  sinceIso: string,
): Promise<{ sales: OnlineSales; orders: number }> {
  const sales: OnlineSales = new Map();
  let orders = 0;
  for (let page = 1; ; page += 1) {
    const result = await payload.find({
      collection: 'orders',
      where: { and: [{ createdAt: { greater_than_equal: sinceIso } }, { status: { in: SOLD_STATUSES } }] },
      page,
      limit: 200,
      depth: 0,
      sort: 'createdAt',
    });
    for (const order of result.docs as any[]) {
      orders += 1;
      const soldAt: string = order.createdAt;
      for (const item of order.items ?? []) {
        if (item?.productType !== 'books') continue;
        const bookId = typeof item.product === 'object' ? item.product?.value : item.product;
        if (bookId === undefined || bookId === null) continue;
        const key = String(bookId);
        const entry = sales.get(key) ?? { lastSoldAt: soldAt, isbns: new Set<string>() };
        if (soldAt > entry.lastSoldAt) entry.lastSoldAt = soldAt;
        for (const isbn of [item.identifiers?.isbn, item.identifiers?.isbn10]) if (isbn) entry.isbns.add(isbn);
        sales.set(key, entry);
      }
    }
    if (!result.hasNextPage) break;
  }
  return { sales, orders };
}
