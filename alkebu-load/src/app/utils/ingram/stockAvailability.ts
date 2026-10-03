// Pure helpers that turn an IngramStock record into an availability decision.
import type { IngramStock } from './parseStockResponse';

/** Query Type 9 accepts at most 25 ISBNs per call. */
export function batchIsbns(isbns: string[], size = 25): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < isbns.length; i += size) out.push(isbns.slice(i, i + size));
  return out;
}

/** On-hand at the primary DC (La Vergne, ~20 min from the store), else the best DC. */
export function ingramOnHand(stock: IngramStock, primaryDc = 'LaVergne'): number {
  const primary = stock.dcs[primaryDc];
  if (primary) return primary.onHand;
  const values = Object.values(stock.dcs).map((dc) => dc.onHand);
  return values.length ? Math.max(...values) : 0;
}

// Product Availability (prodstat) codes: 20 available, 21 in stock, 22 special order;
// 31 temporarily out of stock, 40 not available from Ingram.
const FULFILLABLE_CODES = new Set(['20', '21', '22']);
const UNAVAILABLE_CODES = new Set(['31', '40']);
export const KNOWN_AVAILABILITY_CODES = new Set([...FULFILLABLE_CODES, ...UNAVAILABLE_CODES]);

/**
 * Code-first: the on-sale-date gate, then the availability code, and the quantity
 * threshold only when no code is present. A stale quantity never overrides code 40.
 */
export function isIngramAvailable(
  stock: IngramStock,
  threshold: number,
  opts: { today?: Date; primaryDc?: string } = {},
): boolean {
  // Ingram shows pre-order on-hand up to 14 days before street date; never sell early.
  if (!isOnSale(stock.onSaleDate, opts.today ?? new Date())) return false;
  const code = stock.productAvailability?.trim();
  if (code && UNAVAILABLE_CODES.has(code)) return false;
  if (code && FULFILLABLE_CODES.has(code)) return true;
  return ingramOnHand(stock, opts.primaryDc) > threshold;
}

const chicagoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function isOnSale(onSaleDate: string | undefined, today: Date): boolean {
  // A date the feed parser couldn't read: never risk selling before street date.
  if (onSaleDate === 'unrecognized') return false;
  // Unset, '00010101' or malformed means no street date: sellable on receipt.
  if (!onSaleDate || !/^\d{8}$/.test(onSaleDate) || onSaleDate <= '00010101') return true;
  // Street dates are local, so compare against the store's calendar date, not UTC's.
  return onSaleDate <= chicagoDate.format(today).replace(/-/g, '');
}
