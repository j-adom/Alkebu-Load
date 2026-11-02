import assert from 'node:assert/strict';
import test from 'node:test';

import { createRateLimiter, handleLongTailSearch, type LongTailDeps } from '../../src/app/utils/longTail/longTailSearch';

const result = { ean: '9780000000019', title: 'Sample', onHand: 40, available: true };

function deps(overrides: Partial<LongTailDeps> = {}) {
  const calls = { verify: 0, search: [] as unknown[][], logged: [] as unknown[][] };
  const base: LongTailDeps = {
    verifyToken: async () => {
      calls.verify += 1;
      return { success: true };
    },
    searchLongTail: async (...args) => {
      calls.search.push(args);
      return [result];
    },
    perClient: createRateLimiter({ windowMs: 60_000, max: 3 }),
    global: createRateLimiter({ windowMs: 60_000, max: 100 }),
    logDemand: (...args) => {
      calls.logged.push(args);
    },
  };
  return { deps: { ...base, ...overrides }, calls };
}

const ok = { query: '  Wayward   Lives ', scope: 'title', turnstileToken: 'tok' };

test('returns results for a verified, valid request and logs the demand', async () => {
  const { deps: d, calls } = deps();
  const res = await handleLongTailSearch(ok, '1.2.3.4', d);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { results: [result] });
  assert.deepEqual(calls.search[0], ['Wayward Lives', 'title']);
  assert.deepEqual(calls.logged[0], ['Wayward Lives', 1]);
});

test('rejects a missing bot token without calling Turnstile or Ingram', async () => {
  const { deps: d, calls } = deps();
  const res = await handleLongTailSearch({ ...ok, turnstileToken: '' }, 'ip', d);
  assert.equal(res.status, 400);
  assert.equal(calls.verify, 0);
  assert.equal(calls.search.length, 0);
});

test('rejects a failed bot check with 403 and never calls Ingram', async () => {
  const { deps: d, calls } = deps({ verifyToken: async () => ({ success: false, error: 'nope' }) });
  const res = await handleLongTailSearch(ok, 'ip', d);
  assert.equal(res.status, 403);
  assert.equal(calls.search.length, 0);
});

test('validates the query and scope', async () => {
  const { deps: d } = deps();
  assert.equal((await handleLongTailSearch({ ...ok, query: 'a' }, 'ip', d)).status, 400);
  assert.equal((await handleLongTailSearch({ ...ok, query: 'x'.repeat(121) }, 'ip', d)).status, 400);
  assert.equal((await handleLongTailSearch({ ...ok, scope: 'isbn' }, 'ip', d)).status, 400);
  assert.equal((await handleLongTailSearch({ ...ok, scope: undefined }, 'ip', d)).status, 200);
  assert.equal((await handleLongTailSearch(null, 'ip', d)).status, 400);
});

test('rate-limits per client and globally before spending a bot check', async () => {
  const { deps: d, calls } = deps();
  for (let i = 0; i < 3; i += 1) assert.equal((await handleLongTailSearch(ok, 'same-ip', d)).status, 200);
  assert.equal((await handleLongTailSearch(ok, 'same-ip', d)).status, 429);
  assert.equal(calls.verify, 3);
  assert.equal((await handleLongTailSearch(ok, 'other-ip', d)).status, 200);

  const { deps: capped } = deps({ global: createRateLimiter({ windowMs: 60_000, max: 1 }) });
  assert.equal((await handleLongTailSearch(ok, 'a', capped)).status, 200);
  assert.equal((await handleLongTailSearch(ok, 'b', capped)).status, 429);
});

test('a provider failure returns 502 and is not logged as demand', async () => {
  const { deps: d, calls } = deps({ searchLongTail: async () => { throw new Error('timeout'); } });
  const res = await handleLongTailSearch(ok, 'ip', d);
  assert.equal(res.status, 502);
  assert.equal(calls.logged.length, 0);
});

test('createRateLimiter resets after the window', () => {
  let now = 0;
  const limiter = createRateLimiter({ windowMs: 1000, max: 1, now: () => now });
  assert.equal(limiter.take('k'), true);
  assert.equal(limiter.take('k'), false);
  now = 1000;
  assert.equal(limiter.take('k'), true);
});
