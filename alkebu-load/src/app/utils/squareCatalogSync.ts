import type { Payload } from 'payload';

import { toJsonSafe } from './jsonSafe';
import { isNonBookCategory, mapSquareItemToBook, type ValidationIssue } from './squareCatalogMapping';
import { mergeEditions } from './squareEditionMerge';
import { decideStagingAction } from './squareStagingWorkflow';
import { matchProductLine } from './wellnessProductLines';
import {
  applyInventoryCountToEditions,
  applyInventoryCountToVariations,
  type SquareInventoryCount,
} from './squareInventory';

// Skip Books.tsx's beforeValidate auto-enrichment (ISBNdb / Google Books) on every
// Books write this sync makes. Without this: (1) mapSquareItemToBook's `data` and
// mergeEditions' output for `editions`/`pricing` would be fought by
// buildBookMetadataPatch, which the spec forbids enrichment from touching; and
// (2) every create/update would fire two external HTTP calls inside a job that
// retries up to 3x. Same flag used at
// src/app/api/admin/backfill/author-publisher-links/route.ts:73.
const SKIP_ENRICHMENT_CONTEXT = { skipEnrichment: true };

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

// SquareCatalogStaging.squareCatalogVersion is a required text field -- Payload's text
// validator rejects an empty string, which would abort the whole run (see the per-item
// try/catch below). When Square omits `version`, fall back to the item's updatedAt
// (still honest: it identifies which version of the item we saw) rather than ''; only
// fall back further to the literal 'unknown' if even that is missing.
function squareCatalogVersionOf(rec: Record<string, unknown>): string {
  const version = rec.version;
  if (typeof version === 'bigint') return version.toString();
  if (typeof version === 'string' || typeof version === 'number') return String(version);
  const updatedAt = rec.updatedAt;
  if (typeof updatedAt === 'string' && updatedAt.length > 0) return updatedAt;
  return 'unknown';
}

/**
 * Runs one incremental Square catalog sync: fetch changed items, map each
 * one, and either write a Book, stage it for human review, or skip it
 * (rejected rows stay rejected forever; non-book product lines -- wellness,
 * oils, fashion -- are skipped too, since they have their own import path
 * and don't belong in the Books mapper). Registered as the
 * 'square-catalog-sync' task in payload.config.ts, sharing the exclusive
 * 'books-write' concurrency key with 'square-inventory-sync'.
 *
 * Never fabricates: mapSquareItemToBook already refuses to invent an ISBN or
 * price, and decideStagingAction never auto-promotes a staged row -- only a
 * human calling promoteStagedItem ever creates a Book from staged data.
 *
 * "Unresolved" means neither a Book write NOR a staging write succeeded for
 * an item -- e.g. it has no id at all, or the write/stage attempt itself
 * threw. Successfully staging an item (including as 'needs-review') IS a
 * successful outcome: incomplete-but-staged is exactly what staging is for,
 * and treating it as unresolved would make the steady state throw every run
 * forever, burning all retry attempts and pinning the watermark. Only a
 * genuine per-item failure holds the watermark and forces the end-of-run
 * throw so Payload retries -- persisted checkpoint and counters first, since
 * returning a failure count instead of throwing would mean the retry never
 * happens.
 */
export async function runSquareCatalogSync(payload: Payload): Promise<{
  created: number;
  updated: number;
  staged: number;
  skippedNonBook: number;
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
  let skippedNonBook = 0;
  let unresolved = 0;
  let oldestUnresolvedUpdatedAt: Date | null = null;

  const markUnresolved = (itemUpdatedAt: Date) => {
    unresolved++;
    if (!oldestUnresolvedUpdatedAt || itemUpdatedAt < oldestUnresolvedUpdatedAt) {
      oldestUnresolvedUpdatedAt = itemUpdatedAt;
    }
  };

  for (const item of changedItems) {
    const itemUpdatedAt = new Date(item.updatedAt as string);

    // Wellness/oils/fashion product lines have their own tested import path
    // (wellnessImportPlan.ts) and don't belong in the Books mapper -- routed
    // there they fail the ISBN checksum and pile into the review queue as
    // noise (production has 45 wellness lines / 634 variations). Not written,
    // not staged, not unresolved: this is a clean, deliberate skip, checked
    // before anything else so these items never touch staging lookups.
    const itemData = (item.itemData ?? {}) as Record<string, unknown>;
    const itemName = typeof itemData.name === 'string' ? itemData.name : '';
    if (matchProductLine(itemName)) {
      skippedNonBook++;
      console.log(`⏭️ square-catalog-sync: skipping non-book product line "${itemName}" (has its own import path)`);
      continue;
    }
    // Filed under a non-Books reporting category (incense, apparel, nutrition, ...):
    // not a book, and staging it would only park it as "invalid ISBN" forever.
    if (isNonBookCategory(item)) {
      skippedNonBook++;
      console.log(`⏭️ square-catalog-sync: skipping "${itemName}" (Square reporting category is not Books)`);
      continue;
    }

    // Everything from here writes to the database, so wrap it: any thrown
    // error (a malformed item, a transient DB failure, anything not the
    // specific unique-violation race handled below) must land in this item's
    // own bucket rather than aborting the whole run before the checkpoint
    // and counters are persisted.
    try {
      const squareItemId = typeof item.id === 'string' ? item.id : undefined;
      if (!squareItemId) {
        // No id at all -- can't key a staging row or a Book from this item;
        // neither a write nor a stage is possible.
        throw new Error('Square catalog item has no id');
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
          await payload.update({
            collection: 'books',
            id: existingBook.id,
            data: bookData,
            context: SKIP_ENRICHMENT_CONTEXT,
          });
          updated++;
        } else {
          try {
            const bookData = {
              ...mapped.data,
              editions: mergeEditions([], mapped.data.editions as any[]),
            };
            await payload.create({ collection: 'books', data: bookData as any, context: SKIP_ENRICHMENT_CONTEXT });
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
            await payload.update({
              collection: 'books',
              id: raced.id,
              data: racedData,
              context: SKIP_ENRICHMENT_CONTEXT,
            });
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

        // Staged -- including as 'needs-review' -- is a resolved outcome.
        // Staging IS the resolution path for an incomplete item; it is not
        // a failure to retry.
        staged++;
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
    } catch (err) {
      console.error(`❌ square-catalog-sync: failed to resolve item ${String(item.id ?? '(no id)')}:`, err);
      markUnresolved(itemUpdatedAt);
    }
  }

  console.log(
    `📦 square-catalog-sync: created=${created} updated=${updated} staged=${staged} skippedNonBook=${skippedNonBook} unresolved=${unresolved}`,
  );

  const checkpoint = computeCatalogCheckpoint(windowEnd, oldestUnresolvedUpdatedAt);

  // Persist the checkpoint and counters BEFORE throwing -- a retry must see
  // the same watermark and counts a completed-then-thrown run would have
  // left, not lose them because the process exited via an exception.
  //
  // lastRunSkippedNonBook makes the non-book allow-list's blast radius
  // visible beyond a single Coolify log line -- deleteJobOnComplete defaults
  // to true, so the job record (and its returned counters) is gone the
  // moment the job succeeds. This global is the only durable record.
  await payload.updateGlobal({
    slug: 'squareSyncState',
    data: {
      catalogSyncedThrough: checkpoint.toISOString(),
      lastRunAt: now.toISOString(),
      lastRunCreated: created,
      lastRunUpdated: updated,
      lastRunStaged: staged,
      lastRunUnresolved: unresolved,
      lastRunSkippedNonBook: skippedNonBook,
    },
  });

  if (unresolved > 0) {
    throw new Error(
      `square-catalog-sync: ${unresolved} item(s) neither written nor staged; checkpoint persisted, retrying`,
    );
  }

  return { created, updated, staged, skippedNonBook, unresolved };
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
