import type { CollectionConfig } from 'payload';

import { partnershipListmonkSyncHook } from '../app/utils/partnershipListmonkSync';

const isPartnershipStaff = (user: unknown): boolean => {
  const role = (user as { role?: string } | undefined)?.role;
  return role === 'admin' || role === 'staff';
};

const isAdmin = (user: unknown): boolean => (user as { role?: string } | undefined)?.role === 'admin';

export const PartnershipInquiries: CollectionConfig = {
  slug: 'partnership-inquiries',
  admin: {
    useAsTitle: 'organizationName',
    defaultColumns: [
      'organizationName',
      'inquiryType',
      'status',
      'followUpDate',
      'crmSyncStatus',
      'createdAt',
    ],
    group: 'B2B',
    description: 'Wholesale, institutional, and non-profit partnership leads',
  },
  access: {
    read: ({ req: { user } }) => isPartnershipStaff(user),
    create: ({ req: { user } }) => isPartnershipStaff(user),
    update: ({ req: { user } }) => isPartnershipStaff(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  hooks: {
    // Staff marking an inquiry qualified/won subscribes the lead to the
    // "B2B Partners" listmonk list. Best-effort: never throws into the save.
    afterChange: [partnershipListmonkSyncHook],
  },
  fields: [
    {
      name: 'inquiryType',
      type: 'select',
      required: true,
      options: [
        { label: 'Wholesale', value: 'wholesale' },
        { label: 'Institutional Contract', value: 'institutional' },
        { label: 'Non-profit Project', value: 'nonprofit' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Qualified', value: 'qualified' },
        { label: 'Won', value: 'won' },
        { label: 'Lost', value: 'lost' },
      ],
      admin: {
        condition: (_data, _siblingData, { user }) => isPartnershipStaff(user),
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'organizationName',
      type: 'text',
      required: true,
    },
    {
      name: 'organizationType',
      type: 'text',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'sourcePath',
      type: 'text',
      required: true,
    },
    {
      name: 'submittedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'wholesaleDetails',
      type: 'group',
      admin: {
        condition: (data) => data.inquiryType === 'wholesale',
      },
      fields: [
        {
          name: 'expectedOrderVolume',
          type: 'text',
        },
        {
          name: 'productInterests',
          type: 'array',
          fields: [
            {
              name: 'interest',
              type: 'text',
            },
          ],
        },
        {
          name: 'resaleOrDistributionNeeds',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'institutionalDetails',
      type: 'group',
      admin: {
        condition: (data) => data.inquiryType === 'institutional',
      },
      fields: [
        {
          name: 'institutionType',
          type: 'text',
        },
        {
          name: 'purchasingMethod',
          type: 'text',
        },
        {
          name: 'taxExemptStatus',
          type: 'text',
        },
        {
          name: 'audienceOrStudentGroup',
          type: 'textarea',
        },
        {
          name: 'targetTimeline',
          type: 'text',
        },
      ],
    },
    {
      name: 'nonprofitDetails',
      type: 'group',
      admin: {
        condition: (data) => data.inquiryType === 'nonprofit',
      },
      fields: [
        {
          name: 'projectType',
          type: 'text',
        },
        {
          name: 'missionOrProgramContext',
          type: 'textarea',
        },
        {
          name: 'targetTimeline',
          type: 'text',
        },
        {
          name: 'budgetRange',
          type: 'text',
        },
        {
          name: 'supportRequested',
          type: 'text',
        },
      ],
    },
    {
      name: 'followUpDate',
      type: 'date',
      admin: {
        condition: (_data, _siblingData, { user }) => isPartnershipStaff(user),
      },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      admin: {
        condition: (_data, _siblingData, { user }) => isPartnershipStaff(user),
      },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        condition: (_data, _siblingData, { user }) => isPartnershipStaff(user),
      },
    },
    {
      name: 'staffEmail',
      type: 'group',
      admin: {
        condition: (_data, _siblingData, { user }) => isPartnershipStaff(user),
      },
      fields: [
        {
          name: 'status',
          type: 'select',
          defaultValue: 'pending',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Sent', value: 'sent' },
            { label: 'Failed', value: 'failed' },
            { label: 'Skipped', value: 'skipped' },
          ],
        },
        {
          name: 'sentAt',
          type: 'date',
        },
        {
          name: 'error',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'acknowledgementEmail',
      type: 'group',
      admin: {
        condition: (_data, _siblingData, { user }) => isPartnershipStaff(user),
      },
      fields: [
        {
          name: 'status',
          type: 'select',
          defaultValue: 'pending',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Sent', value: 'sent' },
            { label: 'Failed', value: 'failed' },
            { label: 'Skipped', value: 'skipped' },
          ],
        },
        {
          name: 'sentAt',
          type: 'date',
        },
        {
          name: 'error',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'crmExternalId',
      type: 'text',
      admin: {
        condition: (_data, _siblingData, { user }) => isPartnershipStaff(user),
      },
    },
    {
      name: 'crmSyncStatus',
      type: 'select',
      required: true,
      defaultValue: 'not_configured',
      options: [
        { label: 'Not Configured', value: 'not_configured' },
        { label: 'Pending', value: 'pending' },
        { label: 'Synced', value: 'synced' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: {
        condition: (_data, _siblingData, { user }) => isPartnershipStaff(user),
      },
    },
  ],
};
