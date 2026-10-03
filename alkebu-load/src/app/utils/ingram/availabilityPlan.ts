// What one Ingram refresh would do to one book, as a plan: the new editions plus how the
// customer-facing state moves. Shared by the nightly job (which writes `editions`) and the
// owner dry run (which reports transitions and a review list) so they can't disagree.
import { resolveAvailability, type AvailabilityState } from '../availability/resolveAvailability';
import { applyStockToEditions, editionEan, type CompactStock } from './applyIngramStock';

export type Transition =
  | 'protected' // staff marked request-only / discontinued: never touched
  | 'stays-buyable'
  | 'buyable-to-request'
  | 'rescued-by-sales' // would flip, but sold in store recently: flagged available-to-order
  | 'request-to-buyable'
  | 'stays-request';

export type FlipReason = 'not-carried-by-ingram' | 'ingram-cannot-supply' | 'no-valid-isbn';

export interface BookAvailabilityPlan {
  protected: boolean;
  changed: boolean;
  editions: any[];
  before: AvailabilityState;
  after: AvailabilityState;
  transition: Transition;
  reason?: FlipReason;
  lastSoldAt?: string;
  saleSource?: 'in-store' | 'online' | 'both';
}

/** Website sales per book id: when it last sold, and which ISBNs were bought. */
export type OnlineSales = Map<string, { lastSoldAt: string; isbns: Set<string> }>;

const PROTECTED_STATUSES = new Set(['request-only', 'discontinued']);

export function planBookAvailability(
  book: any,
  stockByEan: Map<string, CompactStock>,
  opts: {
    checkedAt: string;
    fullCoverage: boolean;
    /** In-store (Square) sales: variation id -> last sold. */
    soldVariationIds?: Map<string, string>;
    /** Website sales by book id. */
    onlineSales?: OnlineSales;
  },
): BookAvailabilityPlan {
  const editions: any[] = Array.isArray(book?.editions) ? book.editions : [];
  const before = resolveAvailability(book).state;

  if (PROTECTED_STATUSES.has(String(book?.availabilityStatus))) {
    return { protected: true, changed: false, editions, before, after: before, transition: 'protected' };
  }

  let { editions: next, changed } = applyStockToEditions(editions, stockByEan, opts);
  let after = resolveAvailability({ ...book, editions: next }).state;

  if (before === 'in_stock' && after === 'request' && (opts.soldVariationIds || opts.onlineSales)) {
    const inStoreAt = (edition: any) => opts.soldVariationIds?.get(edition?.squareVariationId);
    const online = opts.onlineSales?.get(String(book?.id));
    // The edition(s) bought online, else the primary (or first) edition.
    const boughtOnline = online
      ? next.filter((edition) => online.isbns.has(edition?.isbn) || online.isbns.has(edition?.isbn10))
      : [];
    const onlineTargets = online
      ? boughtOnline.length > 0
        ? boughtOnline
        : [next.find((edition) => edition?.isPrimary) ?? next[0]].filter(Boolean)
      : [];
    const soldInStore = next.some(inStoreAt);

    if (soldInStore || onlineTargets.length > 0) {
      next = next.map((edition) =>
        inStoreAt(edition) || onlineTargets.includes(edition)
          ? { ...edition, inventory: { ...(edition.inventory ?? {}), availableToOrder: true } }
          : edition,
      );
      changed = true;
      const dates = [...next.map(inStoreAt), online?.lastSoldAt].filter((d): d is string => !!d).sort();
      const saleSource = soldInStore && online ? 'both' : soldInStore ? 'in-store' : 'online';
      after = resolveAvailability({ ...book, editions: next }).state;
      return {
        protected: false,
        changed,
        editions: next,
        before,
        after,
        transition: 'rescued-by-sales',
        lastSoldAt: dates.pop(),
        saleSource,
      };
    }
  }

  const transition: Transition =
    before === 'in_stock'
      ? after === 'in_stock' ? 'stays-buyable' : 'buyable-to-request'
      : after === 'in_stock' ? 'request-to-buyable' : 'stays-request';

  let reason: FlipReason | undefined;
  if (transition === 'buyable-to-request') {
    const eans = next.map(editionEan).filter((ean): ean is string => !!ean);
    reason = eans.length === 0 ? 'no-valid-isbn' : eans.some((ean) => stockByEan.has(ean)) ? 'ingram-cannot-supply' : 'not-carried-by-ingram';
  }

  return { protected: false, changed, editions: next, before, after, transition, reason };
}
