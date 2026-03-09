import type { CollectionConfig } from 'payload';

const SearchAnalytics: CollectionConfig = {
  slug: 'searchAnalytics',
  admin: {
    useAsTitle: 'query',
    defaultColumns: ['query', 'resultCount', 'clickthrough', 'searchDate'],
    group: 'Analytics'
  },
  fields: [
    // Search Query Information
    {
      name: 'query',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'The search query entered by the user'
      }
    },
    {
      name: 'normalizedQuery',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Normalized version of query (lowercase, trimmed, etc.)',
        readOnly: true
      }
    },
    {
      name: 'queryType',
      type: 'select',
      required: true,
      options: [
        { label: 'General Search', value: 'general' },
        { label: 'Book Search', value: 'books' },
        { label: 'Product Search', value: 'products' },
        { label: 'Content Search', value: 'content' },
        { label: 'Business Search', value: 'businesses' },
        { label: 'Event Search', value: 'events' },
        { label: 'Voice Search', value: 'voice' },
        { label: 'Barcode Search', value: 'barcode' }
      ],
      admin: {
        description: 'Type of search performed'
      }
    },

    // Search Context
    {
      name: 'searchSource',
      type: 'select',
      required: true,
      options: [
        { label: 'Homepage', value: 'homepage' },
        { label: 'Product Page', value: 'product-page' },
        { label: 'Blog', value: 'blog' },
        { label: 'Events', value: 'events' },
        { label: 'Directory', value: 'directory' },
        { label: 'Mobile App', value: 'mobile-app' },
        { label: 'API', value: 'api' }
      ],
      admin: {
        description: 'Where the search was initiated from'
      }
    },
    {
      name: 'userType',
      type: 'select',
      options: [
        { label: 'Guest', value: 'guest' },
        { label: 'Registered User', value: 'registered' },
        { label: 'Staff', value: 'staff' }
      ],
      admin: {
        description: 'Type of user who performed the search'
      }
    },
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'User who performed the search (if logged in)'
      }
    },

    // Search Results
    {
      name: 'resultCount',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        description: 'Total number of search results returned'
      }
    },
    {
      name: 'internalResultCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of results from internal inventory'
      }
    },
    {
      name: 'externalResultCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of results from external APIs'
      }
    },
    {
      name: 'searchTime',
      type: 'number',
      admin: {
        description: 'Search execution time in milliseconds'
      }
    },

    // Search Success Metrics
    {
      name: 'clickthrough',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Did user click on any search results?'
      }
    },
    {
      name: 'clickedResult',
      type: 'group',
      admin: {
        condition: (data) => data.clickthrough
      },
      fields: [
        {
          name: 'resultType',
          type: 'select',
          options: [
            { label: 'Book', value: 'books' },
            { label: 'Wellness Product', value: 'wellness-lifestyle' },
            { label: 'Fashion/Jewelry', value: 'fashion-jewelry' },
            { label: 'Oils/Incense', value: 'oils-incense' },
            { label: 'Blog Post', value: 'blogPosts' },
            { label: 'Event', value: 'events' },
            { label: 'Business', value: 'businesses' },
            { label: 'External Book', value: 'externalBooks' }
          ]
        },
        {
          name: 'resultId',
          type: 'text',
          admin: {
            description: 'ID of the clicked result'
          }
        },
        {
          name: 'resultPosition',
          type: 'number',
          admin: {
            description: 'Position of clicked result in search results (1-based)'
          }
        },
        {
          name: 'clickTime',
          type: 'date',
          admin: {
            description: 'When the result was clicked'
          }
        }
      ]
    },
    {
      name: 'conversion',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Did search lead to a purchase/signup/quote request?'
      }
    },
    {
      name: 'conversionType',
      type: 'select',
      admin: {
        condition: (data) => data.conversion,
        description: 'Type of conversion achieved'
      },
      options: [
        { label: 'Purchase', value: 'purchase' },
        { label: 'Add to Cart', value: 'add-to-cart' },
        { label: 'Quote Request', value: 'quote-request' },
        { label: 'Event Registration', value: 'event-registration' },
        { label: 'Newsletter Signup', value: 'newsletter-signup' },
        { label: 'Account Creation', value: 'account-creation' }
      ]
    },

    // External Book Search Specific
    {
      name: 'externalBookSearch',
      type: 'group',
      admin: {
        condition: (data) => data.externalResultCount > 0
      },
      fields: [
        {
          name: 'isbndbUsed',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Was ISBNdb API used?'
          }
        },
        {
          name: 'googleBooksUsed',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Was Google Books API used?'
          }
        },
        {
          name: 'openLibraryUsed',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Was Open Library API used?'
          }
        },
        {
          name: 'bookshopChecked',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Was Bookshop.org availability checked?'
          }
        },
        {
          name: 'quoteRequested',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Did user request a quote for external book?'
          }
        }
      ]
    },

    // Search Refinement
    {
      name: 'refinedSearch',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Did user refine/modify their search?'
      }
    },
    {
      name: 'refinedQuery',
      type: 'text',
      admin: {
        condition: (data) => data.refinedSearch,
        description: 'The refined search query'
      }
    },
    {
      name: 'filtersUsed',
      type: 'array',
      fields: [
        {
          name: 'filterType',
          type: 'select',
          options: [
            { label: 'Category', value: 'category' },
            { label: 'Price Range', value: 'price' },
            { label: 'Availability', value: 'availability' },
            { label: 'Author', value: 'author' },
            { label: 'Publisher', value: 'publisher' },
            { label: 'Date Range', value: 'date' },
            { label: 'Rating', value: 'rating' }
          ]
        },
        {
          name: 'filterValue',
          type: 'text'
        }
      ],
      admin: {
        description: 'Filters applied to search results'
      }
    },

    // Technical Information
    {
      name: 'searchDate',
      type: 'date',
      required: true,
      index: true,
      admin: {
        description: 'When the search was performed'
      }
    },
    {
      name: 'sessionId',
      type: 'text',
      index: true,
      admin: {
        description: 'User session identifier'
      }
    },
    {
      name: 'ipAddress',
      type: 'text',
      admin: {
        description: 'IP address of searcher (for analytics)',
        readOnly: true
      }
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: {
        description: 'Browser/device information',
        readOnly: true
      }
    },
    {
      name: 'deviceType',
      type: 'select',
      options: [
        { label: 'Desktop', value: 'desktop' },
        { label: 'Mobile', value: 'mobile' },
        { label: 'Tablet', value: 'tablet' }
      ],
      admin: {
        description: 'Device type used for search'
      }
    },

    // Performance Metrics
    {
      name: 'searchEngine',
      type: 'select',
      required: true,
      options: [
        { label: 'FlexSearch', value: 'flexsearch' },
        { label: 'PostgreSQL FTS', value: 'postgresql' },
        { label: 'Combined', value: 'combined' }
      ],
      admin: {
        description: 'Search engine used for this query'
      }
    },
    {
      name: 'cacheHit',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Was result served from cache?'
      }
    },

    // Business Intelligence
    {
      name: 'popularQuery',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Is this a frequently searched query?',
        readOnly: true
      }
    },
    {
      name: 'queryFrequency',
      type: 'number',
      defaultValue: 1,
      admin: {
        description: 'How many times this exact query has been searched',
        readOnly: true
      }
    },
    {
      name: 'zeroResultsQuery',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Query that returned no results',
        readOnly: true
      }
    }
  ],

  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (!data || operation !== 'create') {
          return;
        }

        // Normalize query for analysis
        if (data.query) {
          data.normalizedQuery = data.query
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
        }

        // Set search date
        if (!data.searchDate) {
          data.searchDate = new Date().toISOString();
        }

        // Mark as zero results query
        if (data.resultCount === 0) {
          data.zeroResultsQuery = true;
        }
      }
    ],

    afterChange: [
      async ({ doc, operation }) => {
        if (operation !== 'create') return;

        // This could trigger analytics updates, like:
        // - Updating query frequency counters
        // - Identifying trending searches
        // - Flagging potential inventory gaps
        // - Updating search suggestions

        // For now, we'll just log it
        console.log(`Search logged: "${doc.query}" - ${doc.resultCount} results`);
      }
    ]
  }
};

export default SearchAnalytics;