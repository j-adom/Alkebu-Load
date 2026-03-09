import type { CollectionConfig } from 'payload'

const Authors: CollectionConfig = {
  slug: 'authors',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'bookCount', 'genres', 'isActive'],
    group: 'Content'
  },
  fields: [
    // Basic Author Information
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Full author name (e.g., "Langston Hughes", "Maya Angelou")'
      }
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'URL-friendly version of name (auto-generated if empty)'
      },
      hooks: {
        beforeValidate: [
          ({ data }) => {
            if (data?.name && !data?.slug) {
              return data.name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim()
            }
            return data?.slug
          }
        ]
      }
    },

    // Author Details
    {
      name: 'biography',
      type: 'richText',
      admin: {
        description: 'Author biography and background'
      }
    },
    {
      name: 'birthDate',
      type: 'date',
      admin: {
        description: 'Author birth date (if known)'
      }
    },
    {
      name: 'deathDate',
      type: 'date',
      admin: {
        description: 'Author death date (if applicable)'
      }
    },
    {
      name: 'nationality',
      type: 'text',
      admin: {
        description: 'Author nationality or origin'
      }
    },

    // Author Image
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Author portrait or photo'
      }
    },

    // Categorization
    {
      name: 'genres',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'History', value: 'history' },
        { label: 'Biography & Autobiography', value: 'biography-autobiography' },
        { label: 'Literature & Fiction', value: 'literature-fiction' },
        { label: 'Religion & Spirituality', value: 'religion-spirituality' },
        { label: 'Politics & Social Science', value: 'politics-social-science' },
        { label: 'Education & Academia', value: 'education-academia' },
        { label: 'Business & Economics', value: 'business-economics' },
        { label: 'Health & Wellness', value: 'health-wellness' },
        { label: 'Children & Young Adult', value: 'children-young-adult' },
        { label: 'Arts & Culture', value: 'arts-culture' },
        { label: 'Poetry', value: 'poetry' },
        { label: 'Essays', value: 'essays' },
        { label: 'Memoir', value: 'memoir' }
      ],
      admin: {
        description: 'Primary genres this author writes in'
      }
    },

    // Notable Works & Achievements
    {
      name: 'notableWorks',
      type: 'array',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true
        },
        {
          name: 'year',
          type: 'number'
        },
        {
          name: 'description',
          type: 'textarea'
        }
      ],
      admin: {
        description: 'Notable works by this author (beyond books in our inventory)'
      }
    },

    // Awards & Recognition
    {
      name: 'awards',
      type: 'array',
      fields: [
        {
          name: 'award',
          type: 'text',
          required: true
        },
        {
          name: 'year',
          type: 'number'
        },
        {
          name: 'work',
          type: 'text',
          admin: {
            description: 'Specific work that won the award'
          }
        }
      ],
      admin: {
        description: 'Awards and recognition received'
      }
    },

    // External Links
    {
      name: 'website',
      type: 'text',
      admin: {
        description: 'Author official website'
      }
    },
    {
      name: 'socialMedia',
      type: 'group',
      fields: [
        {
          name: 'twitter',
          type: 'text'
        },
        {
          name: 'instagram',
          type: 'text'
        },
        {
          name: 'facebook',
          type: 'text'
        },
        {
          name: 'goodreads',
          type: 'text'
        }
      ],
      admin: {
        description: 'Social media profiles'
      }
    },

    // Management Fields
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Is this author active/published on the site?'
      }
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Feature this author prominently'
      }
    },

    // SEO
    {
      name: 'seo',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
          admin: {
            description: 'SEO title (auto-generated if empty)'
          }
        },
        {
          name: 'description',
          type: 'textarea',
          admin: {
            description: 'SEO description (auto-generated if empty)'
          }
        }
      ]
    },

    // Virtual field to show author's books (read-only)
    {
      name: 'books',
      type: 'relationship',
      relationTo: 'books',
      hasMany: true,
      admin: {
        readOnly: true,
        description: 'Books by this author (automatically populated)'
      }
    }
  ],

  // Endpoints for custom functionality
  endpoints: [
    {
      path: '/:id/books',
      method: 'get',
      handler: async (req) => {
        try {
          const { id } = req.routeParams || {}
          const { payload } = req

          if (!id) {
            return Response.json({ error: 'Author ID is required' }, { status: 400 })
          }

          // Find all books by this author
          const books = await payload.find({
            collection: 'books',
            where: {
              authors: {
                contains: id
              }
            },
            limit: 100,
            sort: 'title'
          })

          return Response.json({
            author: id,
            totalBooks: books.totalDocs,
            books: books.docs
          })
        } catch (error) {
          console.error('Error in author books endpoint:', error)
          return Response.json({ error: 'Internal server error' }, { status: 500 })
        }
      }
    }
  ],

  // Virtual fields and hooks
  // Public read access
  access: {
    read: () => true,
  },

  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (!data || (operation !== 'create' && operation !== 'update')) {
          return
        }

        // Auto-generate SEO fields
        if (!data.seo?.title && data.name) {
          data.seo = { ...data.seo, title: `${data.name} - Books & Biography` }
        }

        if (!data.seo?.description && data.name) {
          const bio = data.biography ?
            (typeof data.biography === 'string' ? data.biography : 'Author biography available') :
            'Discover books and works'
          data.seo = {
            ...data.seo,
            description: `Explore books by ${data.name}. ${bio}`.substring(0, 160)
          }
        }
      }
    ]
  }
}

export default Authors