// Pure, policy-driven diff: what Ingram enrichment would change on one book, and how.
//   fill      current value empty -> apply
//   correct   authoritative field (or title cleanup / price uplift) -> apply
//   same      nothing to do (equal ignoring case/whitespace, or a proposal staff rejected)
//   conflict  differs on a field we never overwrite silently -> review queue
//   kept      differs on a fill-only field: our value stays, nothing is queued
//   protected staff own the field (fieldSources says manual) -> left alone
import { comparable, editionEanOf, getPath, sourceKey, type EnrichmentField, type FieldSources } from './enrichmentFields';
import { FIELD_POLICY, priceUplift } from './enrichmentPolicy';
import type { EnrichmentCandidate } from './mapEnrichment';
import { cleanTitle } from './titleCleanup';

export type ChangeAction = 'fill' | 'correct' | 'same' | 'conflict' | 'kept' | 'protected';

export interface FieldChange {
  /** Provenance key: `title`, or `editions.<EAN>.pricing.shippingWeight`. */
  key: string;
  path: EnrichmentField;
  /** The edition's EAN for edition fields. */
  editionIsbn?: string;
  current: unknown;
  proposed: unknown;
  action: ChangeAction;
  reason?: string;
}

export interface DiffOptions {
  /** Disambiguation: this book's title keeps its author segment. */
  keepAuthor?: boolean;
  /** rejectionKey()s of proposals staff rejected; the same proposal diffs as `same`. */
  rejected?: ReadonlySet<string>;
}

export const rejectionKey = (key: string, path: string, value: unknown): string => `${key}\u001f${comparable(path, value) ?? ''}`;

export const isWrite = (change: FieldChange): boolean => change.action === 'fill' || change.action === 'correct';

type Book = Record<string, any>;

export function diffEnrichment(
  book: Book,
  candidates: EnrichmentCandidate | EnrichmentCandidate[],
  fieldSources: FieldSources = (book?.enrichment?.fieldSources as FieldSources) ?? {},
  opts: DiffOptions = {},
): FieldChange[] {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  const byEan = new Map(list.filter((c) => c?.ean).map((c) => [c.ean, c]));
  const changes: FieldChange[] = [];
  const manual = (key: string) => fieldSources?.[key]?.source === 'manual';

  const push = (change: FieldChange) => {
    if (isWrite(change) || change.action === 'conflict') {
      if (opts.rejected?.has(rejectionKey(change.key, change.path, change.proposed))) {
        changes.push({ ...change, action: 'same', reason: 'rejected-before' });
        return;
      }
    }
    changes.push(change);
  };

  const classify = (key: string, path: EnrichmentField, current: unknown, proposed: unknown, editionIsbn?: string) => {
    if (comparable(path, proposed) === null) return;
    const base = { key, path, current: current ?? null, proposed, ...(editionIsbn ? { editionIsbn } : {}) };
    const empty = comparable(path, current) === null;
    if (comparable(path, current) === comparable(path, proposed)) return push({ ...base, action: 'same' });
    switch (FIELD_POLICY[path]) {
      case 'system':
        return push({ ...base, action: empty ? 'fill' : 'correct' });
      case 'authoritative':
        if (manual(key)) return push({ ...base, action: 'protected' });
        return push({ ...base, action: empty ? 'fill' : 'correct' });
      case 'fill-gap':
        if (manual(key)) return push({ ...base, action: 'protected' });
        return push({ ...base, action: empty ? 'fill' : 'conflict' });
      case 'fill-only':
        if (manual(key)) return push({ ...base, action: 'protected' });
        return push({ ...base, action: empty ? 'fill' : 'kept' });
      case 'review-only':
        if (manual(key)) return push({ ...base, action: 'protected' });
        return push({ ...base, action: 'conflict' });
      default:
        return undefined;
    }
  };

  // Book-level fields come from the first edition (in book order) that Ingram matched.
  const editions: any[] = Array.isArray(book?.editions) ? book.editions : [];
  const primary = editions.map((e) => byEan.get(editionEanOf(e) ?? '')).find(Boolean) ?? list[0];

  if (primary) {
    diffTitle(book, primary, manual, opts, push);
    classify('publisherText', 'publisherText', book.publisherText, primary.book.publisherText);
    classify('subjects', 'subjects', book.subjects, primary.book.subjects);
    classify('synopsis', 'synopsis', book.synopsis, primary.book.synopsis);
    classify('description', 'description', book.description, primary.book.description);
    if (primary.book.contributors?.length) {
      classify('authorsText', 'authorsText', book.authorsText, primary.book.contributors.map((name) => ({ name })));
    }
  }

  for (const edition of editions) {
    const ean = editionEanOf(edition);
    const candidate = ean ? byEan.get(ean) : undefined;
    if (!ean || !candidate) continue;
    for (const path of ['pricing.shippingWeight', 'dimensions', 'pages', 'binding', 'language', 'datePublished', 'mediaMailEligible', 'ingramOnSaleDate'] as const) {
      classify(sourceKey(path, ean), path, getPath(edition, path), candidate.edition[path], ean);
    }
    diffPrice(book, edition, ean, candidate, manual, push);
  }
  return changes;
}

function diffTitle(
  book: Book,
  candidate: EnrichmentCandidate,
  manual: (key: string) => boolean,
  opts: DiffOptions,
  push: (c: FieldChange) => void,
) {
  if (!candidate.book.title && !candidate.book.subtitle) return;
  const contributors = [
    ...(candidate.book.contributors ?? []),
    ...((book.authorsText ?? []) as Array<{ name?: string }>).map((a) => a?.name ?? '').filter(Boolean),
  ];
  const result = cleanTitle({
    current: String(book.title ?? ''),
    ingramTitle: candidate.book.title,
    ingramSubtitle: candidate.book.subtitle,
    contributors,
    keepAuthor: opts.keepAuthor,
  });
  const titleSame = comparable('title', book.title) === comparable('title', result.title);
  const subtitleSame = !result.subtitle || comparable('subtitle', book.subtitle) === comparable('subtitle', result.subtitle);
  const reason = result.removed.length ? `removed ${result.removed.join('+')}` : undefined;
  const title = (action: ChangeAction, why = reason) =>
    push({ key: 'title', path: 'title', current: book.title ?? null, proposed: result.title, action, ...(why ? { reason: why } : {}) });
  const subtitle = (action: ChangeAction, why = reason) =>
    push({ key: 'subtitle', path: 'subtitle', current: book.subtitle ?? null, proposed: result.subtitle, action, ...(why ? { reason: why } : {}) });

  // Staff own the title: a subtitle added under a hand-written title could duplicate it.
  if (manual('title')) {
    if (!titleSame) title('protected');
    if (!subtitleSame) subtitle('protected');
    return;
  }
  if (result.confidence === 'ambiguous') {
    if (!titleSame) title('conflict', 'ambiguous title cleanup');
    if (!subtitleSame) subtitle(manual('subtitle') ? 'protected' : 'conflict', 'ambiguous title cleanup');
    if (titleSame) title('same');
    return;
  }
  title(titleSame ? 'same' : 'correct');
  if (result.subtitle && !subtitleSame) {
    if (manual('subtitle')) subtitle('protected');
    else subtitle(comparable('subtitle', book.subtitle) === null ? 'fill' : 'correct');
  }
}

function diffPrice(
  book: Book,
  edition: any,
  ean: string,
  candidate: EnrichmentCandidate,
  manual: (key: string) => boolean,
  push: (c: FieldChange) => void,
) {
  const key = sourceKey('pricing.retailPrice', ean);
  const current = edition?.pricing?.retailPrice ?? book?.pricing?.retailPrice ?? null;
  const { action, cents } = priceUplift({
    currentCents: current,
    ingramListCents: candidate.edition.listPriceCents,
    isConsignment: book?.inventory?.isConsignment,
    lockPrice: edition?.pricing?.lockPrice,
  });
  if (action === 'keep') return;
  const base = { key, path: 'pricing.retailPrice' as const, editionIsbn: ean, current, proposed: cents };
  if (manual(key)) return push({ ...base, action: 'protected' });
  if (action === 'review') return push({ ...base, action: 'conflict', reason: current ? 'over 3x current price' : 'no current price' });
  push({ ...base, action: 'correct', reason: 'price uplift' });
}
