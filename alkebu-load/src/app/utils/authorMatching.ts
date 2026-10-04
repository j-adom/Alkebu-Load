/**
 * Author linking: find the existing author for a name, or create one.
 *
 * Rules (see authorNameKey.ts for what "same" and "compatible" mean):
 *   1. Same name, written differently ("Gates, Henry Louis Jr." ~ "Henry Louis Gates, Jr.")
 *      -> that author (the oldest record if duplicates already exist).
 *   2. Otherwise exactly ONE compatible person ("Henry L. Gates" ~ "Henry Louis Gates")
 *      -> that author (the oldest record if that person already has duplicates). Two
 *      compatible people (Angela Y. Davis and Angela J. Davis for "Angela Davis") is
 *      ambiguous: create rather than guess.
 *   3. Otherwise create.
 *
 * Existing authors are never renamed here. The old "upgrade to the more complete name"
 * step renamed authors to title-laden forms ("Dr. Jawanza Kunjufu PhD") and, because
 * author names are unique, failed outright when the new name already existed elsewhere
 * (Henry L. Gates -> Henry Louis Gates, Jr., 2026-10-04). Name cleanup belongs to the
 * reviewed merge script (scripts/author-merge.ts).
 */

import { authorKey, namesCompatible } from './authorNameKey';

export interface AuthorRef {
  id: number | string;
  name: string;
}

/** Pure: the author a name should link to, or null to create a new one. */
export function chooseAuthorMatch(newName: string, existing: AuthorRef[]): AuthorRef | null {
  const key = authorKey(newName);
  if (!key) return null;

  const byId = (a: AuthorRef, b: AuthorRef) => Number(a.id) - Number(b.id);
  const sameName = existing.filter((a) => authorKey(a.name) === key).sort(byId);
  if (sameName.length > 0) return sameName[0];

  // Several compatible records that are all the same name (existing duplicates) still
  // count as one person; two different names is genuinely ambiguous.
  const compatible = existing.filter((a) => namesCompatible(newName, a.name)).sort(byId);
  const people = new Set(compatible.map((a) => authorKey(a.name)));
  return people.size === 1 ? compatible[0] : null;
}

export async function findOrCreateAuthor(
  payload: any,
  authorName: string,
): Promise<{ id: number; name: string; wasCreated: boolean }> {
  const trimmedName = authorName.trim();
  if (!trimmedName) {
    throw new Error('Author name cannot be empty');
  }

  // In-memory matching over all authors: a few thousand rows, fine per book link.
  const allAuthors = await payload.find({
    collection: 'authors',
    limit: 10000,
    pagination: false,
    depth: 0,
  });

  const match = chooseAuthorMatch(trimmedName, allAuthors.docs);
  if (match) {
    return { id: match.id as number, name: match.name, wasCreated: false };
  }

  try {
    const newAuthor = await payload.create({
      collection: 'authors',
      data: { name: trimmedName, isActive: true, featured: false },
    });
    return { id: newAuthor.id as number, name: trimmedName, wasCreated: true };
  } catch (error) {
    // Author names are unique: a concurrent link may have just created this exact name.
    const existing = await payload.find({
      collection: 'authors',
      where: { name: { equals: trimmedName } },
      limit: 1,
      depth: 0,
    });
    if (existing.docs[0]) {
      return { id: existing.docs[0].id as number, name: existing.docs[0].name, wasCreated: false };
    }
    throw error;
  }
}
