import assert from 'node:assert';
import test from 'node:test';

import { buildPublicHealthResponse } from '../../src/app/utils/healthResponse';

test('public health response exposes only liveness-safe fields', () => {
  const response = buildPublicHealthResponse({
    database: 'connected',
    timestamp: '2026-05-28T03:17:50.239Z',
  });

  assert.deepStrictEqual(response, {
    status: 'healthy',
    timestamp: '2026-05-28T03:17:50.239Z',
    database: 'connected',
  });
  assert.strictEqual('email' in response, false);
});
