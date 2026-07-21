import assert from 'node:assert';
import test from 'node:test';

import {
  shouldSyncToListmonk,
  runPartnershipListmonkSync,
} from '../../src/app/utils/partnershipListmonkSync';
import type { ListmonkSubscribeResult } from '../../src/app/utils/listmonkClient';

const baseDoc = {
  id: 42,
  status: 'qualified',
  crmSyncStatus: 'not_configured',
  email: 'buyer@school.edu',
  name: 'Taylor Buyer',
  organizationName: 'Nashville Prep',
  inquiryType: 'institutional',
};

// --- shouldSyncToListmonk truth table ---

test('syncs on qualified and won, not on other statuses', () => {
  for (const status of ['qualified', 'won']) {
    assert.strictEqual(
      shouldSyncToListmonk({ doc: { ...baseDoc, status } }),
      true,
      `status=${status} should sync`,
    );
  }
  for (const status of ['new', 'contacted', 'lost', undefined]) {
    assert.strictEqual(
      shouldSyncToListmonk({ doc: { ...baseDoc, status } }),
      false,
      `status=${status} should NOT sync`,
    );
  }
});

test('does not sync when crmSyncStatus is already synced', () => {
  assert.strictEqual(
    shouldSyncToListmonk({ doc: { ...baseDoc, crmSyncStatus: 'synced' } }),
    false,
  );
});

test('re-syncs when crmSyncStatus is failed, pending, or not_configured', () => {
  for (const crmSyncStatus of ['failed', 'pending', 'not_configured', undefined]) {
    assert.strictEqual(
      shouldSyncToListmonk({ doc: { ...baseDoc, crmSyncStatus } }),
      true,
      `crmSyncStatus=${crmSyncStatus} should retry`,
    );
  }
});

test('does not sync when the recursion guard is set in context', () => {
  assert.strictEqual(
    shouldSyncToListmonk({ doc: baseDoc, context: { listmonkSyncDone: true } }),
    false,
  );
});

test('does not sync without an email', () => {
  assert.strictEqual(shouldSyncToListmonk({ doc: { ...baseDoc, email: undefined } }), false);
});

// --- runPartnershipListmonkSync ---

type UpdateCall = { id: string | number; data: Record<string, unknown> };

const makeDeps = (result: ListmonkSubscribeResult) => {
  const updates: UpdateCall[] = [];
  const subscribeCalls: unknown[] = [];
  return {
    updates,
    subscribeCalls,
    deps: {
      subscribe: async (input: unknown) => {
        subscribeCalls.push(input);
        return result;
      },
      updateInquiry: async (id: string | number, data: Record<string, unknown>) => {
        updates.push({ id, data });
      },
    },
  };
};

test('guard-false doc does not call subscribe', async () => {
  const { deps, subscribeCalls } = makeDeps({ ok: true, subscriberId: 1 });
  await runPartnershipListmonkSync({ doc: { ...baseDoc, status: 'new' } }, deps);
  assert.strictEqual(subscribeCalls.length, 0);
});

test('successful subscribe records synced + subscriber id', async () => {
  const { deps, updates, subscribeCalls } = makeDeps({ ok: true, subscriberId: 123 });
  await runPartnershipListmonkSync({ doc: baseDoc }, deps);

  assert.strictEqual(subscribeCalls.length, 1);
  assert.deepStrictEqual(subscribeCalls[0], {
    email: 'buyer@school.edu',
    name: 'Taylor Buyer',
    organizationName: 'Nashville Prep',
    inquiryType: 'institutional',
  });
  assert.deepStrictEqual(updates, [
    { id: 42, data: { crmSyncStatus: 'synced', crmExternalId: '123' } },
  ]);
});

test('successful subscribe without an id records synced with empty external id', async () => {
  const { deps, updates } = makeDeps({ ok: true });
  await runPartnershipListmonkSync({ doc: baseDoc }, deps);
  assert.deepStrictEqual(updates, [
    { id: 42, data: { crmSyncStatus: 'synced', crmExternalId: '' } },
  ]);
});

test('failed subscribe records failed', async () => {
  const { deps, updates } = makeDeps({ ok: false, error: 'listmonk down' });
  await runPartnershipListmonkSync({ doc: baseDoc }, deps);
  assert.deepStrictEqual(updates, [{ id: 42, data: { crmSyncStatus: 'failed' } }]);
});

test('unconfigured result writes nothing (stays not_configured)', async () => {
  const { deps, updates } = makeDeps({ ok: false, error: 'no env', unconfigured: true });
  await runPartnershipListmonkSync({ doc: baseDoc }, deps);
  assert.strictEqual(updates.length, 0);
});

test('a throwing subscribe dep never propagates', async () => {
  const updates: UpdateCall[] = [];
  await runPartnershipListmonkSync(
    { doc: baseDoc },
    {
      subscribe: async () => {
        throw new Error('unexpected');
      },
      updateInquiry: async (id, data) => {
        updates.push({ id, data });
      },
    },
  );
  assert.strictEqual(updates.length, 0, 'no write-back after an unexpected throw');
});

test('a throwing updateInquiry dep never propagates', async () => {
  await runPartnershipListmonkSync(
    { doc: baseDoc },
    {
      subscribe: async () => ({ ok: true as const, subscriberId: 1 }),
      updateInquiry: async () => {
        throw new Error('db write failed');
      },
    },
  );
  // reaching this line without throwing IS the assertion
  assert.ok(true);
});

test('falls back to the email as the subscriber name when name is missing', async () => {
  const { deps, subscribeCalls } = makeDeps({ ok: true, subscriberId: 9 });
  await runPartnershipListmonkSync({ doc: { ...baseDoc, name: undefined } }, deps);
  assert.deepStrictEqual(subscribeCalls[0], {
    email: 'buyer@school.edu',
    name: 'buyer@school.edu',
    organizationName: 'Nashville Prep',
    inquiryType: 'institutional',
  });
});
