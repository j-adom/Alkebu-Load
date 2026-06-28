import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPartnershipPageByPath,
  partnershipPageList,
  partnershipPages,
} from '../src/lib/data/partnershipPages.js';

test('defines the three required partnership pages with unique paths', () => {
  assert.deepEqual(Object.keys(partnershipPages).sort(), [
    'institutional',
    'nonprofit',
    'wholesale',
  ]);
  assert.equal(new Set(partnershipPageList.map((page) => page.path)).size, 3);
  assert.deepEqual(partnershipPageList.map((page) => page.path).sort(), [
    '/institutional-contracts',
    '/non-profit-projects',
    '/wholesale',
  ]);
});

test('each page has SEO, benefits, process steps, and tailored fields', () => {
  for (const page of partnershipPageList) {
    assert.ok(page.seo.title);
    assert.ok(page.seo.description);
    assert.ok(page.hero.headline);
    assert.ok(page.hero.image);
    assert.ok(page.hero.badge);
    assert.equal(page.hero.tiles.length, 4);
    assert.equal(page.benefits.length, 3);
    assert.equal(page.process.length, 3);
    assert.ok(page.form.detailFields.length >= 2);
  }
});

test('path lookup returns matching page config', () => {
  assert.equal(getPartnershipPageByPath('/wholesale').type, 'wholesale');
  assert.equal(getPartnershipPageByPath('/institutional-contracts').type, 'institutional');
  assert.equal(getPartnershipPageByPath('/non-profit-projects').type, 'nonprofit');
});
