/**
 * Pure mapper: Square catalog "item" payloads -> Books collection document shape.
 *
 * This module owns the mapping decisions that the original webhook handler
 * (src/app/api/webhooks/square-catalog/route.ts) got wrong nine different ways:
 * shape-only ISBN "validation" that let arbitrary 13-digit SKUs through,
 * dividing an already-in-cents price by 100, judging "completeness" across the
 * whole item instead of per variation, and writing a plain string into the
 * `editions[].publisher` relationship field.
 *
 * It never fabricates data: a missing ISBN stays missing, a missing price is
 * never coerced to zero, and an unvalidated SKU is never treated as an ISBN.
 * It never throws -- malformed input always resolves to `{ kind: 'incomplete' }`.
 */

export type ValidationIssue = {
  field: string;
  code: string;
  detail?: string;
  variationId?: string;
};

export type MappedComplete = { kind: 'complete'; data: Record<string, unknown> };

export type MappedIncomplete = {
  kind: 'incomplete';
  issues: ValidationIssue[];
  proposed: {
    proposedTitle?: string;
    proposedIsbn?: string;
    proposedPriceCents?: number;
  };
};

/**
 * Real ISBN checksum validation (not just digit-count shape matching).
 *
 * ISBN-13: mod-10 over all 13 digits with alternating weights 1, 3.
 * ISBN-10: mod-11 over all 10 digits with weights 10 down to 1; a trailing
 * 'X' (case-insensitive) counts as check-digit value 10.
 */
export function isValidIsbn(isbn: string): boolean {
  if (typeof isbn !== 'string') return false;
  const clean = isbn.replace(/[-\s]/g, '');

  if (/^\d{13}$/.test(clean)) {
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      const digit = clean.charCodeAt(i) - 48;
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    return sum % 10 === 0;
  }

  if (/^\d{9}[\dXx]$/.test(clean)) {
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const ch = clean[i];
      const value = ch === 'X' || ch === 'x' ? 10 : ch.charCodeAt(0) - 48;
      sum += value * (10 - i);
    }
    return sum % 11 === 0;
  }

  return false;
}

type SquareVariation = {
  id?: unknown;
  itemVariationData?: {
    sku?: unknown;
    upc?: unknown;
    gtin?: unknown;
    priceMoney?: { amount?: unknown };
  };
};

/**
 * The variation's ISBN: the first checksum-valid value among sku, upc and gtin. Staff
 * often leave Square's auto-generated store code (e.g. "H623082") in sku and scan the
 * book's ISBN into the barcode (upc/gtin) field, so sku alone is not enough.
 */
export function isbnFromVariationData(data: { sku?: unknown; upc?: unknown; gtin?: unknown }): {
  isbn?: string;
  candidates: string[];
} {
  const candidates = [data.sku, data.upc, data.gtin]
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    .map((v) => v.trim());
  return { isbn: candidates.find(isValidIsbn), candidates };
}

type UsableVariation = {
  variationId?: string;
  isbn: string;
  priceCents: number;
};

/**
 * A variation is usable only when it carries BOTH a price and an
 * ISBN-checksum-valid sku/upc. A price on one variation and an ISBN on a
 * *different* variation does not make either variation usable.
 */
function evaluateVariation(
  raw: unknown,
  index: number,
): { usable: UsableVariation | null; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  const variation = (raw ?? {}) as SquareVariation;
  const variationId = typeof variation.id === 'string' ? variation.id : undefined;
  const data = variation.itemVariationData ?? {};

  const { isbn, candidates } = isbnFromVariationData(data);

  const rawAmount = data.priceMoney?.amount;
  const hasAmount = typeof rawAmount === 'bigint' || typeof rawAmount === 'number';
  const priceCents = hasAmount ? Number(rawAmount) : undefined;

  if (!isbn) {
    issues.push({
      field: 'editions.isbn',
      code: candidates.length === 0 ? 'missing' : 'invalid-checksum',
      detail:
        candidates.length === 0
          ? undefined
          : `sku/upc/gtin ${candidates.map((c) => `"${c}"`).join(', ')}: none is a valid ISBN`,
      variationId: variationId ?? `index-${index}`,
    });
  }

  if (priceCents === undefined) {
    issues.push({
      field: 'editions.pricing.retailPrice',
      code: 'missing',
      variationId: variationId ?? `index-${index}`,
    });
  }

  if (!isbn || priceCents === undefined) {
    return { usable: null, issues };
  }

  return {
    usable: { variationId, isbn, priceCents },
    issues: [],
  };
}

export function mapSquareItemToBook(item: unknown, now: Date = new Date()): MappedComplete | MappedIncomplete {
  const issues: ValidationIssue[] = [];

  if (item === null || typeof item !== 'object') {
    return {
      kind: 'incomplete',
      issues: [{ field: 'item', code: 'invalid-input', detail: 'item is not an object' }],
      proposed: {},
    };
  }

  const rec = item as Record<string, unknown>;
  const squareItemId = typeof rec.id === 'string' ? rec.id : undefined;
  const itemData = (rec.itemData ?? {}) as Record<string, unknown>;

  const rawName = itemData.name;
  const hasUsableTitle = typeof rawName === 'string' && rawName.trim().length > 0;
  const title = hasUsableTitle ? (rawName as string) : undefined;

  if (!hasUsableTitle) {
    // Item-level requirement (Books.title is required), not per-variation.
    issues.push({ field: 'title', code: 'missing' });
  }

  const rawVariations = itemData.variations;
  const variationsArray = Array.isArray(rawVariations) ? rawVariations : [];

  if (!Array.isArray(rawVariations) || variationsArray.length === 0) {
    issues.push({ field: 'editions', code: 'missing', detail: 'item has no variations' });
  }

  const usable: UsableVariation[] = [];
  for (let i = 0; i < variationsArray.length; i++) {
    const { usable: u, issues: variationIssues } = evaluateVariation(variationsArray[i], i);
    issues.push(...variationIssues);
    if (u) usable.push(u);
  }

  const isComplete = variationsArray.length > 0 && issues.length === 0;

  if (!isComplete) {
    // Best-effort, never-fabricated proposals for staging/review UIs.
    const proposedTitle = title;
    const firstIsbn = usable[0]?.isbn ?? variationsArray
      .map((v) => {
        const d = ((v ?? {}) as SquareVariation).itemVariationData ?? {};
        return isbnFromVariationData(d).isbn;
      })
      .find((v): v is string => v !== undefined);

    const firstPrice = usable[0]?.priceCents ?? variationsArray
      .map((v) => {
        const d = ((v ?? {}) as SquareVariation).itemVariationData ?? {};
        const amount = d.priceMoney?.amount;
        return typeof amount === 'bigint' || typeof amount === 'number' ? Number(amount) : undefined;
      })
      .find((v): v is number => v !== undefined);

    return {
      kind: 'incomplete',
      issues,
      proposed: {
        proposedTitle,
        proposedIsbn: firstIsbn,
        proposedPriceCents: firstPrice,
      },
    };
  }

  // Square's catalog item payload does not have a standard publisher field;
  // if a caller passes one through (e.g. a future enrichment step upstream
  // of this pure mapper), forward it as text only -- never into the
  // `publisher` relationship, which requires a real Publishers doc ID.
  const publisherName = typeof itemData.publisherName === 'string' ? itemData.publisherName : undefined;

  const editions = usable.map((v) => ({
    isbn: v.isbn,
    squareVariationId: v.variationId,
    pricing: { retailPrice: v.priceCents },
    isAvailable: true,
    ...(publisherName ? { publisherText: publisherName } : {}),
  }));

  const bookLevelPrice = Math.min(...usable.map((v) => v.priceCents));

  const data: Record<string, unknown> = {
    title,
    editions,
    pricing: { retailPrice: bookLevelPrice },
    squareItemId,
  };

  // Set last so nothing above can overwrite these.
  data.importSource = 'square-webhook';
  data.lastSyncedAt = now.toISOString();

  return { kind: 'complete', data };
}

// Square reporting category "Books" (4,604 items as of 2026-10-03). Override with
// SQUARE_BOOKS_CATEGORY_ID if the category is ever recreated.
export const DEFAULT_BOOKS_CATEGORY_ID = 'T2B3ROTJ3HFGVBO22QLOOJDE';

/**
 * True when the item is filed under a Square reporting category other than Books
 * (Incense & Oils, Fashion, Nutrition, ...). Those never belong in the Books sync.
 * Items with no reporting category still go through: some books were never filed.
 */
export function isNonBookCategory(
  item: unknown,
  booksCategoryId: string = process.env.SQUARE_BOOKS_CATEGORY_ID || DEFAULT_BOOKS_CATEGORY_ID,
): boolean {
  const data = ((item ?? {}) as { itemData?: { reportingCategory?: { id?: unknown } } }).itemData;
  const id = data?.reportingCategory?.id;
  return typeof id === 'string' && id !== '' && id !== booksCategoryId;
}

/** Staging rows need at least one issue entry; a complete item records this one. */
export const RESOLVED_SENTINEL_ISSUE: ValidationIssue = {
  field: '-',
  code: 'resolved',
  detail: 'Square now supplies all required data',
};
