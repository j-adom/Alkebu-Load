// Streams the text lines of the first file in a zip without inflating it to disk or
// memory: Ingram's full catalog-stock file is ~195 MB zipped and far larger unzipped.
import { createInterface } from 'node:readline';
import type { Readable } from 'node:stream';
import yauzl from 'yauzl';

function openFirstEntry(zipPath: string): Promise<{ stream: Readable; close: () => void }> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: false }, (openErr, zip) => {
      if (openErr || !zip) return reject(openErr ?? new Error(`Could not open ${zipPath}`));
      zip.once('error', reject);
      zip.once('end', () => reject(new Error(`${zipPath} has no files`)));
      zip.once('entry', (entry) => {
        zip.openReadStream(entry, (streamErr, stream) => {
          if (streamErr || !stream) return reject(streamErr ?? new Error('Could not read zip entry'));
          resolve({ stream, close: () => zip.close() });
        });
      });
      zip.readEntry();
    });
  });
}

export async function* zipLines(zipPath: string): AsyncGenerator<string> {
  const { stream, close } = await openFirstEntry(zipPath);
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of lines) yield line;
  } finally {
    lines.close();
    stream.destroy();
    close();
  }
}
