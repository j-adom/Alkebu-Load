// Turns the reviewed author-duplicates CSV into merge groups, refusing anything
// ambiguous. Pure; the SQL that executes a plan lives in scripts/author-merge.ts.

export interface AuthorMergeGroup {
  group: string;
  keep: { id: number; name: string };
  merge: Array<{ id: number; name: string }>;
  /** Name the kept record ends with (suggested_name, else its current name). */
  finalName: string;
}

export interface AuthorMergePlan {
  groups: AuthorMergeGroup[];
  /** Groups not merged, with why ("action is review", "no KEEP row", ...). */
  skipped: Array<{ group: string; reason: string }>;
}

type Row = Record<string, string>;

export function planAuthorMerges(rows: Row[]): AuthorMergePlan {
  const byGroup = new Map<string, Row[]>();
  for (const row of rows) {
    const g = (row.group ?? '').trim();
    if (!g) continue;
    byGroup.set(g, [...(byGroup.get(g) ?? []), row]);
  }

  const groups: AuthorMergeGroup[] = [];
  const skipped: AuthorMergePlan['skipped'] = [];
  const claimed = new Map<number, string>();

  for (const [group, members] of byGroup) {
    const actions = new Set(members.map((r) => (r.action ?? '').trim().toLowerCase()));
    if (actions.size !== 1 || !actions.has('merge')) {
      skipped.push({ group, reason: actions.has('merge') ? 'mixed actions' : 'action is not merge' });
      continue;
    }
    const keeps = members.filter((r) => (r.role ?? '').trim().toUpperCase() === 'KEEP');
    if (keeps.length !== 1) {
      skipped.push({ group, reason: keeps.length === 0 ? 'no KEEP row' : 'more than one KEEP row' });
      continue;
    }
    const parse = (r: Row) => ({ id: Number(r.author_id), name: (r.name ?? '').trim() });
    const keep = parse(keeps[0]);
    const merge = members.filter((r) => r !== keeps[0]).map(parse);
    const all = [keep, ...merge];
    if (all.some((a) => !Number.isInteger(a.id) || a.id <= 0 || !a.name)) {
      skipped.push({ group, reason: 'bad author_id or empty name' });
      continue;
    }
    if (merge.length === 0) {
      skipped.push({ group, reason: 'nothing to merge into KEEP' });
      continue;
    }
    const clash = all.find((a) => claimed.has(a.id));
    if (clash) {
      skipped.push({ group, reason: `author ${clash.id} also appears in group ${claimed.get(clash.id)}` });
      continue;
    }
    if (new Set(all.map((a) => a.id)).size !== all.length) {
      skipped.push({ group, reason: 'an author appears twice in the group' });
      continue;
    }
    for (const a of all) claimed.set(a.id, group);
    const suggested = (keeps[0].suggested_name ?? '').trim();
    groups.push({ group, keep, merge, finalName: suggested || keep.name });
  }

  return { groups, skipped };
}

/** Slug in the Authors collection's style. */
export function authorSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
