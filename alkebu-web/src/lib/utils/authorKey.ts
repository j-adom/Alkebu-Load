// Mirrors alkebu-load/src/app/utils/authorNameKey.ts (authorKey): two spellings of the
// same author name get the same key. Used to redirect author-page URLs whose spelling
// was merged away ("dr-jawanza-kunjufu-phd" -> "jawanza-kunjufu").

const TITLES = new Set(['dr', 'phd', 'md', 'prof', 'mrs', 'mr', 'ms', 'rev']);
const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv']);

function words(s: string): string[] {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function authorKey(name: string): string {
  // Word order doesn't matter to the key, so "Last, First" needs no special casing.
  const ws = words(name).filter((w) => !TITLES.has(w));
  const core = ws.filter((w) => !SUFFIXES.has(w)).sort();
  if (core.length === 0) return '';
  return [...core, ...ws.filter((w) => SUFFIXES.has(w)).sort().map((s) => `~${s}`)].join(' ');
}

/** The most distinctive word to search book author names by (the surname, usually). */
export function authorSearchWord(slug: string): string | null {
  const ws = words(slug).filter((w) => !TITLES.has(w) && !SUFFIXES.has(w));
  return ws.length ? ws.reduce((a, b) => (b.length >= a.length ? b : a)) : null;
}

/** A name among candidates that is the same author as the slug, under a different slug. */
export function findRenamedAuthor(
  slug: string,
  candidateNames: string[],
  toSlug: (name: string) => string,
): string | null {
  const key = authorKey(slug);
  if (!key) return null;
  return candidateNames.find((name) => authorKey(name) === key && toSlug(name) !== slug) ?? null;
}
