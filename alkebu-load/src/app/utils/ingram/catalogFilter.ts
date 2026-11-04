// Stream-filter an Ingram file down to the EANs we carry. Ingram's bibliographic files
// cover millions of titles; we keep a few thousand. Lines outside the catalog are dropped
// unparsed, and nothing is ever buffered beyond the current line (licence: load what we
// display, never mirror the feed).
import { loadCatalogEans } from './refreshCatalogStock';
import { zipLines } from './zipLines';

export { toEan13 } from './ean';
/** Every edition ISBN in the catalog as a checksum-valid EAN-13 (shared with the stock refresh). */
export { loadCatalogEans };

export interface FilterStats {
  /** Lines read from the source, header included. */
  scanned: number;
  /** Lines whose EAN is in the catalog (yielded). */
  matched: number;
  /** Lines with no readable EAN: a header, blank or malformed line. */
  noEan: number;
}

export const emptyFilterStats = (): FilterStats => ({ scanned: 0, matched: 0, noEan: 0 });

/** Yields, in order, only the lines whose EAN (from the cheap `ean` extractor) is in `eans`. */
export async function* filterCatalogLines(
  lines: AsyncIterable<string>,
  ean: (line: string) => string | null,
  eans: ReadonlySet<string>,
  stats: FilterStats = emptyFilterStats(),
): AsyncGenerator<string> {
  for await (const line of lines) {
    stats.scanned += 1;
    const key = ean(line);
    if (!key) {
      stats.noEan += 1;
      continue;
    }
    if (!eans.has(key)) continue;
    stats.matched += 1;
    yield line;
  }
}

/** `filterCatalogLines` over one entry of a zip, streamed (see zipLines). */
export function streamCatalogRecords(
  zipPath: string,
  entryName: string | undefined,
  ean: (line: string) => string | null,
  eans: ReadonlySet<string>,
  stats?: FilterStats,
): AsyncGenerator<string> {
  return filterCatalogLines(zipLines(zipPath, entryName), ean, eans, stats);
}
