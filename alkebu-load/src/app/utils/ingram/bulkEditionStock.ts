// Bulk write for the nightly Ingram stock refresh. The refresh only ever changes four
// inventory columns on edition rows (Ingram on hand, Ingram available, checked at, and the
// sales rescue's available-to-order). Writing them with payload.update rewrites each book's
// whole editions array, one book at a time: thousands of round trips on the weekly re-stamp.
// On PostgreSQL this writes them with one UPDATE per 500 editions instead.
//
// Safe to bypass the Local API because no Books hook sets or reads these columns: the
// hooks enrich from ISBNdb (skipped by the refresh context anyway), derive SEO/categories
// and title fields, guard Square item ownership, and link authors/publisher. Books has no
// versions. The book's updated_at is bumped, as payload.update would.
//
// Anything else falls back to payload.update: a non-Postgres database, an edition without a
// row id, a plan that changes any other edition field, or an edition row the UPDATE didn't
// find (e.g. staff re-saved the book mid-run).
import { sql } from 'drizzle-orm';

export const BULK_EDITION_CHUNK = 500;

export interface EditionStockRow {
  bookId: string | number;
  /** books_editions.id (Payload's array row id). */
  editionId: string;
  onHand: number | null;
  available: boolean;
  checkedAt: string | null;
  availableToOrder: boolean;
}

const STOCK_FIELDS = ['ingramOnHand', 'ingramAvailable', 'ingramCheckedAt', 'availableToOrder'] as const;

/** An edition with the four refresh-owned inventory fields removed, for comparison. */
function withoutStockFields(edition: any): unknown {
  const inventory = { ...(edition?.inventory ?? {}) };
  for (const field of STOCK_FIELDS) delete inventory[field];
  return { ...edition, inventory };
}

const numberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Pure: the edition rows a stock plan changes, or null when the plan can't be written in
 * bulk (an edition has no row id, the edition list changed shape, or a field other than the
 * four stock fields changed). Null means "use payload.update for this book".
 */
export function editionStockRows(book: any, plannedEditions: any[]): EditionStockRow[] | null {
  const before: any[] = Array.isArray(book?.editions) ? book.editions : [];
  if (before.length !== plannedEditions.length) return null;
  const rows: EditionStockRow[] = [];
  for (let i = 0; i < before.length; i += 1) {
    const prev = before[i];
    const next = plannedEditions[i];
    if (prev === next) continue;
    if (!next?.id || next.id !== prev?.id) return null;
    if (JSON.stringify(withoutStockFields(prev)) !== JSON.stringify(withoutStockFields(next))) return null;
    const a = prev?.inventory ?? {};
    const b = next?.inventory ?? {};
    if (STOCK_FIELDS.every((f) => a[f] === b[f])) continue;
    rows.push({
      bookId: book.id,
      editionId: String(next.id),
      onHand: numberOrNull(b.ingramOnHand),
      available: b.ingramAvailable === true,
      checkedAt: b.ingramCheckedAt ? String(b.ingramCheckedAt) : null,
      availableToOrder: b.availableToOrder === true,
    });
  }
  return rows;
}

/** The slice of payload.db the bulk write needs. */
export interface BulkDb {
  name?: string;
  drizzle?: { execute?: (query: any) => Promise<{ rows?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>> };
}

export const supportsBulkEditionWrites = (db: BulkDb | undefined): boolean =>
  db?.name === 'postgres' && typeof db?.drizzle?.execute === 'function';

/**
 * One statement per chunk: update the edition rows, bump their books' updated_at, and
 * return the edition ids actually updated. Returns the set of updated edition ids.
 */
export async function writeEditionStockChunk(db: BulkDb, rows: EditionStockRow[]): Promise<Set<string>> {
  if (rows.length === 0) return new Set();
  const values = sql.join(
    rows.map(
      (r) =>
        sql`(${r.editionId}::varchar, ${r.onHand}::numeric, ${r.available}::boolean, ${r.checkedAt}::timestamptz, ${r.availableToOrder}::boolean)`,
    ),
    sql`, `,
  );
  const query = sql`
    WITH v (id, on_hand, available, checked_at, available_to_order) AS (VALUES ${values}),
    e AS (
      UPDATE "books_editions" AS t
         SET "inventory_ingram_on_hand" = v.on_hand,
             "inventory_ingram_available" = v.available,
             "inventory_ingram_checked_at" = v.checked_at,
             "inventory_available_to_order" = v.available_to_order
        FROM v
       WHERE t."id" = v.id
      RETURNING t."id", t."_parent_id"
    ),
    b AS (
      UPDATE "books" SET "updated_at" = now()
       WHERE "id" IN (SELECT "_parent_id" FROM e)
      RETURNING "id"
    )
    SELECT "id" FROM e`;
  const result = await db.drizzle!.execute!(query);
  const list = Array.isArray(result) ? result : (result?.rows ?? []);
  return new Set(list.map((row) => String(row.id)));
}
