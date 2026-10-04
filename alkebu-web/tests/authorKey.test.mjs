import assert from 'node:assert/strict';
import test from 'node:test';

import { authorKey, authorSearchWord, findRenamedAuthor } from '../src/lib/utils/authorKey.ts';

const toSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

test('slug and name of the same author share a key', () => {
  assert.equal(authorKey('dr-jawanza-kunjufu-phd'), authorKey('Jawanza Kunjufu'));
  assert.equal(authorKey('henry-louis-gates-jr'), authorKey('Gates, Henry Louis Jr.'));
  assert.notEqual(authorKey('martin-luther-king-sr'), authorKey('Martin Luther King, Jr.'));
});

test('findRenamedAuthor redirects a merged-away spelling to the surviving one', () => {
  assert.equal(findRenamedAuthor('dr-jawanza-kunjufu-phd', ['Jawanza Kunjufu', 'Kunjufu Reader'], toSlug), 'Jawanza Kunjufu');
  assert.equal(findRenamedAuthor('jawanza-kunjufu', ['Jawanza Kunjufu'], toSlug), null, 'never redirect to itself');
  assert.equal(findRenamedAuthor('angela-davis', ['Angela Y. Davis'], toSlug), null, 'initials are not the same name');
});

test('authorSearchWord picks the longest non-title word', () => {
  assert.equal(authorSearchWord('dr-jawanza-kunjufu-phd'), 'kunjufu');
  assert.equal(authorSearchWord('dr-phd'), null);
});
