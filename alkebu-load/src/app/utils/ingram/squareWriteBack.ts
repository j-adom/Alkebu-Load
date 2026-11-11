// Square write-back for Ingram price uplifts and title cleanups (spec: "Square write-back").
// Square stays the POS source of truth, and the catalog sync copies Square's name and price
// into Payload, so these two changes must land in Square FIRST or the next sync reverts them.
//
// Safety rules:
//   - A write applies only if Square still holds the value the diff was computed from; a
//     value staff changed at the POS since then is a conflict, never clobbered.
//   - Optimistic concurrency: objects are upserted with the version we fetched. On a version
//     mismatch we re-fetch and recompute once, then report a conflict.
//   - Batches of at most 100 objects; a dry run never calls the upsert.
//   - Books with no Square ids are Payload-only and produce no writes.
import { randomUUID } from 'node:crypto';

import { squareItemName } from '../squareItemName';
import { isWrite, type FieldChange } from './diffEnrichment';
import { editionEanOf } from './enrichmentFields';
import { normalizeTitle } from './titleCleanup';

export const SQUARE_BATCH_LIMIT = 100;

/**
 * The seller's "Author" catalog custom attribute (a Square-defined STRING, definition
 * V7MQSLK2YTE74PDBPJUKROZD). Staff fill it on the item VARIATION. The map key on catalog
 * objects is "Square:<definition key>". Override with SQUARE_AUTHOR_ATTRIBUTE_KEY.
 */
export const SQUARE_AUTHOR_ATTRIBUTE_KEY = 'Square:0de92ab4-c183-40a9-8b69-109842f52da7';
/** Square's limit for a STRING custom attribute value. */
export const SQUARE_AUTHOR_MAX_LENGTH = 255;
/** Log/summary key for author fills (Square only; Payload's authorsText is unchanged). */
export const SQUARE_AUTHOR_FIELD = 'squareAuthor';

export const squareAuthorAttributeKey = (env: Record<string, string | undefined> = process.env) =>
  env.SQUARE_AUTHOR_ATTRIBUTE_KEY?.trim() || SQUARE_AUTHOR_ATTRIBUTE_KEY;

export interface SquareWrite {
  /** author: fill-only, written only where Square's Author is empty. */
  kind: 'price' | 'name' | 'author';
  /** ITEM_VARIATION id (price, author) or ITEM id (name). */
  objectId: string;
  /** The FieldChange key this write carries (`title`, `editions.<EAN>.pricing.retailPrice`). */
  key: string;
  editionIsbn?: string;
  /** Square values that count as "unchanged since the diff". */
  expected: Array<number | string>;
  next: number | string;
  /** author: the custom attribute map key. */
  attributeKey?: string;
}

export interface WrittenObject {
  write: SquareWrite;
  previous: number | string | null;
  previousVersion: string | null;
  newVersion: string | null;
}

export interface SquareWriteResult {
  written: WrittenObject[];
  /**
   * Square no longer holds the expected value (changed at the POS), or versions kept clashing.
   * For an author fill: Square already has a different Author, which is kept.
   */
  conflicts: SquareWrite[];
  /** Not attempted: dry run, or the object no longer exists in Square. */
  skipped: SquareWrite[];
  /** Square already holds the value (author fills only). */
  unchanged: SquareWrite[];
  /** Upsert calls made (for tests and run summaries). */
  upserts: number;
}

/** The slice of the Square SDK's catalog client this module uses (mocked in tests). */
export interface SquareCatalogClient {
  catalog: {
    batchGet(request: { objectIds: string[]; includeRelatedObjects?: boolean }): Promise<{ objects?: any[] }>;
    batchUpsert(request: { idempotencyKey: string; batches: Array<{ objects: any[] }> }): Promise<{ objects?: any[] }>;
  };
}

const proposedOf = (changes: FieldChange[], key: string) => changes.find((c) => c.key === key && isWrite(c));

/**
 * Pure: the Square writes a book's fill/correct changes need. Price changes go to the
 * edition's variation; a title change renames every Square item linked to the book as
 * "<cleaned title> (<binding>)", one name per binding item.
 */
export function planSquareWrites(book: Record<string, any>, changes: FieldChange[]): SquareWrite[] {
  const writes: SquareWrite[] = [];
  const editions: any[] = Array.isArray(book?.editions) ? book.editions : [];

  for (const change of changes) {
    if (!isWrite(change) || change.path !== 'pricing.retailPrice' || !change.editionIsbn) continue;
    const edition = editions.find((e) => editionEanOf(e) === change.editionIsbn);
    if (!edition?.squareVariationId) continue;
    writes.push({
      kind: 'price',
      objectId: edition.squareVariationId,
      key: change.key,
      editionIsbn: change.editionIsbn,
      expected: [Number(change.current)],
      next: Number(change.proposed),
    });
  }

  const title = proposedOf(changes, 'title');
  if (title) {
    const items = new Map<string, any>();
    for (const edition of editions) {
      const itemId = edition?.squareItemId || (edition?.squareVariationId ? book?.squareItemId : null);
      if (itemId && !items.has(itemId)) items.set(itemId, edition);
    }
    if (items.size === 0 && book?.squareItemId) items.set(book.squareItemId, editions[0]);
    for (const [itemId, edition] of items) {
      const ean = editionEanOf(edition);
      const bindingChange = ean ? proposedOf(changes, `editions.${ean}.binding`) : undefined;
      const binding = (bindingChange?.proposed as string | undefined) ?? edition?.binding;
      const currentTitle = String(title.current ?? '');
      writes.push({
        kind: 'name',
        objectId: itemId,
        key: 'title',
        expected: [currentTitle, squareItemName(currentTitle, edition?.binding)],
        next: squareItemName(String(title.proposed), binding),
      });
    }
  }
  return writes;
}

/**
 * Pure: the Square "Author" value for a list of names. Duplicates (ignoring case and spacing)
 * are dropped, names are joined with ", ", and names that would push the value past Square's
 * 255-character limit are left off. Null when there is no name.
 */
export function squareAuthorValue(names: Array<string | null | undefined>): string | null {
  const seen = new Set<string>();
  const kept: string[] = [];
  let length = 0;
  for (const raw of names) {
    const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    const added = (kept.length ? 2 : 0) + name.length;
    if (length + added > SQUARE_AUTHOR_MAX_LENGTH) {
      if (kept.length === 0) return name.slice(0, SQUARE_AUTHOR_MAX_LENGTH).trim();
      continue;
    }
    kept.push(name);
    length += added;
  }
  return kept.length ? kept.join(', ') : null;
}

/**
 * Pure: fill Square's Author on every Square-linked variation of the book with the book's
 * authors. Fill-only: applySquareWrites writes a variation only when its Author is empty, so
 * a name staff typed at the POS is never replaced.
 */
export function planSquareAuthorFills(
  book: Record<string, any>,
  authorNames: Array<string | null | undefined>,
  attributeKey: string = squareAuthorAttributeKey(),
): SquareWrite[] {
  const value = squareAuthorValue(authorNames);
  if (!value) return [];
  const writes: SquareWrite[] = [];
  const seen = new Set<string>();
  for (const edition of Array.isArray(book?.editions) ? book.editions : []) {
    const variationId = edition?.squareVariationId;
    if (!variationId || seen.has(variationId)) continue;
    seen.add(variationId);
    const ean = editionEanOf(edition) ?? undefined;
    writes.push({
      kind: 'author',
      objectId: variationId,
      key: SQUARE_AUTHOR_FIELD,
      editionIsbn: ean,
      expected: [''],
      next: value,
      attributeKey,
    });
  }
  return writes;
}

/** Changes that need a Square write before Payload may take them. */
export function squareBoundKeys(book: Record<string, any>, changes: FieldChange[]): Set<string> {
  return new Set(planSquareWrites(book, changes).map((w) => w.key));
}

const priceOf = (obj: any): number | null => {
  const amount = obj?.itemVariationData?.priceMoney?.amount;
  return amount === undefined || amount === null ? null : Number(amount);
};
const nameOf = (obj: any): string | null => (typeof obj?.itemData?.name === 'string' ? obj.itemData.name : null);
const versionOf = (obj: any): string | null => (obj?.version === undefined || obj?.version === null ? null : String(obj.version));
const authorOf = (obj: any, key: string): string => {
  const value = obj?.customAttributeValues?.[key]?.stringValue;
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
};
const authorKeyOf = (write: SquareWrite) => write.attributeKey ?? SQUARE_AUTHOR_ATTRIBUTE_KEY;

function stillExpected(write: SquareWrite, obj: any): boolean {
  if (write.kind === 'price') return write.expected.some((e) => Number(e) === priceOf(obj));
  if (write.kind === 'author') return authorOf(obj, authorKeyOf(write)) === '';
  const current = normalizeTitle(nameOf(obj));
  return write.expected.some((e) => normalizeTitle(String(e)) === current);
}

function withPrice(variation: any, cents: number): any {
  const money = variation.itemVariationData?.priceMoney ?? {};
  return {
    ...variation,
    itemVariationData: {
      ...variation.itemVariationData,
      pricingType: 'FIXED_PRICING',
      priceMoney: { currency: money.currency ?? 'USD', ...money, amount: BigInt(cents) },
    },
  };
}

function withAuthor(variation: any, key: string, value: string): any {
  const values = variation.customAttributeValues ?? {};
  return {
    ...variation,
    customAttributeValues: { ...values, [key]: { ...(values[key] ?? {}), stringValue: value } },
  };
}

export function isVersionConflict(error: unknown): boolean {
  const e = error as { statusCode?: number; errors?: Array<{ code?: string }>; message?: string } | null;
  if (!e) return false;
  if (e.statusCode === 409) return true;
  if (e.errors?.some((x) => x?.code === 'VERSION_MISMATCH' || x?.code === 'CONFLICT')) return true;
  return /version/i.test(e.message ?? '');
}

const chunk = <T>(list: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

async function fetchObjects(client: SquareCatalogClient, ids: string[]): Promise<Map<string, any>> {
  const byId = new Map<string, any>();
  for (const part of chunk([...new Set(ids)], SQUARE_BATCH_LIMIT)) {
    const response = await client.catalog.batchGet({ objectIds: part, includeRelatedObjects: false });
    for (const obj of response.objects ?? []) if (obj?.id) byId.set(obj.id, obj);
  }
  return byId;
}

interface Built {
  objects: any[];
  applied: Array<{ write: SquareWrite; previous: number | string | null; previousVersion: string | null; objectId: string }>;
  conflicts: SquareWrite[];
  skipped: SquareWrite[];
  unchanged: SquareWrite[];
}

/**
 * Builds the upsert objects for `writes` from freshly fetched Square objects. A price or
 * author write on a variation whose item is also being renamed is folded into that item's
 * nested variation, so one batch never carries the same variation twice.
 */
function build(writes: SquareWrite[], fetched: Map<string, any>): Built {
  const out: Built = { objects: [], applied: [], conflicts: [], skipped: [], unchanged: [] };
  const updated = new Map<string, any>();
  const itemsRenamed = new Set(writes.filter((w) => w.kind === 'name').map((w) => w.objectId));

  for (const write of writes.filter((w) => w.kind === 'name')) {
    const obj = fetched.get(write.objectId);
    if (!obj) {
      out.skipped.push(write);
      continue;
    }
    if (!stillExpected(write, obj)) {
      out.conflicts.push(write);
      itemsRenamed.delete(write.objectId);
      continue;
    }
    updated.set(write.objectId, { ...obj, itemData: { ...obj.itemData, name: String(write.next) } });
    out.applied.push({ write, previous: nameOf(obj), previousVersion: versionOf(obj), objectId: write.objectId });
  }

  const updateVariation = (obj: any, change: (variation: any) => any) => {
    const itemId = obj.itemVariationData?.itemId;
    const parent = itemId && itemsRenamed.has(itemId) ? updated.get(itemId) : undefined;
    const nested = parent?.itemData?.variations?.findIndex((v: any) => v?.id === obj.id) ?? -1;
    if (parent && nested >= 0) {
      const variations = [...parent.itemData.variations];
      variations[nested] = change(variations[nested]);
      updated.set(itemId, { ...parent, itemData: { ...parent.itemData, variations } });
    } else {
      updated.set(obj.id, change(updated.get(obj.id) ?? obj));
    }
  };

  for (const write of writes.filter((w) => w.kind === 'price')) {
    const obj = fetched.get(write.objectId);
    if (!obj) {
      out.skipped.push(write);
      continue;
    }
    if (!stillExpected(write, obj)) {
      out.conflicts.push(write);
      continue;
    }
    updateVariation(obj, (v) => withPrice(v, Number(write.next)));
    out.applied.push({ write, previous: priceOf(obj), previousVersion: versionOf(obj), objectId: write.objectId });
  }

  for (const write of writes.filter((w) => w.kind === 'author')) {
    const obj = fetched.get(write.objectId);
    if (!obj) {
      out.skipped.push(write);
      continue;
    }
    if (!stillExpected(write, obj)) {
      // Square already has an Author: the same one is done, a different one is staff's.
      const same = authorOf(obj, authorKeyOf(write)).toLowerCase() === String(write.next).toLowerCase();
      (same ? out.unchanged : out.conflicts).push(write);
      continue;
    }
    updateVariation(obj, (v) => withAuthor(v, authorKeyOf(write), String(write.next)));
    out.applied.push({ write, previous: null, previousVersion: versionOf(obj), objectId: write.objectId });
  }

  out.objects = [...updated.values()];
  return out;
}

export async function applySquareWrites(
  client: SquareCatalogClient,
  writes: SquareWrite[],
  opts: { dryRun: boolean; idempotencyKey?: () => string },
): Promise<SquareWriteResult> {
  const result: SquareWriteResult = { written: [], conflicts: [], skipped: [], unchanged: [], upserts: 0 };
  if (writes.length === 0) return result;
  if (opts.dryRun) return { ...result, skipped: [...writes] };
  const key = opts.idempotencyKey ?? (() => randomUUID());

  // Group writes so a renamed item and its variations always travel in the same batch.
  const groups = new Map<string, SquareWrite[]>();
  const fetched = await fetchObjects(client, writes.map((w) => w.objectId));
  for (const write of writes) {
    const obj = fetched.get(write.objectId);
    const group = write.kind === 'name' ? write.objectId : (obj?.itemVariationData?.itemId ?? write.objectId);
    groups.set(group, [...(groups.get(group) ?? []), write]);
  }

  const batches: SquareWrite[][] = [];
  let current: SquareWrite[] = [];
  for (const group of groups.values()) {
    if (current.length && current.length + group.length > SQUARE_BATCH_LIMIT) {
      batches.push(current);
      current = [];
    }
    current.push(...group);
  }
  if (current.length) batches.push(current);

  for (const batch of batches) {
    let source = fetched;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const built = build(batch, source);
      if (built.objects.length === 0) {
        result.conflicts.push(...built.conflicts);
        result.skipped.push(...built.skipped);
        result.unchanged.push(...built.unchanged);
        break;
      }
      try {
        result.upserts += 1;
        const response = await client.catalog.batchUpsert({ idempotencyKey: key(), batches: [{ objects: built.objects }] });
        const versions = new Map<string, string | null>();
        const collect = (obj: any) => {
          if (obj?.id) versions.set(obj.id, versionOf(obj));
          for (const v of obj?.itemData?.variations ?? []) collect(v);
        };
        for (const obj of response.objects ?? []) collect(obj);
        for (const a of built.applied) {
          result.written.push({
            write: a.write,
            previous: a.previous,
            previousVersion: a.previousVersion,
            newVersion: versions.get(a.objectId) ?? null,
          });
        }
        result.conflicts.push(...built.conflicts);
        result.skipped.push(...built.skipped);
        result.unchanged.push(...built.unchanged);
        break;
      } catch (error) {
        if (!isVersionConflict(error)) throw error;
        if (attempt === 1) {
          result.conflicts.push(...batch);
          break;
        }
        // Someone changed these objects since we fetched them: re-fetch and recompute once.
        source = await fetchObjects(client, batch.map((w) => w.objectId));
      }
    }
  }
  return result;
}

const writeId = (w: SquareWrite) => `${w.kind}|${w.objectId}|${w.key}`;

/**
 * The part of a multi-book write result that belongs to `planned` (one book's writes),
 * matched on kind, object and key. Lets a run write many books to Square in a few batched
 * calls and still apply each book's Payload changes from its own outcome.
 */
export function pickSquareResult(result: SquareWriteResult, planned: SquareWrite[]): SquareWriteResult {
  const ids = new Set(planned.map(writeId));
  const mine = (list: SquareWrite[]) => list.filter((w) => ids.has(writeId(w)));
  const written = result.written.filter((w) => ids.has(writeId(w.write)));
  const accounted = new Set([...written.map((w) => w.write), ...result.conflicts, ...result.skipped, ...result.unchanged].map(writeId));
  return {
    written,
    conflicts: mine(result.conflicts),
    // A planned write the batch never reached (e.g. it failed before this book) counts as skipped.
    skipped: [...mine(result.skipped), ...planned.filter((w) => !accounted.has(writeId(w)))],
    unchanged: mine(result.unchanged),
    upserts: 0,
  };
}

export interface SquareWriteOption {
  client: SquareCatalogClient;
}

/**
 * Square write-back is on only when INGRAM_ENRICHMENT_SQUARE_WRITEBACK=true. Without it,
 * price and title changes on Square-linked books are deferred (never written to Payload
 * alone, which the catalog sync would revert). Lazy: never loads the SDK when off.
 */
export async function squareWriteOptionFromEnv(
  env: Record<string, string | undefined> = process.env,
): Promise<SquareWriteOption | undefined> {
  if (env.INGRAM_ENRICHMENT_SQUARE_WRITEBACK !== 'true') return undefined;
  if (!env.SQUARE_ACCESS_TOKEN) throw new Error('INGRAM_ENRICHMENT_SQUARE_WRITEBACK=true needs SQUARE_ACCESS_TOKEN');
  const { SquareClient } = await import('square');
  // Same construction as squareCatalogSync.ts.
  return { client: new SquareClient({ token: env.SQUARE_ACCESS_TOKEN }) as unknown as SquareCatalogClient };
}
