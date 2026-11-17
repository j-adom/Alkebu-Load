// Undo price uplifts that one enrichment run wrote to Payload but not to Square.
//
// Before the legacy-link guard (unplannableSquareKeys), a price change on a Square-linked
// edition with no real variation id was written to Payload alone: the website showed the
// Ingram list price while the POS kept the old one, and the next Square edit to the item
// would copy the old price back. This puts those editions back to their logged previous
// price so the next run (after `pnpm square:link-repair`) proposes the uplift again and
// writes Square first.
//
// Only touches, per book, the `editions.<EAN>.pricing.retailPrice` rows of the given run
// that have no matching Square row, on editions that are in Square, and only where the
// edition still holds the run's new price (anything changed since is left alone and
// counted). Payload-only editions keep their uplift. The book-level price is re-derived as
// the minimum edition price, as applyChangesToBook derives it.
import type { Payload } from 'payload';

import { ENRICHMENT_CONTEXT, inTransaction, LOG_COLLECTION, unwrapValue, type PayloadLike } from './applyEnrichment';
import { editionEanOf, parseSourceKey, type FieldSources } from './enrichmentFields';
import { editionInSquare } from './squareWriteBack';

export interface RevertLogRow {
  id: string | number;
  fieldPath: string;
  target?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
}

export interface BookRevertPlan {
  data: Record<string, any>;
  /** Edition price keys put back to their previous value. */
  reverted: string[];
  /** Edition rows whose price changed after the run: left alone. */
  changedSince: string[];
  /** Log rows to delete: the reverted edition rows and, when it moved back, the book row. */
  logIds: Array<string | number>;
}

const PRICE_KEY = /^editions\.\d{13}\.pricing\.retailPrice$/;
const cents = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

/** Pure: the update that undoes one book's unsynced price writes from one run, or null. */
export function planUnsyncedPriceRevert(book: Record<string, any>, runLogs: RevertLogRow[]): BookRevertPlan | null {
  const synced = new Set(runLogs.filter((l) => l.target === 'square').map((l) => l.fieldPath));
  const candidates = runLogs.filter(
    (l) => (l.target ?? 'payload') === 'payload' && PRICE_KEY.test(l.fieldPath) && !synced.has(l.fieldPath),
  );
  if (candidates.length === 0) return null;

  const editions: any[] = (Array.isArray(book?.editions) ? book.editions : []).map((e: any) => ({ ...e }));
  const sources: FieldSources = { ...((book?.enrichment?.fieldSources as FieldSources) ?? {}) };
  const plan: BookRevertPlan = { data: {}, reverted: [], changedSince: [], logIds: [] };

  for (const row of candidates) {
    const { editionEan } = parseSourceKey(row.fieldPath);
    const index = editions.findIndex((e) => editionEanOf(e) === editionEan);
    if (index < 0 || !editionInSquare(book, book.editions[index])) continue;
    const previous = cents(unwrapValue(row.previousValue));
    const next = cents(unwrapValue(row.newValue));
    if (previous === null || next === null) continue;
    if (cents(editions[index]?.pricing?.retailPrice) !== next) {
      plan.changedSince.push(row.fieldPath);
      continue;
    }
    editions[index] = { ...editions[index], pricing: { ...(editions[index].pricing ?? {}), retailPrice: previous } };
    delete sources[row.fieldPath];
    plan.reverted.push(row.fieldPath);
    plan.logIds.push(row.id);
  }
  if (plan.reverted.length === 0) return plan.changedSince.length ? plan : null;

  plan.data.editions = editions;
  plan.data.enrichment = { ...(book.enrichment ?? {}), fieldSources: sources };

  // The run moved the book price to the editions' new minimum; move it back the same way.
  const bookRow = runLogs.find((l) => (l.target ?? 'payload') === 'payload' && l.fieldPath === 'pricing.retailPrice');
  const prices = editions.map((e) => cents(e?.pricing?.retailPrice)).filter((n): n is number => n !== null);
  if (bookRow && prices.length && cents(book?.pricing?.retailPrice) === cents(unwrapValue(bookRow.newValue))) {
    const min = Math.min(...prices);
    if (min !== cents(book?.pricing?.retailPrice)) {
      plan.data.pricing = { ...(book.pricing ?? {}), retailPrice: min };
      plan.logIds.push(bookRow.id);
    }
  }
  return plan;
}

export interface RevertSummary {
  dryRun: boolean;
  runId: string;
  booksWithUnsyncedPrices: number;
  editionsReverted: number;
  editionsChangedSince: number;
  booksUpdated: number;
  booksFailed: number;
  logRowsDeleted: number;
}

type RevertPayload = PayloadLike & Pick<Payload, 'delete'>;

export async function revertUnsyncedPrices(
  payload: RevertPayload,
  runId: string,
  opts: { dryRun: boolean },
): Promise<RevertSummary> {
  const logs: any[] = [];
  for (let page = 1; ; page += 1) {
    const res = await payload.find({
      collection: LOG_COLLECTION as any,
      where: { runId: { equals: runId } },
      page,
      limit: 500,
      depth: 0,
      sort: 'id',
    });
    logs.push(...res.docs);
    if (!res.hasNextPage) break;
  }
  const byBook = new Map<string, RevertLogRow[]>();
  for (const row of logs) {
    const id = String(typeof row.book === 'object' ? row.book?.id : row.book);
    if (!id || id === 'undefined' || id === 'null') continue;
    byBook.set(id, [...(byBook.get(id) ?? []), row]);
  }

  const summary: RevertSummary = {
    dryRun: opts.dryRun,
    runId,
    booksWithUnsyncedPrices: 0,
    editionsReverted: 0,
    editionsChangedSince: 0,
    booksUpdated: 0,
    booksFailed: 0,
    logRowsDeleted: 0,
  };

  for (const [bookId, rows] of byBook) {
    let book: any;
    try {
      book = await payload.findByID({ collection: 'books', id: bookId, depth: 0 });
    } catch {
      continue;
    }
    const plan = planUnsyncedPriceRevert(book, rows);
    if (!plan) continue;
    summary.booksWithUnsyncedPrices += 1;
    summary.editionsReverted += plan.reverted.length;
    summary.editionsChangedSince += plan.changedSince.length;
    if (opts.dryRun || plan.reverted.length === 0) continue;
    try {
      // Book and log rows together: a half-done revert would leave log rows for prices
      // that are no longer live (or live prices with no log row for the purge).
      const deleted = await inTransaction(payload, async (req) => {
        const fresh = await payload.findByID({ collection: 'books', id: book.id, depth: 0, req: req as any });
        const again = planUnsyncedPriceRevert(fresh as any, rows);
        if (!again || again.reverted.length === 0) return 0;
        await payload.update({
          collection: 'books',
          id: book.id,
          data: again.data,
          depth: 0,
          req: req as any,
          context: { ...ENRICHMENT_CONTEXT },
        });
        await payload.delete({ collection: LOG_COLLECTION as any, where: { id: { in: again.logIds } }, req: req as any });
        return again.logIds.length;
      });
      if (deleted) {
        summary.booksUpdated += 1;
        summary.logRowsDeleted += deleted;
      }
    } catch (error) {
      summary.booksFailed += 1;
      console.error(`Ingram price revert: book ${bookId} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return summary;
}
