/**
 * Integration tests for Ingram enrichment against a REAL Payload instance on a disposable
 * SQLite file, using the same harness as tests/import/squareCatalogIntegration.test.ts
 * (that suite is also SQLite, not Postgres: there is no Postgres in the test setup).
 *
 * What only a real instance proves: the Books hooks (manual-edit stamping, titleLong), the
 * enrichment group / json / relationship fields round-tripping, the review queue's queries,
 * and idempotency through real reads. Atomicity is NOT provable here: this repo's SQLite
 * adapter runs without transactions (beginTransaction returns null). It is covered by
 * applyEnrichment.test.ts against a transactional fake, and by Postgres in production.
 *
 * No external service is called: DISABLE_AUTO_BOOK_ENRICHMENT stops ISBNdb/Google lookups,
 * SKIP_EMAIL_VERIFY stops SMTP verification, and nothing here touches Square.
 */
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import fs from 'node:fs';

import type { Payload } from 'payload';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.resolve(__dirname, '../../css-stub-loader.mjs')).href);

const DB_PATH = path.resolve(__dirname, '../../.tmp-integration-ingram-enrichment.db');
const cleanupDbFiles = () => {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    try {
      fs.unlinkSync(DB_PATH + suffix);
    } catch {
      // Not there: fine.
    }
  }
};

let payload: Payload;
let mod: {
  applyEnrichment: typeof import('../../src/app/utils/ingram/applyEnrichment').applyEnrichment;
  loadRejectedProposals: typeof import('../../src/app/utils/ingram/applyEnrichment').loadRejectedProposals;
  diffEnrichment: typeof import('../../src/app/utils/ingram/diffEnrichment').diffEnrichment;
  acceptReview: typeof import('../../src/app/utils/ingram/reviewWorkflow').acceptReview;
  rejectReview: typeof import('../../src/app/utils/ingram/reviewWorkflow').rejectReview;
};

before(async () => {
  cleanupDbFiles();
  (process.env as any).NODE_ENV = 'test';
  process.env.DATABASE_URI = `file:${DB_PATH}`;
  process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'integration-test-secret-at-least-32-chars-long';
  process.env.PAYLOAD_PUBLIC_SERVER_URL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000';
  process.env.DISABLE_AUTO_BOOK_ENRICHMENT = 'true';
  process.env.SKIP_EMAIL_VERIFY = 'true';
  process.env.STAFF_NOTIFICATION_EMAIL = process.env.STAFF_NOTIFICATION_EMAIL || 'staff@example.test';
  process.env.FROM_EMAIL = process.env.FROM_EMAIL || 'orders@example.test';
  delete process.env.R2_ACCESS_KEY_ID;
  delete process.env.ENABLE_JOB_AUTORUN;

  const config = await (await import('../../src/payload.config')).default;
  (config as any).typescript.autoGenerate = false;
  const { getPayload } = await import('payload');
  payload = await getPayload({ config });

  const apply = await import('../../src/app/utils/ingram/applyEnrichment');
  const diff = await import('../../src/app/utils/ingram/diffEnrichment');
  const review = await import('../../src/app/utils/ingram/reviewWorkflow');
  mod = {
    applyEnrichment: apply.applyEnrichment,
    loadRejectedProposals: apply.loadRejectedProposals,
    diffEnrichment: diff.diffEnrichment,
    acceptReview: review.acceptReview,
    rejectReview: review.rejectReview,
  };
});

after(async () => {
  if (payload) await payload.destroy();
  cleanupDbFiles();
});

// Synthetic, checksum-valid EANs.
let eanCounter = 0;
const EANS = ['9780000000002', '9780000000019', '9780000000026', '9780000000033', '9780000000040'];
const nextEan = () => EANS[eanCounter++];

async function createBook(ean: string, overrides: Record<string, unknown> = {}) {
  return (await payload.create({
    collection: 'books',
    data: {
      title: 'Wayward Lives: Beautiful Experiments by Jane Doe',
      authorsText: [{ name: 'Jane Doe' }],
      synopsis: 'Curated copy',
      pricing: { retailPrice: 1999 },
      editions: [{ isbn: ean, pages: 200, pricing: { retailPrice: 1999 } }],
      ...overrides,
    } as any,
    depth: 0,
  })) as any;
}

const readBook = async (id: string | number) => (await payload.findByID({ collection: 'books', id, depth: 0 })) as any;

const candidateFor = (ean: string, synopsis = 'Ingram copy') => ({
  ean,
  recordDate: '2026-09-15',
  book: { title: 'Wayward Lives', subtitle: 'Beautiful Experiments', contributors: ['Jane Doe'], synopsis, publisherText: 'Example Press' },
  edition: { pages: 312, 'pricing.shippingWeight': 16.8, listPriceCents: 2499 },
});

const reviewsFor = async (bookId: string | number) =>
  (
    await payload.find({
      collection: 'ingram-enrichment-review' as any,
      where: { book: { equals: bookId } },
      sort: 'createdAt',
      depth: 0,
      limit: 50,
    })
  ).docs as any[];

const logsFor = async (bookId: string | number) =>
  (await payload.find({ collection: 'ingram-enrichment-log' as any, where: { book: { equals: bookId } }, depth: 0, limit: 100 })).docs as any[];

test('apply writes, stamps provenance, derives titleLong, logs each value; a rerun is a no-op', async () => {
  const ean = nextEan();
  const created = await createBook(ean);
  const candidate = candidateFor(ean);

  const first = await mod.applyEnrichment(payload as any, created, mod.diffEnrichment(created, candidate), 'run-1');
  const book = await readBook(created.id);
  assert.equal(book.title, 'Wayward Lives');
  assert.equal(book.subtitle, 'Beautiful Experiments');
  assert.equal(book.titleLong, 'Wayward Lives: Beautiful Experiments');
  assert.equal(book.editions[0].pages, 312);
  assert.equal(book.editions[0].pricing.retailPrice, 2499);
  assert.equal(book.publisherText, 'Example Press');
  assert.equal(book.synopsis, 'Curated copy');
  assert.equal(book.enrichment.fieldSources.title.source, 'ingram');
  assert.ok(book.enrichment.ingramEnrichedAt);
  assert.equal((await logsFor(created.id)).length, first.logged);
  assert.equal(first.queued, 1);

  const rerun = mod.diffEnrichment(book, candidate);
  const second = await mod.applyEnrichment(payload as any, book, rerun, 'run-1');
  assert.equal(second.applied + second.logged + second.queued + second.superseded + second.deferred, 0);
  assert.equal((await reviewsFor(created.id)).length, 1);
});

test('a staff edit is stamped manual by the real Books hook, and the diff then protects it', async () => {
  const ean = nextEan();
  const created = await createBook(ean);
  await payload.update({
    collection: 'books',
    id: created.id,
    data: { editions: [{ ...created.editions[0], pages: 250 }] } as any,
    user: { id: 1, collection: 'users', role: 'staff' } as any,
    overrideAccess: true,
    depth: 0,
  });
  const book = await readBook(created.id);
  assert.equal(book.enrichment.fieldSources[`editions.${ean}.pages`].source, 'manual');
  const change = mod.diffEnrichment(book, candidateFor(ean)).find((c) => c.key === `editions.${ean}.pages`);
  assert.equal(change?.action, 'protected');
});

test('supersession, accept and reject against the real review collection', async () => {
  const ean = nextEan();
  const created = await createBook(ean);
  await mod.applyEnrichment(payload as any, created, mod.diffEnrichment(created, candidateFor(ean)), 'run-1');
  let book = await readBook(created.id);
  await mod.applyEnrichment(payload as any, book, mod.diffEnrichment(book, candidateFor(ean, 'Newer copy')), 'run-2');

  const rows = await reviewsFor(created.id);
  assert.deepEqual(
    rows.map((r) => [r.proposedValue.value, r.state]),
    [
      ['Ingram copy', 'superseded'],
      ['Newer copy', 'pending'],
    ],
  );

  const staff = await payload.create({
    collection: 'users',
    data: { email: `staff-${Date.now()}@example.test`, password: 'integration-pass-123', role: 'staff' } as any,
  });
  const staffUser = { ...staff, collection: 'users' };
  await mod.rejectReview(payload as any, rows[1].id, staffUser);
  const rejected = await mod.loadRejectedProposals(payload as any);
  book = await readBook(created.id);
  const again = mod.diffEnrichment(book, candidateFor(ean, 'Newer copy'), undefined, { rejected: rejected.get(String(created.id)) });
  assert.equal(again.find((c) => c.key === 'synopsis')?.action, 'same');

  // A different proposal is queued, then accepted.
  await mod.applyEnrichment(payload as any, book, mod.diffEnrichment(book, candidateFor(ean, 'Third copy'), undefined, { rejected: rejected.get(String(created.id)) }), 'run-3');
  const pending = (await reviewsFor(created.id)).find((r) => r.state === 'pending');
  assert.equal(pending.proposedValue.value, 'Third copy');
  await mod.acceptReview(payload as any, pending.id, staffUser);
  book = await readBook(created.id);
  assert.equal(book.synopsis, 'Third copy');
  assert.equal(book.enrichment.fieldSources.synopsis.source, 'ingram');
  const accepted = (await reviewsFor(created.id)).find((r) => r.id === pending.id);
  assert.equal(accepted.state, 'accepted');
  assert.ok((await logsFor(created.id)).some((l) => l.fieldPath === 'synopsis' && l.action === 'accept'));
});

test('the enrichment jobs are registered, share the Square lock, and are inert without INGRAM_ENRICHMENT_ENABLED', async () => {
  delete process.env.INGRAM_ENRICHMENT_ENABLED;
  const tasks = (payload.config.jobs?.tasks ?? []) as any[];
  for (const slug of ['ingram-enrich-titles', 'ingram-enrich-descriptions']) {
    const task = tasks.find((t) => t.slug === slug);
    assert.ok(task, `${slug} registered`);
    assert.equal(task.concurrency?.key?.({}), 'books-write');
    assert.ok(task.schedule?.length, `${slug} scheduled`);
    const result = await task.handler({ req: { payload }, input: {} });
    assert.deepEqual(result, { output: { skipped: 'INGRAM_ENRICHMENT_ENABLED is not true' } });
  }
});
