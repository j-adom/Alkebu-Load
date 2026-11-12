import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAcceptReview, handleBulkAccept, handleRejectReview } from '../../src/app/utils/ingram/reviewEndpoints';

const staff = { id: 1, collection: 'users', role: 'staff' };

test('review endpoints are staff-only', async () => {
  for (const user of [undefined, { collection: 'customers', role: 'admin' }, { collection: 'users', role: 'editor' }]) {
    const req = { user, payload: {}, routeParams: { id: '1' } } as any;
    assert.equal((await handleAcceptReview(req)).status, 403);
    assert.equal((await handleRejectReview(req)).status, 403);
    assert.equal((await handleBulkAccept(req)).status, 403);
  }
});

test('accept maps a refusal to 409 and success to 200', async () => {
  const req = { user: staff, payload: {}, routeParams: { id: '9' } } as any;
  const refused = await handleAcceptReview(req, async () => {
    throw new Error('Review 9 is already accepted.');
  });
  assert.equal(refused.status, 409);
  assert.match((await refused.json()).error, /already accepted/);

  const ok = await handleAcceptReview(req, async () => ({ applied: 1, stale: 0, logged: 1, queued: 0, superseded: 0, deferred: 0, squareWritten: 0, squareConflicts: 0 }));
  assert.equal(ok.status, 200);
  assert.equal((await handleAcceptReview({ ...req, routeParams: {} })).status, 400);
});

test('bulk accept validates the field path', async () => {
  const bad = await handleBulkAccept({ user: staff, payload: {}, data: { path: 'x; drop' } } as any);
  assert.equal(bad.status, 400);
  let seen = '';
  const ok = await handleBulkAccept({ user: staff, payload: {}, data: { path: 'pages' } } as any, async (_p, path) => {
    seen = path;
    return { accepted: 2, failed: 0 };
  });
  assert.equal(ok.status, 200);
  assert.equal(seen, 'pages');
});
