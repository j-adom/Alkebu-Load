// The Book fields Ingram enrichment can write, and the provenance keys they're tracked
// under. Shared by the manual-edit hook (Books beforeChange), the diff, the apply step and
// the termination purge, so all four agree on what a "field" is.
//
// Edition fields are keyed by the edition's EAN, not its array index, so reordering or
// adding editions never moves provenance onto the wrong edition:
//   title                                   (book-level)
//   editions.9780000000002.pricing.shippingWeight (edition-level)
import { toEan13 } from './ean';

export const BOOK_FIELDS = [
  'title',
  'subtitle',
  'publisherText',
  'subjects',
  'synopsis',
  'description',
  'excerpt',
  'authorsText',
] as const;
export type BookField = (typeof BOOK_FIELDS)[number];

export const EDITION_FIELDS = [
  'pricing.shippingWeight',
  'dimensions',
  'pages',
  'binding',
  'language',
  'datePublished',
  'pricing.retailPrice',
  'pricing.wholesalePrice',
  'mediaMailEligible',
  'ingramOnSaleDate',
] as const;
export type EditionField = (typeof EDITION_FIELDS)[number];

export type EnrichmentField = BookField | EditionField;

/** System fields: written only by the job, read-only in the admin, never stamped manual. */
export const SYSTEM_EDITION_FIELDS: ReadonlySet<EditionField> = new Set(['mediaMailEligible', 'ingramOnSaleDate']);

export type FieldSource = 'manual' | 'ingram';
export interface FieldSourceEntry {
  source: FieldSource;
  at: string;
}
export type FieldSources = Record<string, FieldSourceEntry>;

export function sourceKey(path: string, editionEan?: string | null): string {
  return editionEan ? `editions.${editionEan}.${path}` : path;
}

/** Parses a provenance key back into its path and edition EAN. */
export function parseSourceKey(key: string): { path: string; editionEan?: string } {
  const m = key.match(/^editions\.(\d{13})\.(.+)$/);
  return m ? { path: m[2], editionEan: m[1] } : { path: key };
}

export function editionEanOf(edition: { isbn?: unknown; isbn10?: unknown } | null | undefined): string | null {
  return toEan13(edition?.isbn as string) ?? toEan13(edition?.isbn10 as string);
}

export function getPath(obj: unknown, path: string): unknown {
  let cur: any = obj;
  for (const part of path.split('.')) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[part];
  }
  return cur;
}

/** Returns a copy of `obj` with `path` set (intermediate groups copied, never mutated). */
export function setPath<T extends Record<string, any>>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.');
  const copy: Record<string, any> = { ...(obj ?? {}) };
  copy[head] = rest.length === 0 ? value : setPath(copy[head] ?? {}, rest.join('.'), value);
  return copy as T;
}

function lexicalText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as Record<string, unknown>;
  if (typeof n.text === 'string') return n.text;
  if (n.root) return lexicalText(n.root);
  if (Array.isArray(n.children)) return n.children.map(lexicalText).filter(Boolean).join(' ');
  return '';
}

/**
 * A comparable form of a field value: whitespace- and case-insensitive text, rounded
 * numbers, date-only dates, sorted lists, and Lexical reduced to its text. Two values
 * with the same comparable form are "the same" for diffing and change detection.
 */
export function comparable(field: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const textOf = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  switch (field) {
    case 'description': {
      const t = textOf(typeof value === 'string' ? value : lexicalText(value));
      return t || null;
    }
    case 'subjects':
    case 'authorsText': {
      if (!Array.isArray(value)) return null;
      const items = value
        .map((v: any) => (typeof v === 'string' ? v : (v?.subject ?? v?.name ?? '')))
        .map((v: string) => textOf(String(v)))
        .filter(Boolean)
        .sort();
      return items.length ? items.join('|') : null;
    }
    case 'datePublished':
    case 'ingramOnSaleDate': {
      const s = String(value).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    }
    case 'pages':
    case 'pricing.retailPrice':
    case 'pricing.wholesalePrice': {
      const n = Number(value);
      return Number.isFinite(n) && n !== 0 ? String(Math.round(n)) : null;
    }
    case 'pricing.shippingWeight': {
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? n.toFixed(1) : null;
    }
    case 'mediaMailEligible':
      return typeof value === 'boolean' ? String(value) : null;
    default: {
      const t = textOf(String(value));
      return t || null;
    }
  }
}

export const isEmptyValue = (field: string, value: unknown): boolean => comparable(field, value) === null;
