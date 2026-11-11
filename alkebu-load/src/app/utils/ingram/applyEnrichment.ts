// Apply one book's Ingram changes: fill/correct writes go to the book in ONE transaction
// with a log row per value; conflicts go to the review queue (superseding stale pending
// proposals for the same field). Everything runs with context.ingramEnrichment so the
// manual-edit hook doesn't stamp the job's own writes as staff edits.
//
// On PostgreSQL (production) the book write, log rows and review rows commit or roll back
// together. SQLite in this repo runs without transactions (beginTransaction returns null),
// so local runs are best-effort; production is the target.
import type { Payload } from 'payload';

import { isWrite, rejectionKey, type FieldChange } from './diffEnrichment';
import {
  applySquareWrites,
  pickSquareResult,
  planSquareWrites,
  type SquareWriteOption,
  type SquareWriteResult,
  type WrittenObject,
} from './squareWriteBack';
import {
  comparable,
  editionEanOf,
  getPath,
  setPath,
  type FieldSourceEntry,
  type FieldSources,
} from './enrichmentFields';

export const ENRICHMENT_CONTEXT = { ingramEnrichment: true, skipEnrichment: true } as const;
export const LOG_COLLECTION = 'ingram-enrichment-log';
export const REVIEW_COLLECTION = 'ingram-enrichment-review';

/**
 * Payload `json` fields reject bare strings (they must parse as JSON), so logged and
 * proposed values are stored wrapped as `{ value }`.
 */
export const wrapValue = (value: unknown): { value: unknown } => ({ value: value ?? null });
export const unwrapValue = (stored: unknown): unknown =>
  stored && typeof stored === 'object' && !Array.isArray(stored) && 'value' in stored ? (stored as { value: unknown }).value : stored;

export type PayloadLike = Pick<Payload, 'find' | 'findByID' | 'create' | 'update'> & {
  db: Pick<Payload['db'], 'beginTransaction' | 'commitTransaction' | 'rollbackTransaction'>;
};

/** A Local API `req` stand-in carrying the transaction (when the adapter has one). */
export type TxReq = { transactionID?: string | number };

export async function inTransaction<T>(payload: PayloadLike, fn: (req: TxReq) => Promise<T>): Promise<T> {
  const transactionID = (await payload.db.beginTransaction?.()) ?? null;
  const req: TxReq = transactionID !== null ? { transactionID } : {};
  try {
    const result = await fn(req);
    if (transactionID !== null) await payload.db.commitTransaction(transactionID);
    return result;
  } catch (error) {
    if (transactionID !== null) {
      try {
        await payload.db.rollbackTransaction(transactionID);
      } catch (rollbackError) {
        // Never mask the original failure.
        console.error('Ingram enrichment: rollback failed after an earlier error', rollbackError);
      }
    }
    throw error;
  }
}

/** The value a change was computed against, read from a (fresh) book the same way the diff reads it. */
export function currentValueOf(book: Record<string, any>, change: Pick<FieldChange, 'path' | 'editionIsbn'>): unknown {
  if (!change.editionIsbn) return book?.[change.path];
  const edition = (book?.editions ?? []).find((e: any) => editionEanOf(e) === change.editionIsbn);
  if (!edition) return undefined;
  const value = getPath(edition, change.path);
  if (change.path === 'pricing.retailPrice') return value ?? book?.pricing?.retailPrice ?? null;
  return value;
}

export interface AppliedValue {
  key: string;
  path: string;
  editionIsbn?: string;
  previous: unknown;
  next: unknown;
  previousSource: string | null;
  action: FieldChange['action'];
}

/**
 * Pure: the update `data` for applying `writes` to `book`. A change whose current value no
 * longer matches the book (edited since the diff) is returned as stale and not applied.
 */
export function applyChangesToBook(
  book: Record<string, any>,
  writes: FieldChange[],
  opts: { now: string; recordDate?: string | null },
): { data: Record<string, any>; applied: AppliedValue[]; stale: FieldChange[] } {
  const sources: FieldSources = { ...((book?.enrichment?.fieldSources as FieldSources) ?? {}) };
  const applied: AppliedValue[] = [];
  const stale: FieldChange[] = [];
  const data: Record<string, any> = {};
  let editions: any[] = Array.isArray(book?.editions) ? book.editions.map((e: any) => ({ ...e })) : [];
  let editionsChanged = false;
  const stamp: FieldSourceEntry = { source: 'ingram', at: opts.now };

  for (const change of writes) {
    const fresh = currentValueOf(book, change);
    if (comparable(change.path, fresh) !== comparable(change.path, change.current)) {
      stale.push(change);
      continue;
    }
    if (change.editionIsbn) {
      const index = editions.findIndex((e) => editionEanOf(e) === change.editionIsbn);
      if (index < 0) {
        stale.push(change);
        continue;
      }
      editions = editions.map((e, i) => (i === index ? setPath(e, change.path, change.proposed) : e));
      editionsChanged = true;
    } else {
      data[change.path] = change.proposed;
    }
    applied.push({
      key: change.key,
      path: change.path,
      ...(change.editionIsbn ? { editionIsbn: change.editionIsbn } : {}),
      previous: fresh ?? null,
      next: change.proposed,
      previousSource: sources[change.key]?.source ?? null,
      action: change.action,
    });
    sources[change.key] = stamp;
  }

  if (editionsChanged) {
    data.editions = editions;
    // The book-level price is the lowest edition price (as the Square sync sets it). Keep it
    // that way when an uplift raises the edition that held the minimum.
    const prices = (list: any[]) =>
      list.map((e) => Number(e?.pricing?.retailPrice)).filter((n) => Number.isFinite(n) && n > 0);
    const before = prices(book.editions ?? []);
    const after = prices(editions);
    const bookPrice = book?.pricing?.retailPrice;
    if (before.length && after.length && bookPrice === Math.min(...before) && Math.min(...after) !== bookPrice) {
      data.pricing = { ...(book.pricing ?? {}), retailPrice: Math.min(...after) };
      applied.push({
        key: 'pricing.retailPrice',
        path: 'pricing.retailPrice',
        previous: bookPrice,
        next: Math.min(...after),
        previousSource: null,
        action: 'correct',
      });
    }
  }

  if (applied.length) {
    data.enrichment = {
      ...(book?.enrichment ?? {}),
      fieldSources: sources,
      ingramEnrichedAt: opts.now,
      ...(opts.recordDate ? { ingramRecordDate: opts.recordDate } : {}),
    };
  }
  return { data, applied, stale };
}

export interface ApplyOptions {
  now?: () => Date;
  recordDate?: string | null;
  logAction?: 'accept';
  /** A review row being accepted: excluded from supersession. */
  reviewId?: string | number;
  /** Throw (rolling everything back) when any write is stale. Used by accept. */
  requireAll?: boolean;
  /** Extra writes inside the same transaction (e.g. marking the review accepted). */
  withinTransaction?: (req: TxReq) => Promise<void>;
  /**
   * Square write-back (Task 20b). Price/title changes on Square-linked books are written to
   * Square first, then Payload. Without it they are deferred: Payload alone would be
   * reverted by the next Square catalog sync.
   */
  square?: SquareWriteOption;
  /**
   * Square already written for a batch of books by the caller (runEnrichment). This book's
   * outcome is picked out of it instead of making its own Square calls.
   */
  squareResult?: SquareWriteResult;
}

export interface ApplyResult {
  applied: number;
  stale: number;
  logged: number;
  queued: number;
  superseded: number;
  /** Price/title changes held back: Square write-back off, or Square refused (conflict/missing). */
  deferred: number;
  squareWritten: number;
  squareConflicts: number;
}

export const emptyApplyResult = (): ApplyResult => ({
  applied: 0,
  stale: 0,
  logged: 0,
  queued: 0,
  superseded: 0,
  deferred: 0,
  squareWritten: 0,
  squareConflicts: 0,
});

export async function applyEnrichment(
  payload: PayloadLike,
  book: Record<string, any>,
  changes: FieldChange[],
  runId: string,
  opts: ApplyOptions = {},
): Promise<ApplyResult> {
  const result = emptyApplyResult();
  let writes = changes.filter(isWrite);
  const conflicts = changes.filter((c) => c.action === 'conflict');
  if (writes.length === 0 && conflicts.length === 0 && !opts.withinTransaction) return result;
  const now = (opts.now ?? (() => new Date()))().toISOString();

  // Square first. A Square failure throws here, before any Payload write for this book. A
  // Payload failure after a Square success is not retried: the catalog sync converges.
  let squareWritten: WrittenObject[] = [];
  const planned = planSquareWrites(book, writes);
  if (planned.length) {
    let blocked: Set<string>;
    if (!opts.square) {
      blocked = new Set(planned.map((w) => w.key));
    } else {
      const res = opts.squareResult
        ? pickSquareResult(opts.squareResult, planned)
        : await applySquareWrites(opts.square.client, planned, { dryRun: false });
      squareWritten = res.written;
      result.squareWritten = res.written.length;
      result.squareConflicts = res.conflicts.length;
      blocked = new Set([...res.conflicts, ...res.skipped].map((w) => w.key));
    }
    // A subtitle without its cleaned title would duplicate text already in the title.
    if (blocked.has('title')) blocked.add('subtitle');
    const kept = writes.filter((w) => !blocked.has(w.key));
    result.deferred = writes.length - kept.length;
    writes = kept;
    if (opts.requireAll && result.deferred) {
      throw new Error(
        opts.square
          ? 'Square no longer holds the value this proposal was based on (changed at the POS); not applied.'
          : 'This change must be written to Square first, and Square write-back is off (INGRAM_ENRICHMENT_SQUARE_WRITEBACK).',
      );
    }
  }

  return inTransaction(payload, async (req) => {
    for (const w of squareWritten) {
      await payload.create({
        collection: LOG_COLLECTION as any,
        depth: 0,
        data: {
          book: book.id,
          fieldPath: w.write.key,
          editionIsbn: w.write.editionIsbn,
          target: 'square',
          action: opts.logAction ?? 'correct',
          previousValue: wrapValue(w.previous),
          newValue: wrapValue(w.write.next),
          squareObjectId: w.write.objectId,
          squareVersion: w.previousVersion ?? undefined,
          ingramRecordDate: opts.recordDate ?? undefined,
          runId,
        } as any,
        req: req as any,
      });
      result.logged += 1;
    }

    if (writes.length) {
      // Re-read inside the transaction: the diff may be minutes old.
      const fresh = await payload.findByID({ collection: 'books', id: book.id, depth: 0, req: req as any });
      const { data, applied, stale } = applyChangesToBook(fresh as any, writes, { now, recordDate: opts.recordDate });
      result.stale = stale.length;
      if (opts.requireAll && stale.length) {
        throw new Error('The book changed after this proposal was made; it will be re-proposed on the next run.');
      }
      if (applied.length) {
        await payload.update({
          collection: 'books',
          id: book.id,
          data,
          depth: 0,
          req: req as any,
          context: { ...ENRICHMENT_CONTEXT },
        });
        result.applied = applied.filter((a) => a.key !== 'pricing.retailPrice' || a.editionIsbn).length;
        for (const value of applied) {
          await payload.create({
            collection: LOG_COLLECTION as any,
            depth: 0,
            data: {
              book: book.id,
              fieldPath: value.key,
              editionIsbn: value.editionIsbn,
              target: 'payload',
              action: opts.logAction ?? (value.action === 'fill' ? 'fill' : 'correct'),
              previousValue: wrapValue(value.previous),
              newValue: wrapValue(value.next),
              previousSource: value.previousSource,
              ingramRecordDate: opts.recordDate ?? undefined,
              runId,
            } as any,
            req: req as any,
          });
          result.logged += 1;
        }
      }
    }

    // Review queue: one pending row per field; a newer, different proposal supersedes it.
    const touched = new Set([...writes, ...conflicts].map((c) => c.key));
    if (touched.size) {
      const pending = await payload.find({
        collection: REVIEW_COLLECTION as any,
        where: { and: [{ book: { equals: book.id } }, { state: { equals: 'pending' } }, { fieldPath: { in: [...touched] } }] },
        limit: 1000,
        depth: 0,
        req: req as any,
      });
      const proposalByKey = new Map(conflicts.map((c) => [c.key, rejectionKey(c.key, c.path, c.proposed)]));
      const kept = new Set<string>();
      for (const row of pending.docs as any[]) {
        if (opts.reviewId !== undefined && String(row.id) === String(opts.reviewId)) continue;
        if (proposalByKey.get(row.fieldPath) === row.proposedKey && !kept.has(row.fieldPath)) {
          kept.add(row.fieldPath);
          continue;
        }
        await payload.update({
          collection: REVIEW_COLLECTION as any,
          id: row.id,
          data: { state: 'superseded' } as any,
          depth: 0,
          req: req as any,
        });
        result.superseded += 1;
      }
      for (const conflict of conflicts) {
        if (kept.has(conflict.key)) continue;
        await payload.create({
          collection: REVIEW_COLLECTION as any,
          depth: 0,
          data: {
            book: book.id,
            fieldPath: conflict.key,
            path: conflict.path,
            editionIsbn: conflict.editionIsbn,
            currentValue: wrapValue(conflict.current),
            proposedValue: wrapValue(conflict.proposed),
            proposedKey: proposalByKey.get(conflict.key),
            state: 'pending',
            reason: conflict.reason,
            runId,
            ingramRecordDate: opts.recordDate ?? undefined,
          } as any,
          req: req as any,
        });
        result.queued += 1;
      }
    }

    if (opts.withinTransaction) await opts.withinTransaction(req);
    return result;
  });
}

/** Rejected proposals by book id, as rejectionKey()s, for DiffOptions.rejected. */
export async function loadRejectedProposals(payload: Pick<Payload, 'find'>): Promise<Map<string, Set<string>>> {
  const byBook = new Map<string, Set<string>>();
  for (let page = 1; ; page += 1) {
    const result = await payload.find({
      collection: REVIEW_COLLECTION as any,
      where: { state: { equals: 'rejected' } },
      limit: 500,
      page,
      depth: 0,
    });
    for (const row of result.docs as any[]) {
      const bookId = String(typeof row.book === 'object' ? row.book?.id : row.book);
      const set = byBook.get(bookId) ?? new Set<string>();
      if (row.proposedKey) set.add(row.proposedKey);
      byBook.set(bookId, set);
    }
    if (!result.hasNextPage) return byBook;
  }
}
