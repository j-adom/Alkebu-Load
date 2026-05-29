import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const projectRoot = new URL('..', import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, projectRoot), 'utf8');
}

function* walkFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      yield* walkFiles(path);
      continue;
    }

    yield path;
  }
}

test('app shell does not load the unused Agrikol icon font globally', () => {
  const appShell = readProjectFile('src/app.html');

  assert.equal(appShell.includes('/assets/css/agrikol_iconl.css'), false);
});

test('storefront source does not use Agrikol icon classes', () => {
  const sourceRoot = new URL('src', projectRoot).pathname;
  const iconClassPattern = /class=(?:"[^"]*\bicon-[^"]*"|'[^']*\bicon-[^']*')/;
  const matches = [];

  for (const path of walkFiles(sourceRoot)) {
    if (!/\.(svelte|html|js|ts)$/.test(path)) {
      continue;
    }

    const contents = readFileSync(path, 'utf8');

    if (iconClassPattern.test(contents)) {
      matches.push(path.replace(sourceRoot, 'src'));
    }
  }

  assert.deepEqual(matches, []);
});


test('retired legacy vendor assets are not shipped from static/assets', () => {
  const retiredAssets = [
    "static/assets/css/agrikol_iconl.css",
    "static/assets/css/tripo-icons.css",
    "static/assets/css/jquery-ui.css",
    "static/assets/css/bootstrap-select.min.css",
    "static/assets/css/bootstrap-datepicker.min.css",
    "static/assets/css/jquery.mCustomScrollbar.min.css",
    "static/assets/css/swiper.min.css",
    "static/assets/css/jquery.bootstrap-touchspin.css",
    "static/assets/css/animate.min.css",
    "static/assets/fonts/icomoon.eot",
    "static/assets/fonts/icomoon.svg",
    "static/assets/fonts/icomoon.ttf",
    "static/assets/fonts/icomoon.woff",
    "static/assets/fonts/tripo-icon.eot",
    "static/assets/fonts/tripo-icon.svg",
    "static/assets/fonts/tripo-icon.ttf",
    "static/assets/fonts/tripo-icon.woff",
    "static/assets/js/TweenMax.min.js",
    "static/assets/js/appear.js",
    "static/assets/js/bootstrap-datepicker.min.js",
    "static/assets/js/bootstrap-select.min.js",
    "static/assets/js/bootstrap.bundle.min.js",
    "static/assets/js/countdown.min.js",
    "static/assets/js/isotope.js",
    "static/assets/js/jquery.ajaxchimp.min.js",
    "static/assets/js/jquery.bootstrap-touchspin.js",
    "static/assets/js/jquery.bxslider.min.js",
    "static/assets/js/jquery.mCustomScrollbar.concat.min.js",
    "static/assets/js/jquery.magnific-popup.min.js",
    "static/assets/js/jquery.min.js",
    "static/assets/js/jquery.counterup.min.js",
    "static/assets/js/jquery-ui.js",
    "static/assets/js/jquery.validate.min.js",
    "static/assets/js/nouislider.min.js",
    "static/assets/js/owl.carousel.min.js",
    "static/assets/js/swiper.min.js",
    "static/assets/js/theme.js",
    "static/assets/js/typed-2.0.11.js",
    "static/assets/js/vegas.min.js",
    "static/assets/js/waypoints.min.js",
    "static/assets/js/wow.js"
  ];

  const shippedRetiredAssets = retiredAssets.filter((asset) => existsSync(new URL(asset, projectRoot)));

  assert.deepEqual(shippedRetiredAssets, []);
});
