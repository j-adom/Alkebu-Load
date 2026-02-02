// src/globals/SiteSettings.ts
import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'siteSettings',
  label: 'Site Settings',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Describe your blog for search engines and social media.',
      },
    },
    {
      name: 'keywords',
      type: 'array',
      label: 'Keywords',
      admin: {
        description: 'Add keywords that describes your blog.',
      },
      fields: [
        {
          name: 'keyword',
          type: 'text',
        },
      ],
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo',
    },
    {
      name: 'banner',
      type: 'upload',
      relationTo: 'media',
      label: 'Banner',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'authors',
      label: 'Author',
      admin: {
        description: 'Publish an author and set a reference to them here.',
      },
    },
    {
      name: 'paymentProvider',
      type: 'select',
      label: 'Default Payment Provider',
      required: true,
      defaultValue: 'stripe',
      options: [
        { label: 'Stripe', value: 'stripe' },
        { label: 'Square', value: 'square' },
      ],
      admin: {
        description:
          'Choose which payment processor to use on the storefront. Square requires environment configuration to be active.',
      },
    },
  ],
}
