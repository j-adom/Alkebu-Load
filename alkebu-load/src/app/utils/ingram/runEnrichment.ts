// Orchestrates one Ingram catalog-enrichment run over local copies of the Ingram files:
//   stream-filter + parse (Tasks 16-17) -> map + diff (Task 19) -> apply (Tasks 20/20b).
//
// The summary is COUNTS ONLY (no titles, names or values from Ingram records), so it can
// be shared and stored in job logs (agreement §2(c): Ingram data never goes to an AI/LLM).
import { randomUUID } from 'node:crypto';
import type { Payload } from 'payload';

import { applyEnrichment, emptyApplyResult, loadRejectedProposals, type ApplyResult, type PayloadLike } from './applyEnrichment';
import { emptyFilterStats, filterCatalogLines, loadCatalogEans, type FilterStats } from './catalogFilter';
import type { FeedFormat } from './catalogStockSnapshot';
import {
  DESCRIPTION_LAYOUT,
  parseDescriptionStream,
  type DescriptionKind,
  type DescriptionLayout,
} from './descriptionParser';
import { diffEnrichment, type ChangeAction } from './diffEnrichment';
import { editionEanOf } from './enrichmentFields';
import { mapIngramRecord, type EnrichmentCandidate } from './mapEnrichment';
import type { IngramStock } from './parseStockResponse';
import { allBooks } from './refreshCatalogStock';
import type { SquareWriteOption } from './squareWriteBack';
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
  /** Optional Inventory file (Catalog Stock CSV) for media-mail eligibility and on-sale dates. */
  stock?: { path: string; entryName?: string; format: FeedFormat };
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
}

export class PlaceholderLayoutError extends Error {}

function assertLayouts(opts: RunOptions) {
  if (opts.allowPlaceholderLayout) return;
  const titles = opts.titlesLayout ?? TITLES_BASIC_LAYOUT;
  const descriptions = opts.descriptionLayout ?? DESCRIPTION_LAYOUT;
  if (opts.files.titles && titles.placeholder) {
    throw new PlaceholderLayoutError(
      'TITLES_BASIC_LAYOUT is still the placeholder. The owner must transcribe the column order from DeveloperSpecs/ (titlesBasicParser.ts) before a real run.',
    );
  }
  if (opts.files.descriptions?.length && descriptions.placeholder) {
    throw new PlaceholderLayoutError(
      'DESCRIPTION_LAYOUT is still the placeholder. The owner must transcribe the record layout from DeveloperSpecs/ (descriptionParser.ts) before a real run.',
    );
  }
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

async function readDescriptions(files: EnrichmentFiles, eans: Set<string>, layout: DescriptionLayout) {
  const byEan = new Map<string, Partial<Record<DescriptionKind, string>>>();
  let count = 0;
  for (const file of files.descriptions ?? []) {
    for await (const record of parseDescriptionStream(zipLines(file.path, file.entryName), file.kind, { eans, layout })) {
      count += 1;
      byEan.set(record.ean, { ...(byEan.get(record.ean) ?? {}), [record.kind]: record.html });
    }
  }
  return { byEan, count };
}

async function readStock(files: EnrichmentFiles, eans: Set<string>) {
  const stock = new Map<string, IngramStock>();
  if (!files.stock) return { stock, stats: null };
  const { format } = files.stock;
  const stats = emptyFilterStats();
  let first = true;
  async function* body() {
    for await (const line of zipLines(files.stock!.path, files.stock!.entryName)) {
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

export async function runEnrichment(payload: Payload | PayloadLike, opts: RunOptions): Promise<RunSummary> {
  assertLayouts(opts);
  const runId = opts.runId ?? `ingram-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;
  const titlesLayout = opts.titlesLayout ?? TITLES_BASIC_LAYOUT;
  const descriptionLayout = opts.descriptionLayout ?? DESCRIPTION_LAYOUT;
  const pager = payload as Pick<Payload, 'find'>;

  const eans = await loadCatalogEans(pager);
  const errors = emptyParseErrors();
  const titles = await readTitles(opts.files, eans, titlesLayout, errors);
  const descriptions = await readDescriptions(opts.files, eans, descriptionLayout);
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
  };

  // Pass 2: diff and (unless dry run) apply, book by book.
  for await (const book of allBooks(pager)) {
    summary.scanned += 1;
    const candidates = candidatesFor(book);
    if (candidates.length === 0) continue;
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
    if (!actionable) continue;
    summary.booksTouched += 1;
    if (opts.dryRun) continue;

    try {
      const result = await applyEnrichment(payload as PayloadLike, book, changes, runId, {
        now: opts.now,
        recordDate: candidates[0]?.recordDate ?? null,
        square: opts.square,
      });
      for (const k of Object.keys(result) as Array<keyof ApplyResult>) summary.applied[k] += result[k];
    } catch (error) {
      // One book's failure never stops the run, and is never retried here (a Square write
      // that succeeded before a Payload failure converges through the catalog sync).
      summary.booksFailed += 1;
      console.error(`Ingram enrichment: book ${String(book.id)} failed:`, error instanceof Error ? error.message : error);
    }
  }
  summary.disambiguationKept = keepAuthor.size;
  return summary;
}
