// Termination purge (agreement §6(c)): if the Ingram subscription ends, all Ingram Metadata
// must leave our systems. For every book field whose provenance is 'ingram', restore the
// value it had before Ingram first wrote it (from the log, when that value came from a
// non-Ingram source), otherwise clear it; then delete the log and review rows.
//
// Square: price uplifts, title cleanups and Author fills also went to Square. Those are reported (object
// ids and the previous values, from the log) but never changed here; reverting the POS is
// a separate, deliberate owner step.
import type { Payload } from 'payload';

import { LOG_COLLECTION, REVIEW_COLLECTION, unwrapValue } from './applyEnrichment';
import { editionEanOf, parseSourceKey, setPath, type FieldSources } from './enrichmentFields';

export interface LogRow {
  fieldPath: string;
  target?: string | null;
  previousValue?: unknown;
  previousSource?: string | null;
  createdAt?: string;
  squareObjectId?: string | null;
  squareVersion?: string | null;
}

const ARRAY_FIELDS = new Set(['subjects', 'authorsText']);

/** Pure: the update that removes Ingram data from one book, or null when there is none. */
export function planBookPurge(
  book: Record<string, any>,
  logs: LogRow[],
): { data: Record<string, any>; restored: number; cleared: number } | null {
  const sources: FieldSources = { ...((book?.enrichment?.fieldSources as FieldSources) ?? {}) };
  const ingramKeys = Object.keys(sources).filter((k) => sources[k]?.source === 'ingram');
  const payloadLogs = logs
    .filter((l) => (l.target ?? 'payload') === 'payload')
    .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));
  // The derived book-level price is logged but has no provenance key of its own.
  const derivedKeys = [...new Set(payloadLogs.map((l) => l.fieldPath))].filter((k) => k === 'pricing.retailPrice');
  const keys = [...new Set([...ingramKeys, ...derivedKeys])];
  if (keys.length === 0 && !book?.enrichment?.ingramEnrichedAt) return null;

  let data: Record<string, any> = {};
  let editions: any[] | null = null;
  let restored = 0;
  let cleared = 0;

  for (const key of keys) {
    const first = payloadLogs.find((l) => l.fieldPath === key);
    const restore = first && first.previousSource !== 'ingram';
    const { path, editionEan } = parseSourceKey(key);
    const fallback = ARRAY_FIELDS.has(path) ? [] : null;
    const value = restore ? (unwrapValue(first!.previousValue) ?? fallback) : fallback;
    // "Restored" when an earlier non-Ingram value comes back; "cleared" when the field empties.
    const empty = value === null || (Array.isArray(value) && value.length === 0);
    if (empty) cleared += 1;
    else restored += 1;

    if (editionEan) {
      editions ??= (book.editions ?? []).map((e: any) => ({ ...e }));
      const list = editions!;
      const index = list.findIndex((e) => editionEanOf(e) === editionEan);
      if (index >= 0) list[index] = setPath(list[index], path, value);
    } else {
      data = setPath(data, path, value);
      if (path === 'subtitle') data.titleLong = null;
    }
    delete sources[key];
  }

  if (editions) data.editions = editions;
  data.enrichment = { ...(book.enrichment ?? {}), fieldSources: sources, ingramEnrichedAt: null, ingramRecordDate: null };
  return { data, restored, cleared };
}

export interface PurgeSummary {
  dryRun: boolean;
  booksWithIngramData: number;
  booksUpdated: number;
  booksFailed: number;
  fieldsRestored: number;
  fieldsCleared: number;
  logRows: number;
  reviewRows: number;
  /** Square objects Ingram enrichment changed: reported, never touched by the purge. */
  squareChanges: Array<{ objectId: string; fieldPath: string; previousValue: unknown; previousVersion: string | null }>;
}

type PurgePayload = Pick<Payload, 'find' | 'update' | 'delete'>;

async function allDocs(payload: PurgePayload, collection: string, where?: any): Promise<any[]> {
  const docs: any[] = [];
  for (let page = 1; ; page += 1) {
    const result = await payload.find({ collection: collection as any, where, page, limit: 500, depth: 0, sort: 'id' });
    docs.push(...result.docs);
    if (!result.hasNextPage) return docs;
  }
}

export async function runPurge(payload: PurgePayload, opts: { dryRun: boolean }): Promise<PurgeSummary> {
  const logs = await allDocs(payload, LOG_COLLECTION);
  const reviews = await allDocs(payload, REVIEW_COLLECTION);
  const logsByBook = new Map<string, LogRow[]>();
  for (const row of logs) {
    const id = String(typeof row.book === 'object' ? row.book?.id : row.book);
    logsByBook.set(id, [...(logsByBook.get(id) ?? []), row]);
  }

  const summary: PurgeSummary = {
    dryRun: opts.dryRun,
    booksWithIngramData: 0,
    booksUpdated: 0,
    booksFailed: 0,
    fieldsRestored: 0,
    fieldsCleared: 0,
    logRows: logs.length,
    reviewRows: reviews.length,
    squareChanges: logs
      .filter((l) => l.target === 'square' && l.squareObjectId)
      .map((l) => ({
        objectId: l.squareObjectId,
        fieldPath: l.fieldPath,
        previousValue: unwrapValue(l.previousValue),
        previousVersion: l.squareVersion ?? null,
      })),
  };

  for (const book of await allDocs(payload, 'books')) {
    const plan = planBookPurge(book, logsByBook.get(String(book.id)) ?? []);
    if (!plan) continue;
    summary.booksWithIngramData += 1;
    summary.fieldsRestored += plan.restored;
    summary.fieldsCleared += plan.cleared;
    if (opts.dryRun) continue;
    try {
      await payload.update({
        collection: 'books',
        id: book.id,
        data: plan.data,
        depth: 0,
        context: { ingramEnrichment: true, skipEnrichment: true },
      });
      summary.booksUpdated += 1;
    } catch (error) {
      summary.booksFailed += 1;
      console.error(`Ingram purge: book ${String(book.id)} failed:`, error instanceof Error ? error.message : error);
    }
  }

  // Keep the log until every book is clean: it is the only record of the previous values.
  if (!opts.dryRun && summary.booksFailed === 0) {
    await payload.delete({ collection: REVIEW_COLLECTION as any, where: { id: { exists: true } } });
    await payload.delete({ collection: LOG_COLLECTION as any, where: { id: { exists: true } } });
  }
  return summary;
}
