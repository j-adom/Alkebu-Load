import type { CollectionConfig } from 'payload';

export const InstitutionalAccounts: CollectionConfig = {
  slug: 'institutional-accounts',
  admin: {
    useAsTitle: 'organizationName',
    defaultColumns: ['organizationName', 'type', 'status', 'discountTier', 'totalSpent'],
    group: 'B2B',
    description: 'Phase 2: Institutional accounts for schools, nonprofits, churches',
  },
  access: {
    read: ({ req: { user } }) => user?.role === 'admin',
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'organizationName',
      type: 'text',
      required: true,
      admin: {
        description: 'Official organization name',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Public School', value: 'public_school' },
        { label: 'Private School', value: 'private_school' },
        { label: 'University/College', value: 'university' },
        { label: 'Library', value: 'library' },
        { label: 'Church/Religious Organization', value: 'church' },
        { label: 'Nonprofit Organization', value: 'nonprofit' },
        { label: 'Community Center', value: 'community_center' },
        { label: 'Government Agency', value: 'government' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending Approval', value: 'pending' },
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Closed', value: 'closed' },
      ],
    },
    {
      name: 'contactInfo',
      type: 'group',
      fields: [
        {
          name: 'primaryContact',
          type: 'group',
          fields: [
            { name: 'firstName', type: 'text', required: true },
            { name: 'lastName', type: 'text', required: true },
            { name: 'title', type: 'text' },
            { name: 'email', type: 'email', required: true },
            { name: 'phone', type: 'text', required: true },
          ],
        },
        {
          name: 'billingContact',
          type: 'group',
          fields: [
            { name: 'sameAsPrimary', type: 'checkbox', defaultValue: true },
            { name: 'firstName', type: 'text' },
            { name: 'lastName', type: 'text' },
            { name: 'title', type: 'text' },
            { name: 'email', type: 'email' },
            { name: 'phone', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'addresses',
      type: 'group',
      fields: [
        {
          name: 'billing',
          type: 'group',
          required: true,
          fields: [
            { name: 'street', type: 'text', required: true },
            { name: 'street2', type: 'text' },
            { name: 'city', type: 'text', required: true },
            { name: 'state', type: 'text', required: true },
            { name: 'zip', type: 'text', required: true },
            { name: 'country', type: 'text', defaultValue: 'US' },
          ],
        },
        {
          name: 'shipping',
          type: 'group',
          fields: [
            { name: 'sameAsBilling', type: 'checkbox', defaultValue: true },
            { name: 'street', type: 'text' },
            { name: 'street2', type: 'text' },
            { name: 'city', type: 'text' },
            { name: 'state', type: 'text' },
            { name: 'zip', type: 'text' },
            { name: 'country', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'taxInfo',
      type: 'group',
      fields: [
        {
          name: 'taxExempt',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'taxExemptNumber',
          type: 'text',
          admin: {
            condition: (data) => data.taxInfo?.taxExempt,
            description: 'Tax exemption certificate number',
          },
        },
        {
          name: 'exemptCertificateFile',
          type: 'upload',
          relationTo: 'media',
          admin: {
            condition: (data) => data.taxInfo?.taxExempt,
            description: 'Upload tax exemption certificate',
          },
        },
        {
          name: 'exemptionValidUntil',
          type: 'date',
          admin: {
            condition: (data) => data.taxInfo?.taxExempt,
            description: 'Tax exemption expiration date',
          },
        },
      ],
    },
    {
      name: 'paymentTerms',
      type: 'group',
      fields: [
        {
          name: 'preferredMethod',
          type: 'select',
          defaultValue: 'card',
          options: [
            { label: 'Credit Card', value: 'card' },
            { label: 'Purchase Order + Invoice', value: 'net_terms' },
            { label: 'Check', value: 'check' },
            { label: 'Wire Transfer', value: 'wire' },
          ],
        },
        {
          name: 'netTerms',
          type: 'select',
          admin: {
            condition: (data) => data.paymentTerms?.preferredMethod === 'net_terms',
          },
          options: [
            { label: 'Net 15', value: '15' },
            { label: 'Net 30', value: '30' },
            { label: 'Net 45', value: '45' },
            { label: 'Net 60', value: '60' },
          ],
        },
        {
          name: 'creditLimit',
          type: 'number',
          admin: {
            condition: (data) => data.paymentTerms?.preferredMethod === 'net_terms',
            description: 'Credit limit in dollars',
          },
        },
        {
          name: 'currentBalance',
          type: 'number',
          defaultValue: 0,
          admin: {
            condition: (data) => data.paymentTerms?.preferredMethod === 'net_terms',
            description: 'Current outstanding balance in cents',
          },
        },
      ],
    },
    {
      name: 'discounting',
      type: 'group',
      fields: [
        {
          name: 'discountTier',
          type: 'select',
          defaultValue: 'none',
          options: [
            { label: 'No Discount', value: 'none' },
            { label: 'Educational (10%)', value: 'educational_10' },
            { label: 'Educational (15%)', value: 'educational_15' },
            { label: 'Nonprofit (10%)', value: 'nonprofit_10' },
            { label: 'Religious (10%)', value: 'religious_10' },
            { label: 'Bulk (20%)', value: 'bulk_20' },
            { label: 'Custom', value: 'custom' },
          ],
        },
        {
          name: 'customDiscountRate',
          type: 'number',
          admin: {
            condition: (data) => data.discounting?.discountTier === 'custom',
            description: 'Custom discount percentage (e.g., 0.15 for 15%)',
          },
        },
        {
          name: 'minimumOrderForDiscount',
          type: 'number',
          admin: {
            description: 'Minimum order amount for discount (dollars)',
          },
        },
      ],
    },
    {
      name: 'orderHistory',
      type: 'group',
      fields: [
        {
          name: 'totalOrders',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'totalSpent',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Total amount spent (cents)',
          },
        },
        {
          name: 'firstOrderDate',
          type: 'date',
        },
        {
          name: 'lastOrderDate',
          type: 'date',
        },
        {
          name: 'averageOrderValue',
          type: 'number',
          admin: {
            description: 'Average order value (cents)',
          },
        },
      ],
    },
    {
      name: 'verification',
      type: 'group',
      fields: [
        {
          name: 'businessLicense',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Business license or 501(c)(3) documentation',
          },
        },
        {
          name: 'verificationStatus',
          type: 'select',
          defaultValue: 'pending',
          options: [
            { label: 'Pending Review', value: 'pending' },
            { label: 'Verified', value: 'verified' },
            { label: 'Additional Documentation Required', value: 'needs_docs' },
            { label: 'Rejected', value: 'rejected' },
          ],
        },
        {
          name: 'verifiedBy',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            description: 'Staff member who verified the account',
          },
        },
        {
          name: 'verifiedAt',
          type: 'date',
        },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal notes about this institutional account',
      },
    },
  ],
  timestamps: true,
};