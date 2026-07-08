import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getPartnershipPageByPath,
  partnershipPageList,
  partnershipPages,
} from '../src/lib/data/partnershipPages.js';

const projectRoot = new URL('..', import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, projectRoot), 'utf8');
}

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
    assert.ok(page.hero.subhead);
    assert.ok(page.hero.image);
    assert.ok(page.hero.imageAlt);
    assert.equal(page.hero.trustRow.length, 3);
    assert.equal(page.benefits.length, 3);
    assert.equal(page.process.length, 3);
    assert.ok(page.form.detailFields.length >= 2);
    assert.ok(page.form.detailLegend);
  }
});

test('each track has a distinct Adinkra symbol and accent, and the SVG exists', () => {
  assert.equal(new Set(partnershipPageList.map((page) => page.accent)).size, 3);
  assert.equal(new Set(partnershipPageList.map((page) => page.symbol)).size, 3);
  for (const page of partnershipPageList) {
    assert.match(page.accent, /^#[0-9A-Fa-f]{6}$/);
    assert.ok(
      existsSync(new URL(`static${page.symbol}`, projectRoot)),
      `missing symbol asset: ${page.symbol}`
    );
  }
});

test('every referenced image asset exists on disk', () => {
  for (const page of partnershipPageList) {
    assert.ok(
      existsSync(new URL(`static${page.hero.image}`, projectRoot)),
      `missing hero image: ${page.hero.image}`
    );
    if (page.midImage) {
      assert.ok(
        existsSync(new URL(`static${page.midImage.src}`, projectRoot)),
        `missing mid image: ${page.midImage.src}`
      );
      assert.ok(page.midImage.alt, 'midImage needs alt text');
    }
  }
});

test('path lookup returns matching page config', () => {
  assert.equal(getPartnershipPageByPath('/wholesale').type, 'wholesale');
  assert.equal(getPartnershipPageByPath('/institutional-contracts').type, 'institutional');
  assert.equal(getPartnershipPageByPath('/non-profit-projects').type, 'nonprofit');
});

test('form sends renderedAt and the action forwards it to the backend', () => {
  // The backend's minimum-time-to-submit check silently drops any submission
  // without a numeric renderedAt — if either half of this wiring disappears,
  // every real inquiry is swallowed as spam.
  const component = readProjectFile('src/lib/components/Partnership/PartnershipLandingPage.svelte');
  assert.match(component, /name="renderedAt"/);

  const action = readProjectFile('src/lib/server/partnershipInquiry.ts');
  assert.match(action, /formData\.get\('renderedAt'\)/);
  assert.match(action, /renderedAt/);
});

test('form has accessible structure and outcome instrumentation', () => {
  const component = readProjectFile('src/lib/components/Partnership/PartnershipLandingPage.svelte');
  assert.match(component, /<fieldset/);
  assert.match(component, /<legend/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /aria-describedby/);
  assert.match(component, /trackEvent\('partnership_form_start'/);
  assert.match(component, /trackEvent\('partnership_form_submit_success'/);
  assert.match(component, /trackEvent\('partnership_form_submit_error'/);
});

test('homepage business-service cards fall back to /contact', () => {
  const homepage = readProjectFile('src/routes/+page.svelte');
  assert.match(homepage, /service\.href \|\| "\/contact"/);
});
