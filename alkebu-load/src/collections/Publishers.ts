import type { CollectionConfig } from 'payload'

const Publishers: CollectionConfig = {
  slug: 'publishers',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'location', 'isActive', 'bookCount'],
    group: 'Content'
  },
  fields: [
    // Basic Publisher Information
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Publisher name'
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

    // Publisher Type and Details
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Major Publisher', value: 'major' },
        { label: 'Independent Publisher', value: 'independent' },
        { label: 'University Press', value: 'university' },
        { label: 'Self-Published', value: 'self-published' },
        { label: 'Small Press', value: 'small-press' },
        { label: 'Specialty Publisher', value: 'specialty' },
        { label: 'Print on Demand', value: 'pod' }
      ],
      admin: {
        description: 'Type of publishing house'
      }
    },

    {
      name: 'foundedYear',
      type: 'number',
      admin: {
        description: 'Year the publisher was founded'
      }
    },

    // Location
    {
      name: 'location',
      type: 'group',
      fields: [
        {
          name: 'city',
          type: 'text'
        },
        {
          name: 'state',
          type: 'text'
        },
        {
          name: 'country',
          type: 'text',
          defaultValue: 'United States'
        }
      ]
    },

    // Contact Information
    {
      name: 'contact',
      type: 'group',
      fields: [
        {
          name: 'website',
          type: 'text',
          admin: {
            description: 'Publisher website URL'
          }
        },
        {
          name: 'email',
          type: 'email',
          admin: {
            description: 'Publisher contact email'
          }
        },
        {
          name: 'phone',
          type: 'text'
        }
      ]
    },

    // Publishing Focus
    {
      name: 'specialties',
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
        { label: 'Memoir', value: 'memoir' },
        { label: 'Academic', value: 'academic' },
        { label: 'Reference', value: 'reference' }
      ],
      admin: {
        description: 'Publishing specialties and focus areas'
      }
    },

    // Publisher Description
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Publisher description and background'
      }
    },

    // Notable Information
    {
      name: 'notableAuthors',
      type: 'array',
      fields: [
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'authors'
        },
        {
          name: 'note',
          type: 'text',
          admin: {
            description: 'Notable works or achievements with this author'
          }
        }
      ],
      admin: {
        description: 'Notable authors published by this house'
      }
    },

    // Awards and Recognition
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
          name: 'description',
          type: 'textarea'
        }
      ],
      admin: {
        description: 'Awards and recognition received'
      }
    },

    // Logo/Image
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Publisher logo or brand image'
      }
    },

    // Social Media
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
          name: 'linkedin',
          type: 'text'
        }
      ],
      admin: {
        description: 'Social media profiles'
      }
    },

    // Status
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Is this publisher currently active?'
      }
    },

    // Virtual field for book count
    {
      name: 'bookCount',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Number of books from this publisher (automatically calculated)'
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
            return Response.json({ error: 'Publisher ID is required' }, { status: 400 })
          }

          // Find all books from this publisher
          const books = await payload.find({
            collection: 'books',
            where: {
              publisher: {
                equals: id
              }
            },
            limit: 100,
            sort: 'title'
          })

          return Response.json({
            publisher: id,
            totalBooks: books.totalDocs,
            books: books.docs
          })
        } catch (error) {
          console.error('Error in publisher books endpoint:', error)
          return Response.json({ error: 'Internal server error' }, { status: 500 })
        }
      }
    }
  ],

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
          data.seo = { ...data.seo, title: `${data.name} - Publisher` }
        }

        if (!data.seo?.description && data.name) {
          const desc = data.description ?
            (typeof data.description === 'string' ? data.description : 'Publisher information available') :
            'Discover books and publications'
          data.seo = {
            ...data.seo,
            description: `Books by ${data.name}. ${desc}`.substring(0, 160)
          }
        }
      }
    ]
  }
}

export default Publishers