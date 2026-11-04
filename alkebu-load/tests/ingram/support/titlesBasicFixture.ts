// Builds synthetic Titles Basic lines from the layout constant (never from vendor data),
// so the parser tests follow whatever column order the owner transcribes.
import {
  TITLES_BASIC_LAYOUT,
  type TitlesBasicField,
  type TitlesBasicLayout,
} from '../../../src/app/utils/ingram/titlesBasicParser';

export type SyntheticTitle = Partial<Record<Exclude<TitlesBasicField, 'contributor' | 'bisac'>, string>> & {
  contributor?: string[];
  bisac?: string[];
};

function encode(value: string, layout: TitlesBasicLayout): string {
  if (layout.escape) {
    return value.split(layout.escape).join(layout.escape + layout.escape).split(layout.delimiter).join(layout.escape + layout.delimiter);
  }
  if (layout.quote && (value.includes(layout.delimiter) || value.includes(layout.quote))) {
    return layout.quote + value.split(layout.quote).join(layout.quote + layout.quote) + layout.quote;
  }
  return value;
}

export function buildTitlesBasicLine(values: SyntheticTitle, layout: TitlesBasicLayout = TITLES_BASIC_LAYOUT): string {
  const contributors = [...(values.contributor ?? [])];
  const bisac = [...(values.bisac ?? [])];
  return layout.columns
    .map((column) => {
      if (column.startsWith('skip:')) return '';
      if (column === 'contributor') return encode(contributors.shift() ?? '', layout);
      if (column === 'bisac') return encode(bisac.shift() ?? '', layout);
      return encode(values[column as keyof Omit<SyntheticTitle, 'contributor' | 'bisac'>] ?? '', layout);
    })
    .join(layout.delimiter);
}
