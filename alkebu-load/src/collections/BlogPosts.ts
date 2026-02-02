import type { CollectionConfig } from 'payload';

const BlogPosts: CollectionConfig = {
  slug: 'blogPosts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'category', 'status', 'publishDate'],
    group: 'Content'
  },
  fields: [
    // Basic Information
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Blog post title'
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
      name: 'excerpt',
      type: 'textarea',
      maxLength: 300,
      admin: {
        description: 'Brief excerpt for previews (max 300 characters)'
      }
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      admin: {
        description: 'Main blog post content'
      }
    },
    
    // Author & Attribution
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Blog post author (staff member)'
      }
    },
    {
      name: 'guestAuthor',
      type: 'text',
      admin: {
        description: 'Guest author name (if not staff member)'
      }
    },
    {
      name: 'authorBio',
      type: 'textarea',
      admin: {
        description: 'Author biography for this post'
      }
    },
    
    // Categorization
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Book Reviews', value: 'book-reviews' },
        { label: 'Wellness & Lifestyle', value: 'wellness-lifestyle' },
        { label: 'Culture & Arts', value: 'culture-arts' },
        { label: 'History & Education', value: 'history-education' },
        { label: 'Community Events', value: 'community-events' },
        { label: 'Business & Entrepreneurship', value: 'business-entrepreneurship' },
        { label: 'Spirituality', value: 'spirituality' },
        { label: 'Fashion & Style', value: 'fashion-style' },
        { label: 'Store News', value: 'store-news' }
      ],
      admin: {
        description: 'Primary category for this post'
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
        description: 'Tags for better searchability and organization'
      }
    },
    
    // Featured Image
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Featured image for the blog post'
      }
    },
    {
      name: 'featuredImageAlt',
      type: 'text',
      admin: {
        description: 'Alt text for featured image (for accessibility)'
      }
    },
    
    // Related Content - Products from all categories
    {
      name: 'relatedBooks',
      type: 'relationship',
      relationTo: 'books',
      hasMany: true,
      admin: {
        description: 'Books mentioned or reviewed in this post'
      }
    },
    {
      name: 'relatedWellnessProducts',
      type: 'relationship',
      relationTo: 'wellness-lifestyle',
      hasMany: true,
      admin: {
        description: 'Wellness and lifestyle products featured in this post'
      }
    },
    {
      name: 'relatedFashionJewelry',
      type: 'relationship',
      relationTo: 'fashion-jewelry',
      hasMany: true,
      admin: {
        description: 'Fashion and jewelry items featured in this post'
      }
    },
    {
      name: 'relatedOilsIncense',
      type: 'relationship',
      relationTo: 'oils-incense',
      hasMany: true,
      admin: {
        description: 'Oils and incense products featured in this post'
      }
    },
    
    // Other Related Content
    {
      name: 'relatedEvents',
      type: 'relationship',
      relationTo: 'events',
      hasMany: true,
      admin: {
        description: 'Events related to this blog post'
      }
    },
    {
      name: 'relatedBusinesses',
      type: 'relationship',
      relationTo: 'businesses',
      hasMany: true,
      admin: {
        description: 'Local businesses mentioned in this post'
      }
    },
    
    // Publishing
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Review', value: 'review' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' }
      ],
      admin: {
        description: 'Publishing status'
      }
    },
    {
      name: 'publishDate',
      type: 'date',
      admin: {
        description: 'When to publish this post (leave empty for immediate)'
      }
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Feature this post on homepage and in listings'
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
            description: 'SEO title (auto-generated from post title if empty)'
          }
        },
        {
          name: 'description',
          type: 'textarea',
          maxLength: 160,
          admin: {
            description: 'SEO description (auto-generated from excerpt if empty)'
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
        description: 'Allow comments on this blog post'
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
    
    // Analytics
    {
      name: 'viewCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Page views (auto-incremented)',
        readOnly: true
      }
    },
    {
      name: 'shareCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Social shares (auto-incremented)',
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
        
        if (!data.seo?.description && data.excerpt) {
          data.seo = { ...data.seo, description: data.excerpt };
        }
        
        if (!data.seo?.keywords && data.tags?.length) {
          const keywords = data.tags.map((tag: any) => tag.tag).join(', ');
          data.seo = { ...data.seo, keywords };
        }
        
        // Auto-set publish date if publishing for first time
        if (data.status === 'published' && !data.publishDate && operation === 'update') {
          data.publishDate = new Date().toISOString();
        }
      }
    ]
  }
};

export default BlogPosts;