// Streams the text lines of the first file in a zip without inflating it to disk or
// memory: Ingram's full catalog-stock file is ~195 MB zipped and far larger unzipped.
import { createInterface } from 'node:readline';
import type { Readable } from 'node:stream';
import yauzl from 'yauzl';

/**
 * Opens one entry of a zip as a stream: the named entry (exact path or basename) when
 * `entryName` is given, else the first file. Ingram's Titles Basic and description zips
 * hold one data file each, so the name is only a guard against a repackaged archive.
 */
function openEntry(zipPath: string, entryName?: string): Promise<{ stream: Readable; close: () => void }> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: false }, (openErr, zip) => {
      if (openErr || !zip) return reject(openErr ?? new Error(`Could not open ${zipPath}`));
      zip.once('error', reject);
      zip.once('end', () =>
        reject(new Error(entryName ? `${zipPath} has no entry named ${entryName}` : `${zipPath} has no files`)),
      );
      zip.on('entry', (entry) => {
        const name = String(entry.fileName);
        const isDir = name.endsWith('/');
        const matches = entryName ? name === entryName || name.split('/').pop() === entryName : true;
        if (isDir || !matches) {
          zip.readEntry();
          return;
        }
        zip.removeAllListeners('entry');
        zip.openReadStream(entry, (streamErr, stream) => {
          if (streamErr || !stream) return reject(streamErr ?? new Error('Could not read zip entry'));
          resolve({ stream, close: () => zip.close() });
        });
      });
      zip.readEntry();
    });
  });
}

export async function* zipLines(zipPath: string, entryName?: string): AsyncGenerator<string> {
  const { stream, close } = await openEntry(zipPath, entryName);
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of lines) yield line;
  } finally {
    lines.close();
    stream.destroy();
    close();
  }
}
