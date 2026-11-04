// In-memory stand-in for the slice of Payload's Local API the enrichment code uses, with
// real transaction semantics (a transaction works on a copy that commit swaps in and
// rollback discards). Lets the unit tests prove atomicity, which the repo's SQLite adapter
// can't (its beginTransaction returns null).
type Doc = Record<string, any>;
type Store = Map<string, Map<string, Doc>>;

const clone = <T>(v: T): T => structuredClone(v);

function matches(doc: Doc, where: any): boolean {
  if (!where) return true;
  if (Array.isArray(where.and)) return where.and.every((w: any) => matches(doc, w));
  if (Array.isArray(where.or)) return where.or.some((w: any) => matches(doc, w));
  return Object.entries(where).every(([field, cond]: [string, any]) => {
    const raw = doc[field];
    const value = raw && typeof raw === 'object' && 'id' in raw ? raw.id : raw;
    if ('equals' in cond) return String(value) === String(cond.equals);
    if ('in' in cond) return cond.in.map(String).includes(String(value));
    if ('not_equals' in cond) return String(value) !== String(cond.not_equals);
    throw new Error(`fakePayload: unsupported operator in ${JSON.stringify(cond)}`);
  });
}

export function createFakePayload(seed: Record<string, Doc[]> = {}, opts: { transactions?: boolean } = {}) {
  let store: Store = new Map();
  let nextId = 1000;
  const transactions = new Map<string, Store>();
  const failures: Array<{ op: string; collection: string; remaining: number }> = [];
  const calls: Array<{ op: string; collection: string; data?: Doc; context?: any }> = [];

  for (const [collection, docs] of Object.entries(seed)) {
    store.set(collection, new Map(docs.map((d) => [String(d.id), clone(d)])));
  }

  const target = (req?: { transactionID?: string | number }): Store => {
    if (req?.transactionID !== undefined) {
      const tx = transactions.get(String(req.transactionID));
      if (!tx) throw new Error('fakePayload: unknown transaction');
      return tx;
    }
    return store;
  };
  const coll = (s: Store, name: string) => {
    if (!s.has(name)) s.set(name, new Map());
    return s.get(name)!;
  };
  const maybeFail = (op: string, collection: string) => {
    const f = failures.find((x) => x.op === op && x.collection === collection);
    if (!f) return;
    f.remaining -= 1;
    if (f.remaining === 0) throw new Error(`injected ${op} failure on ${collection}`);
  };

  const payload = {
    calls,
    /** Make the nth `op` on `collection` (1-based) throw. */
    failOn(op: 'create' | 'update', collection: string, nth = 1) {
      failures.push({ op, collection, remaining: nth });
    },
    all(collection: string): Doc[] {
      return [...coll(store, collection).values()].map(clone);
    },
    db: {
      beginTransaction: async () => {
        if (opts.transactions === false) return null;
        const id = `tx${transactions.size + 1}-${Math.random()}`;
        transactions.set(id, clone(store) as Store);
        return id;
      },
      commitTransaction: async (id: string | number) => {
        store = transactions.get(String(id))!;
        transactions.delete(String(id));
      },
      rollbackTransaction: async (id: string | number) => {
        transactions.delete(String(id));
      },
    },
    globals: new Map<string, Doc>(),
    async findGlobal({ slug }: any) {
      return clone(payload.globals.get(slug) ?? {});
    },
    async updateGlobal({ slug, data }: any) {
      calls.push({ op: 'updateGlobal', collection: slug, data: clone(data) });
      payload.globals.set(slug, { ...(payload.globals.get(slug) ?? {}), ...clone(data) });
      return clone(payload.globals.get(slug));
    },
    async findByID({ collection, id, req }: any) {
      const doc = coll(target(req), collection).get(String(id));
      if (!doc) throw new Error(`fakePayload: ${collection} ${id} not found`);
      return clone(doc);
    },
    async find({ collection, where, limit = 10, page = 1, req }: any) {
      const docs = [...coll(target(req), collection).values()].filter((d) => matches(d, where));
      const slice = docs.slice((page - 1) * limit, page * limit);
      return { docs: slice.map(clone), hasNextPage: page * limit < docs.length, totalDocs: docs.length };
    },
    async create({ collection, data, req }: any) {
      calls.push({ op: 'create', collection, data: clone(data) });
      maybeFail('create', collection);
      const id = String(nextId++);
      const doc = { id, ...clone(data) };
      coll(target(req), collection).set(id, doc);
      return clone(doc);
    },
    async update({ collection, id, data, req, context }: any) {
      calls.push({ op: 'update', collection, data: clone(data), context });
      maybeFail('update', collection);
      const c = coll(target(req), collection);
      const existing = c.get(String(id));
      if (!existing) throw new Error(`fakePayload: ${collection} ${id} not found`);
      const doc = { ...existing, ...clone(data) };
      c.set(String(id), doc);
      return clone(doc);
    },
  };
  return payload;
}

export type FakePayload = ReturnType<typeof createFakePayload>;
