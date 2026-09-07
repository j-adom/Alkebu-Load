import assert from 'node:assert';
import test from 'node:test';

import {
  getSearchBootstrapTargets,
  SEARCH_INDEX_BOOTSTRAP_TARGETS,
  toSearchText,
  searchEngine,
  filterVisibleSearchResults,
  SearchEngine,
  SEARCH_INDEX_MAX_AGE_MS,
} from '../../src/app/utils/searchEngine';

test('search bootstrap targets use the registered Payload product slugs', () => {
  const targets = getSearchBootstrapTargets([
    'books',
    'wellness-lifestyle',
    'fashion-jewelry',
    'oils-incense',
  ]);

  assert.deepStrictEqual(
    targets.map((target) => target.collection),
    ['books', 'wellness-lifestyle', 'fashion-jewelry', 'oils-incense'],
  );
  assert.deepStrictEqual(
    targets.map((target) => target.type),
    ['books', 'wellnessLifestyle', 'fashionJewelry', 'oilsIncense'],
  );
});

test('search bootstrap targets fall back to the canonical collection list', () => {
  assert.deepStrictEqual(
    getSearchBootstrapTargets(),
    SEARCH_INDEX_BOOTSTRAP_TARGETS,
  );
});

test('toSearchText extracts plain text from Payload lexical content', () => {
  const lexicalValue = {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'African' },
            { type: 'text', text: 'history' },
          ],
        },
      ],
    },
  };

  assert.strictEqual(toSearchText(lexicalValue), 'African history');
});

test('toSearchText flattens nested arrays and objects into searchable text', () => {
  assert.strictEqual(
    toSearchText([
      'black',
      { subject: 'literature' },
      ['diaspora', { text: 'studies' }],
    ]),
    'black literature diaspora studies',
  );
});


test('an indexed book can be retrieved by its author with a storefront dollar price', async () => {
  await searchEngine.addDocument('books', {
    id: 'search-regression',
    title: 'We The Black Jews',
    authorsText: [{ name: 'Yosef Ben-Jochannan' }],
    slug: 'we-the-black-jews',
    editions: [{ isbn: '9780933121400', pricing: { retailPrice: 2995 } }],
  });
  const response = await searchEngine.search('jochannan', { types: ['books'] });
  assert.strictEqual(response.internal.length, 1);
  assert.strictEqual(response.internal[0].author, 'Yosef Ben-Jochannan');
  assert.strictEqual(response.internal[0].price, 29.95);
  assert.strictEqual(response.internal[0].slug, 'we-the-black-jews');
});

test('normalization handles hyphens and doubled consonants without changing display text', async () => {
  const engine = new SearchEngine();
  await engine.addDocument('books', {
    id: 1, title: 'Pan-African History', authorsText: [{ name: 'Yosef Ben-Jochannan' }],
    editions: [{ isbn: '9780933121400', isbn10: '0933121407' }],
  });
  for (const query of ['jochannan', 'jochanan', 'benjochannan', 'Ben- Jochanan', 'panafrican', 'pan-african']) {
    const result = await engine.search(query, { types: ['books'] });
    assert.strictEqual(result.internal.length, 1, query);
    assert.strictEqual(result.internal[0].author, 'Yosef Ben-Jochannan');
  }
  for (const query of ['unrelated author', '9780933121401', '093312140']) {
    assert.strictEqual((await engine.search(query, { types: ['books'] })).internal.length, 0, query);
  }
  for (const query of ['9780933121400', '0933121407']) {
    assert.strictEqual((await engine.search(query, { types: ['books'] })).internal.length, 1, query);
  }
});

test('multi-field matches produce unique cards and all-search does not ration book results', async () => {
  const engine = new SearchEngine();
  for (let id = 1; id <= 16; id++) {
    await engine.addDocument('books', { id, title: 'History', author: 'History', description: 'History' });
  }
  const response = await engine.search('history', { limit: 30 });
  assert.strictEqual(response.internal.length, 16);
  assert.strictEqual(response.totalResults, 16);
});

test('product collection filters preserve same-number IDs and normalize their different price units', async () => {
  const engine = new SearchEngine();
  await engine.addDocument('fashionJewelry', { id: 1, name: 'Cultural shirt', price: 25 });
  await engine.addDocument('wellnessLifestyle', { id: 1, name: 'Cultural soap', variations: [{ price: 1499 }] });
  await engine.addDocument('oilsIncense', { id: 1, name: 'Cultural oil', variations: [{ price: 2500 }, { price: 500 }] });
  const all = await engine.search('cultural');
  assert.strictEqual(all.internal.length, 3);
  for (const [type, price] of [['fashionJewelry', 25], ['wellnessLifestyle', 14.99], ['oilsIncense', 5]] as const) {
    const result = await engine.search('cultural', { types: [type], limit: 1 });
    assert.strictEqual(result.internal.length, 1);
    assert.strictEqual(result.internal[0].type, type);
    assert.strictEqual(result.internal[0].id, '1');
    assert.strictEqual(result.internal[0].price, price);
  }
});

test('bootstrap paginates beyond 1000 books and only becomes ready after the last page', async () => {
  const engine = new SearchEngine();
  const pages: number[] = [];
  const payload = {
    collections: { books: {} },
    find: async (options: any) => {
      assert.strictEqual(engine.isReady, false);
      assert.deepStrictEqual(options.where, { availabilityStatus: { not_equals: 'discontinued' } });
      assert.strictEqual(options.sort, 'id');
      pages.push(options.page);
      const start = (options.page - 1) * options.limit;
      return {
        docs: Array.from({ length: Math.min(options.limit, 1001 - start) }, (_, offset) => ({
          id: start + offset + 1, title: start + offset === 1000 ? 'Lastbook' : 'Book',
        })),
        hasNextPage: options.page < 3,
      };
    },
  };
  assert.strictEqual(engine.isReady, false);
  const first = engine.initializeWithData(payload);
  assert.strictEqual(engine.initializeWithData(payload), first, 'concurrent callers share the rebuild');
  await first;
  assert.strictEqual(engine.isReady, true);
  assert.deepStrictEqual(pages, [1, 2, 3]);
  assert.strictEqual((await engine.search('lastbook')).internal.length, 1);
});

test('failed bootstrap stays unready and a successful retry replaces the snapshot', async () => {
  const engine = new SearchEngine();
  await assert.rejects(engine.initializeWithData({
    collections: { books: {} }, find: async () => { throw new Error('database unavailable'); },
  }), /database unavailable/);
  assert.strictEqual(engine.isReady, false);
  const payload = (title: string) => ({
    collections: { books: {} }, find: async () => ({ docs: [{ id: 1, title }], hasNextPage: false }),
  });
  await engine.initializeWithData(payload('Oldtitle'));
  assert.strictEqual(engine.isReady, true);
  await engine.initializeWithData(payload('Newtitle'));
  assert.strictEqual((await engine.search('oldtitle')).internal.length, 0);
  assert.strictEqual((await engine.search('newtitle')).internal.length, 1);
});

test('aging snapshots remain usable while requesting a refresh', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  const engine = new SearchEngine();
  await engine.initializeWithData({
    collections: { books: {} }, find: async () => ({ docs: [], hasNextPage: false }),
  });
  assert.strictEqual(engine.isReady, true);
  assert.strictEqual(engine.needsRefresh, false);
  t.mock.timers.tick(SEARCH_INDEX_MAX_AGE_MS);
  assert.strictEqual(engine.isReady, true);
  assert.strictEqual(engine.needsRefresh, true);
});


test('visibility recheck excludes removed hits and retains collection-specific publication gates', async () => {
  const hits = [
    { id: 1, type: 'books' }, { id: 2, type: 'books' },
    { id: 1, type: 'wellnessLifestyle' }, { id: 1, type: 'blogPosts' },
  ];
  const checked: string[] = [];
  const filtered = await filterVisibleSearchResults({
    find: async ({ collection, where }: any) => {
      checked.push(collection);
      if (collection === 'books') {
        assert.deepStrictEqual(where.and[1], { availabilityStatus: { not_equals: 'discontinued' } });
        return { docs: [{ id: 1 }] };
      }
      if (collection === 'wellness-lifestyle') {
        assert.deepStrictEqual(where.and[1], { publishOnline: { equals: true } });
      } else {
        assert.deepStrictEqual(where.and[1], { status: { equals: 'published' } });
      }
      return { docs: [] };
    },
  }, hits);
  assert.deepStrictEqual(filtered, [{ id: 1, type: 'books' }]);
  assert.strictEqual(checked.length, 3);
});

test('a failure after a loaded page never exposes the partial replacement', async () => {
  const engine = new SearchEngine();
  await assert.rejects(engine.initializeWithData({
    collections: { books: {} },
    find: async ({ page }: any) => {
      if (page === 2) throw new Error('second page failed');
      return { docs: [{ id: 1, title: 'Partialbook' }], hasNextPage: true };
    },
  }), /second page failed/);
  assert.strictEqual(engine.isReady, false);
  assert.strictEqual((await engine.search('partialbook')).internal.length, 0);
});


test('search preparation waits for a cold index and retains author matches during refresh', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  const engine = new SearchEngine();
  let finishPage!: (page: any) => void;
  let calls = 0;
  const payload = { collections: { books: {} }, find: () => {
    calls++;
    return new Promise(resolve => { finishPage = resolve; });
  } };
  let prepared = false;
  const first = engine.prepareForSearch(payload).then(() => { prepared = true; });
  await Promise.resolve();
  assert.strictEqual(prepared, false);
  const page = { docs: [{ id: 1, title: 'Book', author: 'Yosef Ben-Jochannan' }], hasNextPage: false };
  finishPage(page);
  await first;
  t.mock.timers.tick(SEARCH_INDEX_MAX_AGE_MS);
  await engine.prepareForSearch(payload);
  await engine.prepareForSearch(payload);
  assert.strictEqual(calls, 2, 'only one refresh starts');
  assert.strictEqual((await engine.search('jochanan')).internal.length, 1);
  const refresh = engine.initializeWithData(payload);
  finishPage(page);
  await refresh;
  assert.strictEqual(engine.needsRefresh, false);
});
