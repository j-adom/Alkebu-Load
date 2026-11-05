import type { Payload } from 'payload';

/**
 * In-memory lookups for the full-catalog reconciliation (scripts/reconcile-square-catalog.ts).
 *
 * The per-item sync asks Postgres up to four questions per Square item (its staging row,
 * then books by edition item id, book item id and variation ids). Over the production SSH
 * tunnel that is tens of thousands of round trips. This loads every book and staging row
 * once and answers those exact `where` shapes from memory, so processCatalogItems runs the
 * same decisions (findBookForSquareItem's tiers and filters are unchanged) without the
 * queries. Writes go to the database as before and refresh the cache with the stored doc.
 *
 * Only for a one-off run: a book written by the live job during the run is not seen.
 */

type Doc = Record<string, any> & { id: string | number };
type Condition = { equals?: unknown; in?: unknown[] };

const BOOKS = 'books';
const STAGING = 'square-catalog-staging';
const PAGE = 500;

/** Whether one Payload `where` of the shapes the catalog sync uses matches a doc. */
export function matchesSimpleWhere(doc: Doc, where: Record<string, unknown>): boolean | undefined {
  const entries = Object.entries(where ?? {});
  if (entries.length !== 1) return undefined;
  const [path, rawCond] = entries[0];
  const cond = rawCond as Condition;
  if (!cond || typeof cond !== 'object' || (!('equals' in cond) && !Array.isArray(cond.in))) return undefined;

  const parts = path.split('.');
  let values: unknown[];
  if (parts.length === 1) {
    values = [doc[parts[0]]];
  } else if (parts.length === 2 && parts[0] === 'editions') {
    values = (Array.isArray(doc.editions) ? doc.editions : []).map((edition: any) => edition?.[parts[1]]);
  } else {
    return undefined;
  }

  return values.some((value) =>
    value !== undefined && value !== null &&
    ('equals' in cond ? value === cond.equals : (cond.in as unknown[]).includes(value)),
  );
}

async function loadAll(payload: Payload, collection: string, select?: Record<string, true>): Promise<Doc[]> {
  const docs: Doc[] = [];
  for (let page = 1; ; page++) {
    const result = await payload.find({
      collection: collection as any,
      depth: 0,
      limit: PAGE,
      page,
      sort: 'id',
      ...(select ? { select: select as any } : {}),
    });
    docs.push(...(result.docs as Doc[]));
    if (!result.hasNextPage) return docs;
  }
}

/**
 * A Payload stand-in for processCatalogItems: `find` on books / staging rows is answered
 * from memory when the `where` is one of the simple shapes the sync uses, everything else
 * (and every write) goes to the real Payload.
 */
export async function createPreloadedCatalogPayload(
  payload: Payload,
  log: (message: string) => void = console.log,
): Promise<Payload> {
  const started = Date.now();
  const books = new Map<string | number, Doc>();
  for (const doc of await loadAll(payload, BOOKS)) books.set(doc.id, doc);
  const staging = new Map<string | number, Doc>();
  const stagingSelect = { squareItemId: true, reviewStatus: true, promotedBook: true } as const;
  for (const doc of await loadAll(payload, STAGING, stagingSelect)) staging.set(doc.id, doc);
  log(`preloaded ${books.size} books and ${staging.size} staging rows in ${Math.round((Date.now() - started) / 1000)}s`);

  const cacheFor = (collection: unknown) => (collection === BOOKS ? books : collection === STAGING ? staging : null);

  const refresh = async (collection: string, id: string | number) => {
    const cache = cacheFor(collection)!;
    const doc = await payload.findByID({
      collection: collection as any,
      id,
      depth: 0,
      ...(collection === STAGING ? { select: stagingSelect as any } : {}),
    });
    cache.set(id, doc as Doc);
  };

  const facade = {
    find: async (args: any) => {
      const cache = cacheFor(args?.collection);
      if (cache && args?.where && !args.page) {
        const matched: Doc[] = [];
        let supported = true;
        for (const doc of cache.values()) {
          const result = matchesSimpleWhere(doc, args.where);
          if (result === undefined) {
            supported = false;
            break;
          }
          if (result) matched.push(doc);
        }
        if (supported) {
          const limit = typeof args.limit === 'number' && args.limit > 0 ? args.limit : 10;
          const docs = matched.slice(0, limit);
          return { docs, totalDocs: matched.length, hasNextPage: matched.length > limit, limit, page: 1 };
        }
      }
      return payload.find(args);
    },
    create: async (args: any) => {
      const doc = await payload.create(args);
      if (cacheFor(args?.collection)) await refresh(args.collection, (doc as Doc).id);
      return doc;
    },
    update: async (args: any) => {
      const result = await payload.update(args);
      if (cacheFor(args?.collection) && args.id !== undefined) await refresh(args.collection, args.id);
      return result;
    },
  };

  return new Proxy(payload, {
    get(target, prop, receiver) {
      if (prop in facade) return facade[prop as keyof typeof facade];
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as Payload;
}
