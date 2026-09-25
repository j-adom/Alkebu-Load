import type { Payload } from 'payload';

import { toJsonSafe } from './jsonSafe';
import { mapSquareItemToBook, type ValidationIssue } from './squareCatalogMapping';
import { mergeEditions } from './squareEditionMerge';
import { decideStagingAction } from './squareStagingWorkflow';
import {
  applyInventoryCountToEditions,
  applyInventoryCountToVariations,
  type SquareInventoryCount,
} from './squareInventory';

// Job-queue bodies for the two Square webhook events. Both share the
// 'books-write' concurrency key registered in payload.config.ts -- that key,
// not anything in this file, is what stops a stale catalog write from
// clobbering a concurrent stock write (or vice versa).

const OVERLAP_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000; // 24 hours

const RESOLVED_SENTINEL_ISSUE: ValidationIssue = {
  field: '-',
  code: 'resolved',
  detail: 'Square now supplies all required data',
};

// Lazy-initialize Square client (avoid crash during Next.js build, and avoid
// requiring SQUARE_ACCESS_TOKEN in environments/tests that never call this).
let _squareClient: any = null;
async function getSquareClient() {
  if (!_squareClient) {
    const { SquareClient } = await import('square');
    _squareClient = new SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN!,
    });
  }
  return _squareClient;
}

/**
 * Window start = catalogSyncedThrough minus a 15-minute overlap; unset means
 * 24 hours ago. Deliberately never derived from `now` alone when a checkpoint
 * exists -- that is what makes a retried Square event skip the very change
 * that triggered it.
 */
export function computeCatalogWindowStart(
  catalogSyncedThrough: string | Date | null | undefined,
  now: Date,
): Date {
  if (!catalogSyncedThrough) {
    return new Date(now.getTime() - DEFAULT_LOOKBACK_MS);
  }
  const synced = catalogSyncedThrough instanceof Date ? catalogSyncedThrough : new Date(catalogSyncedThrough);
  return new Date(synced.getTime() - OVERLAP_MS);
}

/**
 * The checkpoint never advances past the oldest still-unresolved item's
 * updatedAt -- one unresolved item holds the watermark so a later run
 * (after Square, or staff, supplies the missing data) re-examines it rather
 * than skipping past it forever.
 */
export function computeCatalogCheckpoint(windowEnd: Date, oldestUnresolvedUpdatedAt: Date | null): Date {
  if (!oldestUnresolvedUpdatedAt) return windowEnd;
  return new Date(Math.min(windowEnd.getTime(), oldestUnresolvedUpdatedAt.getTime()));
}

/**
 * A unique-constraint violation on Books.squareItemId, surfaced by Payload's
 * upsertRow error handler as a ValidationError whose data.errors[].path names
 * the field. Used to detect "a concurrent create won the race" so that case
 * re-reads and updates instead of failing the item.
 */
function isSquareItemIdUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; data?: { errors?: Array<{ path?: unknown }> } };
  if (e.name !== 'ValidationError') return false;
  return Boolean(e.data?.errors?.some((fieldErr) => fieldErr?.path === 'squareItemId'));
}

function squareCatalogVersionOf(rec: Record<string, unknown>): string {
  const version = rec.version;
  if (typeof version === 'bigint') return version.toString();
  if (typeof version === 'string' || typeof version === 'number') return String(version);
  return '';
}

/**
 * Runs one incremental Square catalog sync: fetch changed items, map each
 * one, and either write a Book, stage it for human review, or skip it
 * (rejected rows stay rejected forever). Registered as the 'square-catalog-sync'
 * task in payload.config.ts, sharing the exclusive 'books-write' concurrency
 * key with 'square-inventory-sync'.
 *
 * Never fabricates: mapSquareItemToBook already refuses to invent an ISBN or
 * price, and decideStagingAction never auto-promotes a staged row -- only a
 * human calling promoteStagedItem ever creates a Book from staged data.
 *
 * Throws when any item remains unresolved (still incomplete, still needing
 * review) AFTER persisting the checkpoint and run counters, so Payload
 * retries the job rather than silently completing. Returning a failure count
 * instead of throwing would mean the retry never happens.
 */
export async function runSquareCatalogSync(payload: Payload): Promise<{
  created: number;
  updated: number;
  staged: number;
  unresolved: number;
}> {
  const now = new Date();
  const windowEnd = now;

  const syncState = (await payload.findGlobal({ slug: 'squareSyncState' })) as {
    catalogSyncedThrough?: string | null;
  };
  const windowStart = computeCatalogWindowStart(syncState?.catalogSyncedThrough, now);

  const client = await getSquareClient();
  const catalogResponse = await client.catalog.list({ types: 'ITEM,IMAGE' });

  const items: Record<string, unknown>[] = [];
  for await (const obj of catalogResponse) {
    if (obj?.type === 'ITEM') items.push(obj as Record<string, unknown>);
  }

  const changedItems = items.filter((item) => {
    const updatedAt = item.updatedAt;
    if (typeof updatedAt !== 'string') return false;
    return new Date(updatedAt).getTime() >= windowStart.getTime();
  });

  let created = 0;
  let updated = 0;
  let staged = 0;
  let unresolved = 0;
  let oldestUnresolvedUpdatedAt: Date | null = null;

  const markUnresolved = (itemUpdatedAt: Date) => {
    unresolved++;
    if (!oldestUnresolvedUpdatedAt || itemUpdatedAt < oldestUnresolvedUpdatedAt) {
      oldestUnresolvedUpdatedAt = itemUpdatedAt;
    }
  };

  for (const item of changedItems) {
    const squareItemId = typeof item.id === 'string' ? item.id : undefined;
    const itemUpdatedAt = new Date(item.updatedAt as string);

    if (!squareItemId) {
      // No id at all -- can't key a staging row or a Book from this item.
      markUnresolved(itemUpdatedAt);
      continue;
    }

    const mapped = mapSquareItemToBook(item, now);

    const stagingResult = await payload.find({
      collection: 'square-catalog-staging',
      where: { squareItemId: { equals: squareItemId } },
      limit: 1,
      depth: 0,
    });
    const stagingRow = stagingResult.docs[0] ?? null;

    const decision = decideStagingAction(
      stagingRow ? { reviewStatus: stagingRow.reviewStatus as string, promotedBook: stagingRow.promotedBook } : null,
      mapped,
    );

    if (decision.action === 'write-book') {
      if (mapped.kind !== 'complete') continue; // decideStagingAction guarantees this, but keep TS honest.

      const existingBookResult = await payload.find({
        collection: 'books',
        where: { squareItemId: { equals: squareItemId } },
        limit: 1,
        depth: 0,
      });
      const existingBook = existingBookResult.docs[0] ?? null;

      if (existingBook) {
        const bookData = {
          ...mapped.data,
          editions: mergeEditions((existingBook.editions as any[]) || [], mapped.data.editions as any[]),
        };
        await payload.update({ collection: 'books', id: existingBook.id, data: bookData });
        updated++;
      } else {
        try {
          const bookData = {
            ...mapped.data,
            editions: mergeEditions([], mapped.data.editions as any[]),
          };
          await payload.create({ collection: 'books', data: bookData as any });
          created++;
        } catch (err) {
          if (!isSquareItemIdUniqueViolation(err)) throw err;

          // A concurrent create won the race -- re-read and update rather
          // than failing this item.
          const racedResult = await payload.find({
            collection: 'books',
            where: { squareItemId: { equals: squareItemId } },
            limit: 1,
            depth: 0,
          });
          const raced = racedResult.docs[0];
          if (!raced) throw err;

          const racedData = {
            ...mapped.data,
            editions: mergeEditions((raced.editions as any[]) || [], mapped.data.editions as any[]),
          };
          await payload.update({ collection: 'books', id: raced.id, data: racedData });
          updated++;
        }
      }
    } else if (decision.action === 'stage') {
      const issues = mapped.kind === 'incomplete' ? mapped.issues : [];
      const validationIssues = issues.length > 0 ? issues : [RESOLVED_SENTINEL_ISSUE];

      const stagingData: Record<string, unknown> = {
        squareItemId,
        squareCatalogVersion: squareCatalogVersionOf(item),
        squareUpdatedAt: item.updatedAt,
        rawItem: toJsonSafe(item),
        validationIssues,
        reviewStatus: decision.status,
        lastSeenAt: now.toISOString(),
      };

      if (mapped.kind === 'incomplete') {
        const { proposedTitle, proposedIsbn, proposedPriceCents } = mapped.proposed;
        if (proposedTitle !== undefined) stagingData.proposedTitle = proposedTitle;
        if (proposedIsbn !== undefined) stagingData.proposedIsbn = proposedIsbn;
        if (proposedPriceCents !== undefined) stagingData.proposedPriceCents = proposedPriceCents;
      }

      if (stagingRow) {
        await payload.update({ collection: 'square-catalog-staging', id: stagingRow.id, data: stagingData });
      } else {
        await payload.create({ collection: 'square-catalog-staging', data: stagingData as any });
      }

      staged++;
      if (decision.status === 'needs-review') {
        markUnresolved(itemUpdatedAt);
      }
    } else {
      // skip: rejected is sticky -- touch lastSeenAt only, never resurrect.
      if (stagingRow) {
        await payload.update({
          collection: 'square-catalog-staging',
          id: stagingRow.id,
          data: { lastSeenAt: now.toISOString() },
        });
      }
    }
  }

  const checkpoint = computeCatalogCheckpoint(windowEnd, oldestUnresolvedUpdatedAt);

  // Persist the checkpoint and counters BEFORE throwing -- a retry must see
  // the same watermark and counts a completed-then-thrown run would have
  // left, not lose them because the process exited via an exception.
  await payload.updateGlobal({
    slug: 'squareSyncState',
    data: {
      catalogSyncedThrough: checkpoint.toISOString(),
      lastRunAt: now.toISOString(),
      lastRunCreated: created,
      lastRunUpdated: updated,
      lastRunStaged: staged,
      lastRunUnresolved: unresolved,
    },
  });

  if (unresolved > 0) {
    throw new Error(
      `square-catalog-sync: ${unresolved} item(s) unresolved (missing or invalid catalog data); checkpoint persisted, retrying`,
    );
  }

  return { created, updated, staged, unresolved };
}

// Square is the source of truth for stock; each count overwrites the matching
// wellness/oils variation. Returns true if a document was updated.
//
// Lifted byte-for-byte from the former processInventoryCountUpdate's local
// helper in the webhook route -- only WHERE this runs changed (inside a
// queued job instead of a Next.js after() callback), not WHAT it does.
async function applyInventoryCountToWellness(
  payload: Payload,
  variationId: string,
  quantity: number,
): Promise<boolean> {
  for (const collection of ['wellness-lifestyle', 'oils-incense'] as const) {
    const result = await payload.find({
      collection,
      where: { 'variations.squareVariationId': { equals: variationId } },
      limit: 1,
      depth: 0,
    });

    if (result.docs.length === 0) continue;

    const doc = result.docs[0];
    const newVariations = applyInventoryCountToVariations((doc as any).variations || [], variationId, quantity);

    await payload.update({
      collection,
      id: doc.id,
      data: { variations: newVariations },
    });

    console.log(`✅ Stock for "${(doc as any).name}" variation ${variationId} set to ${quantity}`);
    return true;
  }

  return false;
}

/**
 * Runs one Square inventory.count.updated sync. Square POS is the source of
 * truth for stock, so each count overwrites the matching book edition's
 * inventory.stockLevel (falling through to wellness-lifestyle / oils-incense
 * variations when no book matches).
 *
 * This is the loop body of the former processInventoryCountUpdate, moved
 * behind the job queue unchanged: same matching, same logging, same
 * fallback. Registered as the 'square-inventory-sync' task in
 * payload.config.ts, sharing the exclusive 'books-write' concurrency key
 * with 'square-catalog-sync' -- that shared key is what stops a stale
 * catalog write from clobbering a stock write, not anything in this loop.
 */
export async function runSquareInventorySync(
  payload: Payload,
  counts: SquareInventoryCount[],
): Promise<{ updated: number; total: number }> {
  if (!counts || counts.length === 0) {
    console.log('📦 inventory.count.updated: no inventory_counts in payload');
    return { updated: 0, total: 0 };
  }

  console.log(`📦 Processing ${counts.length} inventory count change(s) from Square`);

  let updated = 0;
  for (const count of counts) {
    const variationId = count.catalog_object_id;
    const quantity = Number(count.quantity);

    if (!variationId || Number.isNaN(quantity)) {
      console.log('⏭️ Skipping malformed inventory count:', count);
      continue;
    }

    // Only sync the sellable on-hand state; ignore states like SOLD/WASTE/etc.
    if (count.state && count.state !== 'IN_STOCK') {
      console.log(`⏭️ Skipping non-IN_STOCK state (${count.state}) for ${variationId}`);
      continue;
    }

    try {
      const result = await payload.find({
        collection: 'books',
        where: { 'editions.squareVariationId': { equals: variationId } },
        limit: 1,
        depth: 0,
      });

      if (result.docs.length === 0) {
        const wellnessUpdated = await applyInventoryCountToWellness(payload, variationId, quantity);

        if (wellnessUpdated) {
          updated++;
        } else {
          console.log(`⚠️ No book edition or wellness variation matches Square variation ${variationId}`);
        }

        continue;
      }

      const book = result.docs[0];
      const newEditions = applyInventoryCountToEditions((book as any).editions || [], variationId, quantity);

      await payload.update({
        collection: 'books',
        id: book.id,
        data: { editions: newEditions },
      });

      updated++;
      console.log(`✅ Stock for "${(book as any).title}" variation ${variationId} set to ${quantity}`);
    } catch (err) {
      console.error(`❌ Failed to update stock for variation ${variationId}:`, err);
    }
  }

  console.log(`📦 Inventory sync complete: updated ${updated}/${counts.length}`);

  return { updated, total: counts.length };
}
