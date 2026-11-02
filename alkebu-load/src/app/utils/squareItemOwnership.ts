// Invariant: a Square item belongs to exactly one book. Each binding is its own Square
// item and a consolidated book can span several, so the database can't enforce this with
// a unique index on editions (one item's variations can sit on two editions of the same
// book). The catalog sync relies on it to find "the" book for an item.
import { ValidationError, type PayloadRequest } from 'payload';

export function squareItemIdsOf(doc: { squareItemId?: string | null; editions?: any[] | null } | null | undefined): Set<string> {
  const ids = new Set<string>();
  if (doc?.squareItemId) ids.add(doc.squareItemId);
  for (const edition of doc?.editions ?? []) {
    if (edition?.squareItemId) ids.add(edition.squareItemId);
  }
  return ids;
}

/** Rejects a book write that links a Square item another book already holds. */
export async function assertSquareItemsUnclaimed({
  data,
  originalDoc,
  req,
}: {
  data: Record<string, any>;
  originalDoc?: Record<string, any> | null;
  req: Pick<PayloadRequest, 'payload'>;
}): Promise<void> {
  const before = squareItemIdsOf(originalDoc);
  const after = squareItemIdsOf({
    squareItemId: 'squareItemId' in data ? data.squareItemId : originalDoc?.squareItemId,
    editions: Array.isArray(data.editions) ? data.editions : originalDoc?.editions,
  });
  const added = [...after].filter((id) => !before.has(id));
  if (added.length === 0) return;

  const claimed = await req.payload.find({
    collection: 'books',
    where: {
      and: [
        ...(originalDoc?.id !== undefined ? [{ id: { not_equals: originalDoc.id } }] : []),
        { or: [{ 'editions.squareItemId': { in: added } }, { squareItemId: { in: added } }] },
      ],
    },
    limit: 1,
    depth: 0,
  });
  const other = claimed.docs[0];
  if (other) {
    throw new ValidationError({
      collection: 'books',
      errors: [
        {
          path: 'editions',
          message: `Square item ${added.join(', ')} is already linked to book ${other.id}. A Square item can belong to only one book.`,
        },
      ],
    });
  }
}
