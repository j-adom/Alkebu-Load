import assert from 'node:assert/strict';
import { access, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  emptyFilterStats,
  filterCatalogLines,
  loadCatalogEans,
  streamCatalogRecords,
  toEan13,
} from '../../src/app/utils/ingram/catalogFilter';
import { fetchIngramFile, latestRemoteFile, sha256File } from '../../src/app/utils/ingram/sftpFetch';
import { makeZip } from './support/makeZip';

// Synthetic, checksum-valid EANs (never taken from a vendor file).
const IN_CATALOG = ['9780000000002', '9780000000019', '9780000000026'];
const NOT_CARRIED = ['9780000000033', '9780000000040', '9780000000057', '9780000000064', '9780000000071'];

const pipeEan = (line: string) => {
  const first = line.split('|', 1)[0];
  return /^\d{13}$/.test(first) ? first : null;
};

function syntheticLines(): string[] {
  return [
    'EAN|TITLE',
    `${NOT_CARRIED[0]}|Skipped one`,
    `${IN_CATALOG[0]}|Kept one`,
    `${NOT_CARRIED[1]}|Skipped two`,
    `${NOT_CARRIED[2]}|Skipped three`,
    `${IN_CATALOG[1]}|Kept two`,
    'garbage line',
    `${NOT_CARRIED[3]}|Skipped four`,
    `${IN_CATALOG[2]}|Kept three`,
    `${NOT_CARRIED[4]}|Skipped five`,
  ];
}

test('toEan13 converts ISBN-10, strips hyphens and drops a bad checksum', () => {
  assert.equal(toEan13('0-306-40615-2'), '9780306406157');
  assert.equal(toEan13('978-0-306-40615-7'), '9780306406157');
  assert.equal(toEan13('9780306406158'), null);
  assert.equal(toEan13('0306406153'), null);
  assert.equal(toEan13(''), null);
});

test('loadCatalogEans normalizes every edition ISBN and drops invalid ones', async () => {
  const pages = [
    {
      docs: [
        { editions: [{ isbn: '978-0-306-40615-7' }, { isbn: 'not-an-isbn', isbn10: '0-306-40615-2' }] },
        { editions: [{ isbn: '9780306406158' }] },
      ],
      hasNextPage: true,
    },
    { docs: [{ editions: [{ isbn: IN_CATALOG[0] }] }], hasNextPage: false },
  ];
  const fake = { find: async ({ page }: { page: number }) => pages[page - 1] } as any;
  const eans = await loadCatalogEans(fake, 2);
  assert.deepEqual([...eans].sort(), ['9780306406157', IN_CATALOG[0]].sort());
});

test('filterCatalogLines yields only catalog lines, in order, and pulls the source lazily', async () => {
  const source = syntheticLines();
  let pulled = 0;
  async function* counting() {
    for (const line of source) {
      pulled += 1;
      yield line;
    }
  }
  const stats = emptyFilterStats();
  const iterator = filterCatalogLines(counting(), pipeEan, new Set(IN_CATALOG), stats)[Symbol.asyncIterator]();

  const first = await iterator.next();
  assert.equal(first.value, `${IN_CATALOG[0]}|Kept one`);
  // Only the header, one skipped line and the match have been read: nothing buffered ahead.
  assert.equal(pulled, 3);

  const rest: string[] = [];
  for (let r = await iterator.next(); !r.done; r = await iterator.next()) rest.push(r.value);
  assert.deepEqual(rest, [`${IN_CATALOG[1]}|Kept two`, `${IN_CATALOG[2]}|Kept three`]);
  assert.equal(pulled, source.length);
  assert.deepEqual(stats, { scanned: 10, matched: 3, noEan: 2 });
});

test('streamCatalogRecords reads the named zip entry and filters it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'catalog-filter-'));
  try {
    const zipPath = join(dir, 'titles.zip');
    await writeFile(
      zipPath,
      makeZip([
        { name: 'readme.txt', content: `${IN_CATALOG[0]}|not the data file\n` },
        { name: 'data/titles.txt', content: `${syntheticLines().join('\r\n')}\r\n` },
      ]),
    );
    const kept: string[] = [];
    for await (const line of streamCatalogRecords(zipPath, 'titles.txt', pipeEan, new Set(IN_CATALOG))) kept.push(line);
    assert.deepEqual(kept, [`${IN_CATALOG[0]}|Kept one`, `${IN_CATALOG[1]}|Kept two`, `${IN_CATALOG[2]}|Kept three`]);

    await assert.rejects(async () => {
      for await (const _ of streamCatalogRecords(zipPath, 'missing.txt', pipeEan, new Set(IN_CATALOG))) void _;
    }, /no entry named missing.txt/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('fetchIngramFile checksums the download and skips an already-processed file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ingram-fetch-test-'));
  try {
    const download = async (_remote: string, local: string) => writeFile(local, 'synthetic payload');
    const first = await fetchIngramFile('TitlesBasic/ttl.zip', { download, tempRoot: root });
    assert.equal(first.skipped, false);
    assert.equal(first.checksum, await sha256File(first.localPath));
    await first.cleanup();
    await assert.rejects(access(first.localPath));

    const again = await fetchIngramFile('TitlesBasic/ttl.zip', { download, tempRoot: root, sinceChecksum: first.checksum });
    assert.equal(again.skipped, true);
    assert.deepEqual(await readdir(root), [], 'a skipped file is cleaned up immediately');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('fetchIngramFile removes its temp dir when the download fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ingram-fetch-test-'));
  try {
    const download = async (_remote: string, local: string) => {
      await writeFile(local, 'partial');
      throw new Error('connection reset');
    };
    await assert.rejects(fetchIngramFile('TitlesBasic/ttl.zip', { download, tempRoot: root }), /connection reset/);
    assert.deepEqual(await readdir(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('latestRemoteFile picks the newest matching file', async () => {
  const list = async () => [
    { name: 'pmmthy-202609.zip', size: 1, modifiedAt: 100 },
    { name: 'pmmthy-202610.zip', size: 1, modifiedAt: 200 },
    { name: 'other.zip', size: 1, modifiedAt: 300 },
  ];
  assert.equal(await latestRemoteFile('PubDescripi/', /^pmmthy-.*\.zip$/i, list), 'PubDescripi/pmmthy-202610.zip');
  assert.equal(await latestRemoteFile('PubDescripi', /^nothing$/, list), null);
});
