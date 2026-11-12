import type { CollectionConfig } from 'payload';

import { adminOnly, staffOnly } from '../access/roles';

// One row per value Ingram enrichment wrote (to Payload or to Square). Supports rollback
// and the agreement §6(c) termination purge (scripts/ingram-purge-metadata.ts), which
// restores `previousValue` wherever `previousSource` was not Ingram.
export const IngramEnrichmentLog: CollectionConfig = {
  slug: 'ingram-enrichment-log',
  admin: {
    useAsTitle: 'fieldPath',
    defaultColumns: ['fieldPath', 'book', 'target', 'action', 'runId', 'createdAt'],
    group: 'Inventory',
    description: 'Audit log of Ingram enrichment writes. Written only by the enrichment job; read-only here.',
  },
  // Only the job (Local API, access overridden) writes. Staff can read; nobody edits.
  access: {
    read: staffOnly,
    create: () => false,
    update: () => false,
    delete: adminOnly,
  },
  fields: [
    { name: 'book', type: 'relationship', relationTo: 'books', index: true },
    {
      name: 'fieldPath',
      type: 'text',
      required: true,
      index: true,
      admin: { description: 'Provenance key, e.g. title or editions.<EAN>.pricing.shippingWeight' },
    },
    { name: 'editionIsbn', type: 'text' },
    {
      name: 'target',
      type: 'select',
      required: true,
      defaultValue: 'payload',
      options: [
        { label: 'Payload', value: 'payload' },
        { label: 'Square', value: 'square' },
      ],
    },
    {
      name: 'action',
      type: 'select',
      options: [
        { label: 'Fill', value: 'fill' },
        { label: 'Correct', value: 'correct' },
        { label: 'Accepted review', value: 'accept' },
      ],
    },
    { name: 'previousValue', type: 'json' },
    { name: 'newValue', type: 'json' },
    {
      name: 'previousSource',
      type: 'text',
      admin: { description: 'fieldSources before this write (manual / ingram / empty = other import)' },
    },
    { name: 'squareObjectId', type: 'text', index: true },
    { name: 'squareVersion', type: 'text', admin: { description: 'Square object version before the write' } },
    { name: 'ingramRecordDate', type: 'date' },
    { name: 'runId', type: 'text', required: true, index: true },
  ],
};
