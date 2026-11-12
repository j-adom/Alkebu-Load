// Pure stream reducer for Ingram's description files: publisher marketing descriptions
// (DESC_BKLST/PMALL_active.zip, PubDescripi/ingmmthy-13.zip), brief descriptions
// (DESC_BKLST/brdn_GBLFL.zip, BriefDesc/brdn.zip) and annotations (TitlesBasic/annobasic_pipe.zip).
//
// These records are variable-length and can span several lines, so a line-based filter
// can't be used. A record starts on a line whose EAN field holds a 13-digit EAN; lines
// that don't start a record continue the current one. Consecutive records for the same
// EAN (long text split across rows) are joined. Records for EANs outside the catalog are
// dropped as they stream past and never accumulate.
//
// Layouts per file, from Ingram's description specs (Description Data Files, Brief
// Description and Publisher Marketing File Specifications, Titles Basic guide):
//   - publisher marketing: fixed-width, EAN in positions 1-13, a 5-digit length in 14-18,
//     the text from 19 to end of line;
//   - brief: pipe-delimited EAN | "BD" | length | text;
//   - annotation (Titles Basic): pipe-delimited EAN | filler | first 100 characters.
import { splitDelimited } from './titlesBasicParser';

export type DescriptionKind = 'marketing' | 'brief' | 'annotation';

export interface DescriptionLayout {
  placeholder: boolean;
  /**
   * Fixed-width records (0-based character offsets): the EAN's 13 characters start at
   * `eanStart`, the text runs from `textStart` to end of line, and everything between them
   * must be digits or spaces. When set, the delimiter fields below are unused.
   */
  fixed?: { eanStart: number; textStart: number };
  delimiter: string;
  quote: string | null;
  escape: string | null;
  /** Field index of the EAN on a record's first line. */
  eanField: number;
  /** Field index where the description text starts on the first line (the rest of the line, delimiters included). */
  textField: number;
  /** A line that ends the current record (exact match after trim), or null when records end at the next start line. */
  recordEndMarker: string | null;
}

const PIPE = { delimiter: '|', quote: null, escape: null, recordEndMarker: null } as const;

export const DESCRIPTION_LAYOUTS: Record<DescriptionKind, DescriptionLayout> = {
  marketing: { placeholder: false, ...PIPE, eanField: 0, textField: 1, fixed: { eanStart: 0, textStart: 18 } },
  brief: { placeholder: false, ...PIPE, eanField: 0, textField: 3 },
  annotation: { placeholder: false, ...PIPE, eanField: 0, textField: 2 },
};

/** The default for callers that don't name a kind: a delimited layout. */
export const DESCRIPTION_LAYOUT: DescriptionLayout = DESCRIPTION_LAYOUTS.brief;

export interface DescriptionRecord {
  ean: string;
  kind: DescriptionKind;
  /** The description as supplied (may contain HTML); continuation lines joined with \n. */
  html: string;
}

/** The EAN when `line` starts a record, else null. */
export function descriptionRecordEan(line: string, layout: DescriptionLayout = DESCRIPTION_LAYOUT): string | null {
  if (layout.fixed) {
    const { eanStart, textStart } = layout.fixed;
    const raw = line.slice(eanStart, eanStart + 13);
    // The digits-or-spaces gap (the length field) keeps a wrapped line that happens to
    // start with 13 digits from being read as a new record.
    if (line.length < textStart || !/^[\d ]*$/.test(line.slice(eanStart + 13, textStart))) return null;
    return /^\d{13}$/.test(raw) ? raw : null;
  }
  const fields = splitDelimited(line, layout);
  if (fields.length <= Math.max(layout.eanField, layout.textField - 1)) return null;
  const raw = (fields[layout.eanField] ?? '').trim();
  return /^\d{13}$/.test(raw) ? raw : null;
}

/** One record's lines (first line + continuations) -> a record, or null when it has no text. */
export function parseDescriptionRecord(
  lines: string[],
  kind: DescriptionKind,
  layout: DescriptionLayout = DESCRIPTION_LAYOUTS[kind],
): DescriptionRecord | null {
  if (lines.length === 0) return null;
  const ean = descriptionRecordEan(lines[0], layout);
  if (!ean) return null;
  const firstText = textFrom(lines[0], layout);
  const html = [firstText, ...lines.slice(1)].join('\n').trim();
  return html ? { ean, kind, html } : null;
}

function textFrom(line: string, layout: DescriptionLayout): string {
  if (layout.fixed) return line.slice(layout.fixed.textStart);
  // Everything from the text field on: description text may itself contain the delimiter.
  let start = 0;
  for (let i = 0; i < layout.textField; i += 1) {
    const next = line.indexOf(layout.delimiter, start);
    if (next < 0) return '';
    start = next + 1;
  }
  const rest = line.slice(start);
  if (layout.quote && rest.startsWith(layout.quote) && rest.endsWith(layout.quote) && rest.length >= 2) {
    return rest.slice(1, -1).split(layout.quote + layout.quote).join(layout.quote);
  }
  return rest;
}

export interface DescriptionReducer {
  /** Feed one line; returns any records it completed. */
  push(line: string): DescriptionRecord[];
  /** End of input; returns the last record, if any. */
  end(): DescriptionRecord[];
  stats: { records: number; kept: number; orphanLines: number };
}

export function createDescriptionReducer(
  kind: DescriptionKind,
  opts: { eans?: ReadonlySet<string>; layout?: DescriptionLayout } = {},
): DescriptionReducer {
  const layout = opts.layout ?? DESCRIPTION_LAYOUTS[kind];
  const stats = { records: 0, kept: 0, orphanLines: 0 };
  let current: { ean: string; keep: boolean; parts: string[] } | null = null;
  let pending: DescriptionRecord | null = null;

  // Records are held one step so a split record (same EAN on consecutive rows) is merged.
  const emit = (record: DescriptionRecord | null): DescriptionRecord[] => {
    if (!record) return [];
    if (pending && pending.ean === record.ean) {
      pending = { ...pending, html: `${pending.html}\n${record.html}` };
      return [];
    }
    const out = pending ? [pending] : [];
    pending = record;
    return out;
  };

  const close = (): DescriptionRecord[] => {
    if (!current) return [];
    const done = current;
    current = null;
    if (!done.keep) return [];
    return emit(parseDescriptionRecord(done.parts, kind, layout));
  };

  return {
    stats,
    push(line) {
      if (layout.recordEndMarker !== null && line.trim() === layout.recordEndMarker) return close();
      const ean = descriptionRecordEan(line, layout);
      if (ean) {
        const out = close();
        stats.records += 1;
        const keep = !opts.eans || opts.eans.has(ean);
        current = { ean, keep, parts: keep ? [line] : [] };
        return out;
      }
      if (!current) {
        if (line.trim() !== '') stats.orphanLines += 1;
        return [];
      }
      if (current.keep) current.parts.push(line);
      return [];
    },
    end() {
      const out = close();
      if (pending) {
        out.push(pending);
        pending = null;
      }
      return out;
    },
  };
}

/** Streams records out of a description file's lines. */
export async function* parseDescriptionStream(
  lines: AsyncIterable<string>,
  kind: DescriptionKind,
  opts: { eans?: ReadonlySet<string>; layout?: DescriptionLayout } = {},
  onStats?: (stats: DescriptionReducer['stats']) => void,
): AsyncGenerator<DescriptionRecord> {
  const reducer = createDescriptionReducer(kind, opts);
  for await (const line of lines) {
    for (const record of reducer.push(line)) {
      reducer.stats.kept += 1;
      yield record;
    }
  }
  for (const record of reducer.end()) {
    reducer.stats.kept += 1;
    yield record;
  }
  onStats?.(reducer.stats);
}
