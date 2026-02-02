// src/globals/AboutPage.ts
import type { GlobalConfig } from 'payload'

export const AboutPage: GlobalConfig = {
  slug: 'aboutPage',
  label: 'About Page',
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
      name: 'section1',
      type: 'group',
      label: 'Section 1',
      fields: [
        {
          name: 'images',
          type: 'array',
          label: 'Section 1 Images',
          maxRows: 3,
          admin: {
            description: '3 Images for home page section 1',
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
          name: 'section2image',
          type: 'upload',
          relationTo: 'media',
          label: 'Section 2 Image',
          admin: {
            description: 'Image for about page bottom cta',
          },
        },
      ],
    },
  ],
}