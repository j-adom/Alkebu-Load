// Pure: Ingram records for one EAN -> the values we would store, in our units and shapes.
// Nothing here decides whether to write; that is diffEnrichment's job.
import type { DescriptionKind, DescriptionRecord } from './descriptionParser';
import type { IngramStock } from './parseStockResponse';
import { htmlToParagraphs, paragraphsToLexical } from './richText';
import { displayName } from './titleCleanup';
import type { TitlesBasicRecord, WeightUnit, DimensionUnit } from './titlesBasicParser';

export type Binding = 'hardcover' | 'paperback' | 'mass-market' | 'ebook' | 'audiobook';

export interface EnrichmentCandidate {
  ean: string;
  /** YYYY-MM-DD of the Ingram record, when the file carries one. */
  recordDate?: string;
  book: {
    title?: string;
    subtitle?: string;
    /** Display form ("Jane Doe"), Ingram order. */
    contributors?: string[];
    publisherText?: string;
    subjects?: Array<{ subject: string }>;
    synopsis?: string;
    description?: Record<string, unknown>;
  };
  edition: {
    /** Ounces (our shippingWeight unit). */
    'pricing.shippingWeight'?: number;
    /** "L x W x H in". */
    dimensions?: string;
    pages?: number;
    binding?: Binding;
    language?: string;
    /** ISO date (midnight UTC). */
    datePublished?: string;
    mediaMailEligible?: boolean;
    /** ISO date (midnight UTC). */
    ingramOnSaleDate?: string;
    /** Ingram US list price, cents (input to priceUplift; never written directly). */
    listPriceCents?: number;
  };
}

const OUNCES_PER: Record<WeightUnit, number> = { oz: 1, lb: 16, g: 1 / 28.349523125, kg: 35.27396195 };
const INCHES_PER: Record<DimensionUnit, number> = { in: 1, cm: 1 / 2.54, mm: 1 / 25.4 };

export function toOunces(value: number, unit: WeightUnit): number {
  return Math.round(value * OUNCES_PER[unit] * 10) / 10;
}

const trimNumber = (n: number) => String(Math.round(n * 100) / 100);

export function formatDimensions(d: NonNullable<TitlesBasicRecord['dimensions']>): string {
  const f = INCHES_PER[d.unit];
  return `${trimNumber(d.length * f)} x ${trimNumber(d.width * f)} x ${trimNumber(d.height * f)} in`;
}

/**
 * Ingram binding text -> our enum, or undefined (not proposed) when unrecognised.
 * OWNER: if the file uses binding codes rather than text, add them here from Reference_Files/.
 */
export function mapBinding(raw: string | null | undefined): Binding | undefined {
  const v = String(raw ?? '').toLowerCase();
  if (!v.trim()) return undefined;
  if (/mass\s*market/.test(v)) return 'mass-market';
  if (/audio|cd|mp3/.test(v)) return 'audiobook';
  if (/e-?book|epub|digital|kindle/.test(v)) return 'ebook';
  if (/hard|cloth|library binding|board/.test(v)) return 'hardcover';
  if (/paper|trade|soft|perfect/.test(v)) return 'paperback';
  return undefined;
}

const LANGUAGES: Record<string, string> = {
  eng: 'en', spa: 'es', fre: 'fr', fra: 'fr', por: 'pt', ger: 'de', deu: 'de', ita: 'it',
  swa: 'sw', ara: 'ar', yor: 'yo', amh: 'am', hat: 'ht', chi: 'zh', zho: 'zh', jpn: 'ja',
};

/** Ingram's 3-letter (MARC/ISO 639-2) codes -> the 2-letter codes our editions use. */
export function mapLanguage(raw: string | null | undefined): string | undefined {
  const v = String(raw ?? '').trim().toLowerCase();
  if (!v) return undefined;
  if (/^[a-z]{2}$/.test(v)) return v;
  if (LANGUAGES[v]) return LANGUAGES[v];
  if (v === 'english') return 'en';
  if (v === 'spanish') return 'es';
  return undefined;
}

const isoDate = (yyyyMmDd: string | undefined) => (yyyyMmDd ? `${yyyyMmDd}T00:00:00.000Z` : undefined);

/** YYYYMMDD -> YYYY-MM-DD; undefined for blanks, zeros and Ingram's '00010101' "no date". */
function yyyyMmDd(value: string | undefined): string | undefined {
  if (!value || !/^\d{8}$/.test(value) || value === '00010101' || /^0+$/.test(value)) return undefined;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

const BISAC_CODE = /^[A-Z]{3}\d{6}$/;

/**
 * BISAC values -> subject headings. Text headings pass through; bare codes need a code
 * table (OWNER: Reference_Files/) and are dropped when no heading is known, since a code
 * like HIS056000 is useless to shoppers and to auto-categorization.
 */
export function mapSubjects(values: string[], headings?: ReadonlyMap<string, string>): Array<{ subject: string }> {
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    const heading = BISAC_CODE.test(v.toUpperCase()) ? headings?.get(v.toUpperCase()) : v;
    if (heading && !out.some((s) => s.toLowerCase() === heading.toLowerCase())) out.push(heading);
  }
  return out.map((subject) => ({ subject }));
}

type Descriptions = Partial<Record<DescriptionKind, string>>;

function byKind(descriptions?: DescriptionRecord[] | Descriptions | null): Descriptions {
  if (!descriptions) return {};
  if (!Array.isArray(descriptions)) return descriptions;
  const out: Descriptions = {};
  for (const d of descriptions) out[d.kind] = d.html;
  return out;
}

export function mapIngramRecord(
  titles: TitlesBasicRecord | null | undefined,
  descriptions?: DescriptionRecord[] | Descriptions | null,
  stock?: Pick<IngramStock, 'ean' | 'mediaMail' | 'onSaleDate' | 'pubListPrice' | 'publicationDate' | 'weightLbs'> | null,
  opts: { bisacHeadings?: ReadonlyMap<string, string> } = {},
): EnrichmentCandidate {
  const descs = byKind(descriptions);
  const ean =
    titles?.ean ??
    stock?.ean ??
    (Array.isArray(descriptions) ? descriptions[0]?.ean : undefined) ??
    '';
  const candidate: EnrichmentCandidate = { ean, book: {}, edition: {} };

  if (titles) {
    if (titles.recordDate) candidate.recordDate = titles.recordDate;
    candidate.book.title = titles.title;
    if (titles.subtitle) candidate.book.subtitle = titles.subtitle;
    if (titles.contributors.length) candidate.book.contributors = titles.contributors.map(displayName);
    if (titles.publisher) candidate.book.publisherText = titles.publisher;
    const subjects = mapSubjects(titles.bisac, opts.bisacHeadings);
    if (subjects.length) candidate.book.subjects = subjects;

    if (titles.weight) candidate.edition['pricing.shippingWeight'] = toOunces(titles.weight.value, titles.weight.unit);
    if (titles.dimensions) candidate.edition.dimensions = formatDimensions(titles.dimensions);
    if (titles.pages) candidate.edition.pages = titles.pages;
    const binding = mapBinding(titles.binding);
    if (binding) candidate.edition.binding = binding;
    const language = mapLanguage(titles.language);
    if (language) candidate.edition.language = language;
    if (titles.pubDate) candidate.edition.datePublished = isoDate(titles.pubDate);
    if (titles.listPrice) {
      const cents = titles.listPrice.unit === 'cents' ? titles.listPrice.amount : titles.listPrice.amount * 100;
      candidate.edition.listPriceCents = Math.round(cents);
    }
  }

  // Long copy -> Lexical description; the shortest available copy -> plain synopsis.
  const longCopy = descs.marketing ?? descs.brief;
  if (longCopy) {
    const paragraphs = htmlToParagraphs(longCopy);
    if (paragraphs.length) candidate.book.description = paragraphsToLexical(paragraphs);
  }
  const shortCopy = descs.brief ?? descs.annotation ?? descs.marketing;
  if (shortCopy) {
    const text = htmlToParagraphs(shortCopy).join('\n\n');
    if (text) candidate.book.synopsis = text;
  }

  if (stock) {
    candidate.edition.mediaMailEligible = Boolean(stock.mediaMail);
    const onSale = yyyyMmDd(stock.onSaleDate);
    if (onSale) candidate.edition.ingramOnSaleDate = isoDate(onSale);
    // Titles Basic has no price, publication date or weight; the inventory file does.
    // A Titles value (other layouts) wins when both are present.
    const published = yyyyMmDd(stock.publicationDate);
    if (published && !candidate.edition.datePublished) candidate.edition.datePublished = isoDate(published);
    if (stock.pubListPrice && !candidate.edition.listPriceCents) {
      candidate.edition.listPriceCents = Math.round(stock.pubListPrice * 100);
    }
    if (stock.weightLbs && !candidate.edition['pricing.shippingWeight']) {
      candidate.edition['pricing.shippingWeight'] = toOunces(stock.weightLbs, 'lb');
    }
  }
  return candidate;
}
