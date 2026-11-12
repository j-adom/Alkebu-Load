// Books beforeChange: record that staff own a field once they edit it, so Ingram
// enrichment never overwrites curated values (precedence: manual > Ingram > other APIs).
//
// Stamps `enrichment.fieldSources[key] = { source: 'manual', at }` for each tracked field
// whose value changed, but only for an authenticated admin/staff/editor user and never
// for a write that carries `context.ingramEnrichment` (the job stamps 'ingram' itself).
// Unauthenticated writes (Square sync, scripts) leave provenance alone.
import {
  BOOK_FIELDS,
  comparable,
  EDITION_FIELDS,
  editionEanOf,
  getPath,
  sourceKey,
  SYSTEM_EDITION_FIELDS,
  type FieldSources,
} from '../../app/utils/ingram/enrichmentFields';

const STAMPING_ROLES = new Set(['admin', 'staff', 'editor']);

export function isStampingUser(user: unknown): boolean {
  const u = user as { collection?: string; role?: string } | null | undefined;
  return Boolean(u && u.collection === 'users' && u.role && STAMPING_ROLES.has(u.role));
}

/** Provenance keys of tracked fields that differ between `before` and the incoming `data`. */
export function changedFieldKeys(data: Record<string, any>, before: Record<string, any> | null | undefined): string[] {
  const keys: string[] = [];
  for (const field of BOOK_FIELDS) {
    if (!(field in data)) continue;
    if (comparable(field, data[field]) !== comparable(field, before?.[field])) keys.push(field);
  }

  if (Array.isArray(data.editions)) {
    const previous = new Map<string, any>();
    for (const edition of before?.editions ?? []) {
      const ean = editionEanOf(edition);
      if (ean && !previous.has(ean)) previous.set(ean, edition);
    }
    for (const edition of data.editions) {
      const ean = editionEanOf(edition);
      if (!ean) continue;
      const old = previous.get(ean);
      for (const field of EDITION_FIELDS) {
        if (SYSTEM_EDITION_FIELDS.has(field)) continue;
        if (comparable(field, getPath(edition, field)) !== comparable(field, getPath(old, field))) {
          keys.push(sourceKey(field, ean));
        }
      }
    }
  }
  return keys;
}

export function stampManualFieldSources({
  data,
  originalDoc,
  req,
  context,
  operation,
  now = () => new Date(),
}: {
  data: Record<string, any>;
  originalDoc?: Record<string, any> | null;
  req: { user?: unknown };
  context?: Record<string, unknown>;
  operation?: 'create' | 'update';
  now?: () => Date;
}): Record<string, any> {
  if (!data || context?.ingramEnrichment === true || !isStampingUser(req?.user)) return data;
  // A staff-triggered create that copies another system's data (e.g. promoting a Square
  // staging row) is not a manual edit; a hand-entered book has no importSource or 'manual'.
  if (operation === 'create' && data.importSource && data.importSource !== 'manual') return data;

  const changed = changedFieldKeys(data, operation === 'create' ? null : originalDoc);
  if (changed.length === 0) return data;

  const at = now().toISOString();
  const existing: FieldSources = {
    ...((originalDoc?.enrichment?.fieldSources as FieldSources | undefined) ?? {}),
    ...((data.enrichment?.fieldSources as FieldSources | undefined) ?? {}),
  };
  for (const key of changed) existing[key] = { source: 'manual', at };
  data.enrichment = { ...(originalDoc?.enrichment ?? {}), ...(data.enrichment ?? {}), fieldSources: existing };
  return data;
}

/**
 * `titleLong` is derived: "Title: Subtitle" whenever the book has a subtitle. Books without
 * one keep their imported titleLong (ISBNdb's title_long often carries the subtitle).
 */
export function deriveTitleLong(data: Record<string, any>, originalDoc?: Record<string, any> | null): Record<string, any> {
  if (!data || !('title' in data || 'subtitle' in data)) return data;
  const title = String(('title' in data ? data.title : originalDoc?.title) ?? '').trim();
  const subtitle = String(('subtitle' in data ? data.subtitle : originalDoc?.subtitle) ?? '').trim();
  if (title && subtitle) data.titleLong = `${title}: ${subtitle}`;
  return data;
}
