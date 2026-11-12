// Orchestrates one Ingram catalog-enrichment run over local copies of the Ingram files:
//   stream-filter + parse (Tasks 16-17) -> map + diff (Task 19) -> apply (Tasks 20/20b).
//
// The summary is COUNTS ONLY (no titles, names or values from Ingram records), so it can
// be shared and stored in job logs (agreement §2(c): Ingram data never goes to an AI/LLM).
import { randomUUID } from 'node:crypto';
import type { Payload } from 'payload';

import {
  applyEnrichment,
  emptyApplyResult,
  loadRejectedProposals,
  LOG_COLLECTION,
  wrapValue,
  type ApplyResult,
  type PayloadLike,
} from './applyEnrichment';
import { emptyFilterStats, filterCatalogLines, loadCatalogEans, type FilterStats } from './catalogFilter';
import type { FeedFormat } from './catalogStockSnapshot';
import {
  DESCRIPTION_LAYOUTS,
  parseDescriptionStream,
  type DescriptionKind,
  type DescriptionLayout,
} from './descriptionParser';
import { diffEnrichment, isWrite, type ChangeAction, type FieldChange } from './diffEnrichment';
import { editionEanOf } from './enrichmentFields';
import { mapIngramRecord, type EnrichmentCandidate } from './mapEnrichment';
import type { IngramStock } from './parseStockResponse';
import { allBooks } from './refreshCatalogStock';
import {
  applySquareWrites,
  planSquareAuthorFills,
  planSquareWrites,
  SQUARE_AUTHOR_FIELD,
  SQUARE_BATCH_LIMIT,
  type SquareWrite,
  type SquareWriteOption,
  type SquareWriteResult,
} from './squareWriteBack';

/**
 * Books applied per Square round: their price/title writes go to Square together (one
 * batchGet and one upsert per 100 objects) instead of two calls per book, then each book's
 * Payload transaction runs with its own share of the result.
 */
export const APPLY_BATCH_BOOKS = 50;
import { authorKey, cleanTitle, findDisambiguationTitles } from './titleCleanup';
import {
  emptyParseErrors,
  parseTitlesBasicLine,
  TITLES_BASIC_LAYOUT,
  titlesBasicEan,
  type TitlesBasicLayout,
  type TitlesBasicRecord,
} from './titlesBasicParser';
import { zipLines } from './zipLines';

export interface EnrichmentFiles {
  titles?: { path: string; entryName?: string };
  descriptions?: Array<{ path: string; kind: DescriptionKind; entryName?: string }>;
  /**
   * Inventory file (Catalog Stock CSV): list price, publication date, weight, media mail,
   * on-sale date. Either the file, or records the daily stock refresh already parsed.
   */
  stock?: { path: string; entryName?: string; format: FeedFormat } | { records: Record<string, IngramStock> };
}

export interface RunOptions {
  files: EnrichmentFiles;
  dryRun: boolean;
  /** Stop after this many books with at least one change (write or review). */
  limit?: number;
  runId?: string;
  square?: SquareWriteOption;
  bisacHeadings?: ReadonlyMap<string, string>;
  titlesLayout?: TitlesBasicLayout;
  /** Overrides the per-kind layouts (DESCRIPTION_LAYOUTS) for every description file. */
  descriptionLayout?: DescriptionLayout;
  /** Tests only: allow the placeholder layouts (real files must never be parsed with them). */
  allowPlaceholderLayout?: boolean;
  now?: () => Date;
}

export interface RunSummary {
  runId: string;
  dryRun: boolean;
  /** Books in the catalog. */
  scanned: number;
  /** Books with at least one Ingram record. */
  matched: number;
  /** Catalog EANs with no Titles Basic record (when a titles file was read). */
  unmatchedEans: number;
  catalogEans: number;
  parseErrors: number;
  lines: { titles: FilterStats | null; descriptionRecords: number; stock: FilterStats | null };
  /** Books with at least one write or review proposal (bounded by limit). */
  booksTouched: number;
  booksFailed: number;
  disambiguationKept: number;
  /** Per field type (not per book): counts of each diff action. */
  byField: Record<string, Partial<Record<ChangeAction, number>>>;
  /** Title cleanup: exact vs ambiguous, and how many kept the author for disambiguation. */
  titleCleanup: { exact: number; ambiguous: number; authorKept: number };
  /** Totals from the apply step (all zero on a dry run). */
  applied: ApplyResult;
  /**
   * Square "Author" fills, one per Square-linked variation of a book with authors. Fill-only:
   * `kept` is a variation that already had a different Author (left alone), `alreadySet` one
   * that already matched. Only `planned` is counted on a dry run or with write-back off.
   */
  squareAuthors: SquareAuthorSummary;
}

export interface SquareAuthorSummary {
  planned: number;
  filled: number;
  kept: number;
  alreadySet: number;
  /** The variation no longer exists in Square. */
  skipped: number;
  /** In a batch Square rejected (logged; the next run retries). */
  failed: number;
}

const emptySquareAuthorSummary = (): SquareAuthorSummary => ({ planned: 0, filled: 0, kept: 0, alreadySet: 0, skipped: 0, failed: 0 });

export class PlaceholderLayoutError extends Error {}

function assertLayouts(opts: RunOptions) {
  if (opts.allowPlaceholderLayout) return;
  const titles = opts.titlesLayout ?? TITLES_BASIC_LAYOUT;
  if (opts.files.titles && titles.placeholder) {
    throw new PlaceholderLayoutError('The Titles Basic layout is a placeholder (titlesBasicParser.ts); a real run needs the vendor column order.');
  }
  for (const file of opts.files.descriptions ?? []) {
    if (descriptionLayoutFor(opts, file.kind).placeholder) {
      throw new PlaceholderLayoutError(`The ${file.kind} description layout is a placeholder (descriptionParser.ts); a real run needs the vendor layout.`);
    }
  }
}

function descriptionLayoutFor(opts: RunOptions, kind: DescriptionKind): DescriptionLayout {
  return opts.descriptionLayout ?? DESCRIPTION_LAYOUTS[kind];
}

async function readTitles(files: EnrichmentFiles, eans: Set<string>, layout: TitlesBasicLayout, errors: { malformed: number }) {
  const records = new Map<string, TitlesBasicRecord>();
  if (!files.titles) return { records, stats: null };
  const stats = emptyFilterStats();
  const lines = filterCatalogLines(zipLines(files.titles.path, files.titles.entryName), (l) => titlesBasicEan(l, layout), eans, stats);
  for await (const line of lines) {
    const record = parseTitlesBasicLine(line, layout, errors);
    if (record) records.set(record.ean, record);
  }
  return { records, stats };
}

async function readDescriptions(files: EnrichmentFiles, eans: Set<string>, layoutFor: (kind: DescriptionKind) => DescriptionLayout) {
  const byEan = new Map<string, Partial<Record<DescriptionKind, string>>>();
  let count = 0;
  for (const file of files.descriptions ?? []) {
    for await (const record of parseDescriptionStream(zipLines(file.path, file.entryName), file.kind, { eans, layout: layoutFor(file.kind) })) {
      count += 1;
      byEan.set(record.ean, { ...(byEan.get(record.ean) ?? {}), [record.kind]: record.html });
    }
  }
  return { byEan, count };
}

async function readStock(files: EnrichmentFiles, eans: Set<string>) {
  const stock = new Map<string, IngramStock>();
  if (!files.stock) return { stock, stats: null };
  if ('records' in files.stock) {
    for (const [ean, record] of Object.entries(files.stock.records)) if (eans.has(ean)) stock.set(ean, record);
    return { stock, stats: null };
  }
  const file = files.stock;
  const { format } = file;
  const stats = emptyFilterStats();
  let first = true;
  async function* body() {
    for await (const line of zipLines(file.path, file.entryName)) {
      if (first) {
        first = false;
        if (format.readHeader(line)) continue;
      }
      yield line;
    }
  }
  for await (const line of filterCatalogLines(body(), (l) => format.ean(l), eans, stats)) {
    const record = format.parse(line);
    if (record) stock.set(record.ean, record);
  }
  return { stock, stats };
}

const namesOf = (book: any): string[] =>
  ((book?.authorsText ?? []) as Array<{ name?: string }>).map((a) => a?.name ?? '').filter(Boolean);

/** The book's authors after this run: ours, or Ingram's when this run fills an empty list. */
function authorsAfter(book: any, changes: FieldChange[]): string[] {
  const ours = namesOf(book);
  if (ours.length) return ours;
  const fill = changes.find((c) => c.key === 'authorsText' && isWrite(c));
  return Array.isArray(fill?.proposed) ? namesOf({ authorsText: fill.proposed }) : [];
}

/**
 * Writes the queued Author fills to Square in batches of 100 and logs each one (target
 * 'square', so the termination purge lists it). A batch Square rejects is counted as failed
 * and retried by the next run; it never stops the others.
 */
async function fillSquareAuthors(
  payload: Pick<Payload, 'create'>,
  fills: Array<{ bookId: string; write: SquareWrite }>,
  square: SquareWriteOption,
  runId: string,
  counts: SquareAuthorSummary,
): Promise<void> {
  const bookOf = new Map(fills.map((f) => [f.write.objectId, f.bookId]));
  for (let i = 0; i < fills.length; i += SQUARE_BATCH_LIMIT) {
    const writes = fills.slice(i, i + SQUARE_BATCH_LIMIT).map((f) => f.write);
    try {
      const res = await applySquareWrites(square.client, writes, { dryRun: false });
      counts.filled += res.written.length;
      counts.kept += res.conflicts.length;
      counts.alreadySet += res.unchanged.length;
      counts.skipped += res.skipped.length;
      for (const w of res.written) {
        await payload.create({
          collection: LOG_COLLECTION as any,
          depth: 0,
          data: {
            book: bookOf.get(w.write.objectId),
            fieldPath: SQUARE_AUTHOR_FIELD,
            editionIsbn: w.write.editionIsbn,
            target: 'square',
            action: 'fill',
            previousValue: wrapValue(null),
            newValue: wrapValue(w.write.next),
            squareObjectId: w.write.objectId,
            squareVersion: w.previousVersion ?? undefined,
            runId,
          } as any,
        });
      }
    } catch (error) {
      counts.failed += writes.length;
      console.error('Ingram enrichment: Square author batch failed:', error instanceof Error ? error.message : error);
    }
  }
}

export async function runEnrichment(payload: Payload | PayloadLike, opts: RunOptions): Promise<RunSummary> {
  assertLayouts(opts);
  const runId = opts.runId ?? `ingram-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;
  const titlesLayout = opts.titlesLayout ?? TITLES_BASIC_LAYOUT;
  const pager = payload as Pick<Payload, 'find'>;

  const eans = await loadCatalogEans(pager);
  const errors = emptyParseErrors();
  const titles = await readTitles(opts.files, eans, titlesLayout, errors);
  const descriptions = await readDescriptions(opts.files, eans, (kind) => descriptionLayoutFor(opts, kind));
  const stock = await readStock(opts.files, eans);
  const rejected = await loadRejectedProposals(pager);

  const candidatesFor = (book: any): EnrichmentCandidate[] => {
    const out: EnrichmentCandidate[] = [];
    for (const edition of book?.editions ?? []) {
      const ean = editionEanOf(edition);
      if (!ean) continue;
      const t = titles.records.get(ean);
      const d = descriptions.byEan.get(ean);
      const s = stock.stock.get(ean);
      if (!t && !d && !s) continue;
      out.push({ ...mapIngramRecord(t, d, s, { bisacHeadings: opts.bisacHeadings }), ean });
    }
    return out;
  };

  // Pass 1, whole catalog: which base titles are shared by different authors.
  const disambiguation: Array<{ id: string; baseTitle: string; authorKey: string }> = [];
  for await (const book of allBooks(pager)) {
    const primary = candidatesFor(book)[0];
    const contributors = [...(primary?.book.contributors ?? []), ...namesOf(book)];
    const base = cleanTitle({
      current: String(book.title ?? ''),
      ingramTitle: primary?.book.title,
      ingramSubtitle: primary?.book.subtitle,
      contributors,
    }).title;
    disambiguation.push({ id: String(book.id), baseTitle: base, authorKey: authorKey(namesOf(book).length ? namesOf(book) : contributors) });
  }
  const keepAuthor = findDisambiguationTitles(disambiguation);

  const summary: RunSummary = {
    runId,
    dryRun: opts.dryRun,
    scanned: 0,
    matched: 0,
    unmatchedEans: opts.files.titles ? [...eans].filter((e) => !titles.records.has(e)).length : 0,
    catalogEans: eans.size,
    parseErrors: errors.malformed,
    lines: { titles: titles.stats, descriptionRecords: descriptions.count, stock: stock.stats },
    booksTouched: 0,
    booksFailed: 0,
    disambiguationKept: 0,
    byField: {},
    titleCleanup: { exact: 0, ambiguous: 0, authorKept: 0 },
    applied: emptyApplyResult(),
    squareAuthors: emptySquareAuthorSummary(),
  };

  // Square "Author" fills. With --limit only the touched books get one, so a limited
  // spot-check run stays small; a full run covers every Square-linked book with authors.
  const limited = opts.limit !== undefined;
  const authorFills: Array<{ bookId: string; write: SquareWrite }> = [];
  const queuedVariations = new Set<string>();
  const queueAuthors = (book: any, names: string[]) => {
    for (const write of planSquareAuthorFills(book, names)) {
      if (queuedVariations.has(write.objectId)) continue;
      queuedVariations.add(write.objectId);
      authorFills.push({ bookId: String(book.id), write });
    }
  };

  const pending: Array<{ book: any; changes: FieldChange[]; recordDate: string | null }> = [];
  const flush = async () => {
    const batch = pending.splice(0);
    if (batch.length === 0) return;
    let squareResult: SquareWriteResult | undefined;
    if (opts.square) {
      const planned = batch.flatMap((p) => planSquareWrites(p.book, p.changes.filter(isWrite)));
      if (planned.length) {
        try {
          squareResult = await applySquareWrites(opts.square.client, planned, { dryRun: false });
        } catch (error) {
          // Fall back to per-book Square calls so one bad object fails only its own book.
          // Writes that landed before the error now read as changed-in-Square (conflict),
          // and the catalog sync copies them into Payload.
          console.error('Ingram enrichment: batched Square write failed, retrying book by book:', error instanceof Error ? error.message : error);
        }
      }
    }
    for (const { book, changes, recordDate } of batch) {
      try {
        const result = await applyEnrichment(payload as PayloadLike, book, changes, runId, {
          now: opts.now,
          recordDate,
          square: opts.square,
          squareResult,
        });
        for (const k of Object.keys(result) as Array<keyof ApplyResult>) summary.applied[k] += result[k];
        queueAuthors(book, authorsAfter(book, changes));
      } catch (error) {
        // One book's failure never stops the run, and is never retried here (a Square write
        // that succeeded before a Payload failure converges through the catalog sync).
        summary.booksFailed += 1;
        console.error(`Ingram enrichment: book ${String(book.id)} failed:`, error instanceof Error ? error.message : error);
      }
    }
  };

  // Pass 2: diff and (unless dry run) apply, book by book.
  for await (const book of allBooks(pager)) {
    summary.scanned += 1;
    const candidates = candidatesFor(book);
    if (candidates.length === 0) {
      if (!limited) queueAuthors(book, namesOf(book));
      continue;
    }
    summary.matched += 1;
    if (opts.limit !== undefined && summary.booksTouched >= opts.limit) continue;

    const keep = keepAuthor.has(String(book.id));
    const changes = diffEnrichment(book, candidates, undefined, { keepAuthor: keep, rejected: rejected.get(String(book.id)) });
    for (const change of changes) {
      const field = (summary.byField[change.path] ??= {});
      field[change.action] = (field[change.action] ?? 0) + 1;
    }
    const titleChange = changes.find((c) => c.key === 'title' && c.action !== 'same' && c.action !== 'protected');
    if (titleChange) {
      if (titleChange.action === 'conflict') summary.titleCleanup.ambiguous += 1;
      else summary.titleCleanup.exact += 1;
    }
    if (keep) summary.titleCleanup.authorKept += 1;

    const actionable = changes.some((c) => c.action === 'fill' || c.action === 'correct' || c.action === 'conflict');
    if (!actionable) {
      if (!limited) queueAuthors(book, namesOf(book));
      continue;
    }
    summary.booksTouched += 1;
    if (opts.dryRun) {
      queueAuthors(book, authorsAfter(book, changes));
      continue;
    }

    pending.push({ book, changes, recordDate: candidates[0]?.recordDate ?? null });
    if (pending.length >= APPLY_BATCH_BOOKS) await flush();
  }
  await flush();
  summary.disambiguationKept = keepAuthor.size;

  summary.squareAuthors.planned = authorFills.length;
  if (!opts.dryRun && opts.square && authorFills.length) {
    await fillSquareAuthors(payload as Pick<Payload, 'create'>, authorFills, opts.square, runId, summary.squareAuthors);
  }
  return summary;
}
