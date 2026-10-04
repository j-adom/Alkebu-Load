import assert from 'node:assert';
import test from 'node:test';

import { decideStagingAction } from '../../src/app/utils/squareStagingWorkflow';

const complete = { kind: 'complete' as const };
const incomplete = { kind: 'incomplete' as const };

test('no staging history + complete mapping writes the Book directly', () => {
  assert.deepStrictEqual(decideStagingAction(null, complete), { action: 'write-book' });
});

test('no staging history + incomplete mapping stages for review', () => {
  assert.deepStrictEqual(decideStagingAction(null, incomplete), { action: 'stage', status: 'needs-review' });
});

test('a needs-review row that is now complete becomes ready and does NOT write a Book', () => {
  // The human gate. Square supplying the data is not approval.
  assert.deepStrictEqual(
    decideStagingAction({ reviewStatus: 'needs-review' }, complete),
    { action: 'stage', status: 'ready' },
  );
});

test('a needs-review row still incomplete stays needs-review', () => {
  assert.deepStrictEqual(
    decideStagingAction({ reviewStatus: 'needs-review' }, incomplete),
    { action: 'stage', status: 'needs-review' },
  );
});

test('a ready row is not auto-promoted by a later sync', () => {
  assert.deepStrictEqual(
    decideStagingAction({ reviewStatus: 'ready' }, complete),
    { action: 'stage', status: 'ready' },
  );
});

test('rejected is sticky in both directions', () => {
  assert.deepStrictEqual(decideStagingAction({ reviewStatus: 'rejected' }, complete), { action: 'skip', reason: 'rejected' });
  assert.deepStrictEqual(decideStagingAction({ reviewStatus: 'rejected' }, incomplete), { action: 'skip', reason: 'rejected' });
});

test('a promoted row lets the sync update its linked Book', () => {
  assert.deepStrictEqual(
    decideStagingAction({ reviewStatus: 'promoted', promotedBook: 7 }, complete),
    { action: 'write-book' },
  );
});

test('a promoted row whose mapping regressed stages rather than writing a broken Book', () => {
  assert.deepStrictEqual(
    decideStagingAction({ reviewStatus: 'promoted', promotedBook: 7 }, incomplete),
    { action: 'stage', status: 'needs-review' },
  );
});

// ---- reassessStagingRow: re-checking rows staged under older rules ----

import { toJsonSafe } from '../../src/app/utils/jsonSafe';
import { reassessStagingRow } from '../../src/app/utils/squareStagingWorkflow';

const stagedItem = (variationData: Record<string, unknown>, category?: string, name = 'A Book') =>
  toJsonSafe({
    type: 'ITEM',
    id: 'ITEM-R',
    itemData: {
      name,
      ...(category ? { reportingCategory: { id: category } } : {}),
      variations: [{ id: 'V1', itemVariationData: { priceMoney: { amount: 1999n }, ...variationData } }],
    },
  });

test('reassess: a barcode ISBN turns a needs-review row ready (never promoted)', () => {
  const r = reassessStagingRow({ reviewStatus: 'needs-review', rawItem: stagedItem({ sku: 'H623082', upc: '9780310180302' }) });
  assert.deepStrictEqual(r.action, 'update');
  assert.strictEqual((r as any).reviewStatus, 'ready');
  assert.strictEqual((r as any).proposedIsbn, '9780310180302');
});

test('reassess: a non-Books category is rejected as non-book', () => {
  const r = reassessStagingRow({ reviewStatus: 'needs-review', rawItem: stagedItem({ sku: 'M16' }, 'HOTU26XFEIY5AZ4M22JPR7CE', 'Madina Incense Pack') });
  assert.strictEqual(r.action, 'reject-non-book');
});

test('reassess: still-invalid rows stay needs-review with fresh issues', () => {
  const r = reassessStagingRow({ reviewStatus: 'needs-review', rawItem: stagedItem({ sku: 'H623082' }) });
  assert.strictEqual((r as any).reviewStatus, 'needs-review');
  assert.match((r as any).validationIssues[0].detail, /none is a valid ISBN/);
});

test('reassess: promoted and rejected rows are left alone', () => {
  assert.deepStrictEqual(reassessStagingRow({ reviewStatus: 'promoted', rawItem: stagedItem({}) }), { action: 'unchanged', reason: 'promoted' });
  assert.deepStrictEqual(reassessStagingRow({ reviewStatus: 'rejected', rawItem: stagedItem({}) }), { action: 'unchanged', reason: 'rejected' });
});
