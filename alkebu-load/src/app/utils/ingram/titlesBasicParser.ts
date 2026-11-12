// Pure parser for Ingram's Titles Basic bibliographic file (TitlesBasic/ttlingbasic_pipe.zip,
// pipe-delimited, one title per line).
//
// Column order from Ingram's Titles Basic Implementation Guide (v2 r6, "Titles Basic File
// Format"): 25 pipe-delimited fields, no text qualifier, CRLF records. The file carries no
// price, publication date, pages, dimensions, weight or language; price, publication date
// and weight come from the inventory (Catalog Stock) file instead (see mapEnrichment).
//
// The parser stays layout-driven: `skip:<vendor column name>` marks columns we ignore, and
// keys marked "repeatable" may appear several times; their values are collected in order.

export type TitlesBasicField =
  | 'ean'
  | 'title'
  | 'subtitle'
  /** repeatable; one name per column, or several joined by `multiValueSeparator` */
  | 'contributor'
  | 'publisher'
  | 'pubDate'
  | 'binding'
  | 'pages'
  | 'language'
  /** repeatable; BISAC subject code or heading */
  | 'bisac'
  | 'length'
  | 'width'
  | 'height'
  | 'weight'
  | 'listPrice'
  /** the date Ingram last changed this record, if the file carries one */
  | 'recordDate';

export type TitlesBasicColumn = TitlesBasicField | `skip:${string}`;

export type WeightUnit = 'lb' | 'oz' | 'g' | 'kg';
export type DimensionUnit = 'in' | 'cm' | 'mm';

export interface TitlesBasicLayout {
  /** True until the owner has transcribed the real layout. Live runs refuse a placeholder. */
  placeholder: boolean;
  columns: readonly TitlesBasicColumn[];
  delimiter: string;
  /** Quote character around fields that contain the delimiter ('' doubled inside), or null. */
  quote: string | null;
  /** Escape character before a literal delimiter (e.g. `\|`), or null. */
  escape: string | null;
  /** Separator inside one repeatable column holding several values; '' for none. */
  multiValueSeparator: string;
  /** The title column holds "Title: Subtitle [With Accessory]" (no subtitle column). */
  titleIncludesSubtitle?: boolean;
  /**
   * The one column whose text may contain the unquoted delimiter (`index`). Extra fields on
   * a line are either its pipes or a trailing delimiter; the reading whose `anchor` column
   * matches `pattern` wins, and a line with no matching reading is malformed.
   */
  delimiterInColumn?: { index: number; anchor: number; pattern: RegExp };
  weightUnit: WeightUnit;
  dimensionUnit: DimensionUnit;
  priceUnit: 'dollars' | 'cents';
}

export const TITLES_BASIC_COLUMNS: readonly TitlesBasicColumn[] = [
  'ean', // 1
  'title', // 2 "Title, derived": includes the subtitle and any accessory
  'skip:Edition Number',
  'skip:Edition Description',
  'skip:Abridged Edition Flag',
  'skip:Large Print Flag',
  'skip:Contributor ID',
  'contributor', // 8
  'skip:Contributor Role Code',
  'skip:Contributor Role Description',
  'skip:Product Type',
  'skip:Product Type Description',
  'skip:BISAC Binding Type Code',
  'binding', // 14 BISAC Binding Type Description, e.g. "Hardcover"
  'skip:BISAC Subject Code',
  'bisac', // 16 BISAC Subject Heading Description
  'skip:Weekly Add/Change Flag',
  'skip:Publisher Alpha Code',
  'publisher', // 19 Publisher Imprint
  'skip:Spring Arbor Division Flag',
  'skip:Number of Units',
  'skip:Accessory Code',
  'skip:Accessory Code Description',
  'skip:Ingram Subject Code',
  'skip:Ingram Subject Description',
];

export const TITLES_BASIC_LAYOUT: TitlesBasicLayout = {
  placeholder: false,
  columns: TITLES_BASIC_COLUMNS,
  delimiter: '|',
  quote: null,
  escape: null,
  // One contributor and one BISAC subject per record: nothing to split.
  multiValueSeparator: '',
  titleIncludesSubtitle: true,
  // Ingram's heading example is "Fiction | Mystery & Detective - Women Sleuths": a pipe in an
  // unqualified pipe-delimited file. Field 22 (Accessory Code) is always three digits.
  delimiterInColumn: { index: 15, anchor: 21, pattern: /^\d{3}$/ },
  // Unused by this layout (no weight, dimension or price columns); Ingram's convention.
  weightUnit: 'lb',
  dimensionUnit: 'in',
  priceUnit: 'dollars',
};

export interface TitlesBasicRecord {
  ean: string;
  title: string;
  subtitle?: string;
  contributors: string[];
  publisher?: string;
  /** YYYY-MM-DD */
  pubDate?: string;
  /** Ingram's binding text or code, unmapped (mapEnrichment maps it to our enum). */
  binding?: string;
  pages?: number;
  language?: string;
  bisac: string[];
  dimensions?: { length: number; width: number; height: number; unit: DimensionUnit };
  weight?: { value: number; unit: WeightUnit };
  listPrice?: { amount: number; unit: 'dollars' | 'cents' };
  /** YYYY-MM-DD */
  recordDate?: string;
}

export interface ParseErrors {
  /** Lines rejected as malformed (wrong field count, bad EAN, no title). */
  malformed: number;
}

export const emptyParseErrors = (): ParseErrors => ({ malformed: 0 });

/** Splits one delimited line, honoring the layout's quote and escape rules. */
export function splitDelimited(line: string, layout: Pick<TitlesBasicLayout, 'delimiter' | 'quote' | 'escape'>): string[] {
  const { delimiter, quote, escape } = layout;
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  let atFieldStart = true;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === quote && line[i + 1] === quote) {
        field += quote;
        i += 1;
      } else if (ch === quote) {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (escape && ch === escape && i + 1 < line.length) {
      field += line[i + 1];
      i += 1;
      atFieldStart = false;
      continue;
    }
    if (quote && ch === quote && atFieldStart) {
      quoted = true;
      atFieldStart = false;
      continue;
    }
    if (ch === delimiter) {
      fields.push(field);
      field = '';
      atFieldStart = true;
      continue;
    }
    field += ch;
    atFieldStart = false;
  }
  fields.push(field);
  return fields;
}

/** YYYY-MM-DD from YYYYMMDD, YYYY-MM-DD(...) or M/D/YYYY; undefined when blank or unreadable. */
export function normalizeDate(value: string | undefined): string | undefined {
  const v = (value ?? '').trim();
  if (!v || /^0+$/.test(v)) return undefined;
  let m = v.match(/^(\d{4})(\d{2})(\d{2})$/) ?? v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return valid(m[1], m[2], m[3]);
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return valid(m[3], m[1].padStart(2, '0'), m[2].padStart(2, '0'));
  return undefined;
}

function valid(y: string, mo: string, d: string): string | undefined {
  const iso = `${y}-${mo}-${d}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso || Number(y) < 1000) return undefined;
  return iso;
}

const positiveNumber = (value: string | undefined): number | undefined => {
  const n = Number((value ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const text = (value: string | undefined): string | undefined => {
  const v = (value ?? '').replace(/\s+/g, ' ').trim();
  return v === '' ? undefined : v;
};

/**
 * Ingram's derived title -> title and subtitle: "Coral Reef Hideaway: The Story of a Clown
 * Anemone Fish [With Plush Fish]" -> { title: "Coral Reef Hideaway", subtitle: "The Story of
 * a Clown Anemone Fish" }. The accessory note is dropped; the split is at the first ": ".
 */
export function splitDerivedTitle(derived: string): { title: string; subtitle?: string } {
  const base = derived.replace(/\s*\[with\b[^\]]*\]\s*$/i, '').trim() || derived.trim();
  const colon = base.indexOf(': ');
  if (colon <= 0) return { title: base };
  const title = base.slice(0, colon).trim();
  const subtitle = base.slice(colon + 2).trim();
  return subtitle ? { title, subtitle } : { title };
}

/** Cheap EAN extractor for the stream filter: never splits the whole line. */
export function titlesBasicEan(line: string, layout: TitlesBasicLayout = TITLES_BASIC_LAYOUT): string | null {
  const index = layout.columns.indexOf('ean');
  if (index < 0) return null;
  const hasEscapes =
    (layout.quote !== null && line.includes(layout.quote)) || (layout.escape !== null && line.includes(layout.escape));
  if (index > 0 && hasEscapes) {
    // A quoted or escaped delimiter before the EAN column would shift a naive scan.
    const raw = (splitDelimited(line, layout)[index] ?? '').trim();
    return /^\d{13}$/.test(raw) ? raw : null;
  }
  let start = 0;
  for (let i = 0; i < index; i += 1) {
    const next = line.indexOf(layout.delimiter, start);
    if (next < 0) return null;
    start = next + 1;
  }
  const end = line.indexOf(layout.delimiter, start);
  const raw = (end < 0 ? line.slice(start) : line.slice(start, end)).replace(/"/g, '').trim();
  return /^\d{13}$/.test(raw) ? raw : null;
}

/**
 * Drops trailing empty fields (a trailing delimiter) and, for a layout with a
 * `delimiterInColumn`, folds extra fields back into that column. Null when no reading
 * satisfies the layout's anchor.
 */
function alignFields(fields: string[], layout: TitlesBasicLayout): string[] | null {
  const width = layout.columns.length;
  const fold = layout.delimiterInColumn;
  if (!fold) {
    const out = [...fields];
    while (out.length > width && out[out.length - 1].trim() === '') out.pop();
    return out;
  }
  // Try dropping 0, 1, 2... trailing empties, folding the rest into the pipe-bearing column.
  for (let drop = 0; fields.length - drop >= width; drop += 1) {
    if (drop > 0 && fields[fields.length - drop].trim() !== '') break;
    const out = fields.slice(0, fields.length - drop);
    const extra = out.length - width;
    if (extra > 0) out.splice(fold.index, extra + 1, out.slice(fold.index, fold.index + extra + 1).join(layout.delimiter));
    if (fold.pattern.test((out[fold.anchor] ?? '').trim())) return out;
  }
  return fields.length < width ? fields : null;
}

/**
 * One Titles Basic line -> a typed record, or null (counted in `errors.malformed`) when the
 * field count differs from the layout, the EAN isn't 13 digits, or the title is blank.
 * A header line is malformed by this rule; the stream filter drops it before parsing.
 */
export function parseTitlesBasicLine(
  line: string,
  layout: TitlesBasicLayout = TITLES_BASIC_LAYOUT,
  errors: ParseErrors = emptyParseErrors(),
): TitlesBasicRecord | null {
  const fields = alignFields(splitDelimited(line, layout), layout);
  if (!fields) {
    errors.malformed += 1;
    return null;
  }
  if (fields.length !== layout.columns.length) {
    errors.malformed += 1;
    return null;
  }

  const single = new Map<TitlesBasicField, string>();
  const contributors: string[] = [];
  const bisac: string[] = [];
  const splitMulti = (v: string) =>
    (layout.multiValueSeparator ? v.split(layout.multiValueSeparator) : [v])
      .map((s) => text(s))
      .filter((s): s is string => Boolean(s));

  layout.columns.forEach((column, i) => {
    if (column.startsWith('skip:')) return;
    const value = fields[i];
    if (column === 'contributor') contributors.push(...splitMulti(value));
    else if (column === 'bisac') bisac.push(...splitMulti(value));
    else single.set(column as TitlesBasicField, value);
  });

  const ean = (single.get('ean') ?? '').trim();
  const title = text(single.get('title'));
  if (!/^\d{13}$/.test(ean) || !title) {
    errors.malformed += 1;
    return null;
  }

  const split = layout.titleIncludesSubtitle ? splitDerivedTitle(title) : { title };
  const record: TitlesBasicRecord = { ean, title: split.title, contributors, bisac };
  const subtitle = text(single.get('subtitle')) ?? split.subtitle;
  if (subtitle) record.subtitle = subtitle;
  const publisher = text(single.get('publisher'));
  if (publisher) record.publisher = publisher;
  const pubDate = normalizeDate(single.get('pubDate'));
  if (pubDate) record.pubDate = pubDate;
  const binding = text(single.get('binding'));
  if (binding) record.binding = binding;
  const pages = positiveNumber(single.get('pages'));
  if (pages) record.pages = Math.round(pages);
  const language = text(single.get('language'));
  if (language) record.language = language;
  const [length, width, height] = (['length', 'width', 'height'] as const).map((k) => positiveNumber(single.get(k)));
  if (length && width && height) record.dimensions = { length, width, height, unit: layout.dimensionUnit };
  const weight = positiveNumber(single.get('weight'));
  if (weight) record.weight = { value: weight, unit: layout.weightUnit };
  const listPrice = positiveNumber(single.get('listPrice'));
  if (listPrice) record.listPrice = { amount: listPrice, unit: layout.priceUnit };
  const recordDate = normalizeDate(single.get('recordDate'));
  if (recordDate) record.recordDate = recordDate;
  return record;
}
