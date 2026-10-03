import assert from 'node:assert/strict';
import test from 'node:test';

import { frequencyForNewSearch, nextFrequency } from '../src/app/utils/searchDemand';

test('nextFrequency increments and flags popular at the threshold', () => {
  assert.deepEqual(nextFrequency(0), { queryFrequency: 1, popularQuery: false });
  assert.deepEqual(nextFrequency(3), { queryFrequency: 4, popularQuery: false });
  assert.deepEqual(nextFrequency(4), { queryFrequency: 5, popularQuery: true });
  assert.deepEqual(nextFrequency(Number.NaN), { queryFrequency: 1, popularQuery: false });
});

const fakePayload = (docs: Array<{ queryFrequency?: number | null }>, calls: unknown[] = []) =>
  ({
    find: async (args: unknown) => {
      calls.push(args);
      return { docs };
    },
  }) as any;

test('frequencyForNewSearch builds on the highest prior count for the same query', async () => {
  const calls: any[] = [];
  const result = await frequencyForNewSearch(fakePayload([{ queryFrequency: 6 }], calls), 'wayward lives');
  assert.deepEqual(result, { queryFrequency: 7, popularQuery: true });
  assert.deepEqual(calls[0].where, { normalizedQuery: { equals: 'wayward lives' } });
  assert.equal(calls[0].sort, '-queryFrequency');
  assert.equal(calls[0].limit, 1);
});

test('frequencyForNewSearch starts at 1 for a new query and on lookup failure', async () => {
  assert.deepEqual(await frequencyForNewSearch(fakePayload([]), 'new'), { queryFrequency: 1, popularQuery: false });
  const failing = { find: async () => { throw new Error('db down'); } } as any;
  assert.deepEqual(await frequencyForNewSearch(failing, 'x'), { queryFrequency: 1, popularQuery: false });
});
