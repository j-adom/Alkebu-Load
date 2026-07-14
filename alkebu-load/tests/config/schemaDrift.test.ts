import assert from 'node:assert';
import test from 'node:test';

import { checkSchemaDrift } from '../../src/app/utils/schemaDrift';

const fakePayload = (
  slugs: string[],
  brokenSlugs: string[] = [],
): { payload: any; calls: string[] } => {
  const calls: string[] = [];

  const payload = {
    config: {
      collections: slugs.map((slug) => ({ slug })),
    },
    count: async ({ collection }: { collection: string }) => {
      calls.push(collection);
      if (brokenSlugs.includes(collection)) {
        throw new Error(`relation "${collection}" does not exist`);
      }
      return { totalDocs: 0 };
    },
  };

  return { payload, calls };
};

test('returns ok: true and an empty missing list when every collection probe succeeds', async () => {
  const { payload } = fakePayload(['users', 'orders', 'carts']);

  const result = await checkSchemaDrift(payload);

  assert.deepStrictEqual(result, { ok: true, missing: [] });
});

test('returns the offending slug when one collection throws (partnership-inquiries incident)', async () => {
  const { payload } = fakePayload(
    ['users', 'orders', 'partnership-inquiries', 'carts'],
    ['partnership-inquiries'],
  );

  const result = await checkSchemaDrift(payload);

  assert.strictEqual(result.ok, false);
  assert.deepStrictEqual(result.missing, ['partnership-inquiries']);
});

test('one failing collection does not abort the sweep — every collection is still probed', async () => {
  const { payload, calls } = fakePayload(
    ['users', 'orders', 'partnership-inquiries', 'carts', 'reviews'],
    ['partnership-inquiries'],
  );

  const result = await checkSchemaDrift(payload);

  // Every slug was probed, including the ones after the broken one.
  assert.deepStrictEqual(calls, ['users', 'orders', 'partnership-inquiries', 'carts', 'reviews']);
  assert.strictEqual(result.ok, false);
  assert.deepStrictEqual(result.missing, ['partnership-inquiries']);
});

test('reports multiple broken collections without aborting on the first', async () => {
  const { payload } = fakePayload(
    ['users', 'partnership-inquiries', 'orders', 'institutional-accounts'],
    ['partnership-inquiries', 'institutional-accounts'],
  );

  const result = await checkSchemaDrift(payload);

  assert.strictEqual(result.ok, false);
  assert.deepStrictEqual(result.missing, ['partnership-inquiries', 'institutional-accounts']);
});

test('handles an empty collections config gracefully', async () => {
  const { payload } = fakePayload([]);

  const result = await checkSchemaDrift(payload);

  assert.deepStrictEqual(result, { ok: true, missing: [] });
});
