// Title cleanup (spec: "Title cleanup"). Square-sourced titles often carry the subtitle
// and/or the author, e.g. `Title: Subtitle by Author Name`. Pure and conservative: text is
// only removed when it matches Ingram's subtitle or one of the book's contributors, and
// anything that doesn't match exactly is returned as `ambiguous` for staff review.

export interface CleanTitleInput {
  current: string;
  ingramTitle?: string | null;
  ingramSubtitle?: string | null;
  /** Ingram contributors plus our authorsText names, in any "Last, First" / "First Last" form. */
  contributors: string[];
  /** Disambiguation: keep the author segment (another book shares the base title). */
  keepAuthor?: boolean;
}

export interface CleanTitleResult {
  title: string;
  subtitle: string | null;
  removed: ('subtitle' | 'author')[];
  confidence: 'exact' | 'ambiguous';
}

/** Case, punctuation and whitespace-insensitive form for comparing titles and names. */
export function normalizeTitle(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'phd', 'md']);

/** "Doe, Jane" or "Jane Doe" -> "doe". Empty when no usable name. */
export function lastNameKey(name: string): string {
  const raw = String(name ?? '').trim();
  if (!raw) return '';
  if (raw.includes(',')) return normalizeTitle(raw.split(',')[0]).split(' ').pop() ?? '';
  const tokens = normalizeTitle(raw).split(' ').filter((t) => t && !SUFFIXES.has(t));
  return tokens.pop() ?? '';
}

/** "Doe, Jane" -> "Jane Doe"; other forms are returned trimmed. */
export function displayName(name: string): string {
  const raw = String(name ?? '').replace(/\s+/g, ' ').trim();
  const m = raw.match(/^([^,]+),\s*([^,]+)$/);
  return m ? `${m[2]} ${m[1]}` : raw;
}

/** A segment names a contributor when it contains one of their last names as a word. */
function matchesContributor(segment: string, contributors: string[]): boolean {
  const words = new Set(normalizeTitle(segment).split(' '));
  if (words.size === 0) return false;
  return contributors.some((c) => {
    const last = lastNameKey(c);
    return last.length > 1 && words.has(last);
  });
}

type AuthorStrip = { rest: string; status: 'stripped' | 'none' | 'unmatched' };

/** Removes one author segment (`by X`, ` - X`, `(X)` at the end, `X:` at the start). */
function stripAuthor(title: string, contributors: string[]): AuthorStrip {
  const patterns: Array<{ re: RegExp; restGroup: number; authorGroup: number; strongMarker: boolean }> = [
    { re: /^(.+?)\s+by\s+([^:()]+)$/i, restGroup: 1, authorGroup: 2, strongMarker: true },
    { re: /^(.+?)\s+[-–—]\s+([^:()]+)$/, restGroup: 1, authorGroup: 2, strongMarker: false },
    { re: /^(.+?)\s*\(([^()]+)\)$/, restGroup: 1, authorGroup: 2, strongMarker: false },
    { re: /^([^:]+):\s*(.+)$/, restGroup: 2, authorGroup: 1, strongMarker: false },
  ];
  for (const { re, restGroup, authorGroup, strongMarker } of patterns) {
    const m = title.match(re);
    if (!m) continue;
    const author = m[authorGroup].trim();
    const rest = m[restGroup].trim();
    if (rest && matchesContributor(author, contributors)) return { rest, status: 'stripped' };
    // "by X" is an author marker even when X isn't one of ours: don't guess, review it.
    if (strongMarker) return { rest: title, status: 'unmatched' };
  }
  return { rest: title, status: 'none' };
}

export function cleanTitle(input: CleanTitleInput): CleanTitleResult {
  const current = String(input.current ?? '').replace(/\s+/g, ' ').trim();
  const ingramTitle = input.ingramTitle?.replace(/\s+/g, ' ').trim() || null;
  const ingramSubtitle = input.ingramSubtitle?.replace(/\s+/g, ' ').trim() || null;
  const removed: CleanTitleResult['removed'] = [];
  let ambiguous = false;

  let base = current;
  if (!input.keepAuthor) {
    const strip = stripAuthor(base, input.contributors);
    if (strip.status === 'stripped') {
      base = strip.rest;
      removed.push('author');
    } else if (strip.status === 'unmatched') {
      ambiguous = true;
    }
  }

  if (!ingramSubtitle) {
    // Ambiguous: offer Ingram's title for review rather than our unchanged one.
    if (ambiguous) return { title: ingramTitle ?? base, subtitle: null, removed, confidence: 'ambiguous' };
    return { title: base, subtitle: null, removed, confidence: 'exact' };
  }

  // Ingram has a subtitle: prefer Ingram's title + subtitle, but only when our title is
  // recognisably the same work (Ingram title alone, or Ingram title + its subtitle).
  const proposedTitle = ingramTitle ?? base;
  const nBase = normalizeTitle(base);
  const nTitle = normalizeTitle(proposedTitle);
  const nSub = normalizeTitle(ingramSubtitle);
  if (nBase === nTitle) {
    return { title: proposedTitle, subtitle: ingramSubtitle, removed, confidence: ambiguous ? 'ambiguous' : 'exact' };
  }
  if (nBase === `${nTitle} ${nSub}`) {
    removed.push('subtitle');
    return { title: proposedTitle, subtitle: ingramSubtitle, removed, confidence: ambiguous ? 'ambiguous' : 'exact' };
  }
  return { title: proposedTitle, subtitle: ingramSubtitle, removed, confidence: 'ambiguous' };
}

/** Sorted last names: two books with the same key have the same author(s). */
export function authorKey(names: string[]): string {
  return [...new Set(names.map(lastNameKey).filter(Boolean))].sort().join('|');
}

/**
 * Books whose cleaned base title is shared with a book by a DIFFERENT author keep their
 * author segment (e.g. two books called "Freedom"). Same title + same author is an
 * edition-consolidation case, not disambiguation. Run over the whole catalog first.
 */
export function findDisambiguationTitles<Id>(books: Array<{ id: Id; baseTitle: string; authorKey: string }>): Set<Id> {
  const groups = new Map<string, Array<{ id: Id; authorKey: string }>>();
  for (const book of books) {
    const key = normalizeTitle(book.baseTitle);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push({ id: book.id, authorKey: book.authorKey });
    groups.set(key, group);
  }
  const keep = new Set<Id>();
  for (const group of groups.values()) {
    const authors = new Set(group.map((b) => b.authorKey));
    if (authors.size > 1) for (const b of group) keep.add(b.id);
  }
  return keep;
}
