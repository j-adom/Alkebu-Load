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
import { buildSnapshot, type CatalogSnapshot, type FeedFormat } from './catalogStockSnapshot';
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

async function* allBooks(payload: BookPager, pageSize = PAGE_SIZE): AsyncGenerator<any> {
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
): Promise<{ input: StockSnapshotInput; counts: Omit<CatalogSnapshot, 'stock'> & { catalogEans: number } }> {
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
      counts,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function applyStockSnapshot(
  payload: BookPager & Pick<Payload, 'update'>,
  input: StockSnapshotInput,
  opts: { checkedAt: string },
): Promise<{ scanned: number; updated: number; failed: number; protected: number }> {
  const stock = new Map(Object.entries(input.stock));
  let scanned = 0;
  let updated = 0;
  let failed = 0;
  let protectedBooks = 0;

  for await (const book of allBooks(payload)) {
    scanned += 1;
    // Request-only / discontinued books are staff decisions: never written by the refresh.
    const plan = planBookAvailability(book, stock, { checkedAt: opts.checkedAt, fullCoverage: input.fullCoverage });
    if (plan.protected) protectedBooks += 1;
    const { editions, changed } = plan;
    if (!changed) continue;
    try {
      await payload.update({
        collection: 'books',
        id: book.id,
        data: { editions },
        depth: 0,
        context: REFRESH_CONTEXT,
      });
      updated += 1;
    } catch (error) {
      failed += 1;
      console.error(`Ingram stock refresh: failed to update book ${book.id}:`, error);
    }
  }

  return { scanned, updated, failed, protected: protectedBooks };
}
