import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { hostKeyMatches, sftpConfigFromEnv } from '../../src/app/utils/ingram/sftp';

test('hostKeyMatches compares an OpenSSH-style SHA256 fingerprint', () => {
  const key = Buffer.from('synthetic-host-key-blob');
  const fingerprint = `SHA256:${createHash('sha256').update(key).digest('base64').replace(/=+$/, '')}`;
  assert.equal(hostKeyMatches(key, fingerprint), true);
  assert.equal(hostKeyMatches(key, fingerprint.replace(/^SHA256:/, '')), true);
  assert.equal(hostKeyMatches(Buffer.from('other'), fingerprint), false);
});

test('sftpConfigFromEnv requires host, user and password', () => {
  assert.throws(() => sftpConfigFromEnv({}), /INGRAM_FTP_HOST/);
  const config = sftpConfigFromEnv({
    INGRAM_FTP_HOST: 'ftp.example.com',
    INGRAM_FTP_USER: 'u',
    INGRAM_FTP_PASSWORD: 'p',
  });
  assert.equal(config.host, 'ftp.example.com');
  assert.equal(config.port, 22);
  assert.equal(config.hostFingerprint, 'SHA256:MKA9n3CYF8dY+j9P713bUoWelyJtFdv8gNpfn8pkzoc');
});

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { verifiedDownload } from '../../src/app/utils/ingram/sftp';

function fakeClient(opts: { content: string; sizes?: number[]; times?: number[] }) {
  const sizes = [...(opts.sizes ?? [])];
  const times = [...(opts.times ?? [])];
  return {
    stat: async () => ({
      size: sizes.length ? sizes.shift()! : Buffer.byteLength(opts.content),
      modifyTime: times.length ? times.shift()! : 1000,
    }),
    get: async (_remote: string, local: string) => {
      await writeFile(local, opts.content);
      return local;
    },
  } as any;
}

test('verifiedDownload accepts a complete, unchanged file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sftp-'));
  try {
    const local = join(dir, 'f.zip');
    await verifiedDownload(fakeClient({ content: 'abcdef' }), 'remote.zip', local);
    assert.equal(await readFile(local, 'utf8'), 'abcdef');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('verifiedDownload rejects a truncated download', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sftp-'));
  try {
    await assert.rejects(
      verifiedDownload(fakeClient({ content: 'abc', sizes: [6, 6] }), 'remote.zip', join(dir, 'f.zip')),
      /incomplete: got 3 of 6 bytes/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('verifiedDownload rejects a file Ingram replaced mid-download', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sftp-'));
  try {
    await assert.rejects(
      verifiedDownload(fakeClient({ content: 'abcdef', times: [1000, 2000] }), 'remote.zip', join(dir, 'f.zip')),
      /changed on the server during download/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
