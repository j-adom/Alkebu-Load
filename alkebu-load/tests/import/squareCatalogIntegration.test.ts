/**
 * Integration tests for the Square catalog importer against a REAL Payload +
 * SQLite database -- not the pure-function unit tests in
 * squareCatalogMapping.test.ts / squareStagingWorkflow.test.ts / squareEditionMerge.test.ts,
 * which never touch a database at all.
 *
 * Every one of the nine original defects this importer fixes was a schema-contract
 * violation (a plain string written into a relationship field, an array field silently
 * wholesale-replaced, a divide-by-100 that a pure-function test with hand-built
 * expectations would happily agree with). Only writing to and reading back from a real
 * Payload instance can catch that class of bug -- these tests do exactly that.
 *
 * HARNESS: this is the first DB-integration test in this codebase (no prior test ever
 * loads payload.config.ts or calls getPayload). It uses an explicit, disposable SQLite
 * file created and deleted by this file -- never the developer's alkebulanimages.db.
 * `payload.config.ts` reads `DATABASE_URI` at module load time to pick its adapter, so
 * the env var is set BEFORE a dynamic `import('../../src/payload.config')` -- a static
 * top-of-file import would read the env too late, before `before()` has set anything.
 *
 * External services are never called:
 *  - 'square' is replaced by a module customization hook (`node:module`'s `register()`,
 *    NOT the deprecated `--experimental-loader` flag and NOT
 *    `--experimental-test-module-mocks` -- both were tried first and reverted: the module-
 *    mocks flag requires Node >=22.3.0, but this repo's `engines.node` declares
 *    `^18.20.2 || >=20.9.0`, so landing it in package.json's `test` script would fail the
 *    ENTIRE suite to even start on any declared-supported Node below 22.3). `register()`
 *    is called at the very top of THIS file (`node --test` forks one process per file, so
 *    the hook never touches any other test file's module resolution) and points
 *    `support/squareLoader.mjs`'s resolve hook at `support/squareStub.mjs`, which every
 *    `import('square')` -- including squareCatalogSync.ts's lazy, memoized one -- resolves
 *    to instead. `squareStub.mjs`'s `setCatalogItems` mutates a module-scope box that
 *    `catalog.list()` reads at CALL time, not at construction time -- that is what lets
 *    each test drive a different catalog response through the one long-lived, memoized
 *    client.
 *  - The same `register()` call also loads this repo's existing `css-stub-loader.mjs`
 *    (previously a `--loader` flag in package.json's `test` script, reverted for the same
 *    reason: it printed an unsuppressed ExperimentalWarning into the TAP stream for every
 *    one of this repo's ~14 test-file processes, not just this one). It stubs out the
 *    `.css` import that `Books.tsx` pulls in transitively via `EnrichBookButton` ->
 *    `react-image-crop`, which node's ESM loader otherwise rejects with
 *    `ERR_UNKNOWN_FILE_EXTENSION`.
 *  - `DISABLE_AUTO_BOOK_ENRICHMENT=true` stops Books' beforeValidate hook from calling
 *    ISBNdb/Google Books. This matters beyond our own direct Book writes: promoteStagedItem
 *    (squareStagingWorkflow.ts) creates Books via a `req` that carries no
 *    `context.skipEnrichment` flag, so only the global env var -- not the per-call context
 *    pattern runSquareCatalogSync uses -- stops it from making live HTTP calls too.
 *  - `SKIP_EMAIL_VERIFY=true` stops the nodemailer transport from verifying real SMTP
 *    credentials against SES on every Payload boot.
 *
 * A CRITICAL LIMITATION, understood and accepted before this file was written: on this
 * repo's local SQLite adapter, `payload.db.beginTransaction()` returns `null` (real
 * transactions are enabled only with a truthy `transactionOptions`, which this config does
 * not pass). Test 9 (concurrent promotion) is written with that fact already priced in --
 * see its comment for exactly what it can and cannot prove here.
 */

import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert';
import { after, before, test } from 'node:test';
import fs from 'node:fs';

import type { Payload } from 'payload';

import { setCatalogItems } from './support/squareStub.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// None of the imports above touch 'square' or a '.css' specifier, so registering these
// hooks here -- before the dynamic imports inside before() run, which is the only place
// either specifier is ever hit -- is early enough. (ESM import statements are always
// fully evaluated before a module's own top-level statements run, regardless of where in
// the file those statements are textually written, so this does not need to be the
// literal first line for correctness -- it needs to run before payload.config.ts's
// eventual `await import('square')`, which only happens much later, inside a test.)
register(pathToFileURL(path.resolve(__dirname, 'support/squareLoader.mjs')).href);
register(pathToFileURL(path.resolve(__dirname, '../../css-stub-loader.mjs')).href);

const DB_PATH = path.resolve(__dirname, '../../.tmp-integration-square-catalog.db');

const cleanupDbFiles = () => {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    try {
      fs.unlinkSync(DB_PATH + suffix);
    } catch {
      // Fine if it never existed (first run) or was already removed.
    }
  }
};

let payload: Payload;
let runSquareCatalogSync: (payload: Payload) => Promise<{
  created: number;
  updated: number;
  staged: number;
  skippedNonBook: number;
  unresolved: number;
}>;
let promoteStagedItem: (
  payload: any,
  stagingId: string | number,
  user: unknown,
) => Promise<{ bookId: string | number }>;

before(async () => {
  cleanupDbFiles();

  // NODE_ENV is typed read-only in this repo's tsconfig (see jobRunnerConfig.ts's
  // comment on the same over-constrained NodeJS.ProcessEnv); assign through `as any`.
  (process.env as any).NODE_ENV = 'test';
  process.env.DATABASE_URI = `file:${DB_PATH}`;
  process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'integration-test-secret-at-least-32-chars-long';
  process.env.PAYLOAD_PUBLIC_SERVER_URL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000';
  process.env.SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || 'test-square-token';
  process.env.DISABLE_AUTO_BOOK_ENRICHMENT = 'true';
  process.env.SKIP_EMAIL_VERIFY = 'true';
  process.env.STAFF_NOTIFICATION_EMAIL = process.env.STAFF_NOTIFICATION_EMAIL || 'staff@example.test';
  process.env.FROM_EMAIL = process.env.FROM_EMAIL || 'orders@example.test';
  // Never let this run touch a real bucket, and never let jobs auto-run on a timer --
  // every job in these tests is queued and run explicitly.
  delete process.env.R2_ACCESS_KEY_ID;
  delete process.env.ENABLE_JOB_AUTORUN;

  const configModule = await import('../../src/payload.config');
  const config = await configModule.default;
  // Stop Payload from spawning a background `generate:types` process on init that would
  // otherwise overwrite the repo's real src/payload-types.ts as a side effect of running
  // the test suite.
  (config as any).typescript.autoGenerate = false;

  const { getPayload } = await import('payload');
  payload = await getPayload({ config });

  ({ runSquareCatalogSync } = await import('../../src/app/utils/squareCatalogSync'));
  ({ promoteStagedItem } = await import('../../src/app/utils/squareStagingWorkflow'));
});

after(async () => {
  if (payload) {
    await payload.destroy();
  }
  cleanupDbFiles();
});

// ---- fixture helpers -------------------------------------------------------

// Checksum-valid ISBN-13s, reused across tests. editions.isbn carries no uniqueness
// constraint in the Books schema, so reuse across unrelated fixtures is safe.
const VALID_A = '9780310180302';
const VALID_B = '9780062457714';

const squareVariation = (id: string, sku: string | undefined, amountCents: number | undefined) => ({
  id,
  itemVariationData: {
    ...(sku === undefined ? {} : { sku }),
    ...(amountCents === undefined ? {} : { priceMoney: { amount: BigInt(amountCents) } }),
  },
});

const squareItem = (
  id: string | undefined,
  variations: unknown[],
  opts: { name?: string; updatedAt?: Date; publisherName?: string } = {},
) => ({
  type: 'ITEM',
  ...(id === undefined ? {} : { id }),
  updatedAt: (opts.updatedAt ?? new Date()).toISOString(),
  itemData: {
    name: opts.name ?? 'Untitled Test Item',
    variations,
    ...(opts.publisherName ? { publisherName: opts.publisherName } : {}),
  },
});

const findStagingByItemId = async (squareItemId: string) => {
  const result = await payload.find({
    collection: 'square-catalog-staging' as any,
    where: { squareItemId: { equals: squareItemId } },
    limit: 1,
  });
  return (result.docs[0] as any) ?? null;
};

const findBookByItemId = async (squareItemId: string) => {
  const result = await payload.find({
    collection: 'books',
    where: { squareItemId: { equals: squareItemId } },
    limit: 1,
    depth: 0,
  });
  return (result.docs[0] as any) ?? null;
};

const countBooksByItemId = async (squareItemId: string): Promise<number> => {
  const result = await payload.find({
    collection: 'books',
    where: { squareItemId: { equals: squareItemId } },
    limit: 100,
    depth: 0,
  });
  return result.docs.length;
};

const drainJobQueue = async (maxIterations = 6) => {
  for (let i = 0; i < maxIterations; i++) {
    const result: any = await (payload as any).jobs.run({ limit: 10 });
    if (result?.noJobsRemaining) return;
  }
};

// ---- 12. Staged items are unreachable from every customer-facing surface -------------
//
// Deliberately runs FIRST in this file, not last. `books` and `square-catalog-staging`
// are separate SQLite auto-increment integer sequences that both start at 1 -- the
// addToCart check below deliberately reuses the staging row's REAL id as a Book
// productId (the actual attack: a staging id mistaken for a book id), and that
// assertion is only meaningful while zero Books exist anywhere in the database. Once
// tests 1-11 start creating Books, `staging.id` could coincidentally collide with an
// unrelated real Book's id and the check would pass or fail for the wrong reason. This
// test creates its own control Book (for the search positive control, see below) only
// AFTER the addToCart check runs.

test('12. a staged (unpromoted) item is unreachable via search, book lookup, and addToCart', async () => {
  const itemId = 'ITEM-T12-UNREACHABLE';
  const uniqueTitle = 'Totally Unpromoted Staged Item T12 Zzyzx';

  setCatalogItems([squareItem(itemId, [squareVariation('V1', 'SHELF-TAG-12', 999)], { name: uniqueTitle })]);
  await runSquareCatalogSync(payload);

  const staging = await findStagingByItemId(itemId);
  assert.ok(staging, 'expected the item to land in staging, not as a Book');
  assert.strictEqual(await findBookByItemId(itemId), null);

  // --- addToCart: the actual attack is a staging row's id reused as a Book productId,
  // not an arbitrary garbage string (which only tests the weaker "unknown id is refused"
  // guarantee). Must run before any Book exists in the suite -- see the comment above.
  const { addToCart, getCartItems } = await import('../../src/app/utils/cartOperations');
  const cart = await payload.create({
    collection: 'carts',
    data: { sessionId: 'test-session-t12', status: 'active', totalAmount: 0 },
  });
  const addResult = await addToCart(
    payload,
    String(cart.id),
    { productId: String(staging.id), productType: 'books', quantity: 1 },
    'test-session-t12',
  );
  assert.strictEqual(addResult.success, false, 'a staging row\'s id reused as a Book productId must be refused');
  assert.strictEqual(
    (await getCartItems(payload, String(cart.id))).length,
    0,
    'a refused add must leave no CartItem behind',
  );

  // --- Book detail lookup: the same Payload query a book-detail page uses (find by
  // slug/title on the `books` collection) must return nothing. alkebu-load has no
  // dedicated book-detail API route of its own (that loader lives in alkebu-web, out of
  // scope for this repo) -- this exercises the same `books` collection lookup any such
  // loader is ultimately backed by, which is the actual boundary that keeps staged data
  // out: a staging row is never a Book, in any collection query, by any field.
  const detailLookup = await payload.find({
    collection: 'books',
    where: { or: [{ title: { equals: uniqueTitle } }, { squareItemId: { equals: itemId } }] },
    limit: 1,
    depth: 0,
  });
  assert.strictEqual(detailLookup.docs.length, 0, 'no Book detail lookup can ever find a staged-only item');

  // --- /api/search: a positive control FIRST. Without it, a broken search route, a
  // failed FlexSearch bootstrap, or a response-shape mismatch all make `allResults` `[]`,
  // and "the staged title is absent" would pass trivially for the wrong reason -- this is
  // exactly the failure mode this whole suite exists to catch. Seed a real, purchasable
  // Book and confirm search finds IT before trusting that it correctly excludes the
  // staged one.
  const controlTitle = 'Findable Control Book T12 Quetzalcoatl';
  await payload.create({
    collection: 'books',
    data: {
      title: controlTitle,
      pricing: { retailPrice: 1500 },
      editions: [{ isbn: VALID_B, pricing: { retailPrice: 1500 }, isAvailable: true }],
      importSource: 'manual',
    } as any,
    context: { skipEnrichment: true },
  });

  const { GET: searchGET } = await import('../../src/app/api/search/route');
  const { NextRequest } = await import('next/server');

  const controlReq = new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(controlTitle)}`);
  const controlRes: Response = await (searchGET as any)(controlReq);
  const controlJson: any = await controlRes.json();
  const controlResults = [...(controlJson.internal || []), ...(controlJson.external || [])];
  assert.ok(
    controlResults.some((r: any) => r.title === controlTitle),
    'positive control failed: a real, published Book must be findable by search, or the absence check below is meaningless',
  );

  const stagedReq = new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(uniqueTitle)}`);
  const stagedRes: Response = await (searchGET as any)(stagedReq);
  const stagedJson: any = await stagedRes.json();
  const stagedResults = [...(stagedJson.internal || []), ...(stagedJson.external || [])];
  assert.ok(
    !stagedResults.some((r: any) => r.title === uniqueTitle),
    'a staged item must never appear in search results',
  );
});

// ---- 1. Incomplete creation --------------------------------------------------

test('1. no valid ISBN: stages the item, writes no Book, and never fabricates an ISBN', async () => {
  const itemId = 'ITEM-T1-NO-ISBN';
  setCatalogItems([squareItem(itemId, [squareVariation('V1', 'SHELF-TAG-1', 1999)], { name: 'Mystery Book T1' })]);

  await runSquareCatalogSync(payload);

  const staging = await findStagingByItemId(itemId);
  assert.ok(staging, 'expected a staging row');
  assert.strictEqual(staging.reviewStatus, 'needs-review');
  assert.strictEqual(staging.proposedIsbn ?? null, null, 'an unvalidated SKU must never be written as proposedIsbn');
  // Positive control: proposedTitle IS captured (mapSquareItemToBook forwards a usable
  // title even when other fields are missing) -- without this, the proposedIsbn check
  // above would pass identically whether the mapper correctly declined the SKU or Payload
  // silently dropped the field for an unrelated reason.
  assert.strictEqual(staging.proposedTitle, 'Mystery Book T1');
  assert.ok(
    staging.validationIssues.some((i: any) => i.field === 'editions.isbn'),
    'the ISBN issue must be recorded',
  );

  const book = await findBookByItemId(itemId);
  assert.strictEqual(book, null, 'no Book may exist for an incomplete item');
});

// ---- 2. No price --------------------------------------------------------------

test('2. no price: stages the item, writes no Book, and never fabricates a $0 price', async () => {
  const itemId = 'ITEM-T2-NO-PRICE';
  setCatalogItems([squareItem(itemId, [squareVariation('V1', VALID_A, undefined)], { name: 'Priceless Book T2' })]);

  await runSquareCatalogSync(payload);

  const staging = await findStagingByItemId(itemId);
  assert.ok(staging, 'expected a staging row');
  assert.strictEqual(staging.proposedPriceCents ?? null, null);
  // Positive control: the ISBN on this item IS valid, so proposedIsbn should equal it --
  // without this, the proposedPriceCents check above would pass identically whether the
  // mapper correctly declined the missing price or Payload silently dropped the field.
  assert.strictEqual(staging.proposedIsbn, VALID_A);
  assert.ok(staging.validationIssues.some((i: any) => i.field === 'editions.pricing.retailPrice'));

  const book = await findBookByItemId(itemId);
  assert.strictEqual(book, null);

  // Belt-and-suspenders: even if some Book slipped through under this id, it must never
  // carry a fabricated zero price -- the mapper is contractually forbidden from coercing
  // a missing price to 0.
  const anyZeroPriced = await payload.find({
    collection: 'books',
    where: {
      and: [{ squareItemId: { equals: itemId } }, { 'pricing.retailPrice': { equals: 0 } }],
    },
    limit: 1,
    depth: 0,
  });
  assert.strictEqual(anyZeroPriced.docs.length, 0);
});

// ---- 3. Complete creation -------------------------------------------------------

test('3. complete item: creates a Book with a cents price, publisherText set, publisher unset, importSource square-webhook', async () => {
  const itemId = 'ITEM-T3-COMPLETE';
  setCatalogItems([
    squareItem(itemId, [squareVariation('V1', VALID_A, 2299)], {
      name: 'Complete Book T3',
      publisherName: 'Raw Publisher Name T3',
    }),
  ]);

  await runSquareCatalogSync(payload);

  const book = await findBookByItemId(itemId);
  assert.ok(book, 'expected a Book to be created');
  assert.strictEqual(book.importSource, 'square-webhook');
  // priceMoney.amount is already cents -- the old webhook's /100 bug would make this 22.
  assert.strictEqual(book.pricing.retailPrice, 2299);

  const [edition] = book.editions;
  assert.strictEqual(edition.isbn, VALID_A);
  assert.strictEqual(edition.publisherText, 'Raw Publisher Name T3');
  assert.strictEqual(edition.publisher ?? null, null, 'publisher relationship must never receive a raw string');
});

// ---- 4. Edition preservation ------------------------------------------------------

test('4. edition preservation: a thin Square payload keeps curated isbn10/publisher/datePublished/pages/dimensions', async () => {
  const itemId = 'ITEM-T4-THIN';

  const publisher = await payload.create({
    collection: 'publishers',
    data: { name: 'Curated Publisher T4' },
  });

  const seeded = await payload.create({
    collection: 'books',
    data: {
      title: 'Curated Book T4',
      squareItemId: itemId,
      pricing: { retailPrice: 1000 },
      editions: [
        {
          isbn: VALID_A,
          isbn10: '0310180309',
          publisher: publisher.id,
          datePublished: '1999-05-01T00:00:00.000Z',
          pages: 342,
          dimensions: '6 x 9 x 1 in',
          squareVariationId: 'V1',
          pricing: { retailPrice: 1000 },
          isAvailable: true,
        },
      ],
      importSource: 'square-webhook',
    } as any,
    context: { skipEnrichment: true },
  });

  // A thin Square re-sync of the SAME variation: only isbn + price, nothing curated.
  setCatalogItems([
    squareItem(itemId, [squareVariation('V1', VALID_A, 1500)], { name: 'Curated Book T4' }),
  ]);

  await runSquareCatalogSync(payload);

  const updated: any = await payload.findByID({ collection: 'books', id: seeded.id, depth: 0 });
  const [edition] = updated.editions;

  assert.strictEqual(edition.pricing.retailPrice, 1500, 'Square owns price and must update it');
  assert.strictEqual(edition.isbn10, '0310180309', 'isbn10 is not Square\'s to touch');
  assert.strictEqual(
    typeof edition.publisher === 'object' ? edition.publisher?.id ?? edition.publisher : edition.publisher,
    publisher.id,
  );
  assert.strictEqual(new Date(edition.datePublished).toISOString(), '1999-05-01T00:00:00.000Z');
  assert.strictEqual(edition.pages, 342);
  assert.strictEqual(edition.dimensions, '6 x 9 x 1 in');
});

// ---- 5. Stock never clobbered ------------------------------------------------------

test('5. stock never clobbered: a catalog write leaves a previously written stockLevel intact', async () => {
  const itemId = 'ITEM-T5-STOCK';

  const seeded = await payload.create({
    collection: 'books',
    data: {
      title: 'Stocked Book T5',
      squareItemId: itemId,
      pricing: { retailPrice: 1200 },
      editions: [
        {
          isbn: VALID_A,
          squareVariationId: 'V1',
          pricing: { retailPrice: 1200 },
          inventory: { stockLevel: 7 },
          isAvailable: true,
        },
      ],
      importSource: 'square-webhook',
    } as any,
    context: { skipEnrichment: true },
  });

  setCatalogItems([squareItem(itemId, [squareVariation('V1', VALID_A, 1800)], { name: 'Stocked Book T5' })]);
  await runSquareCatalogSync(payload);

  const updated: any = await payload.findByID({ collection: 'books', id: seeded.id, depth: 0 });
  const [edition] = updated.editions;
  assert.strictEqual(edition.pricing.retailPrice, 1800, 'the price change from Square must still land');
  assert.strictEqual(edition.inventory.stockLevel, 7, 'stockLevel is not Square catalog\'s field to touch');
});

// ---- 6. Interleaving (real job queue) ------------------------------------------------

test('6. interleaving: a queued catalog-sync and inventory-sync job for the same book leave the inventory value as final stock', async () => {
  const itemId = 'ITEM-T6-INTERLEAVE';
  const variationId = 'V1-T6';

  const seeded = await payload.create({
    collection: 'books',
    data: {
      title: 'Interleaved Book T6',
      squareItemId: itemId,
      pricing: { retailPrice: 1000 },
      editions: [
        {
          isbn: VALID_A,
          squareVariationId: variationId,
          pricing: { retailPrice: 1000 },
          inventory: { stockLevel: 3, trackQuantity: true },
          isAvailable: true,
        },
      ],
      importSource: 'square-webhook',
    } as any,
    context: { skipEnrichment: true },
  });

  // The catalog sync will see a NEW price for the same variation; the inventory sync
  // will see a NEW stock count for the same variation. Neither task's own logic touches
  // the other's field (mergeEditions never touches inventory; the inventory sync only
  // ever touches inventory.stockLevel) -- what this test actually exercises is the
  // *real* job queue honoring the shared 'books-write' concurrency key so the two writes
  // to the SAME editions[] array (a field Payload replaces wholesale, not row-by-row)
  // never interleave into a lost update.
  setCatalogItems([squareItem(itemId, [squareVariation(variationId, VALID_A, 2500)], { name: 'Interleaved Book T6' })]);

  await (payload as any).jobs.queue({ task: 'square-catalog-sync', input: {} });
  await (payload as any).jobs.queue({
    task: 'square-inventory-sync',
    input: { counts: [{ catalog_object_id: variationId, quantity: '12', state: 'IN_STOCK' }] },
  });

  // Both jobs share the exclusive 'books-write' concurrency key, so Payload's runner
  // only ever runs ONE of them per run() call and releases the other back to pending
  // (see runJobs' concurrencyKey de-duplication) -- draining requires multiple run()
  // calls, not one.
  await drainJobQueue();

  const updated: any = await payload.findByID({ collection: 'books', id: seeded.id, depth: 0 });
  const [edition] = updated.editions;
  assert.strictEqual(edition.inventory.stockLevel, 12, 'final stock must be the inventory sync\'s value, whichever job ran first');
  assert.strictEqual(edition.pricing.retailPrice, 2500, 'the catalog sync\'s price update must also have landed, not been lost to interleaving');
});

// ---- 7. Repeat delivery ---------------------------------------------------------

test('7. repeat delivery: the same complete event twice yields one Book; the same incomplete event twice yields one staging row', async () => {
  const completeId = 'ITEM-T7-COMPLETE-REPEAT';
  setCatalogItems([squareItem(completeId, [squareVariation('V1', VALID_A, 3000)], { name: 'Repeat Book T7' })]);
  await runSquareCatalogSync(payload);
  await runSquareCatalogSync(payload);
  assert.strictEqual(await countBooksByItemId(completeId), 1, 'redelivering a complete event must not create a second Book');

  const incompleteId = 'ITEM-T7-INCOMPLETE-REPEAT';
  setCatalogItems([squareItem(incompleteId, [squareVariation('V1', 'SHELF-TAG-7', 1000)], { name: 'Repeat Incomplete T7' })]);
  await runSquareCatalogSync(payload);
  await runSquareCatalogSync(payload);

  const stagingRows = await payload.find({
    collection: 'square-catalog-staging' as any,
    where: { squareItemId: { equals: incompleteId } },
    limit: 10,
  });
  assert.strictEqual(stagingRows.docs.length, 1, 'redelivering an incomplete event must not create a second staging row');
});

// ---- 8. Concurrent creation -----------------------------------------------------

test('8. concurrent creation: two simultaneous syncs for one unseen squareItemId yield exactly one Book', async () => {
  const itemId = 'ITEM-T8-CONCURRENT-CREATE';
  setCatalogItems([squareItem(itemId, [squareVariation('V1', VALID_B, 1750)], { name: 'Concurrent Book T8' })]);

  // Both calls read the mocked catalog fresh each time via the shared box, so this
  // genuinely races two full sync runs against the SAME unseen squareItemId -- the
  // unique constraint + recover-by-update path in squareCatalogSync.ts is what has to
  // hold here, not a pre-emptive existence check.
  await Promise.all([runSquareCatalogSync(payload), runSquareCatalogSync(payload)]);

  const count = await countBooksByItemId(itemId);
  assert.strictEqual(count, 1, 'a race on create must recover by updating, never leave two Books');

  const book = await findBookByItemId(itemId);
  assert.strictEqual(book.pricing.retailPrice, 1750);
});

// ---- 9. Concurrent promotion -----------------------------------------------------

test('9. concurrent promotion: two simultaneous promotions of one staging row leave a single, consistent promoted state', async () => {
  // LIMITATION (see file header): payload.db.beginTransaction() returns null on this
  // repo's SQLite config, so promoteStagedItem's re-read-inside-a-transaction guard runs
  // with NO real transaction -- it cannot demonstrate database-level isolation here. This
  // test therefore does NOT assert "exactly one Book" as the reason something works;
  // instead it asserts the two invariants that hold independently of that guard:
  //   (a) Books.squareItemId carries a real unique DB constraint, enforced by SQLite on
  //       every INSERT regardless of transactions, so a genuine double-create must still
  //       surface as a rejected promotion, not a silent duplicate;
  //   (b) whichever call wins, the staging row ends in a single well-defined terminal
  //       state (promoted, pointing at a real Book) -- not split-brained.
  // Real cross-call mutual exclusion via the transactional guard itself is verified when
  // this suite is re-run against Postgres with real transactions in Task 8.
  //
  // Assert the premise itself, not just state it in prose -- if this ever starts failing,
  // the SQLite adapter config changed to enable real transactions and this test's
  // reasoning (and its weakened assertions below) need to be revisited for a stronger
  // "exactly one Book, via the transactional guard" check.
  const transactionProbe = await payload.db.beginTransaction();
  if (transactionProbe !== null) {
    await payload.db.rollbackTransaction(transactionProbe);
  }
  assert.strictEqual(
    transactionProbe,
    null,
    'this test\'s SQLite-specific reasoning assumes beginTransaction() returns null -- it no longer does',
  );

  const itemId = 'ITEM-T9-CONCURRENT-PROMOTE';
  const rawItem = squareItem(itemId, [squareVariation('V1', VALID_A, 2100)], { name: 'Ready Book T9' });

  const { toJsonSafe } = await import('../../src/app/utils/jsonSafe');
  const stagingRow = await payload.create({
    collection: 'square-catalog-staging' as any,
    data: {
      squareItemId: itemId,
      squareCatalogVersion: '1',
      squareUpdatedAt: new Date().toISOString(),
      rawItem: toJsonSafe(rawItem),
      validationIssues: [{ field: '-', code: 'resolved' }],
      reviewStatus: 'ready',
      lastSeenAt: new Date().toISOString(),
    },
  });

  const staffUser = { id: 'staff-t9', role: 'staff' };
  const settled = await Promise.allSettled([
    promoteStagedItem(payload, stagingRow.id, staffUser),
    promoteStagedItem(payload, stagingRow.id, staffUser),
  ]);

  const fulfilled = settled.filter((r): r is PromiseFulfilledResult<{ bookId: string | number }> => r.status === 'fulfilled');
  assert.ok(fulfilled.length >= 1, 'at least one of the two concurrent promotions must succeed');

  const finalStaging: any = await payload.findByID({ collection: 'square-catalog-staging' as any, id: stagingRow.id });
  assert.strictEqual(finalStaging.reviewStatus, 'promoted');
  assert.ok(finalStaging.promotedBook != null, 'promotedBook must be set on the staging row');

  const promotedBookId =
    typeof finalStaging.promotedBook === 'object' ? finalStaging.promotedBook.id : finalStaging.promotedBook;
  const promotedBook: any = await payload.findByID({ collection: 'books', id: promotedBookId, depth: 0 });
  assert.ok(promotedBook, 'the staging row\'s promotedBook must reference a real Book document');
  assert.strictEqual(promotedBook.squareItemId, itemId);

  // The unique constraint on Books.squareItemId is what actually prevents a duplicate
  // Book here (see comment above) -- confirm it held.
  assert.strictEqual(await countBooksByItemId(itemId), 1, 'the Books.squareItemId unique constraint must prevent a second Book even without a real transaction');
});

// ---- 10. Rejected stickiness -----------------------------------------------------

test('10. rejected stickiness: a rejected row re-observed as complete stays rejected and creates no Book', async () => {
  const itemId = 'ITEM-T10-REJECTED';

  setCatalogItems([squareItem(itemId, [squareVariation('V1', 'SHELF-TAG-10', 1000)], { name: 'Rejected Book T10' })]);
  await runSquareCatalogSync(payload);

  const staging = await findStagingByItemId(itemId);
  assert.ok(staging, 'expected a staging row before rejection');
  await payload.update({
    collection: 'square-catalog-staging' as any,
    id: staging.id,
    data: { reviewStatus: 'rejected' },
  });

  // Square now supplies everything the item was missing.
  setCatalogItems([squareItem(itemId, [squareVariation('V1', VALID_A, 1000)], { name: 'Rejected Book T10' })]);
  await runSquareCatalogSync(payload);

  const stagingAfter = await findStagingByItemId(itemId);
  assert.ok(stagingAfter, 'the staging row must still exist');
  assert.strictEqual(stagingAfter.reviewStatus, 'rejected', 'rejected must be sticky even once the item becomes complete');

  const book = await findBookByItemId(itemId);
  assert.strictEqual(book, null, 'a rejected row must never resurrect into a Book');
});

// ---- 11. Checkpoint holds on failure ------------------------------------------------

test('11. checkpoint holds on failure: one unresolved item prevents the watermark advancing past it, and the job throws', async () => {
  const okItemId = 'ITEM-T11-OK';
  const badItemUpdatedAt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

  setCatalogItems([
    squareItem(okItemId, [squareVariation('V1', VALID_B, 1600)], { name: 'Resolvable Book T11' }),
    // No `id` at all -- squareCatalogSync.ts throws 'Square catalog item has no id',
    // which is caught per-item and marks this item unresolved. It can never be written
    // OR staged, so it must hold the watermark.
    squareItem(undefined, [squareVariation('V1', VALID_A, 1600)], {
      name: 'Unresolvable Item T11',
      updatedAt: badItemUpdatedAt,
    }),
  ]);

  await assert.rejects(
    () => runSquareCatalogSync(payload),
    /neither written nor staged/i,
    'a run with an unresolved item must throw so Payload retries it',
  );

  // The resolvable item in the SAME run must still have been written -- one bad item
  // does not abort the whole run, only holds the checkpoint.
  const okBook = await findBookByItemId(okItemId);
  assert.ok(okBook, 'a resolvable item in the same run as an unresolved one must still be written');

  const state: any = await payload.findGlobal({ slug: 'squareSyncState' as any });
  const checkpoint = new Date(state.catalogSyncedThrough).getTime();
  assert.strictEqual(
    checkpoint,
    badItemUpdatedAt.getTime(),
    'checkpoint must be pinned to the oldest unresolved item, not advanced to "now"',
  );
  assert.ok(state.lastRunUnresolved >= 1);
});

