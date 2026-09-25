/**
 * The human gate for Square catalog import.
 *
 * A Square catalog sync can turn a previously-incomplete item into a
 * complete one at any time -- Square filled in a missing ISBN, added a
 * price, whatever. That is NOT staff approval. `decideStagingAction` is the
 * pure lookup that keeps the sync from ever writing (or overwriting) a Book
 * on Square's say-so alone: a newly-complete item becomes `ready` and waits
 * for `promoteStagedItem` to be called by a human.
 *
 * `rejected` is sticky in both directions. Once staff reject a staged item
 * (a bulk-supply SKU, a duplicate, junk data), no later sync -- complete or
 * not -- may resurrect it. Staff must not have to reject the same item
 * every time Square resends its catalog.
 *
 * `promoteStagedItem` is the transactional half: it is the only path that
 * ever creates a Book from a staged row, and it re-reads the row inside the
 * transaction so two concurrent promotions can only ever produce one Book.
 */

import { fromJsonSafe } from './jsonSafe';
import { mapSquareItemToBook } from './squareCatalogMapping';

export type StagingDecision =
  | { action: 'write-book' } // promoted row, or no staging history
  | { action: 'stage'; status: 'needs-review' | 'ready' }
  | { action: 'skip'; reason: 'rejected' };

type ExistingStagingRow = { reviewStatus: string; promotedBook?: unknown } | null;
type MappingOutcome = { kind: 'complete' | 'incomplete' };

/**
 * Revision 2 transition table. Pure: no I/O, no Payload dependency, so it is
 * unit-testable without a database.
 */
export function decideStagingAction(existing: ExistingStagingRow, mapped: MappingOutcome): StagingDecision {
  if (existing === null) {
    return mapped.kind === 'complete' ? { action: 'write-book' } : { action: 'stage', status: 'needs-review' };
  }

  if (existing.reviewStatus === 'rejected') {
    // Sticky in both directions -- Square supplying (or still lacking) the
    // missing data never resurrects a row staff already rejected.
    return { action: 'skip', reason: 'rejected' };
  }

  if (existing.reviewStatus === 'promoted') {
    // A promoted row's linked Book may legitimately need updating from
    // upstream Square changes, but only while the mapping is still
    // complete. A regression (e.g. the price disappeared) sends it back
    // for review rather than writing a broken Book.
    return mapped.kind === 'complete' ? { action: 'write-book' } : { action: 'stage', status: 'needs-review' };
  }

  // needs-review or ready: never auto-promoted by a sync. Completeness only
  // ever moves the row to 'ready' and waits for a human to call
  // promoteStagedItem.
  return { action: 'stage', status: mapped.kind === 'complete' ? 'ready' : 'needs-review' };
}

type PayloadLike = {
  db: {
    beginTransaction: () => Promise<string | number | null>;
    commitTransaction: (transactionID: string | number) => Promise<void>;
    rollbackTransaction: (transactionID: string | number) => Promise<void>;
  };
  findByID: (args: {
    collection: string;
    id: string | number;
    req?: unknown;
  }) => Promise<Record<string, unknown> | null>;
  create: (args: { collection: string; data: Record<string, unknown>; req?: unknown }) => Promise<{ id: string | number }>;
  update: (args: {
    collection: string;
    id: string | number;
    data: Record<string, unknown>;
    req?: unknown;
  }) => Promise<unknown>;
};

export const isCatalogStaff = (user: unknown): boolean => {
  const role = (user as { role?: string } | undefined)?.role;
  return role === 'admin' || role === 'staff';
};

/**
 * Promotes a `ready` staging row into a real Book. The only place a Book is
 * ever created from staged Square data.
 *
 * Transactional: this repo has no prior Payload transaction usage
 * (`grep -rn "beginTransaction" src/` was empty before this). `beginTransaction`
 * can return `null` on an adapter without transaction support -- when it
 * does, every call below simply runs with `req: { user }` (no
 * transactionID) instead of failing.
 *
 * The re-read of the staging row INSIDE the transaction is the idempotency
 * mechanism: two concurrent promotions of the same row will have one of
 * them see `promotedBook` already set on its re-read and refuse. Do not
 * replace this with a check performed before the transaction opens -- that
 * would leave a race between the check and the write.
 */
export async function promoteStagedItem(
  payload: PayloadLike,
  stagingId: string | number,
  user: unknown,
): Promise<{ bookId: string | number }> {
  if (!isCatalogStaff(user)) {
    throw new Error('Only admin or staff may promote a staged Square catalog item.');
  }

  const transactionID = await payload.db.beginTransaction();
  const req = transactionID !== null ? { transactionID, user } : { user };

  try {
    const row = await payload.findByID({
      collection: 'square-catalog-staging',
      id: stagingId,
      req,
    });

    if (!row) {
      throw new Error(`Staging row ${String(stagingId)} not found.`);
    }

    if (row.promotedBook != null) {
      throw new Error(`Staging row ${String(stagingId)} was already promoted.`);
    }

    if (row.reviewStatus !== 'ready') {
      throw new Error(`Staging row ${String(stagingId)} is not ready to promote (status: ${String(row.reviewStatus)}).`);
    }

    const mapped = mapSquareItemToBook(fromJsonSafe(row.rawItem));

    if (mapped.kind !== 'complete') {
      throw new Error(`Staging row ${String(stagingId)} no longer maps to a complete Book.`);
    }

    const book = await payload.create({
      collection: 'books',
      data: mapped.data,
      req,
    });

    await payload.update({
      collection: 'square-catalog-staging',
      id: stagingId,
      data: { reviewStatus: 'promoted', promotedBook: book.id },
      req,
    });

    if (transactionID !== null) {
      await payload.db.commitTransaction(transactionID);
    }

    return { bookId: book.id };
  } catch (err) {
    if (transactionID !== null) {
      // A failed rollback must never mask the original refusal reason
      // (already promoted / not ready / no longer maps to a complete Book)
      // -- that reason is the entire diagnostic value of this function for
      // a staff member clicking promote. Log the rollback failure instead
      // of throwing it.
      try {
        await payload.db.rollbackTransaction(transactionID);
      } catch (rollbackErr) {
        console.error('promoteStagedItem: rollbackTransaction failed after an earlier error', rollbackErr);
      }
    }
    throw err;
  }
}
