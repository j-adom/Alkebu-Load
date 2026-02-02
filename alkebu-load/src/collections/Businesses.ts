import type { CollectionConfig } from 'payload';

const Businesses: CollectionConfig = {
  slug: 'businesses',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'businessType', 'inDirectory', 'category', 'status', 'featured', 'averageRating'],
    group: 'Community'
  },
  fields: [
    // Business Type & Directory Status
    {
      name: 'businessType',
      type: 'select',
      required: true,
      defaultValue: 'directory-listing',
      options: [
        { 
          label: 'Directory Listing', 
          value: 'directory-listing',
        },
        { 
          label: 'Business Partner', 
          value: 'business-partner',
        },
        { 
          label: 'Event Sponsor', 
          value: 'event-sponsor',
        },
        { 
          label: 'Referenced Business', 
          value: 'referenced-business',
        }
      ],
      admin: {
        description: 'Type of business entry - Directory Listing appears in the local business directory',
        position: 'sidebar'
      }
    },
    {
      name: 'inDirectory',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Include this business in the local business directory',
        position: 'sidebar'
      }
    },
    {
      name: 'directoryCategory',
      type: 'select',
      options: [
        { label: 'Black-Owned Business', value: 'black-owned' },
        { label: 'Minority-Owned Business', value: 'minority-owned' },
        { label: 'Community Partner', value: 'community-partner' },
        { label: 'Local Business', value: 'local-business' },
        { label: 'Cultural Institution', value: 'cultural-institution' }
      ],
      admin: {
        description: 'Directory classification for filtering and organization',
        position: 'sidebar',
        condition: (data) => data.inDirectory === true
      }
    },
    
    // Basic Information
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Business name'
      }
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL slug (auto-generated from name if empty)'
      }
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
      admin: {
        description: 'Business description and details'
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
    
    // Business Category
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Restaurants & Food', value: 'restaurants-food' },
        { label: 'Professional Services', value: 'professional-services' },
        { label: 'Retail & Shopping', value: 'retail-shopping' },
        { label: 'Health & Wellness', value: 'health-wellness' },
        { label: 'Arts & Entertainment', value: 'arts-entertainment' },
        { label: 'Spiritual & Religious', value: 'spiritual-religious' },
        { label: 'Education & Childcare', value: 'education-childcare' },
        { label: 'Beauty & Personal Care', value: 'beauty-personal-care' },
        { label: 'Home & Garden', value: 'home-garden' },
        { label: 'Automotive', value: 'automotive' },
        { label: 'Technology', value: 'technology' },
        { label: 'Financial Services', value: 'financial-services' },
        { label: 'Real Estate', value: 'real-estate' },
        { label: 'Non-Profit Organization', value: 'non-profit' },
        { label: 'Other', value: 'other' }
      ],
      admin: {
        description: 'Primary business category'
      }
    },
    {
      name: 'subcategories',
      type: 'array',
      maxRows: 5,
      fields: [
        {
          name: 'subcategory',
          type: 'text',
          required: true,
          admin: {
            description: 'e.g., "Soul Food", "Barbershop", "Yoga Studio"'
          }
        }
      ],
      admin: {
        description: 'More specific business subcategories'
      }
    },
    
    // Contact Information
    {
      name: 'contact',
      type: 'group',
      fields: [
        {
          name: 'phone',
          type: 'text',
          admin: {
            description: 'Primary phone number'
          }
        },
        {
          name: 'email',
          type: 'email',
          admin: {
            description: 'Business email'
          }
        },
        {
          name: 'website',
          type: 'text',
          admin: {
            description: 'Business website URL'
          }
        },
        {
          name: 'socialMedia',
          type: 'group',
          fields: [
            {
              name: 'facebook',
              type: 'text',
              admin: {
                description: 'Facebook page URL'
              }
            },
            {
              name: 'instagram',
              type: 'text',
              admin: {
                description: 'Instagram handle or URL'
              }
            },
            {
              name: 'twitter',
              type: 'text',
              admin: {
                description: 'Twitter/X handle or URL'
              }
            },
            {
              name: 'linkedin',
              type: 'text',
              admin: {
                description: 'LinkedIn page URL'
              }
            },
            {
              name: 'tiktok',
              type: 'text',
              admin: {
                description: 'TikTok handle or URL'
              }
            }
          ]
        }
      ]
    },
    
    // Location
    {
      name: 'address',
      type: 'group',
      fields: [
        {
          name: 'street',
          type: 'text',
          required: true,
          admin: {
            description: 'Street address'
          }
        },
        {
          name: 'city',
          type: 'text',
          required: true,
          defaultValue: 'Nashville',
          admin: {
            description: 'City'
          }
        },
        {
          name: 'state',
          type: 'text',
          required: true,
          defaultValue: 'TN',
          admin: {
            description: 'State'
          }
        },
        {
          name: 'zipCode',
          type: 'text',
          required: true,
          admin: {
            description: 'ZIP code'
          }
        },
        {
          name: 'neighborhood',
          type: 'text',
          admin: {
            description: 'Nashville neighborhood (e.g., Music Row, The Gulch, East Nashville)'
          }
        },
        {
          name: 'coordinates',
          type: 'group',
          fields: [
            {
              name: 'latitude',
              type: 'number',
              admin: {
                description: 'Latitude (for map display)'
              }
            },
            {
              name: 'longitude',
              type: 'number',
              admin: {
                description: 'Longitude (for map display)'
              }
            }
          ]
        }
      ]
    },
    
    // Hours of Operation
    {
      name: 'hours',
      type: 'group',
      fields: [
        {
          name: 'monday',
          type: 'text',
          admin: {
            description: 'Monday hours (e.g., "9:00 AM - 5:00 PM" or "Closed")'
          }
        },
        {
          name: 'tuesday',
          type: 'text',
          admin: {
            description: 'Tuesday hours'
          }
        },
        {
          name: 'wednesday',
          type: 'text',
          admin: {
            description: 'Wednesday hours'
          }
        },
        {
          name: 'thursday',
          type: 'text',
          admin: {
            description: 'Thursday hours'
          }
        },
        {
          name: 'friday',
          type: 'text',
          admin: {
            description: 'Friday hours'
          }
        },
        {
          name: 'saturday',
          type: 'text',
          admin: {
            description: 'Saturday hours'
          }
        },
        {
          name: 'sunday',
          type: 'text',
          admin: {
            description: 'Sunday hours'
          }
        },
        {
          name: 'specialHours',
          type: 'textarea',
          admin: {
            description: 'Special hours notes (holidays, seasonal changes, etc.)'
          }
        }
      ]
    },
    
    // Business Details
    {
      name: 'services',
      type: 'array',
      fields: [
        {
          name: 'service',
          type: 'text',
          required: true
        }
      ],
      admin: {
        description: 'Services offered by this business'
      }
    },
    {
      name: 'specialties',
      type: 'array',
      fields: [
        {
          name: 'specialty',
          type: 'text',
          required: true
        }
      ],
      admin: {
        description: 'Business specialties or unique offerings'
      }
    },
    {
      name: 'priceRange',
      type: 'select',
      options: [
        { label: '$', value: 'low' },
        { label: '$$', value: 'moderate' },
        { label: '$$$', value: 'high' },
        { label: '$$$$', value: 'luxury' }
      ],
      admin: {
        description: 'General price range'
      }
    },
    
    // Owner Information
    {
      name: 'owner',
      type: 'group',
      fields: [
        {
          name: 'name',
          type: 'text',
          admin: {
            description: 'Business owner/founder name'
          }
        },
        {
          name: 'bio',
          type: 'richText',
          admin: {
            description: 'Owner biography and background'
          }
        },
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Owner photo'
          }
        }
      ]
    },
    
    // Images
    {
      name: 'images',
      type: 'array',
      maxRows: 10,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true
        },
        {
          name: 'alt',
          type: 'text',
          required: true
        },
        {
          name: 'caption',
          type: 'text',
          admin: {
            description: 'Image caption (optional)'
          }
        },
        {
          name: 'isPrimary',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Use as primary business image'
          }
        }
      ],
      admin: {
        description: 'Business photos (storefront, interior, products, etc.)'
      }
    },
    
    // Reviews & Rating
    {
      name: 'averageRating',
      type: 'number',
      min: 0,
      max: 5,
      defaultValue: 0,
      admin: {
        description: 'Average customer rating (auto-calculated)',
        readOnly: true
      }
    },
    {
      name: 'reviewCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Total number of approved reviews (auto-calculated)',
        readOnly: true
      }
    },
    
    // Tags
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
        description: 'Tags for better searchability (e.g., "family-owned", "veteran-owned", "woman-owned")'
      }
    },
    
    // Related Content
    {
      name: 'relatedEvents',
      type: 'relationship',
      relationTo: 'events',
      hasMany: true,
      admin: {
        description: 'Events this business is involved in or hosting'
      }
    },
    {
      name: 'relatedBlogPosts',
      type: 'relationship',
      relationTo: 'blogPosts',
      hasMany: true,
      admin: {
        description: 'Blog posts featuring or mentioning this business'
      }
    },
    
    // Status & Publishing
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending Review', value: 'pending' },
        { label: 'Published', value: 'published' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Closed', value: 'closed' }
      ],
      admin: {
        description: 'Business listing status'
      }
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Feature this business in listings and on homepage'
      }
    },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Business has been verified by staff'
      }
    },
    
    // Submission Information
    {
      name: 'submittedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Who submitted this business listing'
      }
    },
    {
      name: 'submissionDate',
      type: 'date',
      admin: {
        description: 'When this listing was submitted',
        readOnly: true
      }
    },
    {
      name: 'lastUpdated',
      type: 'date',
      admin: {
        description: 'Last update date',
        readOnly: true
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
            description: 'SEO title (auto-generated from business name if empty)'
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
            description: 'SEO keywords (auto-generated from tags and category if empty)'
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
        description: 'Allow comments on this business listing'
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
    },
    {
      name: 'viewCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Profile views (auto-incremented)',
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
        
        // Auto-manage directory inclusion based on business type
        if (data.businessType) {
          switch (data.businessType) {
            case 'directory-listing':
              data.inDirectory = true;
              break;
            case 'referenced-business':
            case 'event-sponsor':
              // These can optionally be in directory, don't override if manually set
              if (data.inDirectory === undefined) {
                data.inDirectory = false;
              }
              break;
            case 'business-partner':
              // Partners are typically in directory unless manually excluded
              if (data.inDirectory === undefined) {
                data.inDirectory = true;
              }
              break;
          }
        }
        
        // Set default directory category for directory listings
        if (data.inDirectory && !data.directoryCategory) {
          data.directoryCategory = 'local-business';
        }
        
        // Auto-generate slug from name
        if (!data.slug && data.name) {
          data.slug = data.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        }
        
        // Auto-generate SEO fields if empty
        if (!data.seo?.title && data.name) {
          data.seo = { ...data.seo, title: data.name };
        }
        
        if (!data.seo?.description && data.shortDescription) {
          data.seo = { ...data.seo, description: data.shortDescription };
        }
        
        if (!data.seo?.keywords && (data.tags?.length || data.category)) {
          const keywords = [];
          if (data.tags?.length) {
            keywords.push(...data.tags.map((tag: any) => tag.tag));
          }
          if (data.category) {
            keywords.push(data.category);
          }
          // Add directory category to keywords if applicable
          if (data.inDirectory && data.directoryCategory) {
            keywords.push(data.directoryCategory);
          }
          data.seo = { ...data.seo, keywords: keywords.join(', ') };
        }
        
        // Set submission date on create
        if (operation === 'create' && !data.submissionDate) {
          data.submissionDate = new Date().toISOString();
        }
        
        // Set last updated
        data.lastUpdated = new Date().toISOString();
      }
    ]
  }
};

export default Businesses;