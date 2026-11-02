import { toEan13 } from './ingram/ean';

/**
 * Legacy imports put the wrong value in the Square *item* id fields: the March CSV
 * import stored each book's variation id there (scripts/reconcile-book-data.ts read the
 * export's variation token as the item id), and older manual books carry numeric ids
 * from the pre-Square system. The edition backfill then copied those values onto
 * editions[].squareItemId. Such a value never names a current Square item, so it must
 * neither block a match nor stop the real item from owning the book.
 */
export function isLegacySquareItemId(itemId: unknown, bookVariationIds: readonly string[]): boolean {
  if (typeof itemId !== 'string' || itemId === '') return false;
  return /^\d+$/.test(itemId) || bookVariationIds.includes(itemId);
}

export function bookVariationIds(book: { editions?: unknown } | null | undefined): string[] {
  return (((book?.editions as any[]) || []) as any[])
    .map((edition) => edition?.squareVariationId)
    .filter((id): id is string => typeof id === 'string' && id !== '');
}

/**
 * An edition no other current Square item claims. An edition without its own item id
 * inherits the book's (books not yet backfilled with edition-level ids), so it is open
 * only when that is empty, legacy or this item too.
 */
export function editionOpenToItem(
  edition: any,
  squareItemId: string,
  book: { squareItemId?: unknown; editions?: unknown },
): boolean {
  const linked = edition?.squareItemId || book.squareItemId;
  return !linked || linked === squareItemId || isLegacySquareItemId(linked, bookVariationIds(book));
}

/** ISBN-13 and, for 978 ISBNs, ISBN-10 spellings, for an `editions.isbn in [...]` query. */
export function isbnQueryForms(isbns: readonly string[]): string[] {
  const forms = new Set<string>();
  for (const isbn of isbns) {
    const ean = toEan13(isbn);
    if (!ean) continue;
    forms.add(ean);
    if (ean.startsWith('978')) {
      const body = ean.slice(3, 12);
      const sum = [...body].reduce((acc, digit, i) => acc + Number(digit) * (10 - i), 0);
      const check = (11 - (sum % 11)) % 11;
      forms.add(body + (check === 10 ? 'X' : String(check)));
    }
  }
  return [...forms];
}

/**
 * Re-points a matched book's legacy-linked editions at this Square item's variations by
 * ISBN, so mergeEditions updates them in place instead of appending a second edition
 * with the same ISBN and flagging the original unavailable. Only editions whose current
 * variation id is absent from this pull and that no other current item claims are moved.
 */
export function relinkEditionsByIsbn(
  book: { squareItemId?: unknown; editions?: unknown },
  incoming: any[],
  squareItemId: string,
): any[] {
  const existing = ((book.editions as any[]) || []) as any[];
  const ownVariationIds = bookVariationIds(book);
  const incomingIds = new Set(incoming.map((row) => row?.squareVariationId).filter(Boolean));
  const held = new Set(ownVariationIds);
  const incomingByEan = new Map<string, any>();
  for (const row of incoming) {
    const ean = toEan13(row?.isbn);
    if (ean && row?.squareVariationId && !held.has(row.squareVariationId)) incomingByEan.set(ean, row);
  }

  return existing.map((row) => {
    if (row?.squareVariationId && incomingIds.has(row.squareVariationId)) return row;
    if (!editionOpenToItem(row, squareItemId, book)) return row;
    const ean = toEan13(row?.isbn);
    const match = ean ? incomingByEan.get(ean) : undefined;
    if (!match) return row;
    incomingByEan.delete(ean as string);
    return { ...row, squareVariationId: match.squareVariationId, squareItemId };
  });
}

/** Image URLs for an item, from the IMAGE objects listed alongside it. */
export function squareImageUrls(item: Record<string, unknown>, imageUrlsById: ReadonlyMap<string, string>): string[] {
  const itemData = (item.itemData ?? {}) as { imageIds?: unknown };
  const ids = Array.isArray(itemData.imageIds) ? itemData.imageIds : [];
  return ids.map((id) => imageUrlsById.get(String(id))).filter((url): url is string => !!url);
}

/** True when the book shows no cover on the storefront (no upload and no scraped URL). */
export function bookHasNoCover(book: { images?: unknown; scrapedImageUrls?: unknown }): boolean {
  const uploads = Array.isArray(book.images) ? book.images : [];
  const scraped = Array.isArray(book.scrapedImageUrls) ? book.scrapedImageUrls : [];
  return uploads.length === 0 && !scraped.some((row: any) => typeof row?.url === 'string' && row.url !== '');
}
