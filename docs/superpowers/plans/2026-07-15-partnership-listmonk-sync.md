# Partnership → listmonk Staff-Gated Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When staff mark a `PartnershipInquiries` doc `qualified` or `won`, subscribe the lead to the listmonk "B2B Partners" list and record the outcome in the existing `crmSyncStatus`/`crmExternalId` fields.

**Architecture:** A pure fetch-based listmonk client (`listmonkClient.ts`) + a dependency-injected sync module (`partnershipListmonkSync.ts`) exposing a guard function, a runner, and a ready-made Payload `afterChange` hook attached to the collection. Zero schema change; write-back uses `context.listmonkSyncDone` to prevent hook recursion and threads `req` to stay in the parent transaction (see `customerUpsert.ts` for why).

**Tech Stack:** Payload CMS 3.x, TypeScript, Node built-in test runner (`node:test` + `node:assert`), global `fetch`/`Response` (Node ≥18).

**Spec:** `docs/superpowers/specs/2026-07-15-partnership-listmonk-sync-design.md`

## Global Constraints

- Working directory for all commands: `alkebu-load/` (pnpm, NOT npm).
- Run tests with `pnpm test` (injects `STRIPE_SECRET_KEY=sk_test_dummy`; single files via `pnpm test -- --test-name-pattern` is unreliable — run the full suite, it's fast).
- Strict build mode: `pnpm build` fails on type/lint warnings; `pnpm lint` must be clean.
- New env vars (all optional — missing env means the hook no-ops as `unconfigured`): `LISTMONK_API_URL`, `LISTMONK_API_USER`, `LISTMONK_API_TOKEN`, `LISTMONK_B2B_LIST_ID`.
- listmonk auth header format: `Authorization: token <user>:<token>` (v3+ token auth).
- Never throw out of the hook — a listmonk outage must not block a staff save.
- Commit directly to `main` (solo-dev convention). Do NOT `git push` until the final task (push = Coolify production deploy).
- Shell runs as root: after each commit, `chown -R jadom:jadom /home/jadom/Coding/alkebulanimages2.0/.git` and any created files.

---

### Task 1: listmonk client

**Files:**
- Create: `alkebu-load/src/app/utils/listmonkClient.ts`
- Test: `alkebu-load/tests/partnership/listmonkClient.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces (Task 2 relies on these exact names):
  ```ts
  export interface ListmonkSubscribeInput {
    email: string
    name: string
    organizationName?: string
    inquiryType?: string
  }
  export type ListmonkSubscribeResult =
    | { ok: true; subscriberId?: number }
    | { ok: false; error: string; unconfigured?: boolean }
  export async function subscribeToB2BList(
    input: ListmonkSubscribeInput,
    opts?: { fetchImpl?: typeof fetch; env?: Record<string, string | undefined> },
  ): Promise<ListmonkSubscribeResult>
  ```

- [ ] **Step 1: Write the failing tests**

Create `alkebu-load/tests/partnership/listmonkClient.test.ts`:

```ts
import assert from 'node:assert';
import test from 'node:test';

import { subscribeToB2BList } from '../../src/app/utils/listmonkClient';

const ENV = {
  LISTMONK_API_URL: 'https://mail.example.com/',
  LISTMONK_API_USER: 'apiuser',
  LISTMONK_API_TOKEN: 'sekret',
  LISTMONK_B2B_LIST_ID: '7',
};

const INPUT = {
  email: 'buyer@school.edu',
  name: 'Taylor Buyer',
  organizationName: 'Nashville Prep',
  inquiryType: 'institutional',
};

type CapturedCall = { url: string; init?: RequestInit };

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** fetchImpl that replays queued responses and records every call. */
const fetchStub = (responses: Response[], calls: CapturedCall[]): typeof fetch =>
  (async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) throw new Error('fetchStub: no response queued');
    return next;
  }) as typeof fetch;

test('returns unconfigured when env vars are missing', async () => {
  const result = await subscribeToB2BList(INPUT, { env: {}, fetchImpl: fetchStub([], []) });
  assert.strictEqual(result.ok, false);
  assert.ok(!result.ok && result.unconfigured, 'should flag unconfigured');
});

test('returns unconfigured when the list id is not a positive number', async () => {
  const env = { ...ENV, LISTMONK_B2B_LIST_ID: 'not-a-number' };
  const result = await subscribeToB2BList(INPUT, { env, fetchImpl: fetchStub([], []) });
  assert.strictEqual(result.ok, false);
  assert.ok(!result.ok && result.unconfigured, 'should flag unconfigured');
});

test('successful subscribe POSTs the right payload and returns the subscriber id', async () => {
  const calls: CapturedCall[] = [];
  const result = await subscribeToB2BList(INPUT, {
    env: ENV,
    fetchImpl: fetchStub([jsonResponse(200, { data: { id: 123 } })], calls),
  });

  assert.deepStrictEqual(result, { ok: true, subscriberId: 123 });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].url, 'https://mail.example.com/api/subscribers');
  assert.strictEqual(calls[0].init?.method, 'POST');

  const headers = calls[0].init?.headers as Record<string, string>;
  assert.strictEqual(headers.Authorization, 'token apiuser:sekret');

  const body = JSON.parse(String(calls[0].init?.body));
  assert.strictEqual(body.email, 'buyer@school.edu');
  assert.strictEqual(body.name, 'Taylor Buyer');
  assert.strictEqual(body.status, 'enabled');
  assert.strictEqual(body.preconfirm_subscriptions, true);
  assert.deepStrictEqual(body.lists, [7]);
  assert.deepStrictEqual(body.attribs, {
    organizationName: 'Nashville Prep',
    inquiryType: 'institutional',
  });
});

test('non-2xx non-409 response returns ok:false with the status in the error', async () => {
  const result = await subscribeToB2BList(INPUT, {
    env: ENV,
    fetchImpl: fetchStub([jsonResponse(500, { message: 'boom' })], []),
  });
  assert.strictEqual(result.ok, false);
  assert.ok(!result.ok && result.error.includes('500'), `error should mention 500, got: ${!result.ok ? result.error : ''}`);
});

test('409 existing subscriber: looks up id and adds to the B2B list', async () => {
  const calls: CapturedCall[] = [];
  const result = await subscribeToB2BList(INPUT, {
    env: ENV,
    fetchImpl: fetchStub(
      [
        jsonResponse(409, { message: 'subscriber exists' }),
        jsonResponse(200, { data: { results: [{ id: 55 }] } }),
        jsonResponse(200, { data: true }),
      ],
      calls,
    ),
  });

  assert.deepStrictEqual(result, { ok: true, subscriberId: 55 });
  assert.strictEqual(calls.length, 3);
  assert.ok(calls[1].url.startsWith('https://mail.example.com/api/subscribers?query='), 'second call is the lookup');
  assert.strictEqual(calls[2].url, 'https://mail.example.com/api/subscribers/lists');
  assert.strictEqual(calls[2].init?.method, 'PUT');
  const putBody = JSON.parse(String(calls[2].init?.body));
  assert.deepStrictEqual(putBody.ids, [55]);
  assert.strictEqual(putBody.action, 'add');
  assert.deepStrictEqual(putBody.target_list_ids, [7]);
});

test('409 with failed lookup still returns ok (the 409 proves the email exists)', async () => {
  const result = await subscribeToB2BList(INPUT, {
    env: ENV,
    fetchImpl: fetchStub(
      [jsonResponse(409, {}), jsonResponse(500, {})],
      [],
    ),
  });
  assert.deepStrictEqual(result, { ok: true });
});

test('409 where the list-add PUT fails returns ok:false (subscriber is NOT on the B2B list)', async () => {
  const result = await subscribeToB2BList(INPUT, {
    env: ENV,
    fetchImpl: fetchStub(
      [
        jsonResponse(409, {}),
        jsonResponse(200, { data: { results: [{ id: 55 }] } }),
        jsonResponse(500, {}),
      ],
      [],
    ),
  });
  assert.strictEqual(result.ok, false);
});

test('network error returns ok:false and never throws', async () => {
  const throwingFetch = (async () => {
    throw new Error('connect ECONNREFUSED');
  }) as unknown as typeof fetch;

  const result = await subscribeToB2BList(INPUT, { env: ENV, fetchImpl: throwingFetch });
  assert.strictEqual(result.ok, false);
  assert.ok(!result.ok && result.error.includes('ECONNREFUSED'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd alkebu-load && pnpm test 2>&1 | tail -20`
Expected: FAIL — `Cannot find module '../../src/app/utils/listmonkClient'` (all other suites stay green).

- [ ] **Step 3: Write the implementation**

Create `alkebu-load/src/app/utils/listmonkClient.ts`:

```ts
/**
 * Minimal listmonk API client for the staff-gated B2B lead sync.
 *
 * Spec: docs/superpowers/specs/2026-07-15-partnership-listmonk-sync-design.md
 * Auth matches the storefront newsletter proxy (alkebu-web /api/newsletter):
 * listmonk v3+ token auth, "token <api_user>:<api_token>".
 *
 * All failures return { ok: false } — this module never throws, because its
 * only caller runs inside a Payload afterChange hook that must not block a
 * staff member's save.
 */

export interface ListmonkSubscribeInput {
  email: string
  name: string
  organizationName?: string
  inquiryType?: string
}

export type ListmonkSubscribeResult =
  | { ok: true; subscriberId?: number }
  | { ok: false; error: string; unconfigured?: boolean }

export interface ListmonkClientOptions {
  fetchImpl?: typeof fetch
  env?: Record<string, string | undefined>
}

export async function subscribeToB2BList(
  input: ListmonkSubscribeInput,
  opts: ListmonkClientOptions = {},
): Promise<ListmonkSubscribeResult> {
  const env = opts.env ?? process.env
  const fetchImpl = opts.fetchImpl ?? fetch

  const apiUrl = env.LISTMONK_API_URL
  const apiUser = env.LISTMONK_API_USER
  const apiToken = env.LISTMONK_API_TOKEN
  const listId = Number(env.LISTMONK_B2B_LIST_ID)

  if (!apiUrl || !apiUser || !apiToken || !Number.isFinite(listId) || listId <= 0) {
    return { ok: false, error: 'listmonk env vars are not configured', unconfigured: true }
  }

  const base = apiUrl.replace(/\/$/, '')
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `token ${apiUser}:${apiToken}`,
  }

  try {
    const res = await fetchImpl(`${base}/api/subscribers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: input.email,
        name: input.name,
        status: 'enabled',
        lists: [listId],
        preconfirm_subscriptions: true,
        attribs: {
          organizationName: input.organizationName ?? '',
          inquiryType: input.inquiryType ?? '',
        },
      }),
    })

    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as { data?: { id?: unknown } }
      const id = body?.data?.id
      return { ok: true, ...(typeof id === 'number' ? { subscriberId: id } : {}) }
    }

    // 409: the email is already a listmonk subscriber (e.g. on the consumer
    // newsletter). Add the existing subscriber to the B2B list instead.
    if (res.status === 409) {
      return addExistingSubscriberToList(input.email, listId, base, headers, fetchImpl)
    }

    const errText = await res.text().catch(() => '')
    return {
      ok: false,
      error: `listmonk subscribe failed with status ${res.status}${errText ? `: ${errText.slice(0, 300)}` : ''}`,
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function addExistingSubscriberToList(
  email: string,
  listId: number,
  base: string,
  headers: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<ListmonkSubscribeResult> {
  try {
    const escaped = email.replace(/'/g, "''")
    const query = encodeURIComponent(`subscribers.email='${escaped}'`)
    const lookupRes = await fetchImpl(`${base}/api/subscribers?query=${query}`, { headers })

    if (!lookupRes.ok) {
      // The 409 already proved the email exists in listmonk; without an id we
      // can't add the B2B list, but treat as success rather than blocking the
      // pipeline on a read endpoint hiccup (spec decision).
      return { ok: true }
    }

    const body = (await lookupRes.json().catch(() => ({}))) as {
      data?: { results?: Array<{ id?: unknown }> }
    }
    const id = body?.data?.results?.[0]?.id
    if (typeof id !== 'number') {
      return { ok: true }
    }

    const addRes = await fetchImpl(`${base}/api/subscribers/lists`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ids: [id],
        action: 'add',
        target_list_ids: [listId],
        status: 'confirmed',
      }),
    })

    if (!addRes.ok) {
      // Here we KNOW the add failed — surfacing it keeps crmSyncStatus honest.
      return { ok: false, error: `listmonk list-add failed with status ${addRes.status}` }
    }

    return { ok: true, subscriberId: id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd alkebu-load && pnpm test 2>&1 | tail -10`
Expected: all suites PASS, including the 8 new listmonkClient tests.

- [ ] **Step 5: Lint and commit**

```bash
cd alkebu-load && pnpm lint
git add src/app/utils/listmonkClient.ts tests/partnership/listmonkClient.test.ts
git commit -m "feat(b2b): listmonk client for the staff-gated B2B lead sync"
chown -R jadom:jadom /home/jadom/Coding/alkebulanimages2.0/.git
```

---

### Task 2: sync guard, runner, and afterChange hook

**Files:**
- Create: `alkebu-load/src/app/utils/partnershipListmonkSync.ts`
- Test: `alkebu-load/tests/partnership/partnershipListmonkSync.test.ts`

**Interfaces:**
- Consumes (from Task 1): `subscribeToB2BList`, `ListmonkSubscribeInput`, `ListmonkSubscribeResult` from `./listmonkClient`.
- Produces (Task 3 relies on this exact name): `export const partnershipListmonkSyncHook: CollectionAfterChangeHook` plus testable internals `shouldSyncToListmonk(args)` and `runPartnershipListmonkSync(args, deps)`.

- [ ] **Step 1: Write the failing tests**

Create `alkebu-load/tests/partnership/partnershipListmonkSync.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd alkebu-load && pnpm test 2>&1 | tail -20`
Expected: FAIL — `Cannot find module '../../src/app/utils/partnershipListmonkSync'`.

- [ ] **Step 3: Write the implementation**

Create `alkebu-load/src/app/utils/partnershipListmonkSync.ts`:

```ts
import type { CollectionAfterChangeHook } from 'payload'

import {
  subscribeToB2BList,
  type ListmonkSubscribeInput,
  type ListmonkSubscribeResult,
} from './listmonkClient'

/**
 * Staff-gated PartnershipInquiries -> listmonk sync.
 *
 * When staff mark an inquiry `qualified` or `won`, the lead is subscribed to
 * the "B2B Partners" listmonk list and the outcome lands in the pre-existing
 * crmSyncStatus / crmExternalId fields (no schema change). Best-effort by
 * design: nothing in here may throw into the afterChange pipeline, because
 * that would block a staff member's save over a listmonk outage.
 *
 * Spec: docs/superpowers/specs/2026-07-15-partnership-listmonk-sync-design.md
 * Why these leads go on a list at all: docs/b2b-email-strategy.md
 */

const SYNC_STATUSES = new Set(['qualified', 'won'])

type InquiryDocLike = {
  id: string | number
  status?: string | null
  crmSyncStatus?: string | null
  email?: string | null
  name?: string | null
  organizationName?: string | null
  inquiryType?: string | null
}

export function shouldSyncToListmonk(args: {
  doc: InquiryDocLike
  context?: Record<string, unknown>
}): boolean {
  if (args.context?.listmonkSyncDone) return false
  if (!args.doc.status || !SYNC_STATUSES.has(args.doc.status)) return false
  if (args.doc.crmSyncStatus === 'synced') return false
  if (!args.doc.email) return false
  return true
}

export interface PartnershipListmonkSyncDeps {
  subscribe: (input: ListmonkSubscribeInput) => Promise<ListmonkSubscribeResult>
  updateInquiry: (
    id: string | number,
    data: { crmSyncStatus: 'synced' | 'failed'; crmExternalId?: string },
  ) => Promise<unknown>
}

export async function runPartnershipListmonkSync(
  args: { doc: InquiryDocLike; context?: Record<string, unknown> },
  deps: PartnershipListmonkSyncDeps,
): Promise<void> {
  if (!shouldSyncToListmonk(args)) return

  try {
    const result = await deps.subscribe({
      email: args.doc.email as string,
      name: args.doc.name || (args.doc.email as string),
      organizationName: args.doc.organizationName ?? undefined,
      inquiryType: args.doc.inquiryType ?? undefined,
    })

    if (!result.ok && result.unconfigured) {
      // No env, no error: crmSyncStatus stays not_configured on purpose.
      return
    }

    if (result.ok) {
      await deps.updateInquiry(args.doc.id, {
        crmSyncStatus: 'synced',
        crmExternalId: result.subscriberId != null ? String(result.subscriberId) : '',
      })
    } else {
      console.error(`Partnership listmonk sync failed for inquiry ${args.doc.id}: ${result.error}`)
      await deps.updateInquiry(args.doc.id, { crmSyncStatus: 'failed' })
    }
  } catch (err) {
    console.error(`Partnership listmonk sync error for inquiry ${args.doc.id}:`, err)
  }
}

export const partnershipListmonkSyncHook: CollectionAfterChangeHook = async ({
  doc,
  req,
  context,
}) => {
  await runPartnershipListmonkSync(
    { doc: doc as InquiryDocLike, context: context as Record<string, unknown> | undefined },
    {
      subscribe: subscribeToB2BList,
      // Threading `req` keeps the write-back inside the parent operation's
      // transaction (see customerUpsert.ts for the incident that taught us).
      // context.listmonkSyncDone stops the write-back re-triggering this hook.
      updateInquiry: (id, data) =>
        req.payload.update({
          collection: 'partnership-inquiries',
          id,
          data,
          req,
          context: { listmonkSyncDone: true },
          overrideAccess: true,
        }),
    },
  )
  return doc
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd alkebu-load && pnpm test 2>&1 | tail -10`
Expected: all suites PASS, including the 13 new sync tests.

- [ ] **Step 5: Lint and commit**

```bash
cd alkebu-load && pnpm lint
git add src/app/utils/partnershipListmonkSync.ts tests/partnership/partnershipListmonkSync.test.ts
git commit -m "feat(b2b): staff-gated listmonk sync guard, runner, and afterChange hook"
chown -R jadom:jadom /home/jadom/Coding/alkebulanimages2.0/.git
```

---

### Task 3: attach the hook + env documentation

**Files:**
- Modify: `alkebu-load/src/collections/PartnershipInquiries.ts` (add `hooks` key after the `access` block, ~line 30)
- Modify: `alkebu-load/.env.example` (append listmonk block before the `# Development` section)
- Modify: `alkebu-load/CLAUDE.md` (add one line under "Environment Variables → Optional")

**Interfaces:**
- Consumes (from Task 2): `partnershipListmonkSyncHook` from `../app/utils/partnershipListmonkSync`.
- Produces: the live wiring; no exports.

- [ ] **Step 1: Attach the hook**

In `alkebu-load/src/collections/PartnershipInquiries.ts`, add the import at the top:

```ts
import { partnershipListmonkSyncHook } from '../app/utils/partnershipListmonkSync';
```

and add a `hooks` key between the `access` block and `fields`:

```ts
  hooks: {
    // Staff-gated B2B list sync: qualified/won leads are subscribed to the
    // listmonk "B2B Partners" list; outcome lands in crmSyncStatus.
    afterChange: [partnershipListmonkSyncHook],
  },
```

- [ ] **Step 2: Document the env vars**

Append to `alkebu-load/.env.example` (before the `# Development` section):

```bash
# listmonk (staff-gated B2B lead sync — optional; hook no-ops when unset)
# Same instance as the storefront newsletter proxy: https://mail.alkebulanimages.com
# LISTMONK_B2B_LIST_ID is the numeric id of the "B2B Partners" list (NOT the
# consumer newsletter list). See docs/b2b-email-strategy.md.
LISTMONK_API_URL=
LISTMONK_API_USER=
LISTMONK_API_TOKEN=
LISTMONK_B2B_LIST_ID=
```

In `alkebu-load/CLAUDE.md`, under "### Optional", add:

```markdown
- `LISTMONK_API_URL`, `LISTMONK_API_USER`, `LISTMONK_API_TOKEN`, `LISTMONK_B2B_LIST_ID` — staff-gated B2B lead sync (PartnershipInquiries → listmonk); hook no-ops when unset
```

- [ ] **Step 3: Verify — full suite, lint, and type-check via build**

```bash
cd alkebu-load && pnpm test 2>&1 | tail -5 && pnpm lint && pnpm build 2>&1 | tail -15
```

Expected: tests PASS, lint clean, build succeeds (strict mode — build failure means a type error in the hook wiring; fix before committing).

- [ ] **Step 4: Commit**

```bash
git add src/collections/PartnershipInquiries.ts .env.example CLAUDE.md
git commit -m "feat(b2b): wire listmonk sync hook into PartnershipInquiries"
chown -R jadom:jadom /home/jadom/Coding/alkebulanimages2.0/.git
```

---

### Task 4: ship + production activation

**Files:** none (operational)

- [ ] **Step 1: Push to main (this IS the production deploy)**

Safe to deploy before the env vars exist: without `LISTMONK_*` the hook returns `unconfigured` and writes nothing.

```bash
git push origin main
```

- [ ] **Step 2: Verify the deploy**

Run: `curl -s https://payload.alkebulanimages.com/api/health` after Coolify finishes.
Expected: healthy response.

- [ ] **Step 3: Production activation checklist (requires Jordan / listmonk UI)**

1. In listmonk (`mail.alkebulanimages.com`): create a **private** list named "B2B Partners"; note its numeric id.
2. In listmonk: create (or reuse) an API user + token with subscriber-write access.
3. In Coolify (payload app env): set `LISTMONK_API_URL=https://mail.alkebulanimages.com`, `LISTMONK_API_USER`, `LISTMONK_API_TOKEN`, `LISTMONK_B2B_LIST_ID`; redeploy/restart.
4. Smoke test: in `/admin` → B2B → Partnership Inquiries, mark a test inquiry `qualified` and save. Expect `crmSyncStatus` → `Synced` and the subscriber visible on the B2B Partners list in listmonk.
5. Clean up the test subscriber/inquiry.

---

## Self-Review

- **Spec coverage:** client env-gating/409 flow (Task 1), guard truth table + best-effort runner + recursion guard + `req` threading (Task 2), collection wiring + env docs (Task 3), deploy + ops checklist from the spec's §4 (Task 4). The spec's "list-add PUT failure" case was unspecified; resolved as `ok:false` to keep `crmSyncStatus` honest — noted in code comments and tested.
- **Placeholder scan:** none.
- **Type consistency:** `subscribeToB2BList` / `ListmonkSubscribeInput` / `ListmonkSubscribeResult` (Task 1) match Task 2's imports; `partnershipListmonkSyncHook` (Task 2) matches Task 3's import. `crmSyncStatus` write values (`synced`/`failed`) are members of the collection's existing select options.
