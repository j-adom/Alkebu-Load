import type { CollectionConfig } from 'payload';

const ExternalBooks: CollectionConfig = {
  slug: 'externalBooks',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'isbn', 'source', 'available', 'lastUpdated'],
    group: 'Inventory'
  },
  fields: [
    // Basic Book Information
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Book title from external source'
      }
    },
    {
      name: 'titleLong',
      type: 'text',
      admin: {
        description: 'Full title with subtitle'
      }
    },
    {
      name: 'author',
      type: 'text',
      index: true,
      admin: {
        description: 'Primary author'
      }
    },
    {
      name: 'authors',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true
        }
      ],
      admin: {
        description: 'All authors'
      }
    },
    {
      name: 'isbn',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'ISBN-13 (primary identifier)'
      }
    },
    {
      name: 'isbn10',
      type: 'text',
      index: true,
      admin: {
        description: 'ISBN-10'
      }
    },
    
    // Publication Details
    {
      name: 'publisher',
      type: 'text',
      admin: {
        description: 'Publisher name'
      }
    },
    {
      name: 'publishedDate',
      type: 'date',
      admin: {
        description: 'Publication date'
      }
    },
    {
      name: 'edition',
      type: 'text',
      admin: {
        description: 'Edition information'
      }
    },
    {
      name: 'binding',
      type: 'select',
      options: [
        { label: 'Hardcover', value: 'hardcover' },
        { label: 'Paperback', value: 'paperback' },
        { label: 'Mass Market', value: 'mass-market' },
        { label: 'eBook', value: 'ebook' },
        { label: 'Audiobook', value: 'audiobook' },
        { label: 'Unknown', value: 'unknown' }
      ],
      admin: {
        description: 'Book format/binding'
      }
    },
    {
      name: 'pages',
      type: 'number',
      admin: {
        description: 'Number of pages'
      }
    },
    {
      name: 'language',
      type: 'text',
      defaultValue: 'en',
      admin: {
        description: 'Language code'
      }
    },
    {
      name: 'dimensions',
      type: 'text',
      admin: {
        description: 'Physical dimensions'
      }
    },
    
    // Content Information
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Book description/overview'
      }
    },
    {
      name: 'synopsis',
      type: 'textarea',
      admin: {
        description: 'Short synopsis'
      }
    },
    {
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description: 'Book excerpt'
      }
    },
    
    // Categorization
    {
      name: 'categories',
      type: 'array',
      fields: [
        {
          name: 'category',
          type: 'text'
        }
      ],
      admin: {
        description: 'Categories from external source'
      }
    },
    {
      name: 'subjects',
      type: 'array',
      fields: [
        {
          name: 'subject',
          type: 'text'
        }
      ],
      admin: {
        description: 'Subject tags from external source'
      }
    },
    {
      name: 'deweyDecimal',
      type: 'array',
      fields: [
        {
          name: 'code',
          type: 'text'
        }
      ],
      admin: {
        description: 'Dewey Decimal classifications'
      }
    },
    
    // Images
    {
      name: 'imageUrls',
      type: 'array',
      fields: [
        {
          name: 'url',
          type: 'text',
          required: true
        },
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Cover', value: 'cover' },
            { label: 'Thumbnail', value: 'thumbnail' },
            { label: 'Large', value: 'large' }
          ]
        }
      ],
      admin: {
        description: 'Book cover image URLs from external sources'
      }
    },
    
    // Source Information
    {
      name: 'source',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'ISBNdb', value: 'isbndb' },
        { label: 'Google Books', value: 'google-books' },
        { label: 'Open Library', value: 'open-library' },
        { label: 'Bookshop.org', value: 'bookshop' },
        { label: 'Other', value: 'other' }
      ],
      admin: {
        description: 'External source where book was found'
      }
    },
    {
      name: 'sourceId',
      type: 'text',
      admin: {
        description: 'ID/identifier from the external source'
      }
    },
    {
      name: 'sourceUrl',
      type: 'text',
      admin: {
        description: 'URL to the book on external source'
      }
    },
    {
      name: 'sourceData',
      type: 'json',
      admin: {
        description: 'Raw data from external source API (for debugging)'
      }
    },
    
    // Availability & Pricing
    {
      name: 'available',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description: 'Is book available for order from external source?'
      }
    },
    {
      name: 'availabilityDetails',
      type: 'group',
      fields: [
        {
          name: 'inStock',
          type: 'checkbox',
          defaultValue: false
        },
        {
          name: 'estimatedDelivery',
          type: 'text',
          admin: {
            description: 'e.g., "3-5 business days"'
          }
        },
        {
          name: 'stockQuantity',
          type: 'text',
          admin: {
            description: 'Available quantity (if known)'
          }
        }
      ]
    },
    {
      name: 'pricing',
      type: 'array',
      fields: [
        {
          name: 'source',
          type: 'text',
          admin: {
            description: 'Price source (e.g., "Bookshop.org", "Ingram")'
          }
        },
        {
          name: 'price',
          type: 'number',
          admin: {
            description: 'Price in USD'
          }
        },
        {
          name: 'currency',
          type: 'text',
          defaultValue: 'USD'
        },
        {
          name: 'priceType',
          type: 'select',
          options: [
            { label: 'Retail', value: 'retail' },
            { label: 'Wholesale', value: 'wholesale' },
            { label: 'MSRP', value: 'msrp' },
            { label: 'Used', value: 'used' }
          ]
        }
      ],
      admin: {
        description: 'Pricing information from various sources'
      }
    },
    
    // Cache Management
    {
      name: 'lastUpdated',
      type: 'date',
      required: true,
      index: true,
      admin: {
        description: 'When this data was last updated from external source',
        readOnly: true
      }
    },
    {
      name: 'cacheExpiry',
      type: 'date',
      admin: {
        description: 'When this cached data should be refreshed'
      }
    },
    {
      name: 'refreshCount',
      type: 'number',
      defaultValue: 1,
      admin: {
        description: 'How many times this book has been refreshed from external source',
        readOnly: true
      }
    },
    {
      name: 'isStale',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Is cached data considered stale?',
        readOnly: true
      }
    },
    
    // Usage Analytics
    {
      name: 'searchCount',
      type: 'number',
      defaultValue: 1,
      admin: {
        description: 'How many times this book has appeared in search results',
        readOnly: true
      }
    },
    {
      name: 'quoteRequestCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'How many quote requests have been made for this book',
        readOnly: true
      }
    },
    {
      name: 'lastSearched',
      type: 'date',
      admin: {
        description: 'When this book was last shown in search results',
        readOnly: true
      }
    },
    
    // Import to Internal Catalog
    {
      name: 'imported',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Has this book been imported to internal catalog?'
      }
    },
    {
      name: 'importedBookId',
      type: 'relationship',
      relationTo: 'books',
      admin: {
        condition: (data) => data.imported,
        description: 'Link to internal book record if imported'
      }
    },
    {
      name: 'importReason',
      type: 'select',
      admin: {
        condition: (data) => data.imported,
        description: 'Why was this book imported?'
      },
      options: [
        { label: 'High Demand', value: 'high-demand' },
        { label: 'Quote Converted to Stock', value: 'quote-converted' },
        { label: 'Staff Recommendation', value: 'staff-recommendation' },
        { label: 'Fits Collection', value: 'fits-collection' },
        { label: 'Other', value: 'other' }
      ]
    },
    
    // Quality & Relevance Scoring
    {
      name: 'relevanceScore',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Relevance score for Alkebulanimages audience (0-100)',
        readOnly: true
      }
    },
    {
      name: 'qualityScore',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Data quality score (0-100)',
        readOnly: true
      }
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text'
        }
      ],
      admin: {
        description: 'Internal tags for categorization'
      }
    }
  ],
  
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (!data || (operation !== 'create' && operation !== 'update')) {
          return;
        }
        
        // Set last updated timestamp
        data.lastUpdated = new Date().toISOString();
        
        // Set cache expiry (7 days from now)
        if (!data.cacheExpiry) {
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 7);
          data.cacheExpiry = expiry.toISOString();
        }
        
        // Check if data is stale
        if (data.cacheExpiry) {
          data.isStale = new Date(data.cacheExpiry) < new Date();
        }
        
        // Increment refresh count on update
        if (operation === 'update') {
          data.refreshCount = (data.refreshCount || 0) + 1;
        }
        
        // Calculate quality score based on available data
        let qualityScore = 0;
        if (data.title) qualityScore += 20;
        if (data.author) qualityScore += 20;
        if (data.description) qualityScore += 15;
        if (data.imageUrls?.length) qualityScore += 15;
        if (data.publisher) qualityScore += 10;
        if (data.publishedDate) qualityScore += 10;
        if (data.categories?.length) qualityScore += 10;
        
        data.qualityScore = qualityScore;
      }
    ]
  }
};

export default ExternalBooks;