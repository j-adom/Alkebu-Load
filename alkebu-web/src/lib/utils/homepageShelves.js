/**
 * Build the two homepage book shelves from raw Payload results.
 *
 * - `featured` is the owner-curated shelf (books flagged `isFeatured`).
 *   It is capped, never padded: an empty shelf stays empty so the page can
 *   hide the section rather than show a heading over whitespace.
 * - `newBooks` is the newest-first pool, kept only when a cover exists, and
 *   with anything already on the visible featured shelf removed so the two
 *   shelves never show the same book twice.
 *
 * @template {{ id: string | number, images?: unknown[], scrapedImageUrls?: unknown[] }} T
 * @param {{ featured?: T[], fresh?: T[], limit?: number }} input
 * @returns {{ featured: T[], newBooks: T[] }}
 */
export function buildHomepageShelves({ featured = [], fresh = [], limit = 8 } = {}) {
  const shownFeatured = featured.slice(0, limit);
  const featuredIds = new Set(shownFeatured.map((book) => String(book.id)));

  const newBooks = fresh
    .filter(hasCover)
    .filter((book) => !featuredIds.has(String(book.id)))
    .slice(0, limit);

  return { featured: shownFeatured, newBooks };
}

/** @param {{ images?: unknown[], scrapedImageUrls?: unknown[] }} book */
function hasCover(book) {
  return (book.images?.length ?? 0) > 0 || (book.scrapedImageUrls?.length ?? 0) > 0;
}
