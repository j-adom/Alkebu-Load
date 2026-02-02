// src/globals/ContactPage.ts
import type { GlobalConfig } from 'payload'

export const ContactPage: GlobalConfig = {
  slug: 'contactPage',
  label: 'Contact Page',
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
          name: 'section1image',
          type: 'upload',
          relationTo: 'media',
          label: 'Section 1 Image',
          admin: {
            description: 'Banner Image',
          },
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
            description: 'Image for contact section',
          },
        },
      ],
    },
  ],
}