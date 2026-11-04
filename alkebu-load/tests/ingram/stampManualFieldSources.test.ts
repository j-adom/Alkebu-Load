import assert from 'node:assert/strict';
import test from 'node:test';

import {
  changedFieldKeys,
  deriveTitleLong,
  stampManualFieldSources,
} from '../../src/collections/hooks/stampManualFieldSources';

const EAN_A = '9780000000002';
const EAN_B = '9780000000019';
const NOW = () => new Date('2026-11-01T12:00:00.000Z');
const staff = { collection: 'users', role: 'staff' };

const original = () => ({
  id: 1,
  title: 'Synthetic Book',
  synopsis: 'Old synopsis',
  editions: [
    { isbn: EAN_A, pages: 200, pricing: { shippingWeight: 10, retailPrice: 1999 } },
    { isbn: EAN_B, pages: 300, pricing: { shippingWeight: 16, retailPrice: 2999 } },
  ],
  enrichment: { fieldSources: { synopsis: { source: 'ingram', at: '2026-10-01T00:00:00.000Z' } } },
});

test('an admin edit stamps the changed fields manual', () => {
  const data = { ...original(), synopsis: 'Staff-written synopsis' };
  const out = stampManualFieldSources({ data, originalDoc: original(), req: { user: { collection: 'users', role: 'admin' } }, operation: 'update', now: NOW });
  assert.deepEqual(out.enrichment.fieldSources.synopsis, { source: 'manual', at: NOW().toISOString() });
  assert.equal(out.enrichment.fieldSources.title, undefined, 'unchanged title is not stamped');
});

test('a job write (context.ingramEnrichment) is never stamped manual', () => {
  const data = { ...original(), synopsis: 'From Ingram' };
  const out = stampManualFieldSources({ data, originalDoc: original(), req: { user: staff }, context: { ingramEnrichment: true }, operation: 'update', now: NOW });
  assert.deepEqual(out.enrichment.fieldSources, original().enrichment.fieldSources);
});

test('unauthenticated writes and customer principals leave provenance alone', () => {
  for (const user of [undefined, { collection: 'customers', role: 'admin' }, { collection: 'users', role: 'customer' }]) {
    const data = { ...original(), synopsis: 'Changed by a sync' };
    const out = stampManualFieldSources({ data, originalDoc: original(), req: { user }, operation: 'update', now: NOW });
    assert.equal(out.enrichment.fieldSources.synopsis.source, 'ingram');
  }
});

test('unchanged and whitespace/case-only edits are not stamped; absent fields are ignored', () => {
  const data = { title: '  synthetic   BOOK ', synopsis: 'Old synopsis' };
  assert.deepEqual(changedFieldKeys(data, original()), []);
  const out = stampManualFieldSources({ data, originalDoc: original(), req: { user: staff }, operation: 'update', now: NOW });
  assert.equal(out.enrichment, undefined);
});

test('edition fields are keyed by EAN, so a reorder does not misattribute', () => {
  const before = original();
  // Editions reordered, and only B's weight changed.
  const data = {
    editions: [
      { ...before.editions[1], pricing: { ...before.editions[1].pricing, shippingWeight: 18 } },
      before.editions[0],
    ],
  };
  assert.deepEqual(changedFieldKeys(data, before), [`editions.${EAN_B}.pricing.shippingWeight`]);
});

test('a hand-entered create stamps its fields; a create copying another system does not', () => {
  const manual = stampManualFieldSources({ data: { title: 'Typed In', editions: [{ isbn: EAN_A, pages: 120 }] }, req: { user: staff }, operation: 'create', now: NOW });
  assert.deepEqual(Object.keys(manual.enrichment.fieldSources).sort(), ['title', `editions.${EAN_A}.pages`].sort());

  const promoted = stampManualFieldSources({ data: { title: 'From Square', importSource: 'square-webhook' }, req: { user: staff }, operation: 'create', now: NOW });
  assert.equal(promoted.enrichment, undefined);
});

test('system fields (media mail, on-sale date) are never stamped manual', () => {
  const before = original();
  const data = { editions: [{ ...before.editions[0], mediaMailEligible: true, ingramOnSaleDate: '2026-01-01' }, before.editions[1]] };
  assert.deepEqual(changedFieldKeys(data, before), []);
});

test('titleLong is derived from title and subtitle', () => {
  assert.equal(deriveTitleLong({ title: 'Wayward Lives', subtitle: 'Beautiful Experiments' }).titleLong, 'Wayward Lives: Beautiful Experiments');
  // Partial update: subtitle only, title from the stored doc.
  assert.equal(deriveTitleLong({ subtitle: 'New Sub' }, { title: 'Stored' }).titleLong, 'Stored: New Sub');
  // No subtitle: the imported titleLong is kept.
  assert.equal(deriveTitleLong({ title: 'T', titleLong: 'T: from isbndb' }).titleLong, 'T: from isbndb');
  // Unrelated update: untouched.
  assert.deepEqual(deriveTitleLong({ synopsis: 'x' }, { title: 'A', subtitle: 'B' }), { synopsis: 'x' });
});
