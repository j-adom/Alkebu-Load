import assert from 'node:assert';
import test from 'node:test';

import { shouldEnableDevSchemaPush } from '../../src/app/utils/devSchemaPush';

test('allows dev schema push against a local Postgres host', () => {
  for (const uri of [
    'postgresql://user:pw@localhost:5432/alkebulanimages',
    'postgresql://user:pw@127.0.0.1:5432/alkebulanimages',
    'postgres://user:pw@[::1]:5432/alkebulanimages',
    'postgresql://user:pw@host.docker.internal:5432/alkebulanimages',
  ]) {
    assert.strictEqual(
      shouldEnableDevSchemaPush(uri),
      true,
      `expected local host in ${uri} to allow dev push`,
    );
  }
});

test('refuses dev schema push against the production Tailscale host', () => {
  assert.strictEqual(
    shouldEnableDevSchemaPush('postgresql://user:pw@100.108.178.32:5432/alkebulanimages'),
    false,
  );
});

test('refuses dev schema push against any non-local host', () => {
  for (const uri of [
    'postgresql://user:pw@db.example.com:5432/app',
    'postgresql://user:pw@10.0.0.5:5432/app',
    'postgresql://user:pw@192.168.1.20:5432/app',
    'postgres://user:pw@203.0.113.7:5432/app',
  ]) {
    assert.strictEqual(
      shouldEnableDevSchemaPush(uri),
      false,
      `expected remote host in ${uri} to block dev push`,
    );
  }
});

test('fails closed on a missing or unparseable URI', () => {
  for (const uri of [undefined, '', 'not a url', 'postgresql://']) {
    assert.strictEqual(
      shouldEnableDevSchemaPush(uri),
      false,
      `expected ${JSON.stringify(uri)} to fail closed`,
    );
  }
});

test('a password containing an @ does not fool the host check', () => {
  // urlparse takes the LAST @ as the host delimiter, so this must resolve to
  // the real host and not to anything inside the credentials.
  assert.strictEqual(
    shouldEnableDevSchemaPush('postgresql://user:p%40ss@100.108.178.32:5432/db'),
    false,
  );
  assert.strictEqual(
    shouldEnableDevSchemaPush('postgresql://user:p%40ss@localhost:5432/db'),
    true,
  );
});
