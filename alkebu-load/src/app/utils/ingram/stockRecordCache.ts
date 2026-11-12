// The full Catalog Stock records for our EANs, saved by the daily stock refresh so the weekly
// enrichment job can reuse them instead of downloading the ~195 MB file a second time.
// A local file (not the database): it lives as long as the container, and a missing or
// stale cache just means the enrichment job downloads the file itself. Our EANs only; the
// SFTP feed is licensed for storing in our systems.
import { createHash } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { IngramStock } from './parseStockResponse';

export interface StockRecordCache {
  savedAt: string;
  /** The remote file the records came from. */
  sourceFile: string;
  /** sha256 of the records, standing in for the file checksum in the enrichment state. */
  checksum: string;
  records: Record<string, IngramStock>;
}

/** A refresh at 5:30 AM CT serves Tuesday's 8 AM enrichment run with hours to spare. */
export const STOCK_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function stockCachePath(env: Record<string, string | undefined> = process.env): string {
  return env.INGRAM_STOCK_CACHE_PATH || join(tmpdir(), 'ingram-stock-records.json');
}

export async function saveStockRecords(
  records: Map<string, IngramStock>,
  sourceFile: string,
  opts: { path?: string; now?: Date } = {},
): Promise<StockRecordCache> {
  const path = opts.path ?? stockCachePath();
  const plain = Object.fromEntries([...records].sort(([a], [b]) => a.localeCompare(b)));
  const cache: StockRecordCache = {
    savedAt: (opts.now ?? new Date()).toISOString(),
    sourceFile,
    checksum: createHash('sha256').update(JSON.stringify(plain)).digest('hex'),
    records: plain,
  };
  // Write then rename, so a reader never sees a half-written file.
  await writeFile(`${path}.tmp`, JSON.stringify(cache));
  await rename(`${path}.tmp`, path);
  return cache;
}

/** The cache when it exists, came from `sourceFile`, and is younger than maxAgeMs; else null. */
export async function loadStockRecords(
  sourceFile: string,
  opts: { path?: string; now?: Date; maxAgeMs?: number } = {},
): Promise<StockRecordCache | null> {
  try {
    const cache = JSON.parse(await readFile(opts.path ?? stockCachePath(), 'utf8')) as StockRecordCache;
    const age = (opts.now ?? new Date()).getTime() - Date.parse(cache.savedAt);
    if (cache.sourceFile !== sourceFile || !(age >= 0 && age <= (opts.maxAgeMs ?? STOCK_CACHE_MAX_AGE_MS))) return null;
    if (!cache.records || typeof cache.records !== 'object') return null;
    return cache;
  } catch {
    return null;
  }
}
