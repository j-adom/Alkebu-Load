// Module customization hook (registered via node:module's `register()`, NOT the
// deprecated --experimental-loader CLI flag and NOT --experimental-test-module-mocks)
// that redirects any `import('square')` to squareStub.mjs. Scoped to whichever single
// test-file process registers it -- `node --test` forks one process per file, so this
// never affects any other test file's module resolution.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const stubUrl = pathToFileURL(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'squareStub.mjs'),
).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'square') {
    return { url: stubUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
