// Pure parser for Ingram Web Service Query Type 9 responses (SearchRequestTypes12349Enhanced).
// Dependency-light so it can be unit-tested without loading the Payload/Stripe module graph.
//
// The SOAP envelope and <Basic> layout match the live production response (2026-10-02).
// The <Ingram><Stock><DC> layout is the planned structure and is not yet verified: the
// account currently returns no stock section with dataRequest=STK. A product without
// one parses with empty `dcs`, so callers degrade to "no Ingram stock signal".
import { XMLParser } from 'fast-xml-parser';

export interface DcStock {
  onHand: number;
  onOrder: number;
  stockStatus: boolean;
}

export interface IngramStock {
  ean: string;
  ingramPrice?: number;
  pubListPrice?: number;
  /** 2-char Product Availability (prodstat) code, e.g. '21', when present. */
  productAvailability?: string;
  /** YYYYMMDD street date; '00010101' or unset means sellable on receipt. */
  onSaleDate?: string;
  backorder: boolean;
  mediaMail: boolean;
  /** Keyed by distribution-center name, e.g. "LaVergne". */
  dcs: Record<string, DcStock>;
}

// parseTagValue: false keeps EANs, codes and dates as strings (no numeric coercion).
const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
  isArray: (name) => name === 'Product',
});

const text = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === '' ? undefined : s;
};
const num = (v: unknown): number | undefined => {
  const s = text(v);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};
const yes = (v: unknown) => text(v)?.toUpperCase() === 'Y';

export function parseStockResponse(xml: string): IngramStock[] {
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }
  const results = findDeep(doc, 'IngramSearchResults');
  const products: any[] = Array.isArray(results?.Product) ? results.Product : [];

  return products
    .map((p): IngramStock => {
      const basic = p?.Basic ?? {};
      const ingram = p?.Ingram ?? {};
      const stock = ingram?.Stock && typeof ingram.Stock === 'object' ? ingram.Stock : {};
      const dcs: Record<string, DcStock> = {};
      for (const [dcName, dc] of Object.entries<any>(stock)) {
        if (!dc || typeof dc !== 'object') continue;
        dcs[dcName] = {
          onHand: num(dc.OnHand) ?? 0,
          onOrder: num(dc.OnOrder) ?? 0,
          stockStatus: yes(dc.StockStatus),
        };
      }
      return {
        ean: text(basic.EAN) ?? '',
        ingramPrice: num(ingram.IngramPrice),
        pubListPrice: num(basic.PubListPrice),
        productAvailability: text(ingram.ProductAvailability),
        onSaleDate: text(ingram.OnSaleDate),
        backorder: yes(ingram.Backorder),
        mediaMail: yes(ingram.MediaMail),
        dcs,
      };
    })
    .filter((rec) => rec.ean !== '');
}

function findDeep(obj: any, key: string): any {
  if (obj == null || typeof obj !== 'object') return undefined;
  if (key in obj) return obj[key];
  for (const v of Object.values(obj)) {
    const hit = findDeep(v, key);
    if (hit !== undefined) return hit;
  }
  return undefined;
}
