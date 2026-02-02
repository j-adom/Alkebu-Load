import type { CollectionConfig } from 'payload';

const OilsIncense: CollectionConfig = {
  slug: 'oils-incense',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'productType', 'baseScent', 'isActive'],
    group: 'Inventory'
  },
  fields: [
    // Basic Product Information
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Product name (e.g., "Egyptian Musk Oil", "Nag Champa Incense")'
      }
    },
    {
      name: 'productType',
      type: 'select',
      required: true,
      options: [
        { label: 'Fragrance Oil', value: 'fragrance-oil' },
        { label: 'Incense Pack', value: 'incense-pack' },
        { label: 'Sage Bundle', value: 'sage-bundle' },
        { label: 'Palo Santo', value: 'palo-santo' }
      ],
      admin: {
        description: 'Type of product'
      }
    },
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Product description'
      }
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      admin: {
        description: 'Brief description for product listings'
      }
    },

    // Scent Information (for oils and incense)
    {
      name: 'baseScent',
      type: 'text',
      required: true,
      admin: {
        description: 'Primary scent (e.g., "Egyptian Musk", "Nag Champa", "White Sage")'
      }
    },
    {
      name: 'scentFamily',
      type: 'select',
      options: [
        { label: 'Floral', value: 'floral' },
        { label: 'Woody', value: 'woody' },
        { label: 'Citrus', value: 'citrus' },
        { label: 'Herbal', value: 'herbal' },
        { label: 'Spicy', value: 'spicy' },
        { label: 'Earthy', value: 'earthy' },
        { label: 'Sweet', value: 'sweet' },
        { label: 'Fresh', value: 'fresh' },
        { label: 'Exotic', value: 'exotic' },
        { label: 'Sacred', value: 'sacred' }
      ],
      admin: {
        description: 'General scent category'
      }
    },

    // Product Variations
    {
      name: 'variations',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'sku',
          type: 'text',
          required: true,
          admin: {
            description: 'Unique SKU for this variation'
          }
        },
        {
          name: 'size',
          type: 'select',
          required: true,
          options: [
            // For fragrance oils
            { label: '1/4 oz Bottle', value: '0.25-oz-bottle' },
            { label: '1/2 oz Bottle', value: '0.5-oz-bottle' },
            { label: '1 oz Bottle', value: '1-oz-bottle' },
            { label: '2 oz Bottle', value: '2-oz-bottle' },
            { label: '1/3 oz Roll-on', value: '0.33-oz-rollon' },
            
            // For incense
            { label: 'Incense Pack', value: 'incense-pack' },
            
            // For sage/palo santo
            { label: 'Small Bundle', value: 'small-bundle' },
            { label: 'Large Bundle', value: 'large-bundle' },
            { label: 'Single Stick', value: 'single-stick' }
          ],
          admin: {
            description: 'Size/format of this variation'
          }
        },
        {
          name: 'packaging',
          type: 'select',
          options: [
            { label: 'Glass Bottle', value: 'glass-bottle' },
            { label: 'Roll-on Bottle', value: 'roll-on' },
            { label: 'Box', value: 'box' },
            { label: 'Pouch', value: 'pouch' },
            { label: 'Bundle', value: 'bundle' }
          ],
          admin: {
            description: 'How the product is packaged'
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
          name: 'medusaVariantId',
          type: 'text',
          admin: {
            description: 'MedusaJS variant ID for ecommerce'
          }
        },
        {
          name: 'isAvailable',
          type: 'checkbox',
          defaultValue: true
        }
      ],
      admin: {
        description: 'Available sizes and formats'
      }
    },

    // Sage Bundle Specific Fields
    {
      name: 'sageBlend',
      type: 'array',
      fields: [
        {
          name: 'ingredient',
          type: 'select',
          options: [
            { label: 'White Sage', value: 'white-sage' },
            { label: 'Blue Sage', value: 'blue-sage' },
            { label: 'Cedar', value: 'cedar' },
            { label: 'Lavender', value: 'lavender' },
            { label: 'Rosemary', value: 'rosemary' },
            { label: 'Sweetgrass', value: 'sweetgrass' },
            { label: 'Other', value: 'other' }
          ]
        },
        {
          name: 'customIngredient',
          type: 'text',
          admin: {
            condition: (data, siblingData) => siblingData?.ingredient === 'other',
            description: 'Custom ingredient name'
          }
        }
      ],
      admin: {
        condition: (data) => data?.productType === 'sage-bundle',
        description: 'Ingredients in this sage bundle blend'
      }
    },

    // Future Uses (optional for now)
    {
      name: 'uses',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Aromatherapy', value: 'aromatherapy' },
        { label: 'Meditation', value: 'meditation' },
        { label: 'Spiritual Practice', value: 'spiritual-practice' },
        { label: 'Relaxation', value: 'relaxation' },
        { label: 'Energy Cleansing', value: 'energy-cleansing' },
        { label: 'Personal Fragrance', value: 'personal-fragrance' },
        { label: 'Home Fragrance', value: 'home-fragrance' }
      ],
      admin: {
        description: 'Intended uses (optional - for future expansion)'
      }
    },

    // Categorization
    {
      name: 'categories',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Fragrance Oils', value: 'fragrance-oils' },
        { label: 'Incense', value: 'incense' },
        { label: 'Sage & Cleansing', value: 'sage-cleansing' },
        { label: 'Spiritual Tools', value: 'spiritual-tools' },
        { label: 'Home Fragrance', value: 'home-fragrance' }
      ],
      admin: {
        description: 'Product categories'
      }
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          admin: {
            description: 'e.g., "popular", "new", "bestseller"'
          }
        }
      ],
      admin: {
        description: 'Custom tags for organization'
      }
    },

    // Collections
    {
      name: 'collections',
      type: 'array',
      fields: [
        {
          name: 'collectionName',
          type: 'select',
          options: [
            { label: 'Popular Scents', value: 'popular-scents' },
            { label: 'New Arrivals', value: 'new-arrivals' },
            { label: 'Bestsellers', value: 'bestsellers' },
            { label: 'Cleansing & Sage', value: 'cleansing-sage' },
            { label: 'Gift Sets', value: 'gift-sets' },
            { label: 'Travel Size', value: 'travel-size' },
            { label: 'Staff Picks', value: 'staff-picks' }
          ]
        }
      ],
      admin: {
        description: 'Add to curated collections'
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
        description: 'Product images (max 3)'
      }
    },

    // Related Products
    {
      name: 'relatedProducts',
      type: 'relationship',
      relationTo: 'oils-incense',
      hasMany: true,
      admin: {
        description: 'Similar or complementary products'
      }
    },

    // Management Fields
    {
      name: 'importSource',
      type: 'select',
      options: [
        { label: 'Manual Entry', value: 'manual' },
        { label: 'Square POS Import', value: 'square-import' },
        { label: 'CSV Import', value: 'csv-import' }
      ],
      admin: {
        description: 'Source of this product data'
      }
    },
    {
      name: 'importDate',
      type: 'date',
      admin: {
        description: 'Date when this product was imported'
      }
    },
    {
      name: 'lastUpdated',
      type: 'date',
      admin: {
        description: 'Last time product data was updated'
      }
    },

    // Customer Reviews & Ratings
    {
      name: 'averageRating',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Average customer rating (1-5 stars, auto-calculated from Reviews collection)',
      },
    },
    {
      name: 'reviewCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Total number of approved reviews (auto-calculated)',
      },
    },

    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Is this product active in the store?'
      }
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Featured product for homepage/promotions'
      }
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
            description: 'SEO title (auto-generated if empty)'
          }
        },
        {
          name: 'description',
          type: 'textarea',
          admin: {
            description: 'SEO description (auto-generated if empty)'
          }
        },
        {
          name: 'keywords',
          type: 'text',
          admin: {
            description: 'SEO keywords (auto-generated if empty)'
          }
        }
      ]
    }
  ],

  // Hooks for auto-processing
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

        // Auto-generate SEO fields if empty
        if (!data.seo?.title && data.name) {
          data.seo = { ...data.seo, title: data.name };
        }

        if (!data.seo?.description && data.shortDescription) {
          data.seo = { ...data.seo, description: data.shortDescription };
        }

        // Auto-generate keywords from scent and tags
        if (!data.seo?.keywords) {
          const keywords = [data.baseScent, data.scentFamily].filter(Boolean);
          if (data.tags) {
            keywords.push(...data.tags.map((t: any) => t.tag));
          }
          if (keywords.length > 0) {
            data.seo = { ...data.seo, keywords: keywords.join(', ') };
          }
        }

        // Set import date
        if (operation === 'create' && !data.importDate) {
          data.importDate = new Date().toISOString();
        }

        // Set last updated
        data.lastUpdated = new Date().toISOString();
      }
    ]
  }
};

export default OilsIncense;