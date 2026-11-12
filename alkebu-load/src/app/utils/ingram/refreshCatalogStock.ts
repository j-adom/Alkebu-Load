// Stage-1 availability refresh from the Ingram SFTP feed, in two halves:
//   fetch (no lock): download the full file, keep only our EANs -> a compact snapshot
//   apply (books-write lock): merge the snapshot into editions, writing changed books only
// Splitting them keeps a multi-minute download from blocking Square stock updates.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Payload } from 'payload';

import { editionEan, type CompactStock } from './applyIngramStock';
import { planBookAvailability } from './availabilityPlan';
import {
  BULK_EDITION_CHUNK,
  editionStockRows,
  supportsBulkEditionWrites,
  writeEditionStockChunk,
  type BulkDb,
  type EditionStockRow,
} from './bulkEditionStock';
import { buildSnapshot, type CatalogSnapshot, type FeedFormat } from './catalogStockSnapshot';
import type { IngramStock } from './parseStockResponse';
import { downloadIngramFile } from './sftp';
import { zipLines } from './zipLines';

/** Serializable snapshot: travels from the fetch job to the apply job as job input. */
export interface StockSnapshotInput {
  stock: Record<string, CompactStock>;
  /** True only for a complete file: then a catalog EAN that's absent means "not carried". */
  fullCoverage: boolean;
  sourceFile?: string;
}

const PAGE_SIZE = 200;
const REFRESH_CONTEXT = { skipEnrichment: true, ingramStockRefresh: true };

type BookPager = Pick<Payload, 'find'>;

export async function* allBooks(payload: BookPager, pageSize = PAGE_SIZE): AsyncGenerator<any> {
  for (let page = 1; ; page += 1) {
    const result = await payload.find({ collection: 'books', page, limit: pageSize, depth: 0, sort: 'id' });
    for (const doc of result.docs) yield doc;
    if (!result.hasNextPage) return;
  }
}

export async function loadCatalogEans(payload: BookPager, pageSize = PAGE_SIZE): Promise<Set<string>> {
  const eans = new Set<string>();
  for await (const book of allBooks(payload, pageSize)) {
    for (const edition of book.editions ?? []) {
      const ean = editionEan(edition);
      if (ean) eans.add(ean);
    }
  }
  return eans;
}

/**
 * A truncated download or a silent format change would otherwise mark the whole catalog
 * "Ingram doesn't carry it". Require a plausible line count and mostly-readable lines.
 */
export function snapshotIsTrustworthy(
  counts: Pick<CatalogSnapshot, 'scannedLines' | 'matched' | 'skippedLines'>,
  minLines: number,
): boolean {
  if (counts.scannedLines < minLines) return false;
  return counts.skippedLines / counts.scannedLines < 0.05;
}

export interface FetchOptions {
  remotePath: string;
  /** Fresh per run: header-driven formats hold the column layout they read. */
  format: FeedFormat;
  threshold: number;
  minLines: number;
  today?: Date;
}

export async function fetchStockSnapshot(
  payload: BookPager,
  opts: FetchOptions,
  download: (remote: string, local: string) => Promise<void> = (remote, local) => downloadIngramFile(remote, local),
): Promise<{
  input: StockSnapshotInput;
  /** Full records for our EANs (kept out of `input`, which travels as job input). */
  records: Map<string, IngramStock>;
  counts: Omit<CatalogSnapshot, 'stock' | 'records'> & { catalogEans: number };
}> {
  const catalogEans = await loadCatalogEans(payload);
  const dir = await mkdtemp(join(tmpdir(), 'ingram-stock-'));
  try {
    const localPath = join(dir, 'stock.zip');
    await download(opts.remotePath, localPath);
    const snapshot = await buildSnapshot(zipLines(localPath), catalogEans, opts.format, {
      threshold: opts.threshold,
      today: opts.today,
    });
    const counts = {
      catalogEans: catalogEans.size,
      scannedLines: snapshot.scannedLines,
      matched: snapshot.matched,
      skippedLines: snapshot.skippedLines,
      unrecognizedOnSaleDates: snapshot.unrecognizedOnSaleDates,
      unrecognizedAvailabilityCodes: snapshot.unrecognizedAvailabilityCodes,
    };
    if (!snapshotIsTrustworthy(snapshot, opts.minLines)) {
      throw new Error(`Ingram stock file looks incomplete or unreadable: ${JSON.stringify(counts)}`);
    }
    return {
      input: { stock: Object.fromEntries(snapshot.stock), fullCoverage: true, sourceFile: opts.remotePath },
      records: snapshot.records,
      counts,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Writes refreshed books. On PostgreSQL, books whose plan only touches the four stock
 * columns are buffered and written in bulk (bulkEditionStock.ts); anything else, and any
 * book the bulk UPDATE didn't fully reach, goes through payload.update.
 */
export function createStockWriter(payload: Pick<Payload, 'update'> & { db?: unknown }, opts: { chunk?: number } = {}) {
  const db = payload.db as BulkDb | undefined;
  const bulk = supportsBulkEditionWrites(db);
  const chunk = opts.chunk ?? BULK_EDITION_CHUNK;
  const counts = { updated: 0, failed: 0, bulk: 0 };
  let buffer: Array<{ book: any; editions: any[]; rows: EditionStockRow[] }> = [];
  let buffered = 0;

  const updateOne = async (book: any, editions: any[]) => {
    try {
      await payload.update({ collection: 'books', id: book.id, data: { editions }, depth: 0, context: REFRESH_CONTEXT });
      counts.updated += 1;
    } catch (error) {
      counts.failed += 1;
      console.error(`Ingram stock refresh: failed to update book ${book.id}:`, error);
    }
  };

  const flush = async () => {
    const batch = buffer;
    buffer = [];
    buffered = 0;
    if (batch.length === 0) return;
    let done = new Set<string>();
    try {
      done = await writeEditionStockChunk(db!, batch.flatMap((b) => b.rows));
    } catch (error) {
      console.error('Ingram stock refresh: bulk edition write failed, writing book by book:', error instanceof Error ? error.message : error);
    }
    for (const item of batch) {
      if (item.rows.every((r) => done.has(r.editionId))) {
        counts.updated += 1;
        counts.bulk += 1;
      } else {
        await updateOne(item.book, item.editions);
      }
    }
  };

  return {
    counts,
    flush,
    async write(book: any, editions: any[]) {
      const rows = bulk ? editionStockRows(book, editions) : null;
      if (!rows || rows.length === 0) return updateOne(book, editions);
      buffer.push({ book, editions, rows });
      buffered += rows.length;
      if (buffered >= chunk) await flush();
    },
  };
}

export async function applyStockSnapshot(
  payload: BookPager & Pick<Payload, 'update'> & { db?: unknown },
  input: StockSnapshotInput,
  opts: { checkedAt: string; chunk?: number },
): Promise<{ scanned: number; updated: number; failed: number; protected: number; bulk: number }> {
  const stock = new Map(Object.entries(input.stock));
  const writer = createStockWriter(payload, { chunk: opts.chunk });
  let scanned = 0;
  let protectedBooks = 0;

  for await (const book of allBooks(payload)) {
    scanned += 1;
    // Request-only / discontinued books are staff decisions: never written by the refresh.
    const plan = planBookAvailability(book, stock, { checkedAt: opts.checkedAt, fullCoverage: input.fullCoverage });
    if (plan.protected) protectedBooks += 1;
    if (!plan.changed) continue;
    await writer.write(book, plan.editions);
  }
  await writer.flush();

  const { updated, failed, bulk } = writer.counts;
  return { scanned, updated, failed, protected: protectedBooks, bulk };
}
