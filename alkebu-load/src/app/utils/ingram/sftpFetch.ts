// Download one Ingram SFTP file to a private temp dir, with a sha256 checksum so a run
// can skip a file it has already processed. Built on sftp.ts (host-key pinning, verified
// sequential download), which the Stage-1 stock refresh also uses.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { downloadIngramFile, listIngramDir, type RemoteFile } from './sftp';

export type Downloader = (remotePath: string, localPath: string) => Promise<void>;

export interface FetchedFile {
  remotePath: string;
  /** Local copy; removed by cleanup(). Still present (until cleanup) when skipped. */
  localPath: string;
  checksum: string;
  /** True when the checksum equals `sinceChecksum`: the caller has already processed it. */
  skipped: boolean;
  cleanup: () => Promise<void>;
}

export async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

/**
 * Downloads `remotePath` into a fresh temp dir. On any failure the temp dir is removed
 * before the error propagates. A skipped file is cleaned up immediately; otherwise the
 * caller must call `cleanup()` once it has streamed the file.
 */
export async function fetchIngramFile(
  remotePath: string,
  opts: { sinceChecksum?: string | null; download?: Downloader; tempRoot?: string } = {},
): Promise<FetchedFile> {
  const download = opts.download ?? ((remote, local) => downloadIngramFile(remote, local));
  const dir = await mkdtemp(join(opts.tempRoot ?? tmpdir(), 'ingram-fetch-'));
  const cleanup = () => rm(dir, { recursive: true, force: true });
  try {
    const localPath = join(dir, basename(remotePath) || 'download.bin');
    await download(remotePath, localPath);
    const checksum = await sha256File(localPath);
    const skipped = Boolean(opts.sinceChecksum) && opts.sinceChecksum === checksum;
    if (skipped) await cleanup();
    return { remotePath, localPath, checksum, skipped, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

/**
 * Newest file in `dir` whose name matches `pattern` (e.g. the monthly `pmmthy-*.zip`
 * adds/changes files, whose names carry a date). Null when none match.
 */
export async function latestRemoteFile(
  dir: string,
  pattern: RegExp,
  list: (dir: string) => Promise<RemoteFile[]> = (d) => listIngramDir(d),
): Promise<string | null> {
  const matches = (await list(dir)).filter((file) => pattern.test(file.name));
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.modifiedAt - a.modifiedAt || b.name.localeCompare(a.name));
  return `${dir.replace(/\/+$/, '')}/${matches[0].name}`;
}
