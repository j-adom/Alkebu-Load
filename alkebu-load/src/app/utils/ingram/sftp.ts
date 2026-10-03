// SFTP access to Ingram Data Services (GoAnywhere server). Node's ssh2 negotiates its
// algorithms (ecdh-sha2-nistp256 / rsa-sha2-512 / aes128-gcm), so no OpenSSH binary is
// needed in the container.
import { createHash } from 'node:crypto';
import SftpClient from 'ssh2-sftp-client';

// Recorded 2026-10-02 on first connect. Override with INGRAM_FTP_HOST_FINGERPRINT if
// Ingram rotates the key (they announce maintenance from metadataupdates@).
const DEFAULT_HOST_FINGERPRINT = 'SHA256:MKA9n3CYF8dY+j9P713bUoWelyJtFdv8gNpfn8pkzoc';

export interface IngramSftpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  hostFingerprint: string;
}

export function sftpConfigFromEnv(env: Record<string, string | undefined> = process.env): IngramSftpConfig {
  const host = env.INGRAM_FTP_HOST;
  const username = env.INGRAM_FTP_USER;
  const password = env.INGRAM_FTP_PASSWORD;
  if (!host || !username || !password) {
    throw new Error('INGRAM_FTP_HOST, INGRAM_FTP_USER and INGRAM_FTP_PASSWORD must be set');
  }
  return {
    host,
    port: Number(env.INGRAM_FTP_PORT) || 22,
    username,
    password,
    hostFingerprint: env.INGRAM_FTP_HOST_FINGERPRINT || DEFAULT_HOST_FINGERPRINT,
  };
}

/** True when the raw host key blob has the given OpenSSH SHA256 fingerprint. */
export function hostKeyMatches(key: Buffer, fingerprint: string): boolean {
  const actual = createHash('sha256').update(key).digest('base64').replace(/=+$/, '');
  return actual === fingerprint.replace(/^SHA256:/, '').replace(/=+$/, '');
}

export interface RemoteFile {
  name: string;
  size: number;
  modifiedAt: number;
}

async function withSftp<T>(config: IngramSftpConfig, fn: (client: SftpClient) => Promise<T>): Promise<T> {
  const client = new SftpClient('ingram');
  await client.connect({
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    readyTimeout: 30_000,
    hostVerifier: (key: Buffer) => hostKeyMatches(key, config.hostFingerprint),
  });
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function listIngramDir(dir: string, config = sftpConfigFromEnv()): Promise<RemoteFile[]> {
  return withSftp(config, async (client) =>
    (await client.list(dir))
      .filter((entry) => entry.type === '-')
      .map((entry) => ({ name: entry.name, size: entry.size, modifiedAt: entry.modifyTime })),
  );
}

export async function downloadIngramFile(remotePath: string, localPath: string, config = sftpConfigFromEnv()): Promise<void> {
  await withSftp(config, (client) => client.fastGet(remotePath, localPath));
}
