import type { CollectionConfig } from 'payload';
import { autoEnrichBookFromISBN, autoLinkAuthors } from '@/app/utils/autoEnrichBook';
import { EnrichBookButton } from '@/app/components/EnrichBookButton';

// Auto-categorization mapping helper
const mapCategoriesToPayload = (scrapedCategories: string[], scrapedSubjects: string[]): string[] => {
  const categories = [];
  const combined = [...scrapedCategories, ...scrapedSubjects].map(c => c.toLowerCase());

  // History
  if (combined.some(c => c.includes('history') || c.includes('historical'))) {
    categories.push('history');
  }

  // Biography
  if (combined.some(c => c.includes('biography') || c.includes('biographies') || c.includes('memoir'))) {
    categories.push('biography-autobiography');
  }

  // Literature & Fiction
  if (combined.some(c => c.includes('fiction') || c.includes('literature') || c.includes('novel'))) {
    categories.push('literature-fiction');
  }

  // Religion & Spirituality
  if (combined.some(c => c.includes('religion') || c.includes('spiritual') || c.includes('theology'))) {
    categories.push('religion-spirituality');
  }

  // Politics & Social Science
  if (combined.some(c => c.includes('politics') || c.includes('social') || c.includes('civil rights'))) {
    categories.push('politics-social-science');
  }

  // Children & Young Adult
  if (combined.some(c => c.includes('children') || c.includes('young adult') || c.includes('juvenile'))) {
    categories.push('children-young-adult');
  }

  // Arts & Culture
  if (combined.some(c => c.includes('art') || c.includes('culture') || c.includes('music'))) {
    categories.push('arts-culture');
  }

  // Education & Academia
  if (combined.some(c => c.includes('education') || c.includes('academic') || c.includes('reference'))) {
    categories.push('education-academia');
  }

  // Business & Economics
  if (combined.some(c => c.includes('business') || c.includes('economic') || c.includes('entrepreneur'))) {
    categories.push('business-economics');
  }

  // Health & Wellness
  if (combined.some(c => c.includes('health') || c.includes('wellness') || c.includes('medical'))) {
    categories.push('health-wellness');
  }

  return categories;
};

const Books: CollectionConfig = {
  slug: 'books',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'authors', 'publisher', 'vendor', 'categories', 'isActive', 'isbndbChecked'],
    group: 'Inventory',
    components: {
      views: {
        edit: {
          Component: (({ children }: any) => (
            <>
              <div style={{ paddingBottom: '24px' }}>
                <EnrichBookButton />
              </div>
              {children}
            </>
          )) as any
        }
      }
    }
  },
  fields: [
    // Basic Book Information
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Main book title (maps to isbndb.title)'
      }
    },
    {
      name: 'titleLong',
      type: 'text',
      admin: {
        description: 'Full title with subtitle (maps to isbndb.title_long)'
      }
    },
    {
      name: 'slug',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'URL-friendly version of title (auto-generated if empty)'
      },
      hooks: {
        beforeValidate: [
          ({ data }) => {
            if (data?.title && !data?.slug) {
              return data.title
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
            }
            return data?.slug;
          }
        ]
      }
    },
    {
      name: 'authors',
      type: 'relationship',
      relationTo: 'authors',
      hasMany: true,
      admin: {
        description: 'Book authors (linked to Authors collection)'
      }
    },
    {
      name: 'authorsText',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true
        }
      ],
      admin: {
        description: 'Raw author names from import (for reference/auto-linking)'
      }
    },
    {
      name: 'publisher',
      type: 'relationship',
      relationTo: 'publishers',
      admin: {
        description: 'Publisher (linked to Publishers collection)'
      }
    },
    {
      name: 'publisherText',
      type: 'text',
      admin: {
        description: 'Raw publisher name from import (for reference/auto-linking)'
      }
    },
    {
      name: 'vendor',
      type: 'relationship',
      relationTo: 'vendors',
      admin: {
        description: 'Vendor/supplier we get this book from'
      }
    },
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Book description (maps to isbndb.overview or CSV.Description)'
      }
    },
    {
      name: 'synopsis',
      type: 'textarea',
      admin: {
        description: 'Short synopsis (maps to isbndb.synopsis)'
      }
    },
    {
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description: 'Book excerpt (maps to isbndb.excerpt)'
      }
    },

    // Edition Management
    {
      name: 'editions',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'isbn',
          type: 'text',
          required: true,
          admin: {
            description: 'ISBN-13 (maps to isbndb.isbn13)'
          }
        },
        {
          name: 'isbn10',
          type: 'text',
          admin: {
            description: 'ISBN-10 (maps to isbndb.isbn)'
          }
        },
        {
          name: 'publisher',
          type: 'relationship',
          relationTo: 'publishers',
          admin: {
            description: 'Publisher for this specific edition'
          }
        },
        {
          name: 'publisherText',
          type: 'text',
          admin: {
            description: 'Raw publisher name (fallback if no relationship)'
          }
        },
        {
          name: 'datePublished',
          type: 'date',
          admin: {
            description: 'Publication date (maps to isbndb.date_published)'
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
            { label: 'Audiobook', value: 'audiobook' }
          ],
          admin: {
            description: 'Book format (maps to isbndb.binding or CSV.Binding)'
          }
        },
        {
          name: 'edition',
          type: 'text',
          admin: {
            description: 'Edition info (maps to isbndb.edition)'
          }
        },
        {
          name: 'pages',
          type: 'number',
          admin: {
            description: 'Page count (maps to isbndb.pages)'
          }
        },
        {
          name: 'language',
          type: 'text',
          defaultValue: 'en',
          admin: {
            description: 'Language code (maps to isbndb.language)'
          }
        },
        {
          name: 'dimensions',
          type: 'text',
          admin: {
            description: 'Physical dimensions (maps to isbndb.dimensions)'
          }
        },
        {
          name: 'squareVariationId',
          type: 'text',
          admin: {
            description: 'Square POS variation ID for inventory sync'
          }
        },
        {
          name: 'stripePriceId',
          type: 'text',
          admin: {
            description: 'Stripe price ID for this edition'
          }
        },
        {
          name: 'pricing',
          type: 'group',
          fields: [
            {
              name: 'retailPrice',
              type: 'number',
              admin: {
                description: 'Edition-specific retail price in cents',
                step: 1,
              },
            },
            {
              name: 'wholesalePrice',
              type: 'number',
              admin: {
                description: 'Edition-specific wholesale price in cents',
                step: 1,
              },
            },
            {
              name: 'shippingWeight',
              type: 'number',
              admin: {
                description: 'Weight in ounces for this edition',
              },
            },
          ],
        },
        {
          name: 'inventory',
          type: 'group',
          fields: [
            {
              name: 'stockLevel',
              type: 'number',
              defaultValue: 0,
              admin: {
                description: 'Stock level for this specific edition',
              },
            },
            {
              name: 'allowBackorders',
              type: 'checkbox',
              defaultValue: false,
            },
          ],
        },
        {
          name: 'isAvailable',
          type: 'checkbox',
          defaultValue: true
        }
      ],
      admin: {
        description: 'Different editions/printings of this book'
      }
    },

    // Categorization (Your Custom Categories)
    {
      name: 'categories',
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
      ],
      admin: {
        description: 'Your custom categories (auto-mapped from scraped data)'
      }
    },

    // Raw Scraped Categories (for reference/debugging)
    {
      name: 'rawCategories',
      type: 'array',
      fields: [
        {
          name: 'category',
          type: 'text'
        }
      ],
      admin: {
        description: 'Original categories from isbndb/CSV (for reference)'
      }
    },

    // Subjects/Topics (from scraped data)
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
        description: 'Subject tags from scraped data (maps to isbndb.subjects or CSV.Subjects)'
      }
    },

    // Dewey Decimal Classification
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
        description: 'Dewey Decimal codes (maps to isbndb.dewey_decimal)'
      }
    },

    // Your Custom Tags
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          admin: {
            description: 'e.g., "civil rights", "pan-africanism", "slavery", "diaspora"'
          }
        }
      ],
      admin: {
        description: 'Your custom tags for specific topics/themes'
      }
    },

    // Curated Collections
    {
      name: 'collections',
      type: 'array',
      fields: [
        {
          name: 'collectionName',
          type: 'select',
          options: [
            { label: 'Civil Rights Movement', value: 'civil-rights-movement' },
            { label: 'African Diaspora', value: 'african-diaspora' },
            { label: 'Pan-Africanism', value: 'pan-africanism' },
            { label: 'Black Business Leaders', value: 'black-business-leaders' },
            { label: 'Essential Black History', value: 'essential-black-history' },
            { label: 'Contemporary Black Voices', value: 'contemporary-black-voices' },
            { label: 'African Literature Classics', value: 'african-literature-classics' },
            { label: 'Spirituality & Consciousness', value: 'spirituality-consciousness' },
            { label: 'Youth & Education', value: 'youth-education' },
            { label: 'Staff Picks', value: 'staff-picks' },
            { label: 'New Arrivals', value: 'new-arrivals' },
            { label: 'Bestsellers', value: 'bestsellers' },
          ]
        }
      ],
      admin: {
        description: 'Add this book to curated collections'
      }
    },

    // Images
    {
      name: 'images',
      type: 'array',
      maxRows: 3,
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
          name: 'isPrimary',
          type: 'checkbox',
          defaultValue: false
        }
      ],
      admin: {
        description: 'Book cover images (max 3)'
      }
    },

    // Scraped Image URLs (for initial import)
    {
      name: 'scrapedImageUrls',
      type: 'array',
      fields: [
        {
          name: 'url',
          type: 'text'
        }
      ],
      admin: {
        description: 'Image URLs from scraped data (maps to isbndb.image, isbndb.image_original)'
      }
    },

    // Reviews (from scraped data)
    {
      name: 'reviews',
      type: 'array',
      fields: [
        {
          name: 'review',
          type: 'textarea'
        }
      ],
      admin: {
        description: 'Reviews from scraped data (maps to isbndb.reviews)'
      }
    },

    // Related Books
    {
      name: 'relatedBooks',
      type: 'relationship',
      relationTo: 'books',
      hasMany: true,
      admin: {
        description: 'Related books (can be auto-populated from scraped data)'
      }
    },

    // Import/Management Fields
    {
      name: 'squareItemId',
      type: 'text',
      admin: {
        description: 'Square POS item ID for sync tracking'
      }
    },
    {
      name: 'importSource',
      type: 'select',
      options: [
        { label: 'Manual Entry', value: 'manual' },
        { label: 'ISBNDB API', value: 'isbndb' },
        { label: 'Google Books API', value: 'google-books' },
        { label: 'CSV Import', value: 'csv-import' },
        { label: 'Square Webhook', value: 'square-webhook' }
      ],
      admin: {
        description: 'Source of this book data'
      }
    },
    {
      name: 'importDate',
      type: 'date',
      admin: {
        description: 'Date when this book was imported'
      }
    },
    {
      name: 'lastUpdated',
      type: 'date',
      admin: {
        description: 'Last time book data was updated'
      }
    },
    {
      name: 'isbndbChecked',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Has this book been enriched from ISBNdb/Google Books?',
        position: 'sidebar'
      }
    },
    {
      name: 'lastEnrichedAt',
      type: 'date',
      admin: {
        description: 'Last time book data was enriched from external sources',
        position: 'sidebar'
      }
    },
    {
      name: 'enrichmentErrors',
      type: 'textarea',
      admin: {
        description: 'Any errors encountered during enrichment (for debugging)'
      }
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Is this book active in the store?'
      }
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Featured book for homepage/promotions'
      }
    },

    // Pricing & E-Commerce
    {
      name: 'pricing',
      type: 'group',
      fields: [
        {
          name: 'retailPrice',
          type: 'number',
          required: true,
          admin: {
            description: 'Retail price in cents',
            step: 1,
          },
        },
        {
          name: 'wholesalePrice',
          type: 'number',
          admin: {
            description: 'Wholesale/cost price in cents',
            step: 1,
          },
        },
        {
          name: 'compareAtPrice',
          type: 'number',
          admin: {
            description: 'Original price for sales/discounts (cents)',
            step: 1,
          },
        },
        {
          name: 'taxCode',
          type: 'select',
          defaultValue: 'books_tax_free',
          options: [
            { label: 'Books (Tax Free)', value: 'books_tax_free' },
            { label: 'Taxable Goods', value: 'taxable' },
            { label: 'Digital Goods', value: 'digital' },
          ],
        },
        {
          name: 'requiresShipping',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'False for digital downloads',
          },
        },
        {
          name: 'shippingWeight',
          type: 'number',
          admin: {
            description: 'Weight in ounces for shipping calculation',
          },
        },
      ],
    },

    // Inventory Management
    {
      name: 'inventory',
      type: 'group',
      fields: [
        {
          name: 'trackQuantity',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Track inventory levels for this book',
          },
        },
        {
          name: 'stockLevel',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Current stock quantity',
          },
        },
        {
          name: 'lowStockThreshold',
          type: 'number',
          defaultValue: 5,
          admin: {
            description: 'Alert when stock falls below this level',
          },
        },
        {
          name: 'allowBackorders',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Allow orders when out of stock',
          },
        },
        {
          name: 'location',
          type: 'select',
          defaultValue: 'main_store',
          options: [
            { label: 'Main Store', value: 'main_store' },
            { label: 'Warehouse', value: 'warehouse' },
            { label: 'Store 2', value: 'store_2' },
            { label: 'Consignment', value: 'consignment' },
          ],
        },
        {
          name: 'isConsignment',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Is this a consignment item?',
          },
        },
        {
          name: 'dateAdded',
          type: 'date',
          admin: {
            description: 'Date added to inventory',
          },
        },
      ],
    },

    // SEO Fields
    {
      name: 'seo',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
          admin: {
            description: 'SEO title (auto-generated from book title if empty)'
          }
        },
        {
          name: 'description',
          type: 'textarea',
          admin: {
            description: 'SEO description (auto-generated from book description if empty)'
          }
        },
        {
          name: 'keywords',
          type: 'text',
          admin: {
            description: 'SEO keywords (auto-generated from tags/subjects if empty)'
          }
        }
      ]
    }
  ],

  // Hooks for auto-processing scraped data
  access: {
    read: () => true,
  },

  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (!data || (operation !== 'create' && operation !== 'update')) {
          return;
        }

        // AUTO-ENRICH: Fetch book data from ISBNdb/Google Books if ISBN is provided
        // This runs FIRST so the enriched data can be used by subsequent hooks
        // ⚠️ TEMPORARILY DISABLED FOR BATCH ENRICHMENT SCRIPT
        // await autoEnrichBookFromISBN(data, operation);

        // Auto-generate SEO fields if empty
        if (!data.seo?.title && data.title) {
          data.seo = { ...data.seo, title: data.title };
        }

        if (!data.seo?.description && data.description) {
          data.seo = { ...data.seo, description: data.description };
        }

        // Auto-categorize based on scraped data
        if (data.rawCategories || data.subjects) {
          const rawCats = data.rawCategories?.map((rc: any) => rc.category) || [];
          const subjects = data.subjects?.map((s: any) => s.subject) || [];
          const autoCategories = mapCategoriesToPayload(rawCats, subjects);

          if (autoCategories.length > 0 && !data.categories?.length) {
            data.categories = autoCategories;
          }
        }

        // Set import date
        if (operation === 'create' && !data.importDate) {
          data.importDate = new Date().toISOString();
        }

        // Set last updated
        data.lastUpdated = new Date().toISOString();
      }
    ],

    afterChange: [
      async ({ doc, req, operation }) => {
        // AUTO-LINK: Link authors after book is created/updated
        // This runs after the book is saved so we have a valid book ID
        // ⚠️ TEMPORARILY DISABLED FOR BATCH ENRICHMENT SCRIPT
        // if (operation === 'create' || operation === 'update') {
        //   await autoLinkAuthors(doc, req);
        // }
      }
    ]
  }
};

export default Books;