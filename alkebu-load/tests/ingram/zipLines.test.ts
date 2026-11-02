import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { crc32, deflateRawSync } from 'node:zlib';

import { zipLines } from '../../src/app/utils/ingram/zipLines';

/** Minimal single-entry deflate zip, enough for yauzl. */
function makeZip(name: string, content: string): Buffer {
  const data = Buffer.from(content, 'utf8');
  const compressed = deflateRawSync(data);
  const nameBuf = Buffer.from(name, 'utf8');
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);

  const localSize = local.length + nameBuf.length + compressed.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + nameBuf.length, 12);
  end.writeUInt32LE(localSize, 16);

  return Buffer.concat([local, nameBuf, compressed, central, nameBuf, end]);
}

test('zipLines streams the lines of the first entry, stripping CR', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ziplines-'));
  try {
    const zipPath = join(dir, 'stock.zip');
    await writeFile(zipPath, makeZip('stock.csv', 'h1,h2\r\na,1\r\nb,2\r\n'));
    const lines: string[] = [];
    for await (const line of zipLines(zipPath)) lines.push(line);
    assert.deepEqual(lines, ['h1,h2', 'a,1', 'b,2']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('zipLines can stop early without leaking the stream', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ziplines-'));
  try {
    const zipPath = join(dir, 'stock.zip');
    await writeFile(zipPath, makeZip('stock.csv', Array.from({ length: 1000 }, (_, i) => `row${i}`).join('\n')));
    for await (const line of zipLines(zipPath)) {
      assert.equal(line, 'row0');
      break;
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
