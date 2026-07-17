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
  assert.ok(
    !result.ok && result.error.includes('500'),
    `error should mention 500, got: ${!result.ok ? result.error : ''}`,
  );
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
  assert.ok(
    calls[1].url.startsWith('https://mail.example.com/api/subscribers?query='),
    'second call is the lookup',
  );
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
    fetchImpl: fetchStub([jsonResponse(409, {}), jsonResponse(500, {})], []),
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
