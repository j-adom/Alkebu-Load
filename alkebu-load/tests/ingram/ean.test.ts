import assert from 'node:assert/strict';
import test from 'node:test';

import { toEan13 } from '../../src/app/utils/ingram/ean';

test('toEan13 accepts a valid ISBN-13 with or without hyphens', () => {
  assert.equal(toEan13('9780000000002'), '9780000000002');
  assert.equal(toEan13('978-0-00-000000-2'), '9780000000002');
});

test('toEan13 converts a valid ISBN-10, including an X check digit', () => {
  assert.equal(toEan13('0306406152'), '9780306406157');
  assert.equal(toEan13('0-8044-2957-X'), '9780804429573');
});

test('toEan13 rejects bad checksums, wrong lengths and junk', () => {
  assert.equal(toEan13('9780000000003'), null);
  assert.equal(toEan13('0306406153'), null);
  assert.equal(toEan13('12345'), null);
  assert.equal(toEan13('7f289f56-5272-4'), null);
  assert.equal(toEan13(undefined), null);
});
