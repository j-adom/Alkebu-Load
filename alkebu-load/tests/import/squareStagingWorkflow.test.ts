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
