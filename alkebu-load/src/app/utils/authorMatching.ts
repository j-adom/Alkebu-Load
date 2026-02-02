/**
 * Smart author matching utility
 * Uses parse-full-name to normalize and match author names
 * Handles variations like:
 * - "Dr. Martin Luther King Jr." vs "Martin Luther King"
 * - "Maya Angelou" vs "Dr. Maya Angelou"
 * - Different capitalization and spacing
 */

import parseFullName from 'parse-full-name';

export interface ParsedName {
  first: string;
  middle: string;
  last: string;
  title: string;
  suffix: string;
  nick: string;
  normalized: string; // Full name without title/suffix
  sortKey: string; // For matching: "last first middle" lowercase
}

/**
 * Parse and normalize an author name
 */
export function parseAuthorName(fullName: string): ParsedName {
  const parsed = parseFullName.parseFullName(fullName);

  // Build normalized name (first middle last, no title/suffix)
  const nameParts = [
    parsed.first,
    parsed.middle,
    parsed.last
  ].filter(Boolean);

  const normalized = nameParts.join(' ').trim();

  // Create sort key for matching (last, first middle)
  const sortKeyParts = [
    parsed.last,
    parsed.first,
    parsed.middle
  ].filter(Boolean);

  const sortKey = sortKeyParts
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '') // Remove non-letters
    .replace(/\s+/g, ' ')     // Normalize spaces
    .trim();

  return {
    first: parsed.first || '',
    middle: parsed.middle || '',
    last: parsed.last || '',
    title: parsed.title || '',
    suffix: parsed.suffix || '',
    nick: parsed.nick || '',
    normalized,
    sortKey
  };
}

/**
 * Check if two author names match (fuzzy matching)
 * Returns true if they represent the same person
 */
export function namesMatch(name1: string, name2: string): boolean {
  const parsed1 = parseAuthorName(name1);
  const parsed2 = parseAuthorName(name2);

  // Exact match on sort key (ignores titles, suffixes, capitalization)
  if (parsed1.sortKey === parsed2.sortKey) {
    return true;
  }

  // Check if one is a subset of the other (handles middle name variations)
  // e.g., "Martin Luther King" matches "Martin L. King"
  const key1Words = parsed1.sortKey.split(' ').filter(w => w.length > 1);
  const key2Words = parsed2.sortKey.split(' ').filter(w => w.length > 1);

  if (key1Words.length === 0 || key2Words.length === 0) {
    return false;
  }

  // Must have matching first and last names
  const firstMatch = key1Words[0] === key2Words[0]; // Last name
  const lastMatch = key1Words[key1Words.length - 1] === key2Words[key2Words.length - 1] ||
                    key1Words[1] === key2Words[1]; // First name

  if (!firstMatch || !lastMatch) {
    return false;
  }

  // If they have the same first and last, consider it a match
  // (handles middle name/initial differences)
  return true;
}

/**
 * Get the most complete version of a name
 * Prefers versions with titles and suffixes
 */
export function getMostCompleteName(name1: string, name2: string): string {
  const parsed1 = parseAuthorName(name1);
  const parsed2 = parseAuthorName(name2);

  // Score based on completeness
  const score1 =
    (parsed1.title ? 1 : 0) +
    (parsed1.first ? 1 : 0) +
    (parsed1.middle ? 1 : 0) +
    (parsed1.last ? 1 : 0) +
    (parsed1.suffix ? 1 : 0);

  const score2 =
    (parsed2.title ? 1 : 0) +
    (parsed2.first ? 1 : 0) +
    (parsed2.middle ? 1 : 0) +
    (parsed2.last ? 1 : 0) +
    (parsed2.suffix ? 1 : 0);

  // Return the more complete version
  return score1 >= score2 ? name1 : name2;
}

/**
 * Find matching author in existing authors list
 * Returns the matching author or null
 */
export function findMatchingAuthor(
  newName: string,
  existingAuthors: Array<{ id: number | string; name: string }>
): { id: number | string; name: string } | null {
  for (const existing of existingAuthors) {
    if (namesMatch(newName, existing.name)) {
      return existing;
    }
  }
  return null;
}

/**
 * Smart author finder with fuzzy matching
 * For use with Payload API
 */
export async function findOrCreateAuthor(
  payload: any,
  authorName: string
): Promise<{ id: number; name: string; wasCreated: boolean }> {
  const trimmedName = authorName.trim();
  if (!trimmedName) {
    throw new Error('Author name cannot be empty');
  }

  // Get all authors (we'll do fuzzy matching in-memory)
  // This is efficient enough for a few thousand authors
  const allAuthors = await payload.find({
    collection: 'authors',
    limit: 10000,
    pagination: false
  });

  // Try to find a matching author
  const match = findMatchingAuthor(trimmedName, allAuthors.docs);

  if (match) {
    // Found a match - check if we should update to a more complete name
    const betterName = getMostCompleteName(trimmedName, match.name);

    if (betterName !== match.name) {
      // Update to the more complete version
      await payload.update({
        collection: 'authors',
        id: match.id,
        data: {
          name: betterName
        }
      });

      console.log(`  🔄 Updated author name: "${match.name}" → "${betterName}"`);

      return {
        id: match.id as number,
        name: betterName,
        wasCreated: false
      };
    }

    return {
      id: match.id as number,
      name: match.name,
      wasCreated: false
    };
  }

  // No match found - create new author
  const newAuthor = await payload.create({
    collection: 'authors',
    data: {
      name: trimmedName,
      isActive: true,
      featured: false
    }
  });

  return {
    id: newAuthor.id as number,
    name: trimmedName,
    wasCreated: true
  };
}
