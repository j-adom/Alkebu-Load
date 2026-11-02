import { fetchBookMetadataPatch } from './autoEnrichBook';

/**
 * One ISBNdb / Google Books pass for a book the Square sync is about to create, so new
 * titles arrive with a cover, synopsis and author instead of a bare title and price.
 *
 * The sync writes with skipEnrichment (enrichment would otherwise run on every Square
 * edit, inside a retried job), so this runs once, before the create, and folds into
 * that single write: a second write would race the sync's own create-race recovery.
 * It only fills gaps, and editions are left out: they are Square-owned. Failures are
 * logged, never thrown; a book without enrichment is still a correct book.
 */
export async function withNewBookEnrichment<T extends Record<string, unknown>>(
  bookData: T,
  fetchPatch: (book: any) => Promise<Record<string, unknown> | null> = fetchBookMetadataPatch,
): Promise<T> {
  if (process.env.DISABLE_AUTO_BOOK_ENRICHMENT === 'true') return bookData;
  try {
    const { editions: _editions, ...patch } = (await fetchPatch(bookData)) ?? {};
    return { ...bookData, ...patch };
  } catch (error) {
    console.error(`square-catalog-sync: enrichment failed for new book "${String(bookData.title ?? '')}"`, error);
    return bookData;
  }
}
