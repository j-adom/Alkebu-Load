import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SITEMAP_STATIC_PAGES,
  buildSitemapSelectParams,
  sitemapUrlElement,
} from '../src/lib/server/sitemapHelpers.js';

test('sitemap select params use Payload bracket syntax, not comma syntax', () => {
  const params = buildSitemapSelectParams();

  assert.equal(params.get('select[slug]'), 'true');
  assert.equal(params.get('select[updatedAt]'), 'true');
  assert.equal(params.get('select'), null);
});

test('sitemapUrlElement does not throw when lastmod is missing', () => {
  const xml = sitemapUrlElement('https://example.com/x', undefined);

  assert.match(xml, /<loc>https:\/\/example\.com\/x<\/loc>/);
  assert.match(xml, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
});

test('sitemapUrlElement formats a valid lastmod as YYYY-MM-DD', () => {
  const xml = sitemapUrlElement('https://example.com/x', '2026-05-27T07:08:40.813Z');

  assert.match(xml, /<lastmod>2026-05-27<\/lastmod>/);
});

test('static sitemap pages only reference routes that exist', () => {
  const paths = SITEMAP_STATIC_PAGES.map((p) => p.path);

  assert.ok(paths.includes('/return-policy'));
  assert.ok(paths.includes('/terms-of-service'));
  assert.ok(paths.includes('/privacy'));

  // Old entries that 404 in production must be gone.
  assert.equal(paths.includes('/returns'), false);
  assert.equal(paths.includes('/terms'), false);
  assert.equal(paths.includes('/shipping'), false);
});
