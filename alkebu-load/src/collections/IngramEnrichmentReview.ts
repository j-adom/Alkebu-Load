import type { CollectionConfig } from 'payload';

import { adminOnly, staffOnly } from '../access/roles';
import {
  handleAcceptReview,
  handleBulkAccept,
  handleRejectReview,
} from '../app/utils/ingram/reviewEndpoints';

// Proposed Ingram changes that need a person: fill-gap fields that already hold different
// curated text, ambiguous title cleanups and >3x price uplifts.
// State: pending -> accepted | rejected | superseded (the Square staging pattern).
// Work the queue at /admin/ingram-review.
export const IngramEnrichmentReview: CollectionConfig = {
  slug: 'ingram-enrichment-review',
  admin: {
    useAsTitle: 'fieldPath',
    defaultColumns: ['fieldPath', 'book', 'state', 'reason', 'createdAt'],
    group: 'Inventory',
    description:
      'Ingram enrichment proposals awaiting review. Use the review screen at /admin/ingram-review to compare and accept or reject. Rejected proposals are not proposed again.',
  },
  access: {
    read: staffOnly,
    create: () => false,
    // State changes go through the accept/reject endpoints, which apply the change.
    update: () => false,
    delete: adminOnly,
  },
  endpoints: [
    { path: '/bulk-accept', method: 'post', handler: (req) => handleBulkAccept(req) },
    { path: '/:id/accept', method: 'post', handler: (req) => handleAcceptReview(req) },
    { path: '/:id/reject', method: 'post', handler: (req) => handleRejectReview(req) },
  ],
  fields: [
    // Not required: the FK is ON DELETE SET NULL, so deleting a book must not be blocked.
    { name: 'book', type: 'relationship', relationTo: 'books', index: true },
    {
      name: 'fieldPath',
      type: 'text',
      required: true,
      index: true,
      admin: { description: 'Provenance key, e.g. synopsis or editions.<EAN>.pricing.retailPrice' },
    },
    { name: 'path', type: 'text', required: true, index: true, admin: { description: 'Field type, for bulk accept' } },
    { name: 'editionIsbn', type: 'text' },
    { name: 'currentValue', type: 'json' },
    { name: 'proposedValue', type: 'json' },
    {
      name: 'proposedKey',
      type: 'text',
      index: true,
      admin: { readOnly: true, description: 'Normalized proposal, used to de-duplicate and to suppress rejected proposals' },
    },
    {
      name: 'state',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Superseded', value: 'superseded' },
      ],
    },
    { name: 'reason', type: 'text' },
    { name: 'runId', type: 'text', index: true },
    { name: 'ingramRecordDate', type: 'date' },
    { name: 'reviewedBy', type: 'relationship', relationTo: 'users' },
    { name: 'reviewedAt', type: 'date' },
  ],
};
