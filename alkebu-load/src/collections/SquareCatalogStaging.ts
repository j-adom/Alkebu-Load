import type { CollectionConfig } from 'payload';

const isCatalogStaff = (user: unknown): boolean => {
  const role = (user as { role?: string } | undefined)?.role;
  return role === 'admin' || role === 'staff';
};
const isAdmin = (user: unknown): boolean =>
  (user as { role?: string } | undefined)?.role === 'admin';

export const SquareCatalogStaging: CollectionConfig = {
  slug: 'square-catalog-staging',
  admin: {
    useAsTitle: 'proposedTitle',
    defaultColumns: ['proposedTitle', 'reviewStatus', 'squareItemId', 'lastSeenAt'],
    group: 'Inventory',
    description:
      'Square catalog items awaiting review. Complete the missing data and promote, or reject. Rejection is permanent: a rejected item is never re-imported.',
  },
  // Staff-only on every operation. No storefront surface: no public route, no
  // search bootstrap target, no cart product type.
  access: {
    read: ({ req: { user } }) => isCatalogStaff(user),
    create: ({ req: { user } }) => isCatalogStaff(user),
    update: ({ req: { user } }) => isCatalogStaff(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  fields: [
    { name: 'squareItemId', type: 'text', required: true, unique: true, index: true },
    { name: 'squareCatalogVersion', type: 'text', required: true },
    { name: 'squareUpdatedAt', type: 'date', required: true },
    {
      name: 'rawItem',
      type: 'json',
      required: true,
      admin: {
        description:
          'Square payload, BigInt-normalised by jsonSafe.ts. Storing the raw SDK object throws: JSON.stringify cannot serialise BigInt, and priceMoney.amount is one.',
      },
    },
    {
      name: 'validationIssues',
      type: 'array',
      required: true,
      minRows: 1,
      admin: {
        description:
          'Why this is not a Book. A row that becomes complete records the sentinel {field:"-", code:"resolved"} rather than an empty array, because minRows is 1.',
      },
      fields: [
        { name: 'field', type: 'text', required: true },
        { name: 'code', type: 'text', required: true },
        { name: 'detail', type: 'text' },
        { name: 'variationId', type: 'text', admin: { description: 'Set when the issue is per-variation.' } },
      ],
    },
    {
      name: 'reviewStatus',
      type: 'select',
      required: true,
      defaultValue: 'needs-review',
      index: true,
      options: [
        { label: 'Needs Review', value: 'needs-review' },
        { label: 'Ready to Promote', value: 'ready' },
        { label: 'Promoted', value: 'promoted' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    {
      name: 'promotedBook',
      type: 'relationship',
      relationTo: 'books',
      admin: { description: 'Set on promotion. Its presence refuses a second promotion.' },
    },
    { name: 'proposedTitle', type: 'text' },
    { name: 'proposedIsbn', type: 'text', admin: { description: 'Only when the SKU passed the ISBN checksum. Never a raw SKU.' } },
    { name: 'proposedPriceCents', type: 'number', admin: { description: 'Cents, unconverted.' } },
    { name: 'lastSeenAt', type: 'date', required: true },
  ],
};
