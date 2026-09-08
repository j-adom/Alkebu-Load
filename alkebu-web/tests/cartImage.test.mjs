import assert from 'node:assert/strict';
import test from 'node:test';
import { cartImage, cartProduct } from '../src/lib/utils/cartImage.js';

test('book cart resolves the polymorphic product and nested Payload cover', () => {
  const cover = { url: 'https://media.example.com/cover.jpg', width: 400, height: 600, alt: 'Book cover' };
  const book = { title: 'We The Black Jews', slug: 'we-the-black-jews', images: [{ image: cover }] };
  const item = { product: { relationTo: 'books', value: book } };
  assert.equal(cartProduct(item), book);
  assert.equal(cartImage(item), cover);
});

test('direct product images and URL snapshots remain supported', () => {
  const image = { url: '/cover.jpg' };
  assert.equal(cartImage({ product: { images: [image] } }), image);
  assert.deepEqual(cartImage({ image: 'https://media.example.com/snapshot.jpg' }), { url: 'https://media.example.com/snapshot.jpg' });
});

test('unpopulated media falls back to the scraped cover', () => {
  assert.deepEqual(cartImage({ product: { relationTo: 'books', value: {
    images: [{ image: 123 }], scrapedImageUrls: [{ url: 'https://example.com/cover.jpg' }],
  } } }), { url: 'https://example.com/cover.jpg' });
});

test('missing products and media retain the no-image placeholder', () => {
  for (const item of [null, {}, { product: 12 }, { product: { relationTo: 'books', value: 12 } }, { product: { images: [{ image: 123 }] } }]) {
    assert.equal(cartImage(item), null);
  }
});
