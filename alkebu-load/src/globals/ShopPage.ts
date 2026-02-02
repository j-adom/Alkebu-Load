// src/globals/ShopPage.ts
import type { GlobalConfig } from 'payload'

export const ShopPage: GlobalConfig = {
  slug: 'shopPage',
  label: 'Shop Page',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
    },
    {
      name: 'banner',
      type: 'group',
      label: 'Banner',
      fields: [
        {
          name: 'bannerImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Banner Image',
          admin: {
            description: 'Image for shop home banner',
          },
        },
      ],
    },
    {
      name: 'section1',
      type: 'group',
      label: 'Section 1',
      fields: [
        {
          name: 'images',
          type: 'array',
          label: 'Section 1 Images',
          admin: {
            description: 'Images for each shop category',
          },
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              required: true,
            },
          ],
        },
      ],
    },
  ],
}