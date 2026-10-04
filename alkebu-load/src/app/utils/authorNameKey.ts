// One definition of "the same author name", shared by the author linker, the duplicate
// merge script and (mirrored) the storefront's author-page redirect. Pure.
//
// Same name  = same words after folding accents and case, dropping punctuation and
//              titles (Dr., PhD, ...), and undoing "Last, First" order. Jr./Sr. must
//              match: Martin Luther King Sr. is not Martin Luther King Jr.
// Compatible = same last name, compatible first/middle names where an initial matches
//              a full name ("Henry L." ~ "Henry Louis"), and no Jr/Sr conflict.

const TITLES = new Set(['dr', 'phd', 'md', 'prof', 'mrs', 'mr', 'ms', 'rev'])
const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv'])

function words(s: string): string[] {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

export interface NameParts {
  /** Given names then last name, in reading order, without titles or suffixes. */
  core: string[]
  suffixes: string[]
}

export function nameParts(name: string): NameParts {
  let raw = name.trim()
  const comma = raw.indexOf(',')
  if (comma !== -1) {
    const after = words(raw.slice(comma + 1)).filter((w) => !TITLES.has(w))
    // "Last, First" (but not "First Last, Jr.") -> "First Last"
    if (after.length > 0 && !after.every((w) => SUFFIXES.has(w))) {
      raw = `${raw.slice(comma + 1)} ${raw.slice(0, comma)}`
    }
  }
  const ws = words(raw).filter((w) => !TITLES.has(w))
  return { core: ws.filter((w) => !SUFFIXES.has(w)), suffixes: ws.filter((w) => SUFFIXES.has(w)).sort() }
}

/** Equal keys = the same name written differently. '' for a name with no words. */
export function authorKey(name: string): string {
  const { core, suffixes } = nameParts(name)
  if (core.length === 0) return ''
  return [...[...core].sort(), ...suffixes.map((s) => `~${s}`)].join(' ')
}

const tokenCompatible = (a: string, b: string) =>
  a === b || (a.length === 1 && b.startsWith(a)) || (b.length === 1 && a.startsWith(b))

/** Probably the same person; weaker than equal keys, so callers must handle ambiguity. */
export function namesCompatible(a: string, b: string): boolean {
  const pa = nameParts(a)
  const pb = nameParts(b)
  if (pa.core.length < 2 || pb.core.length < 2) return false
  if (pa.core.at(-1) !== pb.core.at(-1)) return false
  const sa = new Set(pa.suffixes)
  const sb = new Set(pb.suffixes)
  if ((sa.has('jr') && sb.has('sr')) || (sa.has('sr') && sb.has('jr'))) return false
  if (sa.size > 0 && sb.size > 0 && [...sa].some((s) => !sb.has(s))) return false
  const ga = pa.core.slice(0, -1)
  const gb = pb.core.slice(0, -1)
  if (!tokenCompatible(ga[0], gb[0])) return false
  for (let i = 1; i < Math.min(ga.length, gb.length); i += 1) {
    if (!tokenCompatible(ga[i], gb[i])) return false
  }
  return true
}
