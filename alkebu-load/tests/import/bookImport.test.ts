import assert from 'node:assert';
import test from 'node:test';

import {
  buildBookMetadataPatch,
  transformGoogleBooksToPayload,
  transformIsbndbToPayload,
} from '../../src/app/utils/bookImport';

test('transformIsbndbToPayload maps structured ISBNdb weight into shippingWeight', () => {
  const result = transformIsbndbToPayload({
    book: {
      title: 'Shipping Test Book',
      isbn13: '9781234567890',
      authors: ['Test Author'],
      subjects: ['Testing'],
      binding: 'Paperback',
      dimensions_structured: {
        weight: {
          unit: 'lb',
          value: 1.25,
        },
      },
    },
  });

  assert.strictEqual(result.pricing?.shippingWeight, 20);
  assert.strictEqual(result.editions[0].pricing?.shippingWeight, 20);
});

test('transformIsbndbToPayload maps raw author and publisher fields to text fields', () => {
  const result = transformIsbndbToPayload({
    book: {
      title: 'Metadata Test Book',
      isbn13: '9781234567890',
      authors: [' Author One ', 'Author Two'],
      publisher: 'Test Publisher',
      binding: 'Hardcover',
    },
  });

  assert.deepStrictEqual(result.authorsText, [
    { name: 'Author One' },
    { name: 'Author Two' },
  ]);
  assert.strictEqual(result.publisherText, 'Test Publisher');
  assert.strictEqual(result.editions[0].publisherText, 'Test Publisher');
  assert.strictEqual(result.editions[0].binding, 'hardcover');
});

test('transformGoogleBooksToPayload uses google fallback metadata', () => {
  const result = transformGoogleBooksToPayload({
    title: 'Google Title',
    subtitle: 'Subtitle',
    authors: ['Author A'],
    publisher: 'Google Publisher',
    publishedDate: '2004',
    description: 'A google books description.',
    categories: ['History', 'Biography'],
    pageCount: 320,
    language: 'en',
    imageLinks: {
      thumbnail: 'http://example.com/thumb.jpg',
      large: 'https://example.com/large.jpg',
    },
  }, {
    isbn13: '9781111111111',
    isbn10: '1111111111',
  });

  assert.strictEqual(result.titleLong, 'Google Title: Subtitle');
  assert.strictEqual(result.publisherText, 'Google Publisher');
  assert.strictEqual(result.editions[0].datePublished, '2004-01-01');
  assert.deepStrictEqual(result.scrapedImageUrls, [
    { url: 'https://example.com/large.jpg' },
    { url: 'https://example.com/thumb.jpg' },
  ]);
});

test('buildBookMetadataPatch fills missing fields from ISBNdb first and Google second', () => {
  const { updateData, fieldsUpdated } = buildBookMetadataPatch({
    title: 'Existing Title',
    authorsText: [],
    subjects: [],
    scrapedImageUrls: [],
    editions: [
      {
        isbn: '9781234567890',
        pricing: {},
      },
    ],
    pricing: {},
    seo: {},
  }, {
    isbndbBook: {
      title_long: 'Existing Title: Extended',
      authors: ['ISBNdb Author'],
      publisher: 'ISBNdb Publisher',
      synopsis: 'ISBNdb synopsis',
      pages: 280,
      binding: 'Paperback',
      dimensions_structured: {
        weight: { unit: 'oz', value: 12 },
      },
    },
    googleVolumeInfo: {
      description: 'Google description',
      categories: ['History'],
      imageLinks: {
        thumbnail: 'https://example.com/thumb.jpg',
      },
      publishedDate: '1999',
    },
  });

  assert.ok(fieldsUpdated > 0);
  assert.strictEqual(updateData.titleLong, 'Existing Title: Extended');
  assert.deepStrictEqual(updateData.authorsText, [{ name: 'ISBNdb Author' }]);
  assert.strictEqual(updateData.publisherText, 'ISBNdb Publisher');
  assert.strictEqual(updateData.synopsis, 'ISBNdb synopsis');
  assert.deepStrictEqual(updateData.subjects, [{ subject: 'History' }]);
  assert.deepStrictEqual(updateData.scrapedImageUrls, [{ url: 'https://example.com/thumb.jpg' }]);
  assert.strictEqual((updateData.editions as any[])[0].pages, 280);
  assert.strictEqual((updateData.editions as any[])[0].datePublished, '1999-01-01');
  assert.strictEqual((updateData.editions as any[])[0].pricing.shippingWeight, 12);
  assert.strictEqual((updateData.pricing as Record<string, number>).shippingWeight, 12);
});
