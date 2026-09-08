import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHomepageShelves } from '../src/lib/utils/homepageShelves.js';

const book = (id, extra = {}) => ({ id, title: `Book ${id}`, images: [{ id: `m${id}` }], ...extra });

test('new arrivals exclude books already on the featured shelf', () => {
  const featured = [book(1), book(2)];
  const fresh = [book(2), book(3), book(1), book(4)];
  const shelves = buildHomepageShelves({ featured, fresh, limit: 8 });
  assert.deepEqual(shelves.featured.map((b) => b.id), [1, 2]);
  assert.deepEqual(shelves.newBooks.map((b) => b.id), [3, 4]);
});

test('both shelves are capped at the limit after deduping', () => {
  const featured = Array.from({ length: 10 }, (_, i) => book(i + 1));
  const fresh = Array.from({ length: 20 }, (_, i) => book(i + 5));
  const shelves = buildHomepageShelves({ featured, fresh, limit: 8 });
  assert.equal(shelves.featured.length, 8);
  assert.equal(shelves.newBooks.length, 8);
  // dedupe is against the books actually shown, not the whole featured pool
  assert.deepEqual(shelves.newBooks.map((b) => b.id), [9, 10, 11, 12, 13, 14, 15, 16]);
});

test('new arrivals only include books with a cover image', () => {
  const fresh = [book(1, { images: [] }), book(2, { images: [], scrapedImageUrls: ['x'] }), book(3)];
  const shelves = buildHomepageShelves({ featured: [], fresh, limit: 8 });
  assert.deepEqual(shelves.newBooks.map((b) => b.id), [2, 3]);
});

test('an empty featured pool yields an empty featured shelf, not a fallback', () => {
  const shelves = buildHomepageShelves({ featured: [], fresh: [book(1)], limit: 8 });
  assert.deepEqual(shelves.featured, []);
  assert.equal(shelves.newBooks.length, 1);
});

test('tolerates undefined inputs', () => {
  const shelves = buildHomepageShelves({});
  assert.deepEqual(shelves, { featured: [], newBooks: [] });
});
