import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const routesDir = new URL('../src/routes', import.meta.url).pathname;

function* walkDirs(dir) {
  yield dir;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      yield* walkDirs(path);
    }
  }
}

test('every route with page form actions also has a page component', () => {
  // A +page.server.ts exporting `actions` without a sibling +page.svelte
  // renders a 500 on GET (this shipped to production as /login).
  const offenders = [];

  for (const dir of walkDirs(routesDir)) {
    const serverFile = join(dir, '+page.server.ts');
    if (!existsSync(serverFile)) continue;

    const hasActions = /export\s+const\s+actions/.test(readFileSync(serverFile, 'utf8'));
    const hasPage = existsSync(join(dir, '+page.svelte'));

    if (hasActions && !hasPage) {
      offenders.push(dir.slice(routesDir.length) || '/');
    }
  }

  assert.deepEqual(offenders, []);
});
