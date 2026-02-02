import type { CollectionConfig } from 'payload';

const WellnessLifestyle: CollectionConfig = {
  slug: 'wellness-lifestyle',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'productType', 'vendor', 'primaryIngredient', 'isActive'],
    group: 'Inventory'
  },
  fields: [
    // Basic Product Information
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Product name (e.g., "Egyptian Musk Oil", "Shea Butter Cream", "Sage Bundle")'
      }
    },
    {
      name: 'productType',
      type: 'select',
      required: true,
      options: [
        // Oils & Fragrances
        { label: 'Fragrance Oil', value: 'fragrance-oil' },
        { label: 'Essential Oil', value: 'essential-oil' },
        { label: 'Oil Blend', value: 'oil-blend' },
        
        // Cosmetics & Body Care
        { label: 'Body Butter', value: 'body-butter' },
        { label: 'Body Cream', value: 'body-cream' },
        { label: 'Body Lotion', value: 'body-lotion' },
        { label: 'Face Cream', value: 'face-cream' },
        { label: 'Soap', value: 'soap' },
        { label: 'Body Scrub', value: 'body-scrub' },
        { label: 'Hair Oil', value: 'hair-oil' },
        { label: 'Hair Cream', value: 'hair-cream' },
        { label: 'Lip Balm', value: 'lip-balm' },
        { label: 'Deodorant', value: 'deodorant' },
        
        // Incense & Cleansing
        { label: 'Incense Sticks', value: 'incense-sticks' },
        { label: 'Incense Cones', value: 'incense-cones' },
        { label: 'Loose Incense', value: 'loose-incense' },
        { label: 'Sage Bundle', value: 'sage-bundle' },
        { label: 'Palo Santo', value: 'palo-santo' },
        { label: 'Resin', value: 'resin' },
        
        // Health & Supplements
        { label: 'Herbal Tea', value: 'herbal-tea' },
        { label: 'Tincture', value: 'tincture' },
        { label: 'Capsules', value: 'capsules' },
        { label: 'Powder', value: 'powder' },
        { label: 'Herbal Blend', value: 'herbal-blend' },
        
        // Household & Lifestyle
        { label: 'Candle', value: 'candle' },
        { label: 'Room Spray', value: 'room-spray' },
        { label: 'Cleaning Product', value: 'cleaning-product' },
        { label: 'Textile', value: 'textile' },
        { label: 'Art & Decor', value: 'art-decor' },
        { label: 'Kitchen Item', value: 'kitchen-item' },
        { label: 'Spiritual Tool', value: 'spiritual-tool' },
        
        // Tools & Accessories
        { label: 'Oil Burner', value: 'oil-burner' },
        { label: 'Incense Holder', value: 'incense-holder' },
        { label: 'Diffuser', value: 'diffuser' },
        { label: 'Smudge Bowl', value: 'smudge-bowl' }
      ],
      admin: {
        description: 'Type of wellness/lifestyle product'
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
    {
      name: 'brand',
      type: 'text',
      admin: {
        description: 'Brand or manufacturer name'
      }
    },
    {
      name: 'vendor',
      type: 'relationship',
      relationTo: 'vendors',
      admin: {
        description: 'Vendor/supplier we get this product from'
      }
    },

    // Primary Ingredient/Scent (for easy categorization)
    {
      name: 'primaryIngredient',
      type: 'text',
      required: true,
      admin: {
        description: 'Main ingredient or scent (e.g., "Lavender", "Shea Butter", "White Sage")'
      }
    },

    // Ingredients & Composition
    {
      name: 'ingredients',
      type: 'array',
      fields: [
        {
          name: 'ingredient',
          type: 'text',
          required: true,
          admin: {
            description: 'Ingredient name (e.g., "Organic Shea Butter", "Lavender Essential Oil")'
          }
        },
        {
          name: 'percentage',
          type: 'number',
          admin: {
            description: 'Percentage in product (optional)'
          }
        },
        {
          name: 'purpose',
          type: 'select',
          options: [
            { label: 'Active Ingredient', value: 'active' },
            { label: 'Base/Carrier', value: 'base' },
            { label: 'Fragrance', value: 'fragrance' },
            { label: 'Preservative', value: 'preservative' },
            { label: 'Emulsifier', value: 'emulsifier' },
            { label: 'Therapeutic', value: 'therapeutic' },
            { label: 'Coloring', value: 'coloring' },
            { label: 'Other', value: 'other' }
          ],
          admin: {
            description: 'Purpose of this ingredient'
          }
        },
        {
          name: 'isOrganic',
          type: 'checkbox',
          defaultValue: false
        },
        {
          name: 'origin',
          type: 'text',
          admin: {
            description: 'Where this ingredient is sourced from'
          }
        }
      ],
      admin: {
        description: 'Complete ingredient list'
      }
    },

    // Scent Information (for fragrant products)
    {
      name: 'scentProfile',
      type: 'group',
      admin: {
        condition: (data) => {
          const scentedTypes = ['fragrance-oil', 'essential-oil', 'oil-blend', 'incense-sticks', 'incense-cones', 'loose-incense', 'candle', 'room-spray', 'soap', 'body-cream', 'body-lotion'];
          return scentedTypes.includes(data?.productType);
        },
        description: 'Scent details for fragrant products'
      },
      fields: [
        {
          name: 'scentFamily',
          type: 'select',
          hasMany: true,
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
            { label: 'Sacred', value: 'sacred' },
            { label: 'Musky', value: 'musky' }
          ]
        },
        {
          name: 'scentNotes',
          type: 'array',
          fields: [
            {
              name: 'note',
              type: 'select',
              options: [
                { label: 'Top Note', value: 'top' },
                { label: 'Middle Note', value: 'middle' },
                { label: 'Base Note', value: 'base' }
              ]
            },
            {
              name: 'scent',
              type: 'text',
              required: true
            }
          ]
        },
        {
          name: 'scentStrength',
          type: 'select',
          options: [
            { label: 'Light', value: 'light' },
            { label: 'Medium', value: 'medium' },
            { label: 'Strong', value: 'strong' },
            { label: 'Very Strong', value: 'very-strong' }
          ]
        }
      ]
    },

    // Usage & Benefits
    {
      name: 'uses',
      type: 'select',
      hasMany: true,
      options: [
        // Wellness
        { label: 'Aromatherapy', value: 'aromatherapy' },
        { label: 'Skincare', value: 'skincare' },
        { label: 'Hair Care', value: 'hair-care' },
        { label: 'Relaxation', value: 'relaxation' },
        { label: 'Stress Relief', value: 'stress-relief' },
        { label: 'Sleep Aid', value: 'sleep-aid' },
        { label: 'Pain Relief', value: 'pain-relief' },
        { label: 'Immune Support', value: 'immune-support' },
        { label: 'Digestive Health', value: 'digestive-health' },
        
        // Spiritual
        { label: 'Meditation', value: 'meditation' },
        { label: 'Spiritual Practice', value: 'spiritual-practice' },
        { label: 'Energy Cleansing', value: 'energy-cleansing' },
        { label: 'Protection', value: 'protection' },
        { label: 'Ritual Work', value: 'ritual-work' },
        { label: 'Ceremonial', value: 'ceremonial' },
        
        // Practical
        { label: 'Personal Fragrance', value: 'personal-fragrance' },
        { label: 'Home Fragrance', value: 'home-fragrance' },
        { label: 'Air Freshening', value: 'air-freshening' },
        { label: 'Massage', value: 'massage' },
        { label: 'Cleaning', value: 'cleaning' },
        { label: 'Decoration', value: 'decoration' }
      ],
      admin: {
        description: 'Intended uses and applications'
      }
    },
    {
      name: 'benefits',
      type: 'array',
      fields: [
        {
          name: 'benefit',
          type: 'text',
          required: true,
          admin: {
            description: 'Specific benefit (e.g., "Moisturizes dry skin", "Promotes calm")'
          }
        },
        {
          name: 'description',
          type: 'textarea',
          admin: {
            description: 'Detailed explanation of this benefit'
          }
        }
      ],
      admin: {
        description: 'Health, wellness, or practical benefits'
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
          type: 'group',
          fields: [
            {
              name: 'volume',
              type: 'number',
              admin: {
                description: 'Volume/quantity (e.g., 10, 30, 50)'
              }
            },
            {
              name: 'unit',
              type: 'select',
              options: [
                // Liquid measures
                { label: 'mL', value: 'ml' },
                { label: 'oz', value: 'oz' },
                { label: 'fl oz', value: 'fl-oz' },
                
                // Weight measures
                { label: 'g', value: 'g' },
                { label: 'kg', value: 'kg' },
                { label: 'lb', value: 'lb' },
                
                // Count/quantity
                { label: 'count', value: 'count' },
                { label: 'sticks', value: 'sticks' },
                { label: 'cones', value: 'cones' },
                { label: 'pieces', value: 'pieces' },
                { label: 'bundle', value: 'bundle' },
                { label: 'pack', value: 'pack' },
                
                // Special sizes
                { label: 'travel size', value: 'travel-size' },
                { label: 'sample', value: 'sample' },
                { label: 'bulk', value: 'bulk' }
              ]
            }
          ]
        },
        {
          name: 'packaging',
          type: 'select',
          options: [
            // Bottles & Containers
            { label: 'Glass Bottle', value: 'glass-bottle' },
            { label: 'Plastic Bottle', value: 'plastic-bottle' },
            { label: 'Dropper Bottle', value: 'dropper-bottle' },
            { label: 'Roll-on Bottle', value: 'roll-on' },
            { label: 'Jar', value: 'jar' },
            { label: 'Tin', value: 'tin' },
            { label: 'Tube', value: 'tube' },
            
            // Flexible packaging
            { label: 'Pouch', value: 'pouch' },
            { label: 'Bag', value: 'bag' },
            { label: 'Box', value: 'box' },
            { label: 'Bundle', value: 'bundle' },
            { label: 'Stick Pack', value: 'stick-pack' },
            
            // Bulk/loose
            { label: 'Bulk Container', value: 'bulk-container' },
            { label: 'Loose/Unpackaged', value: 'loose' }
          ]
        },
        {
          name: 'concentration',
          type: 'select',
          admin: {
            condition: (data, siblingData) => {
              const concentratedTypes = ['essential-oil', 'fragrance-oil', 'tincture', 'herbal-blend'];
              return concentratedTypes.includes(data?.productType);
            },
            description: 'Concentration level (for oils, tinctures, etc.)'
          },
          options: [
            { label: '100% Pure', value: 'pure' },
            { label: 'Diluted 10%', value: 'diluted-10' },
            { label: 'Diluted 50%', value: 'diluted-50' },
            { label: 'Ready to Use', value: 'ready-to-use' },
            { label: 'Concentrated', value: 'concentrated' },
            { label: 'Standard Strength', value: 'standard' }
          ]
        },
        {
          name: 'scent',
          type: 'text',
          admin: {
            description: 'Specific scent for this variation (if different from main)'
          }
        },
        {
          name: 'color',
          type: 'text',
          admin: {
            description: 'Color of this variation (for candles, soaps, etc.)'
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
          name: 'squareItemId',
          type: 'text',
          admin: {
            description: 'Square POS item ID for sync tracking'
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
        description: 'Different sizes, concentrations, and packaging options'
      }
    },

    // Origin & Sourcing
    {
      name: 'origin',
      type: 'group',
      fields: [
        {
          name: 'country',
          type: 'text',
          admin: {
            description: 'Country of origin'
          }
        },
        {
          name: 'region',
          type: 'text',
          admin: {
            description: 'Specific region (e.g., "West Africa", "Ghana", "Morocco")'
          }
        },
        {
          name: 'culturalBackground',
          type: 'textarea',
          admin: {
            description: 'Cultural background or traditional use'
          }
        }
      ]
    },
    {
      name: 'certifications',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Organic', value: 'organic' },
        { label: 'Fair Trade', value: 'fair-trade' },
        { label: 'Wildcrafted', value: 'wildcrafted' },
        { label: 'Cruelty-Free', value: 'cruelty-free' },
        { label: 'Vegan', value: 'vegan' },
        { label: 'Natural', value: 'natural' },
        { label: 'Handmade', value: 'handmade' },
        { label: 'Small Batch', value: 'small-batch' },
        { label: 'Sustainably Sourced', value: 'sustainably-sourced' }
      ],
      admin: {
        description: 'Product certifications and quality markers'
      }
    },

    // Sage Bundle Specific (for cleansing products)
    {
      name: 'sageBlend',
      type: 'array',
      admin: {
        condition: (data) => data?.productType === 'sage-bundle',
        description: 'Ingredients in this sage bundle'
      },
      fields: [
        {
          name: 'ingredient',
          type: 'select',
          options: [
            { label: 'White Sage', value: 'white-sage' },
            { label: 'Blue Sage', value: 'blue-sage' },
            { label: 'Desert Sage', value: 'desert-sage' },
            { label: 'Cedar', value: 'cedar' },
            { label: 'Lavender', value: 'lavender' },
            { label: 'Rosemary', value: 'rosemary' },
            { label: 'Sweetgrass', value: 'sweetgrass' },
            { label: 'Palo Santo', value: 'palo-santo' },
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
      ]
    },

    // Safety & Instructions
    {
      name: 'safetyInformation',
      type: 'richText',
      admin: {
        description: 'Safety warnings, contraindications, allergy information'
      }
    },
    {
      name: 'usageInstructions',
      type: 'richText',
      admin: {
        description: 'How to use the product effectively'
      }
    },
    {
      name: 'storageInstructions',
      type: 'text',
      admin: {
        description: 'How to store the product properly'
      }
    },
    {
      name: 'shelfLife',
      type: 'text',
      admin: {
        description: 'Shelf life or expiration information'
      }
    },

    // Categorization
    {
      name: 'categories',
      type: 'select',
      hasMany: true,
      options: [
        // Wellness
        { label: 'Essential Oils', value: 'essential-oils' },
        { label: 'Fragrance Oils', value: 'fragrance-oils' },
        { label: 'Natural Cosmetics', value: 'natural-cosmetics' },
        { label: 'Body Care', value: 'body-care' },
        { label: 'Hair Care', value: 'hair-care' },
        { label: 'Skincare', value: 'skincare' },
        { label: 'Health Supplements', value: 'health-supplements' },
        { label: 'Herbal Medicine', value: 'herbal-medicine' },
        
        // Spiritual
        { label: 'Incense', value: 'incense' },
        { label: 'Sage & Cleansing', value: 'sage-cleansing' },
        { label: 'Spiritual Tools', value: 'spiritual-tools' },
        { label: 'Meditation Supplies', value: 'meditation-supplies' },
        { label: 'Ritual Supplies', value: 'ritual-supplies' },
        
        // Lifestyle
        { label: 'Home Fragrance', value: 'home-fragrance' },
        { label: 'Candles', value: 'candles' },
        { label: 'African Imports', value: 'african-imports' },
        { label: 'Household Goods', value: 'household-goods' },
        { label: 'Art & Decor', value: 'art-decor' },
        { label: 'Kitchen & Dining', value: 'kitchen-dining' }
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
            description: 'e.g., "healing", "relaxation", "imported", "handmade"'
          }
        }
      ],
      admin: {
        description: 'Custom tags for detailed categorization'
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
            { label: 'Sacred Scents', value: 'sacred-scents' },
            { label: 'Natural Beauty', value: 'natural-beauty' },
            { label: 'African Wellness', value: 'african-wellness' },
            { label: 'Healing Collection', value: 'healing-collection' },
            { label: 'Cleansing & Protection', value: 'cleansing-protection' },
            { label: 'Meditation Essentials', value: 'meditation-essentials' },
            { label: 'Aromatherapy Set', value: 'aromatherapy-set' },
            { label: 'Travel Size', value: 'travel-size' },
            { label: 'Gift Sets', value: 'gift-sets' },
            { label: 'Beginner Friendly', value: 'beginner-friendly' },
            { label: 'Premium Collection', value: 'premium-collection' },
            { label: 'African Imports', value: 'african-imports' },
            { label: 'New Arrivals', value: 'new-arrivals' },
            { label: 'Bestsellers', value: 'bestsellers' },
            { label: 'Staff Picks', value: 'staff-picks' }
          ]
        }
      ],
      admin: {
        description: 'Add to curated collections'
      }
    },

    // Target Demographics & Uses
    {
      name: 'targetAudience',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Wellness Enthusiasts', value: 'wellness-enthusiasts' },
        { label: 'Spiritual Practitioners', value: 'spiritual-practitioners' },
        { label: 'Natural Beauty Lovers', value: 'natural-beauty-lovers' },
        { label: 'Aromatherapy Users', value: 'aromatherapy-users' },
        { label: 'Cultural Enthusiasts', value: 'cultural-enthusiasts' },
        { label: 'Eco-Conscious Consumers', value: 'eco-conscious' },
        { label: 'Health-Conscious', value: 'health-conscious' },
        { label: 'Home Fragrance Lovers', value: 'home-fragrance-lovers' },
        { label: 'Men', value: 'men' },
        { label: 'Women', value: 'women' },
        { label: 'Unisex', value: 'unisex' }
      ],
      admin: {
        description: 'Target audience for this product'
      }
    },

    // Images
    {
      name: 'images',
      type: 'array',
      maxRows: 6,
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
        },
        {
          name: 'showsVariation',
          type: 'text',
          admin: {
            description: 'Which variation this image shows (e.g., "30ml Glass Bottle", "Large Bundle")'
          }
        },
        {
          name: 'imageType',
          type: 'select',
          options: [
            { label: 'Product Shot', value: 'product-shot' },
            { label: 'Lifestyle', value: 'lifestyle' },
            { label: 'Ingredients', value: 'ingredients' },
            { label: 'Usage/Application', value: 'usage' },
            { label: 'Detail/Close-up', value: 'detail' }
          ]
        }
      ],
      admin: {
        description: 'Product images (max 6)'
      }
    },

    // Related Products
    {
      name: 'relatedProducts',
      type: 'relationship',
      relationTo: 'wellness-lifestyle' as any,
      hasMany: true,
      admin: {
        description: 'Similar or complementary wellness products'
      }
    },
    {
      name: 'complementaryProducts',
      type: 'relationship',
      relationTo: ['wellness-lifestyle', 'fashion-jewelry', 'books'] as any,
      hasMany: true,
      admin: {
        description: 'Products that work well together'
      }
    },

    // Management Fields
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
        { label: 'Square POS Import', value: 'square-import' },
        { label: 'CSV Import', value: 'csv-import' },
        { label: 'Supplier Catalog', value: 'supplier-catalog' },
        { label: 'African Import', value: 'african-import' }
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

        // Auto-generate keywords from ingredients, uses, tags, and categories
        if (!data.seo?.keywords) {
          const keywords = [];
          
          // Add primary ingredient
          if (data.primaryIngredient) {
            keywords.push(data.primaryIngredient);
          }
          
          // Add main ingredients
          if (data.ingredients) {
            keywords.push(...data.ingredients.slice(0, 3).map((i: any) => i.ingredient));
          }
          
          // Add uses
          if (data.uses) {
            keywords.push(...data.uses.slice(0, 3));
          }
          
          // Add tags
          if (data.tags) {
            keywords.push(...data.tags.map((t: any) => t.tag));
          }
          
          // Add categories
          if (data.categories) {
            keywords.push(...data.categories.slice(0, 2));
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

export default WellnessLifestyle;