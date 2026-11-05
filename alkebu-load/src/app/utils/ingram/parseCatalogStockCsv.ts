// Parser for Ingram's trimmed Catalog Stock CSV (Inventory/Catalog_Stock/cat_ing_stock.zip,
// ~195 MB zipped vs the multi-GB StockV2 file). Columns are located by header name, so
// a reordered file still parses and a file missing a needed column fails loudly.
import type { FeedFormat } from './catalogStockSnapshot';
import type { DcStock, IngramStock } from './parseStockResponse';

const REQUIRED = ['EAN', 'Product Availability Code', 'On Sale Date'] as const;

// "<DC> On Hand" / "<DC> On Order" column prefixes -> the DC keys IngramStock uses
// (LaVergne is the primary DC in ingramOnHand). Future DC columns are ignored.
const DCS: Record<string, string> = {
  'LaVergne TN': 'LaVergne',
  'Roseburg OR': 'Roseburg',
  'Ft Wayne IN': 'FtWayne',
  'Chambersburg PA': 'Chambersburg',
};

export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields.map((f) => f.trim());
}

/** YYYYMMDD, or undefined when blank, or 'unrecognized' (counted by the snapshot). */
export function normalizeOnSaleDate(value: string): string | undefined {
  const v = value.trim();
  if (v === '') return undefined;
  if (/^\d{8}$/.test(v)) return v;
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}${m[1].padStart(2, '0')}${m[2].padStart(2, '0')}`;
  return 'unrecognized';
}

const count = (v: string | undefined) => {
  const n = Number((v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};
/**
 * A price or weight: "24.99" as written, or "2499" / "00002499" with Ingram's two implied
 * decimals (the inventory guide's convention). Undefined when blank or not positive.
 */
export function impliedDecimal(v: string | undefined): number | undefined {
  const raw = (v ?? '').replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(raw)) return undefined;
  const n = raw.includes('.') ? Number(raw) : Number(raw) / 100;
  return n > 0 ? n : undefined;
}

const yes = (v: string | undefined) => /^(y|yes|true|1)$/i.test((v ?? '').trim());

export function createCatalogCsvFormat(): FeedFormat {
  let columns: Map<string, number> | null = null;
  const dcColumns: Array<{ key: string; onHand: number; onOrder?: number }> = [];

  const field = (fields: string[], name: string) => {
    const index = columns?.get(name);
    return index === undefined ? undefined : fields[index];
  };

  return {
    readHeader(line) {
      const names = splitCsvLine(line);
      if (names[0]?.toUpperCase() !== 'EAN') {
        throw new Error('Catalog Stock CSV has no header row (expected first column "EAN")');
      }
      columns = new Map(names.map((name, index) => [name, index]));
      const missing = REQUIRED.filter((name) => !columns!.has(name));
      if (missing.length) throw new Error(`Catalog Stock CSV is missing column(s): ${missing.join(', ')}`);
      for (const [prefix, key] of Object.entries(DCS)) {
        const onHand = columns.get(`${prefix} On Hand`);
        if (onHand !== undefined) dcColumns.push({ key, onHand, onOrder: columns.get(`${prefix} On Order`) });
      }
      if (dcColumns.length === 0) throw new Error('Catalog Stock CSV has no recognized DC On Hand columns');
      return true;
    },

    ean(line) {
      // EAN is the first column; avoid a full split for the millions of lines we discard.
      const comma = line.indexOf(',');
      const raw = (comma === -1 ? line : line.slice(0, comma)).replace(/"/g, '').trim();
      return /^\d{13}$/.test(raw) ? raw : null;
    },

    parse(line): IngramStock | null {
      if (!columns) throw new Error('Catalog Stock CSV parse() called before readHeader()');
      const fields = splitCsvLine(line);
      const ean = field(fields, 'EAN');
      if (!ean || !/^\d{13}$/.test(ean)) return null;
      const dcs: Record<string, DcStock> = {};
      for (const dc of dcColumns) {
        const onHand = count(fields[dc.onHand]);
        dcs[dc.key] = {
          onHand,
          onOrder: dc.onOrder === undefined ? 0 : count(fields[dc.onOrder]),
          stockStatus: onHand > 0,
        };
      }
      const publicationDate = normalizeOnSaleDate(field(fields, 'Publication Date') ?? '');
      return {
        ean,
        pubListPrice: impliedDecimal(field(fields, 'List Price')),
        publicationDate: publicationDate === 'unrecognized' ? undefined : publicationDate,
        weightLbs: impliedDecimal(field(fields, 'Weight')),
        productAvailability: field(fields, 'Product Availability Code') || undefined,
        onSaleDate: normalizeOnSaleDate(field(fields, 'On Sale Date') ?? ''),
        backorder: yes(field(fields, 'Back Order Only Indicator')),
        mediaMail: yes(field(fields, 'Media Mail Indicator')),
        dcs,
      };
    },
  };
}
