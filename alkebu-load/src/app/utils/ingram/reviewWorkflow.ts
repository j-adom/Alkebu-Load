// Staff decisions on the Ingram enrichment review queue.
//   accept: applies the proposal through the same transactional path as the job (stamps
//           provenance 'ingram', writes a log row) and marks the row accepted, atomically.
//   reject: records the rejection; the diff then treats the same proposal as `same`.
import type { FieldChange } from './diffEnrichment';
import { applyEnrichment, REVIEW_COLLECTION, unwrapValue, type ApplyResult, type PayloadLike } from './applyEnrichment';
import type { EnrichmentField } from './enrichmentFields';

export const isReviewStaff = (user: unknown): boolean => {
  const u = user as { collection?: string; role?: string } | null | undefined;
  return Boolean(u && u.collection === 'users' && (u.role === 'admin' || u.role === 'staff'));
};

const userId = (user: unknown) => (user as { id?: string | number } | null)?.id;

async function pendingRow(payload: PayloadLike, id: string | number) {
  const row = (await payload.findByID({ collection: REVIEW_COLLECTION as any, id, depth: 0 })) as any;
  if (!row) throw new Error(`Review ${String(id)} not found.`);
  if (row.state !== 'pending') throw new Error(`Review ${String(id)} is already ${row.state}.`);
  return row;
}

/**
 * Hook for Task 20b: Square write-back for accepted price/title proposals. Supplied by the
 * caller so this module stays free of the Square SDK.
 */
export interface AcceptExtras {
  beforeApply?: (book: Record<string, any>, change: FieldChange) => Promise<void>;
}

export async function acceptReview(
  payload: PayloadLike,
  id: string | number,
  user: unknown,
  extras: AcceptExtras = {},
  now: () => Date = () => new Date(),
): Promise<ApplyResult> {
  if (!isReviewStaff(user)) throw new Error('Only admin or staff can accept Ingram proposals.');
  const row = await pendingRow(payload, id);
  const bookId = typeof row.book === 'object' ? row.book?.id : row.book;
  const book = (await payload.findByID({ collection: 'books', id: bookId, depth: 0 })) as any;
  const change: FieldChange = {
    key: row.fieldPath,
    path: row.path as EnrichmentField,
    ...(row.editionIsbn ? { editionIsbn: row.editionIsbn } : {}),
    current: unwrapValue(row.currentValue) ?? null,
    proposed: unwrapValue(row.proposedValue),
    action: 'correct',
  };
  await extras.beforeApply?.(book, change);
  return applyEnrichment(payload, book, [change], `review-${String(id)}`, {
    now,
    recordDate: row.ingramRecordDate,
    logAction: 'accept',
    reviewId: row.id,
    requireAll: true,
    withinTransaction: async (req) => {
      await payload.update({
        collection: REVIEW_COLLECTION as any,
        id: row.id,
        data: { state: 'accepted', reviewedBy: userId(user), reviewedAt: now().toISOString() } as any,
        depth: 0,
        req: req as any,
      });
    },
  });
}

export async function rejectReview(
  payload: PayloadLike,
  id: string | number,
  user: unknown,
  now: () => Date = () => new Date(),
): Promise<void> {
  if (!isReviewStaff(user)) throw new Error('Only admin or staff can reject Ingram proposals.');
  const row = await pendingRow(payload, id);
  await payload.update({
    collection: REVIEW_COLLECTION as any,
    id: row.id,
    data: { state: 'rejected', reviewedBy: userId(user), reviewedAt: now().toISOString() } as any,
    depth: 0,
  });
}

/** Accept every pending proposal for one field type (e.g. all `pages`). Failures are counted, not fatal. */
export async function bulkAcceptByPath(
  payload: PayloadLike,
  path: string,
  user: unknown,
  extras: AcceptExtras = {},
): Promise<{ accepted: number; failed: number }> {
  if (!isReviewStaff(user)) throw new Error('Only admin or staff can accept Ingram proposals.');
  const rows = await payload.find({
    collection: REVIEW_COLLECTION as any,
    where: { and: [{ state: { equals: 'pending' } }, { path: { equals: path } }] },
    limit: 1000,
    depth: 0,
  });
  let accepted = 0;
  let failed = 0;
  for (const row of rows.docs as any[]) {
    try {
      await acceptReview(payload, row.id, user, extras);
      accepted += 1;
    } catch (error) {
      failed += 1;
      console.error(`Ingram review ${String(row.id)}: bulk accept failed:`, error instanceof Error ? error.message : error);
    }
  }
  return { accepted, failed };
}
