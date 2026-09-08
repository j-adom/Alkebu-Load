import assert from 'node:assert/strict';
import test from 'node:test';

import { cleanResultDescription, getBookMeta } from '../src/lib/utils/searchPresentation.js';

test('search descriptions remove repeated author and title text', () => {
  assert.equal(
    cleanResultDescription('Yosef Ben-Jochannan — A study of African history', 'We the Black Jews', 'Yosef Ben-Jochannan'),
    'A study of African history',
  );
  assert.equal(cleanResultDescription('Yosef Ben-Jochannan', 'We the Black Jews', 'Yosef Ben-Jochannan'), '');
  assert.equal(cleanResultDescription('We the Black Jews', 'We the Black Jews', 'Yosef Ben-Jochannan'), '');
});

test('book metadata uses customer-facing format and availability labels', () => {
  assert.deepEqual(getBookMeta({ binding: 'paperback', stockLevel: 3 }), ['Paperback', 'In stock']);
  assert.deepEqual(getBookMeta({ binding: 'hardcover', availabilityStatus: 'request-only' }), ['Hardcover', 'Request only']);
  assert.deepEqual(getBookMeta({ allowBackorders: true }), ['Available to order']);
});
