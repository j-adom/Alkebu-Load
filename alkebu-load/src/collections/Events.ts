import type { CollectionConfig } from 'payload';

const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'eventType', 'startDate', 'status', 'registrationRequired'],
    group: 'Content'
  },
  fields: [
    // Basic Information
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Event title'
      }
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL slug (auto-generated from title if empty)'
      }
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
      admin: {
        description: 'Event description and details'
      }
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      maxLength: 200,
      admin: {
        description: 'Brief description for previews (max 200 characters)'
      }
    },
    
    // Event Details
    {
      name: 'eventType',
      type: 'select',
      required: true,
      options: [
        { label: 'Book Launch', value: 'book-launch' },
        { label: 'Author Reading', value: 'author-reading' },
        { label: 'Book Club Meeting', value: 'book-club' },
        { label: 'Wellness Workshop', value: 'wellness-workshop' },
        { label: 'Community Meeting', value: 'community-meeting' },
        { label: 'Cultural Event', value: 'cultural-event' },
        { label: 'Educational Workshop', value: 'educational-workshop' },
        { label: 'Spiritual Gathering', value: 'spiritual-gathering' },
        { label: 'Business Networking', value: 'business-networking' },
        { label: 'Store Event', value: 'store-event' },
        { label: 'Other', value: 'other' }
      ],
      admin: {
        description: 'Type of event'
      }
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      admin: {
        description: 'Event start date and time',
        date: {
          pickerAppearance: 'dayAndTime'
        }
      }
    },
    {
      name: 'endDate',
      type: 'date',
      admin: {
        description: 'Event end date and time (optional)',
        date: {
          pickerAppearance: 'dayAndTime'
        }
      }
    },
    {
      name: 'isRecurring',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Is this a recurring event?'
      }
    },
    {
      name: 'recurringPattern',
      type: 'group',
      admin: {
        condition: (data) => data.isRecurring
      },
      fields: [
        {
          name: 'frequency',
          type: 'select',
          options: [
            { label: 'Weekly', value: 'weekly' },
            { label: 'Bi-weekly', value: 'biweekly' },
            { label: 'Monthly', value: 'monthly' },
            { label: 'Quarterly', value: 'quarterly' }
          ]
        },
        {
          name: 'endRecurringDate',
          type: 'date',
          admin: {
            description: 'When to stop recurring (optional)'
          }
        }
      ]
    },
    
    // Location
    {
      name: 'venue',
      type: 'group',
      fields: [
        {
          name: 'name',
          type: 'text',
          defaultValue: 'Alkebulanimages Bookstore',
          admin: {
            description: 'Venue name'
          }
        },
        {
          name: 'address',
          type: 'textarea',
          admin: {
            description: 'Full address'
          }
        },
        {
          name: 'isVirtual',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Is this a virtual event?'
          }
        },
        {
          name: 'virtualLink',
          type: 'text',
          admin: {
            condition: (data, siblingData) => siblingData.isVirtual,
            description: 'Virtual event link (Zoom, etc.)'
          }
        },
        {
          name: 'accessInstructions',
          type: 'textarea',
          admin: {
            description: 'How to access the venue or virtual event'
          }
        }
      ]
    },
    
    // Registration
    {
      name: 'registrationRequired',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Does this event require registration?'
      }
    },
    {
      name: 'registrationDetails',
      type: 'group',
      admin: {
        condition: (data) => data.registrationRequired
      },
      fields: [
        {
          name: 'maxAttendees',
          type: 'number',
          admin: {
            description: 'Maximum number of attendees (optional)'
          }
        },
        {
          name: 'registrationDeadline',
          type: 'date',
          admin: {
            description: 'Registration deadline'
          }
        },
        {
          name: 'price',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Event price (0 for free events)'
          }
        },
        {
          name: 'paymentRequired',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Is payment required for registration?'
          }
        },
        {
          name: 'registrationInstructions',
          type: 'richText',
          admin: {
            description: 'How to register for this event'
          }
        }
      ]
    },
    {
      name: 'currentAttendees',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Current number of registered attendees',
        readOnly: true
      }
    },
    {
      name: 'registeredUsers',
      type: 'array',
      admin: {
        description: 'List of registered attendees',
      },
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
        },
        {
          name: 'guestEmail',
          type: 'email',
          admin: {
            condition: (data) => !data.user,
            description: 'Email for guest registration',
          },
        },
        {
          name: 'guestName',
          type: 'text',
          admin: {
            condition: (data) => !data.user,
            description: 'Name for guest registration',
          },
        },
        {
          name: 'registrationDate',
          type: 'date',
          defaultValue: () => new Date().toISOString(),
        },
        {
          name: 'attendeeCount',
          type: 'number',
          defaultValue: 1,
          admin: {
            description: 'Number of people this registration covers',
          },
        },
        {
          name: 'specialRequests',
          type: 'textarea',
          admin: {
            description: 'Special accommodation requests',
          },
        },
      ],
    },
    
    // Organizer
    {
      name: 'organizer',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Event organizer (staff member)'
      }
    },
    {
      name: 'guestOrganizer',
      type: 'text',
      admin: {
        description: 'Guest organizer name (if not staff member)'
      }
    },
    {
      name: 'contactInfo',
      type: 'group',
      fields: [
        {
          name: 'email',
          type: 'email',
          admin: {
            description: 'Contact email for questions'
          }
        },
        {
          name: 'phone',
          type: 'text',
          admin: {
            description: 'Contact phone number'
          }
        }
      ]
    },
    
    // Featured Image
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Featured image for the event'
      }
    },
    {
      name: 'featuredImageAlt',
      type: 'text',
      admin: {
        description: 'Alt text for featured image'
      }
    },
    
    // Related Content - All product categories
    {
      name: 'relatedBooks',
      type: 'relationship',
      relationTo: 'books',
      hasMany: true,
      admin: {
        description: 'Books featured or discussed at this event'
      }
    },
    {
      name: 'relatedWellnessProducts',
      type: 'relationship',
      relationTo: 'wellness-lifestyle',
      hasMany: true,
      admin: {
        description: 'Wellness products featured at this event'
      }
    },
    {
      name: 'relatedFashionJewelry',
      type: 'relationship',
      relationTo: 'fashion-jewelry',
      hasMany: true,
      admin: {
        description: 'Fashion/jewelry items featured at this event'
      }
    },
    {
      name: 'relatedOilsIncense',
      type: 'relationship',
      relationTo: 'oils-incense',
      hasMany: true,
      admin: {
        description: 'Oils/incense products featured at this event'
      }
    },
    {
      name: 'relatedBusinesses',
      type: 'relationship',
      relationTo: 'businesses',
      hasMany: true,
      admin: {
        description: 'Local businesses involved in or sponsoring this event'
      }
    },
    {
      name: 'relatedBlogPosts',
      type: 'relationship',
      relationTo: 'blogPosts',
      hasMany: true,
      admin: {
        description: 'Blog posts related to this event'
      }
    },
    
    // Categories & Tags
    {
      name: 'categories',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Literature & Reading', value: 'literature-reading' },
        { label: 'Wellness & Health', value: 'wellness-health' },
        { label: 'Culture & Arts', value: 'culture-arts' },
        { label: 'Education & Learning', value: 'education-learning' },
        { label: 'Community Building', value: 'community-building' },
        { label: 'Business & Entrepreneurship', value: 'business-entrepreneurship' },
        { label: 'Spirituality & Religion', value: 'spirituality-religion' },
        { label: 'Youth & Children', value: 'youth-children' },
        { label: 'Social Justice', value: 'social-justice' },
        { label: 'History & Heritage', value: 'history-heritage' }
      ],
      admin: {
        description: 'Event categories for filtering and organization'
      }
    },
    {
      name: 'tags',
      type: 'array',
      maxRows: 10,
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true
        }
      ],
      admin: {
        description: 'Tags for better searchability'
      }
    },
    
    // Status & Publishing
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Completed', value: 'completed' }
      ],
      admin: {
        description: 'Event status'
      }
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Feature this event on homepage and in listings'
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
          maxLength: 60,
          admin: {
            description: 'SEO title (auto-generated from event title if empty)'
          }
        },
        {
          name: 'description',
          type: 'textarea',
          maxLength: 160,
          admin: {
            description: 'SEO description (auto-generated from short description if empty)'
          }
        },
        {
          name: 'keywords',
          type: 'text',
          admin: {
            description: 'SEO keywords (auto-generated from tags if empty)'
          }
        }
      ]
    },
    
    // Engagement
    {
      name: 'allowComments',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Allow comments on this event page'
      }
    },
    {
      name: 'commentsCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of comments (auto-calculated)',
        readOnly: true
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
          return;
        }
        
        // Auto-generate slug from title
        if (!data.slug && data.title) {
          data.slug = data.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        }
        
        // Auto-generate SEO fields if empty
        if (!data.seo?.title && data.title) {
          data.seo = { ...data.seo, title: data.title };
        }
        
        if (!data.seo?.description && data.shortDescription) {
          data.seo = { ...data.seo, description: data.shortDescription };
        }
        
        if (!data.seo?.keywords && data.tags?.length) {
          const keywords = data.tags.map((tag: any) => tag.tag).join(', ');
          data.seo = { ...data.seo, keywords };
        }
      }
    ]
  }
};

export default Events;