// src/globals/HomePage.ts
import type { GlobalConfig } from 'payload'

export const HomePage: GlobalConfig = {
  slug: 'homePage',
  label: 'Home Page',
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
          name: 'bannerImages',
          type: 'array',
          label: 'Banner Images',
          admin: {
            description: 'Images for home page banner',
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
    {
      name: 'section2',
      type: 'group',
      label: 'Section 2',
      fields: [
        {
          name: 'images',
          type: 'array',
          label: 'Section 2 Images',
          maxRows: 2,
          admin: {
            description: '2 Images for home page section 2',
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
    {
      name: 'section3',
      type: 'group',
      label: 'Section 3',
      fields: [
        {
          name: 'images',
          type: 'array',
          label: 'Section 3 Images',
          maxRows: 4,
          admin: {
            description: '4 Images for home page section 3',
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
    {
      name: 'section4',
      type: 'group',
      label: 'Section 4',
      fields: [
        {
          name: 'images',
          type: 'array',
          label: 'Section 4 Images',
          maxRows: 3,
          admin: {
            description: '3 Images for home page section 4',
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