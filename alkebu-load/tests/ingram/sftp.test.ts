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
