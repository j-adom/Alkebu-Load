// Pure parser for the Ingram FTP StockV2 fixed-width inventory file (301-char records).
// Emits the same IngramStock shape as the Web Service parser, so availability logic and
// the refresh job work with either transport.
import type { IngramStock } from './parseStockResponse';

export interface StockV2Record extends IngramStock {
  weightLbs: number;
  /** Our discount level (= our cost basis), e.g. '40%' or 'REG'. */
  discountLevel: string;
  /** Publisher status code, e.g. 'IP' (see the pubstatus reference table). */
  publisherStatus: string;
}

// 1-based inclusive positions per IDS Inventory Implementation Guide v2.14 (Feb 2022).
const field = (line: string, start: number, end: number) => line.slice(start - 1, end).trim();
const count = (s: string) => (s === '' ? 0 : Number(s) || 0);

const DCS: Record<string, { onHand: [number, number]; onOrder: [number, number]; flag: number }> = {
  LaVergne: { onHand: [39, 45], onOrder: [95, 101], flag: 181 },
  Roseburg: { onHand: [46, 52], onOrder: [102, 108], flag: 182 },
  FtWayne: { onHand: [53, 59], onOrder: [109, 115], flag: 183 },
  Chambersburg: { onHand: [60, 66], onOrder: [116, 122], flag: 184 },
  Allentown: { onHand: [67, 73], onOrder: [123, 129], flag: 185 },
};

/** The record's EAN without parsing the rest, for filtering a multi-GB file cheaply. */
export function stockV2Ean(line: string): string | null {
  const ean = line.slice(1, 14);
  return /^\d{13}$/.test(ean) ? ean : null;
}

export function parseStockV2Line(rawLine: string): StockV2Record {
  const line = rawLine.replace(/\r$/, '');
  const dcs: IngramStock['dcs'] = {};
  for (const [name, pos] of Object.entries(DCS)) {
    dcs[name] = {
      onHand: count(field(line, ...pos.onHand)),
      onOrder: count(field(line, ...pos.onOrder)),
      stockStatus: field(line, pos.flag, pos.flag) === 'Y',
    };
  }
  return {
    ean: field(line, 2, 14),
    pubListPrice: count(field(line, 151, 157)) / 100,
    productAvailability: field(line, 272, 273),
    onSaleDate: field(line, 197, 204),
    backorder: field(line, 219, 219) === 'Y',
    mediaMail: field(line, 220, 220) === 'Y',
    dcs,
    weightLbs: count(field(line, 239, 244)) / 100,
    discountLevel: field(line, 166, 168),
    publisherStatus: field(line, 179, 180),
  };
}
