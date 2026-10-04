// Sales from the pre-Payload storefront (Snipcart order export). Only three columns are
// read -- order date, order status and item ID (the ISBN-13 for books) -- so the export's
// customer details never enter this code path.
import { parse } from 'csv-parse/sync';

import { toEan13 } from './ean';

export interface LegacySales {
  /** EAN -> latest sale date (ISO) within the window. */
  sold: Map<string, string>;
  lines: number;
  counted: number;
  cancelled: number;
  outsideWindow: number;
  notABook: number;
}

/** Snipcart dates look like "2024-05-01 14:21:08" (no zone): treat as UTC. */
function toIso(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const t = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v.replace(' ', 'T')}Z`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function parseSnipcartOrders(csvText: string, sinceIso: string): LegacySales {
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[];
  const sold = new Map<string, string>();
  const result: LegacySales = { sold, lines: rows.length, counted: 0, cancelled: 0, outsideWindow: 0, notABook: 0 };

  for (const row of rows) {
    if ((row['Order status'] ?? '').trim().toLowerCase() === 'cancelled') {
      result.cancelled += 1;
      continue;
    }
    const ean = toEan13(row['Item ID']);
    if (!ean) {
      result.notABook += 1;
      continue;
    }
    const soldAt = toIso(row['Order date'] ?? '');
    if (!soldAt || soldAt < sinceIso) {
      result.outsideWindow += 1;
      continue;
    }
    result.counted += 1;
    const previous = sold.get(ean);
    if (!previous || soldAt > previous) sold.set(ean, soldAt);
  }
  return result;
}
