// Pure merge of an Ingram stock snapshot onto a book's editions. Only the Ingram cache
// fields inside `inventory` change; every other edition field is carried over as-is,
// because Payload replaces the whole editions array on update.
import { toEan13 } from './ean';

/** What the refresh keeps per EAN: already reduced to the two values the site uses. */
export interface CompactStock {
  onHand: number;
  available: boolean;
}

/** Re-stamp unchanged editions at most weekly, instead of rewriting every book daily. */
const RESTAMP_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function editionEan(edition: any): string | null {
  return toEan13(edition?.isbn) ?? toEan13(edition?.isbn10);
}

export function applyStockToEditions(
  editions: any[],
  stockByEan: Map<string, CompactStock>,
  opts: { checkedAt: string; fullCoverage: boolean },
): { editions: any[]; changed: boolean } {
  let changed = false;
  const next = editions.map((edition) => {
    const ean = editionEan(edition);
    if (!ean) return edition;

    const found = stockByEan.get(ean);
    // Missing from a full snapshot means Ingram doesn't carry it; missing from a
    // partial one (a delta) means "no news".
    if (!found && !opts.fullCoverage) return edition;
    const target = found ?? { onHand: 0, available: false };

    const inventory = edition?.inventory ?? {};
    const lastChecked = Date.parse(inventory.ingramCheckedAt ?? '');
    const stale = Number.isNaN(lastChecked) || Date.parse(opts.checkedAt) - lastChecked >= RESTAMP_AFTER_MS;
    const same = inventory.ingramOnHand === target.onHand && inventory.ingramAvailable === target.available;
    if (same && !stale) return edition;

    changed = true;
    return {
      ...edition,
      inventory: {
        ...inventory,
        ingramOnHand: target.onHand,
        ingramAvailable: target.available,
        ingramCheckedAt: opts.checkedAt,
      },
    };
  });
  return { editions: changed ? next : editions, changed };
}
