// Reduces an Ingram inventory file to the few thousand EANs we carry. Format-agnostic:
// each feed format supplies a cheap EAN extractor (for filtering millions of lines) and
// a full parser that only runs on matched lines. Nothing outside the catalog is kept.
import type { CompactStock } from './applyIngramStock';
import type { IngramStock } from './parseStockResponse';
import { parseStockV2Line, stockV2Ean } from './parseStockV2';
import { ingramOnHand, isIngramAvailable } from './stockAvailability';

export interface FeedFormat {
  /** Called with the first line; returns true if it was a header (not a record). */
  readHeader(line: string): boolean;
  ean(line: string): string | null;
  parse(line: string): IngramStock | null;
}

export const stockV2Format: FeedFormat = {
  readHeader: () => false,
  ean: stockV2Ean,
  parse: (line) => parseStockV2Line(line),
};

export interface CatalogSnapshot {
  stock: Map<string, CompactStock>;
  scannedLines: number;
  matched: number;
  /** Lines with no readable EAN (blank, truncated, malformed). */
  skippedLines: number;
}

export async function buildSnapshot(
  lines: AsyncIterable<string>,
  catalogEans: Set<string>,
  format: FeedFormat,
  opts: { threshold: number; today?: Date },
): Promise<CatalogSnapshot> {
  const stock = new Map<string, CompactStock>();
  let scannedLines = 0;
  let skippedLines = 0;
  let first = true;

  for await (const line of lines) {
    if (first) {
      first = false;
      if (format.readHeader(line)) continue;
    }
    scannedLines += 1;
    const ean = format.ean(line);
    if (!ean) {
      skippedLines += 1;
      continue;
    }
    if (!catalogEans.has(ean)) continue;
    const record = format.parse(line);
    if (!record) {
      skippedLines += 1;
      continue;
    }
    stock.set(ean, {
      onHand: ingramOnHand(record),
      available: isIngramAvailable(record, opts.threshold, { today: opts.today }),
    });
  }

  return { stock, scannedLines, matched: stock.size, skippedLines };
}
