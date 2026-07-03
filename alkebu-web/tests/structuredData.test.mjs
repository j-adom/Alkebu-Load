import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const projectRoot = new URL('..', import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, projectRoot), 'utf8');
}

test('Meta.svelte renders JSON-LD script tags into the document head', () => {
  const meta = readProjectFile('src/lib/components/Meta.svelte');

  // Server loads pass pre-built `<script type="application/ld+json">` strings
  // as `jsonLd` / `breadcrumbsJsonLd`; they must reach the SSR head via @html.
  assert.match(meta, /\{@html\s+resolved\.jsonLd\}/);
  assert.match(meta, /\{@html\s+resolved\.breadcrumbsJsonLd\}/);
});

test('Meta.svelte emits a robots noindex tag when noIndex is set', () => {
  const meta = readProjectFile('src/lib/components/Meta.svelte');

  assert.match(meta, /name="robots"/);
  assert.match(meta, /noindex/);
});

test('ldScript escapes < so JSON-LD cannot break out of its script tag', () => {
  const seo = readProjectFile('src/lib/seo.ts');

  assert.match(seo, /\\u003C/i);
});
