import assert from 'node:assert';
import test from 'node:test';

import { handlePromoteRequest } from '../../src/app/utils/promoteStagingEndpoint';

const staff = { role: 'staff' };

test('promote endpoint: staff can promote, and get the new book id', async () => {
  const res = await handlePromoteRequest({ user: staff, payload: {}, routeParams: { id: '42' } } as any, async () => ({ bookId: 7 }));
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { bookId: 7 });
});

test('promote endpoint: customers and anonymous users are refused', async () => {
  for (const user of [null, { role: 'customer' }, { role: 'editor' }]) {
    const res = await handlePromoteRequest({ user, payload: {}, routeParams: { id: '42' } } as any, async () => {
      throw new Error('must not be called');
    });
    assert.strictEqual(res.status, 403);
  }
});

test('promote endpoint: a refusal from promoteStagedItem becomes a 409 with its reason', async () => {
  const res = await handlePromoteRequest({ user: staff, payload: {}, routeParams: { id: '42' } } as any, async () => {
    throw new Error('Staging row 42 is not ready to promote (status: needs-review).');
  });
  assert.strictEqual(res.status, 409);
  assert.match((await res.json()).error, /not ready/);
});
