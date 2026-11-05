import assert from 'node:assert';
import test from 'node:test';

import { bookUpdateForSquareItem, findBookForSquareItem } from '../../src/app/utils/squareBookMatch';
import {
  bookHasNoCover,
  isbnQueryForms,
  isLegacySquareItemId,
  relinkEditionsByIsbn,
  squareImageUrls,
} from '../../src/app/utils/squareLinks';
import { withNewBookEnrichment } from '../../src/app/utils/squareNewBookEnrichment';

// In-memory stand-in for payload.find over the four where shapes the lookup uses.
function fakePayload(books: any[]) {
  const matches = (book: any, where: Record<string, any>) => {
    const [path, cond] = Object.entries(where)[0];
    const values =
      path === 'squareItemId'
        ? [book.squareItemId]
        : (book.editions || []).map((edition: any) => edition[path.split('.')[1]]);
    return values.some((value: unknown) => ('equals' in cond ? value === cond.equals : cond.in.includes(value)));
  };
  return {
    find: async ({ where }: any) => ({ docs: books.filter((book) => matches(book, where)) }),
  } as any;
}

// What the March CSV import left behind: the variation id stored as the item id, then
// copied onto the edition by the 2026-10-03 backfill.
const csvImported = {
  id: 4764,
  squareItemId: 'VAR_4UP6',
  images: [{ image: 1 }],
  editions: [{ isbn: '9780913543962', squareVariationId: 'VAR_4UP6', squareItemId: 'VAR_4UP6', pricing: { retailPrice: 1500 } }],
};

const mappedFromSquare = {
  title: 'Countering the Conspiracy',
  squareItemId: 'ITEM_P5WR',
  editions: [{ isbn: '9780913543962', squareVariationId: 'VAR_4UP6', squareItemId: 'ITEM_P5WR', pricing: { retailPrice: 1695 } }],
};

test('a legacy item id is a stored variation id or an old numeric id, never a real item id', () => {
  assert.equal(isLegacySquareItemId('VAR_4UP6', ['VAR_4UP6']), true);
  assert.equal(isLegacySquareItemId('210000000351', []), true);
  assert.equal(isLegacySquareItemId('ITEM_P5WR', ['VAR_4UP6']), false);
  assert.equal(isLegacySquareItemId(null, []), false);
});

test('a Square edit to a CSV-imported book finds that book instead of creating a duplicate', async () => {
  const book = await findBookForSquareItem(fakePayload([csvImported]), 'ITEM_P5WR', ['VAR_4UP6']);
  assert.equal(book?.id, 4764);
});

test('the real item takes over a legacy-linked book and repairs both ids', () => {
  const update = bookUpdateForSquareItem(csvImported, 'ITEM_P5WR', mappedFromSquare) as any;
  assert.equal(update.squareItemId, 'ITEM_P5WR');
  assert.equal(update.title, 'Countering the Conspiracy');
  assert.equal(update.editions.length, 1);
  assert.equal(update.editions[0].squareItemId, 'ITEM_P5WR');
  assert.equal(update.editions[0].pricing.retailPrice, 1695);
});

test('an edition linked to a different real item is not claimed through its variation', async () => {
  const linkedElsewhere = {
    id: 9,
    squareItemId: 'ITEM_OTHER',
    editions: [{ isbn: '9780913543962', squareVariationId: 'VAR_4UP6', squareItemId: 'ITEM_OTHER' }],
  };
  assert.equal(await findBookForSquareItem(fakePayload([linkedElsewhere]), 'ITEM_P5WR', ['VAR_4UP6'], ['9780913543962']), null);
});

test('a manual book with a dead numeric id is found by ISBN, including an ISBN-10 spelling', async () => {
  const manual = {
    id: 3202,
    squareItemId: '210000000351',
    editions: [{ isbn: '0913543969', squareVariationId: '210000000351', squareItemId: '210000000351' }],
  };
  const book = await findBookForSquareItem(fakePayload([manual]), 'ITEM_NEW', ['VAR_NEW'], ['9780913543962']);
  assert.equal(book?.id, 3202);

  const update = bookUpdateForSquareItem(manual, 'ITEM_NEW', {
    squareItemId: 'ITEM_NEW',
    editions: [{ isbn: '9780913543962', squareVariationId: 'VAR_NEW', squareItemId: 'ITEM_NEW' }],
  }) as any;
  assert.equal(update.squareItemId, 'ITEM_NEW');
  assert.equal(update.editions.length, 1, 'relinked by ISBN, not appended beside the old edition');
  assert.equal(update.editions[0].squareVariationId, 'VAR_NEW');
});

test('an unlinked edition inherits its book-level item and is not claimed by ISBN', async () => {
  const linkedByBook = { id: 5, squareItemId: 'ITEM_OTHER', editions: [{ isbn: '9780913543962', squareVariationId: 'VAR_O' }] };
  assert.equal(await findBookForSquareItem(fakePayload([linkedByBook]), 'ITEM_NEW', ['VAR_NEW'], ['9780913543962']), null);
});

test('two books holding the same ISBN are an error, not a guess', async () => {
  const a = { id: 1, editions: [{ isbn: '9780913543962' }] };
  const b = { id: 2, editions: [{ isbn: '9780913543962' }] };
  await assert.rejects(findBookForSquareItem(fakePayload([a, b]), 'ITEM_X', [], ['9780913543962']), /matches books 1, 2/);
});

test('relinking by ISBN leaves editions that already match or belong to another item alone', () => {
  const existing = [
    { isbn: '9780913543962', squareVariationId: 'VAR_A', squareItemId: 'ITEM_X' },
    { isbn: '9781111111113', squareVariationId: 'VAR_B', squareItemId: 'ITEM_OTHER' },
  ];
  const incoming = [
    { isbn: '9780913543962', squareVariationId: 'VAR_A' },
    { isbn: '9781111111113', squareVariationId: 'VAR_C' },
  ];
  assert.deepEqual(relinkEditionsByIsbn({ squareItemId: 'ITEM_X', editions: existing }, incoming, 'ITEM_X'), existing);
});

test('ISBN query forms cover the 13- and 10-digit spellings', () => {
  assert.deepEqual(isbnQueryForms(['978-0-913543-96-2']), ['9780913543962', '0913543969']);
  assert.deepEqual(isbnQueryForms(['9798996445905']), ['9798996445905']);
});

test('Square photos come from the IMAGE objects listed with the item', () => {
  const urls = new Map([['IMG1', 'https://square.example/1.jpg']]);
  assert.deepEqual(squareImageUrls({ itemData: { imageIds: ['IMG1', 'IMG_GONE'] } }, urls), ['https://square.example/1.jpg']);
  assert.equal(bookHasNoCover({ images: [], scrapedImageUrls: [{ url: '' }] }), true);
  assert.equal(bookHasNoCover({ scrapedImageUrls: [{ url: 'https://x/1.jpg' }] }), false);
});

test('new-book enrichment folds gap-fills into the create data, never editions, and never throws', async () => {
  delete process.env.DISABLE_AUTO_BOOK_ENRICHMENT;
  const data = { title: 'T', editions: [{ isbn: '9780913543962' }] };
  const enriched = await withNewBookEnrichment(data, async () => ({ synopsis: 'x', editions: [{ pages: 200 }] }));
  assert.deepEqual(enriched, { title: 'T', editions: [{ isbn: '9780913543962' }], synopsis: 'x' });
  assert.deepEqual(await withNewBookEnrichment(data, async () => null), data);
  assert.deepEqual(await withNewBookEnrichment(data, async () => { throw new Error("ISBNdb down"); }), data);
});

test('Square fills a missing title but never retitles an existing book', () => {
  const titled = { ...csvImported, title: 'Countering the Conspiracy to Destroy Black Boys' };
  const update = bookUpdateForSquareItem(titled, 'ITEM_P5WR', mappedFromSquare) as any;
  assert.equal('title' in update, false);
  assert.equal(update.squareItemId, 'ITEM_P5WR');

  const untitled = bookUpdateForSquareItem({ ...csvImported, title: '  ' }, 'ITEM_P5WR', mappedFromSquare) as any;
  assert.equal(untitled.title, 'Countering the Conspiracy');
});
