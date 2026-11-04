import type { Payload, Where } from 'payload';

import { mergeEditions } from './squareEditionMerge';
import {
  bookVariationIds,
  editionOpenToItem,
  isbnQueryForms,
  isLegacySquareItemId,
  relinkEditionsByIsbn,
} from './squareLinks';

/**
 * The one book a Square item belongs to (see squareItemOwnership.ts), found in tiers:
 * an edition linked to the item, then the book-level link (books not yet backfilled
 * with edition-level ids), then any edition holding one of the item's variations. More
 * than one book in a tier is a data error to fix by hand, never something to guess at.
 * Last, only when `isbns` are given (promotion), an edition with the same ISBN, for legacy
 * books whose stored variation ids Square no longer has.
 */
export async function findBookForSquareItem(
  payload: Payload,
  squareItemId: string,
  variationIds: string[],
  isbns: string[] = [],
  req?: unknown,
): Promise<any | null> {
  // A variation or ISBN match only counts on an edition no other current Square item
  // claims. Legacy item ids (see squareLinks.ts) claim nothing: without that, every Square
  // edit to a CSV-imported book created a coverless duplicate.
  const holdsVariation = (book: any) =>
    ((book.editions as any[]) || []).some(
      (edition) =>
        variationIds.includes(edition?.squareVariationId) &&
        editionOpenToItem(edition, squareItemId, book),
    );
  const eans = new Set(isbnQueryForms(isbns).filter((isbn) => isbn.length === 13));
  const holdsIsbn = (book: any) =>
    ((book.editions as any[]) || []).some(
      (edition) =>
        isbnQueryForms([edition?.isbn ?? '']).some((ean) => eans.has(ean)) &&
        editionOpenToItem(edition, squareItemId, book),
    );
  const isbnForms = isbnQueryForms(isbns);
  const tiers: Array<{ where: Where; keep?: (book: any) => boolean }> = [
    { where: { 'editions.squareItemId': { equals: squareItemId } } },
    { where: { squareItemId: { equals: squareItemId } } },
    ...(variationIds.length > 0
      ? [{ where: { 'editions.squareVariationId': { in: variationIds } } as Where, keep: holdsVariation }]
      : []),
    ...(isbnForms.length > 0 ? [{ where: { 'editions.isbn': { in: isbnForms } } as Where, keep: holdsIsbn }] : []),
  ];
  for (const { where, keep } of tiers) {
    const result = await payload.find({ collection: 'books', where, limit: 10, depth: 0, ...(req ? { req: req as any } : {}) });
    const docs = keep ? result.docs.filter(keep) : result.docs;
    const ids = [...new Set(docs.map((doc) => doc.id))];
    if (ids.length > 1) {
      throw new Error(`Square item ${squareItemId} matches books ${ids.join(', ')}; fix the Square link in the admin`);
    }
    if (ids.length === 1) return docs[0];
  }
  return null;
}

/**
 * Update data for an existing book from one Square item. The book's own (book-level)
 * item owns its price and squareItemId. A different item -- another binding
 * consolidated into this book -- only reconciles its own editions.
 *
 * Square never retitles an existing book: POS names carry "- by Author (Hardcover)"
 * suffixes and truncations, while website titles are curated or enriched (the
 * 2026-11-03 reconcile dry run found 181 such retitles). Square's name only fills a
 * book that has no title.
 */
export function bookUpdateForSquareItem(
  existingBook: { squareItemId?: string | null; editions?: unknown; title?: unknown },
  squareItemId: string,
  mappedData: Record<string, unknown>,
): Record<string, unknown> {
  const legacyBookLink = isLegacySquareItemId(existingBook.squareItemId, bookVariationIds(existingBook));
  const editions = mergeEditions(
    relinkEditionsByIsbn(existingBook, (mappedData.editions as any[]) || [], squareItemId),
    mappedData.editions as any[],
    {
      squareItemId,
      bookSquareItemId: legacyBookLink ? null : (existingBook.squareItemId ?? null),
    },
  );
  // A legacy book-level id names no current item, so the first real item to match takes
  // ownership and the sync overwrites the bad id with the real one.
  const ownsBook = !existingBook.squareItemId || existingBook.squareItemId === squareItemId || legacyBookLink;
  if (!ownsBook) return { editions, lastSyncedAt: mappedData.lastSyncedAt };
  const { title, ...rest } = mappedData;
  const hasTitle = typeof existingBook.title === 'string' && existingBook.title.trim() !== '';
  return hasTitle ? { ...rest, editions } : { ...mappedData, editions };
}
