// The scheduled / CLI entry point for Ingram catalog enrichment: resolve which SFTP files
// a job needs, download them (sftpFetch.ts), skip files already applied (sha256 kept in
// the ingramEnrichmentState global), run the enrichment, and record what was applied.
import type { Payload } from 'payload';

import type { DescriptionKind } from './descriptionParser';
import { runEnrichment, type EnrichmentFiles, type RunSummary } from './runEnrichment';
import { fetchIngramFile, latestRemoteFile, type Downloader, type FetchedFile } from './sftpFetch';
import type { RemoteFile } from './sftp';
import { squareWriteOptionFromEnv, type SquareWriteOption } from './squareWriteBack';
import { stockFeedFromEnv } from './stockFeeds';
import { loadStockRecords, type StockRecordCache } from './stockRecordCache';

export type EnrichmentJob = 'titles' | 'descriptions';
type FileKind = 'titles' | 'stock' | DescriptionKind;

export interface RemoteSpec {
  kind: FileKind;
  /** A fixed path, or the newest file in `dir` matching `pattern`. */
  remote: string | { dir: string; pattern: RegExp };
}

export const STATE_GLOBAL = 'ingramEnrichmentState';

/**
 * Remote files per job (2026-09-22 access sheet; names as listed on the server 2026-11-05).
 * Weekly: Titles Basic (Tue 6 AM CT drop) plus the Catalog Stock file, which carries the
 * price, publication date and weight Titles Basic lacks (INGRAM_ENRICH_WITH_STOCK_FILE=false
 * turns it off). The Titles Basic annotation file is skipped: it is only the first 100
 * characters of a description. Monthly: publisher marketing + brief descriptions;
 * `backfill` uses the full backlist files instead of the monthly adds/changes. Paths are
 * overridable by env.
 */
export function enrichmentFilesFor(
  job: EnrichmentJob,
  env: Record<string, string | undefined> = process.env,
  opts: { backfill?: boolean } = {},
): RemoteSpec[] {
  if (job === 'titles') {
    const specs: RemoteSpec[] = [
      { kind: 'titles', remote: env.INGRAM_TITLES_BASIC_PATH || 'TitlesBasic/ttlingbasic_pipe.zip' },
    ];
    if (env.INGRAM_ANNOTATIONS_PATH) specs.push({ kind: 'annotation', remote: env.INGRAM_ANNOTATIONS_PATH });
    if (env.INGRAM_ENRICH_WITH_STOCK_FILE !== 'false') specs.push({ kind: 'stock', remote: stockFeedFromEnv(env).remotePath });
    return specs;
  }
  if (opts.backfill) {
    return [
      { kind: 'marketing', remote: env.INGRAM_MARKETING_DESC_BACKLIST_PATH || 'DESC_BKLST/PMALL_active.zip' },
      { kind: 'brief', remote: env.INGRAM_BRIEF_DESC_BACKLIST_PATH || 'DESC_BKLST/brdn_GBLFL.zip' },
    ];
  }
  return [
    {
      kind: 'marketing',
      remote: env.INGRAM_MARKETING_DESC_PATH || { dir: 'PubDescripi', pattern: /^ingmmthy-.*\.zip$/i },
    },
    { kind: 'brief', remote: env.INGRAM_BRIEF_DESC_PATH || 'BriefDesc/brdn.zip' },
  ];
}

/** First Monday of the month, UTC (cron can't say "first Monday" on its own). */
export const isFirstMondayUtc = (date: Date): boolean => date.getUTCDay() === 1 && date.getUTCDate() <= 7;

export interface ScheduledDeps {
  download?: Downloader;
  list?: (dir: string) => Promise<RemoteFile[]>;
  /** Local copies instead of SFTP, by kind (CLI --local). */
  local?: Partial<Record<FileKind, string>>;
  /** The daily refresh's saved stock records; defaults to loadStockRecords. Null: always download. */
  stockCache?: ((sourceFile: string) => Promise<StockRecordCache | null>) | null;
  square?: SquareWriteOption | null;
  env?: Record<string, string | undefined>;
  now?: () => Date;
}

export interface ScheduledOptions {
  dryRun: boolean;
  limit?: number;
  backfill?: boolean;
  /** Run even when every file matches the last applied checksum. */
  force?: boolean;
  allowPlaceholderLayout?: boolean;
}

export type ScheduledResult =
  | { skipped: string }
  | (RunSummary & { files: Array<{ kind: FileKind; remote: string; changed: boolean }> });

type Processed = Record<string, { checksum: string; processedAt: string }>;

export async function runScheduledEnrichment(
  payload: Payload,
  job: EnrichmentJob,
  opts: ScheduledOptions,
  deps: ScheduledDeps = {},
): Promise<ScheduledResult> {
  const env = deps.env ?? process.env;
  const specs = enrichmentFilesFor(job, env, { backfill: opts.backfill });
  const state = (await payload.findGlobal({ slug: STATE_GLOBAL as any, depth: 0 }).catch(() => null)) as
    | { processedFiles?: Processed | null }
    | null;
  const processed: Processed = { ...(state?.processedFiles ?? {}) };

  const fetched: Array<{ spec: RemoteSpec; remote: string; file: FetchedFile }> = [];
  let cachedStock: { remote: string; cache: StockRecordCache } | null = null;
  try {
    for (const spec of specs) {
      const remote =
        typeof spec.remote === 'string' ? spec.remote : await latestRemoteFile(spec.remote.dir, spec.remote.pattern, deps.list);
      if (!remote) {
        console.warn(`Ingram enrichment: no ${spec.kind} file found on the server; continuing without it`);
        continue;
      }
      if (spec.kind === 'stock' && !deps.local?.stock && deps.stockCache !== null) {
        const cache = await (deps.stockCache ?? loadStockRecords)(remote);
        if (cache) {
          cachedStock = { remote, cache };
          continue;
        }
      }
      const localCopy = deps.local?.[spec.kind];
      const download: Downloader | undefined = localCopy
        ? async (_remote, local) => {
            const { copyFile } = await import('node:fs/promises');
            await copyFile(localCopy, local);
          }
        : deps.download;
      fetched.push({ spec, remote, file: await fetchIngramFile(remote, { download }) });
    }

    const sources = [
      ...fetched.map((f) => ({ kind: f.spec.kind, remote: f.remote, checksum: f.file.checksum })),
      ...(cachedStock ? [{ kind: 'stock' as const, remote: cachedStock.remote, checksum: cachedStock.cache.checksum }] : []),
    ];
    const changes = sources.map((f) => ({ kind: f.kind, remote: f.remote, changed: processed[f.remote]?.checksum !== f.checksum }));
    if (sources.length === 0) return { skipped: 'no Ingram files available' };
    if (!opts.force && changes.every((c) => !c.changed)) return { skipped: 'files unchanged since the last applied run' };

    const files: EnrichmentFiles = {};
    for (const { spec, file } of fetched) {
      if (spec.kind === 'titles') files.titles = { path: file.localPath };
      else if (spec.kind === 'stock') files.stock = { path: file.localPath, format: stockFeedFromEnv(env).createFormat() };
      else (files.descriptions ??= []).push({ path: file.localPath, kind: spec.kind });
    }
    if (cachedStock) files.stock = { records: cachedStock.cache.records };

    const square = opts.dryRun ? undefined : deps.square === undefined ? await squareWriteOptionFromEnv(env) : (deps.square ?? undefined);
    const summary = await runEnrichment(payload, {
      files,
      dryRun: opts.dryRun,
      limit: opts.limit,
      square,
      allowPlaceholderLayout: opts.allowPlaceholderLayout,
      now: deps.now,
    });

    // Record the files only after a complete, clean apply; otherwise the next run retries them.
    // A bounded (--limit) run hasn't covered every book, so it never marks files processed.
    if (!opts.dryRun && summary.booksFailed === 0 && opts.limit === undefined) {
      const at = (deps.now ?? (() => new Date()))().toISOString();
      for (const { remote, checksum } of sources) processed[remote] = { checksum, processedAt: at };
      await payload.updateGlobal({
        slug: STATE_GLOBAL as any,
        data: { processedFiles: processed, lastRunAt: at, lastRunSummary: summary } as any,
        depth: 0,
      });
    }
    return { ...summary, files: changes };
  } finally {
    await Promise.all(fetched.map((f) => f.file.cleanup()));
  }
}
