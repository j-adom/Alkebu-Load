// Square item names carry the binding ("Wayward Lives (Paperback)") because each binding is
// its own Square item and staff must tell them apart at the POS. Payload keeps the binding
// on the edition, so the catalog sync strips that suffix when it maps a name to a title.
// Without this, Ingram title cleanup's write-back would echo back into Payload as
// "Title (Paperback)" on the next sync.

export const BINDING_LABELS: Record<string, string> = {
  hardcover: 'Hardcover',
  paperback: 'Paperback',
  'mass-market': 'Mass Market',
  ebook: 'eBook',
  audiobook: 'Audiobook',
};

const SUFFIX = new RegExp(
  `\\s*\\((?:${Object.values(BINDING_LABELS)
    .map((label) => label.replace(/\s+/g, '\\s+'))
    .join('|')})\\)\\s*$`,
  'i',
);

/** "Title (Paperback)" -> "Title". Only our own binding labels are stripped; never empties a name. */
export function stripBindingSuffix(name: string): string {
  const stripped = name.replace(SUFFIX, '').trim();
  return stripped || name.trim();
}

/** The Square item name for a cleaned title and an edition binding. */
export function squareItemName(title: string, binding: string | null | undefined): string {
  const label = binding ? BINDING_LABELS[binding] : undefined;
  const base = title.replace(/\s+/g, ' ').trim();
  return label ? `${base} (${label})` : base;
}
