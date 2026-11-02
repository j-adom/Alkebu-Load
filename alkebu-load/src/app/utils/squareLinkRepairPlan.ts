import { toEan13 } from './ingram/ean';

/**
 * Plans the one-off repair of Books' Square links (scripts/square-link-repair.ts). Pure.
 *
 * Legacy imports stored variation ids or old numeric ids where Square item ids belong
 * (see squareLinks.ts), and every Square edit to such a book created a duplicate. For
 * each book this resolves every Square-linked edition to its real Square item and
 * variation (by variation id, else by an ISBN Square has on exactly one variation),
 * then groups books by real item:
 *   - one book per item, links wrong: `repairs` (ids only; titles and prices untouched);
 *   - several books per item, all but the oldest created by the Square sync: `merges`,
 *     the newer copies folding into the oldest (which keeps its cover and history);
 *   - several books per item otherwise: `conflicts`, for a person to sort out.
 */

export type PlanBook = {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  importSource: string | null;
  squareItemId: string | null;
  editions: Array<{ id: string; isbn: string | null; squareItemId: string | null; squareVariationId: string | null }>;
};

export type SquareVariationRef = { itemId: string; variationId: string };

export type SquareIndex = {
  variations: ReadonlyMap<string, SquareVariationRef>;
  /** EAN-13 to every Square variation carrying it. */
  byEan: ReadonlyMap<string, SquareVariationRef[]>;
};

export type EditionFix = { editionId: string; squareItemId: string; squareVariationId: string; via: 'variation' | 'isbn' };

export type RepairPlan = {
  repairs: Array<{ bookId: number; squareItemId: string; editions: EditionFix[] }>;
  merges: Array<{ squareItemId: string; keeperId: number; duplicateIds: number[]; keeperEditions: EditionFix[] }>;
  conflicts: Array<{ squareItemId: string; bookIds: number[]; reason: string }>;
  counts: {
    books: number;
    alreadyCorrect: number;
    repaired: number;
    relinkedByIsbn: number;
    merged: number;
    conflicted: number;
    notInSquare: number;
    multiItem: number;
  };
};

const SYNC_CREATED = new Set(['square-webhook']);

export function planSquareLinkRepair(books: PlanBook[], square: SquareIndex): RepairPlan {
  const resolved = new Map<number, { itemId: string; fixes: EditionFix[]; editionsResolved: EditionFix[] }>();
  const counts = { books: books.length, alreadyCorrect: 0, repaired: 0, relinkedByIsbn: 0, merged: 0, conflicted: 0, notInSquare: 0, multiItem: 0 };

  for (const book of books) {
    const linked = book.editions.filter((edition) => edition.squareVariationId || edition.squareItemId || book.squareItemId);
    if (linked.length === 0 && !book.squareItemId) continue;

    const claimed = new Set<string>();
    const editionsResolved: EditionFix[] = [];
    for (const edition of book.editions) {
      const byVariation = edition.squareVariationId ? square.variations.get(edition.squareVariationId) : undefined;
      if (byVariation) {
        editionsResolved.push({ editionId: edition.id, squareItemId: byVariation.itemId, squareVariationId: byVariation.variationId, via: 'variation' });
        claimed.add(byVariation.variationId);
      }
    }
    for (const edition of book.editions) {
      if (editionsResolved.some((fix) => fix.editionId === edition.id)) continue;
      const ean = toEan13(edition.isbn);
      const candidates = (ean ? square.byEan.get(ean) : undefined)?.filter((ref) => !claimed.has(ref.variationId)) ?? [];
      if (candidates.length === 1) {
        editionsResolved.push({ editionId: edition.id, squareItemId: candidates[0].itemId, squareVariationId: candidates[0].variationId, via: 'isbn' });
        claimed.add(candidates[0].variationId);
      }
    }

    if (editionsResolved.length === 0) {
      counts.notInSquare++;
      continue;
    }
    // The book's own item: the one most of its editions resolve to (ties: first edition).
    const tally = new Map<string, number>();
    for (const fix of editionsResolved) tally.set(fix.squareItemId, (tally.get(fix.squareItemId) ?? 0) + 1);
    if (tally.size > 1) counts.multiItem++;
    const itemId = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];

    const fixes = editionsResolved.filter((fix) => {
      const edition = book.editions.find((e) => e.id === fix.editionId)!;
      return edition.squareItemId !== fix.squareItemId || edition.squareVariationId !== fix.squareVariationId;
    });
    resolved.set(book.id, { itemId, fixes, editionsResolved });
  }

  const byItem = new Map<string, PlanBook[]>();
  for (const book of books) {
    const r = resolved.get(book.id);
    if (!r) continue;
    byItem.set(r.itemId, [...(byItem.get(r.itemId) ?? []), book]);
  }

  const plan: RepairPlan = { repairs: [], merges: [], conflicts: [], counts };
  for (const [itemId, group] of byItem) {
    if (group.length === 1) {
      const book = group[0];
      const r = resolved.get(book.id)!;
      if (r.fixes.length === 0 && book.squareItemId === itemId) {
        counts.alreadyCorrect++;
        continue;
      }
      plan.repairs.push({ bookId: book.id, squareItemId: itemId, editions: r.fixes });
      counts.repaired++;
      if (r.fixes.some((fix) => fix.via === 'isbn')) counts.relinkedByIsbn++;
      continue;
    }

    const sorted = [...group].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
    const [keeper, ...duplicates] = sorted;
    if (duplicates.every((book) => SYNC_CREATED.has(book.importSource ?? '')) && !SYNC_CREATED.has(keeper.importSource ?? '')) {
      plan.merges.push({ squareItemId: itemId, keeperId: keeper.id, duplicateIds: duplicates.map((b) => b.id), keeperEditions: resolved.get(keeper.id)!.fixes });
      counts.merged += duplicates.length;
    } else {
      plan.conflicts.push({ squareItemId: itemId, bookIds: sorted.map((b) => b.id), reason: 'several books, not just Square-sync copies of an older one' });
      counts.conflicted += group.length;
    }
  }
  return plan;
}
