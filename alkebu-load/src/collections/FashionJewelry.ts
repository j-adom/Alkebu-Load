import type { CollectionConfig } from 'payload';

const FashionJewelry: CollectionConfig = {
  slug: 'fashion-jewelry',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'primaryType', 'vendor', 'style', 'isActive'],
    group: 'Inventory'
  },
  fields: [
    // Basic Product Information
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Product name (e.g., "Black Lives Matter Design", "Amethyst Crystal Necklace")'
      }
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description: 'URL-friendly identifier (auto-generated from name)'
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (!value && data?.name) {
              return data.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            }
            return value;
          }
        ]
      }
    },
    {
      name: 'price',
      type: 'number',
      admin: {
        description: 'Base price in dollars (for display purposes)'
      }
    },
    {
      name: 'primaryType',
      type: 'select',
      required: true,
      options: [
        { label: 'Clothing Design', value: 'clothing-design' },
        { label: 'Jewelry Piece', value: 'jewelry-piece' },
        { label: 'Fashion Accessory', value: 'fashion-accessory' }
      ],
      admin: {
        description: 'Primary category - determines which fields are most relevant'
      }
    },
    {
      name: 'style',
      type: 'select',
      options: [
        // Clothing styles
        { label: 'Screen Printed', value: 'screen-printed' },
        { label: 'African Print', value: 'african-print' },
        { label: 'Cultural/Traditional', value: 'cultural-traditional' },
        { label: 'Activist/Message', value: 'activist-message' },
        { label: 'Casual Wear', value: 'casual-wear' },
        
        // Jewelry styles
        { label: 'Handmade Jewelry', value: 'handmade-jewelry' },
        { label: 'Crystal Jewelry', value: 'crystal-jewelry' },
        { label: 'African-Inspired Jewelry', value: 'african-inspired-jewelry' },
        { label: 'Statement Piece', value: 'statement-piece' },
        { label: 'Everyday Jewelry', value: 'everyday-jewelry' },
        
        // General
        { label: 'Contemporary', value: 'contemporary' },
        { label: 'Vintage/Retro', value: 'vintage-retro' },
        { label: 'Unique/One-off', value: 'unique-item' }
      ],
      admin: {
        description: 'Style category of the item'
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
      name: 'vendor',
      type: 'relationship',
      relationTo: 'vendors',
      admin: {
        description: 'Vendor/supplier we get this product from'
      }
    },

    // Available Product Types (for designs that come in multiple formats)
    {
      name: 'availableProductTypes',
      type: 'select',
      hasMany: true,
      required: true,
      options: [
        // Clothing
        { label: 'T-Shirt', value: 't-shirt' },
        { label: 'Baby T-Shirt', value: 'baby-tee' },
        { label: 'Hoodie', value: 'hoodie' },
        { label: 'Sweatshirt', value: 'sweatshirt' },
        { label: 'Tank Top', value: 'tank-top' },
        { label: 'Long Sleeve', value: 'long-sleeve' },
        
        // African Fashion
        { label: 'Dashiki', value: 'dashiki' },
        { label: 'Wrap Skirt', value: 'wrap-skirt' },
        { label: 'Wrap Dress', value: 'wrap-dress' },
        { label: 'Blouse', value: 'blouse' },
        { label: 'Kaftan', value: 'kaftan' },
        { label: 'Head Wrap', value: 'head-wrap' },
        
        // Jewelry
        { label: 'Necklace', value: 'necklace' },
        { label: 'Bracelet', value: 'bracelet' },
        { label: 'Earrings', value: 'earrings' },
        { label: 'Ring', value: 'ring' },
        { label: 'Anklet', value: 'anklet' },
        { label: 'Jewelry Set', value: 'jewelry-set' },
        
        // Accessories
        { label: 'Hat', value: 'hat' },
        { label: 'Cap', value: 'cap' },
        { label: 'Scarf', value: 'scarf' },
        { label: 'Bag', value: 'bag' },
        { label: 'Belt', value: 'belt' }
      ],
      admin: {
        description: 'What product types are available for this design/piece'
      }
    },

    // Available Colors
    {
      name: 'availableColors',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'colorName',
          type: 'text',
          required: true,
          admin: {
            description: 'Color name (e.g., "Black", "Rose Gold", "Natural Wood")'
          }
        },
        {
          name: 'colorCode',
          type: 'text',
          admin: {
            description: 'Hex color code (optional, for display)'
          }
        }
      ],
      admin: {
        description: 'Available colors for this item'
      }
    },

    // Available Sizes
    {
      name: 'availableSizes',
      type: 'select',
      hasMany: true,
      required: true,
      options: [
        // Standard clothing sizes
        { label: 'XS', value: 'xs' },
        { label: 'Small', value: 's' },
        { label: 'Medium', value: 'm' },
        { label: 'Large', value: 'l' },
        { label: 'XL', value: 'xl' },
        { label: '2XL', value: '2xl' },
        { label: '3XL', value: '3xl' },
        { label: '4XL', value: '4xl' },
        
        // Combined sizes (vendor style)
        { label: 'S/M', value: 's-m' },
        { label: 'L/XL', value: 'l-xl' },
        
        // Numbered women's sizes
        { label: 'Size 0', value: '0' },
        { label: 'Size 2', value: '2' },
        { label: 'Size 4', value: '4' },
        { label: 'Size 6', value: '6' },
        { label: 'Size 8', value: '8' },
        { label: 'Size 10', value: '10' },
        { label: 'Size 12', value: '12' },
        { label: 'Size 14', value: '14' },
        { label: 'Size 16', value: '16' },
        { label: 'Size 18', value: '18' },
        { label: 'Size 20', value: '20' },
        
        // Jewelry/accessory sizes
        { label: 'One Size', value: 'one-size' },
        { label: 'Adjustable', value: 'adjustable' },
        { label: 'Small (16-18 inches)', value: 'small-jewelry' },
        { label: 'Medium (18-20 inches)', value: 'medium-jewelry' },
        { label: 'Large (20-22 inches)', value: 'large-jewelry' },
        { label: 'N/A', value: 'na' }
      ],
      admin: {
        description: 'Available sizes for this item'
      }
    },

    // Materials (shared across clothing and jewelry)
    {
      name: 'materials',
      type: 'array',
      fields: [
        {
          name: 'material',
          type: 'select',
          options: [
            // Fabric materials
            { label: 'Cotton', value: 'cotton' },
            { label: 'Cotton Blend', value: 'cotton-blend' },
            { label: 'Polyester', value: 'polyester' },
            { label: 'Cotton/Polyester Blend', value: 'cotton-polyester' },
            { label: 'African Print Cotton', value: 'african-print-cotton' },
            { label: 'Kente Cloth', value: 'kente-cloth' },
            { label: 'Ankara Fabric', value: 'ankara-fabric' },
            { label: 'Mudcloth', value: 'mudcloth' },
            
            // Metal materials
            { label: 'Brass', value: 'brass' },
            { label: 'Copper', value: 'copper' },
            { label: 'Silver', value: 'silver' },
            { label: 'Gold', value: 'gold' },
            { label: 'Rose Gold', value: 'rose-gold' },
            { label: 'Stainless Steel', value: 'stainless-steel' },
            { label: 'Pewter', value: 'pewter' },
            
            // Natural materials
            { label: 'Leather', value: 'leather' },
            { label: 'Cotton Cord', value: 'cotton-cord' },
            { label: 'Hemp', value: 'hemp' },
            { label: 'Wood', value: 'wood' },
            { label: 'Bone', value: 'bone' },
            { label: 'Shell', value: 'shell' },
            { label: 'Stone', value: 'stone' },
            
            // Other
            { label: 'Glass', value: 'glass' },
            { label: 'Ceramic', value: 'ceramic' },
            { label: 'Plastic', value: 'plastic' },
            { label: 'Mixed Materials', value: 'mixed' },
            { label: 'Other', value: 'other' }
          ]
        },
        {
          name: 'customMaterial',
          type: 'text',
          admin: {
            condition: (data, siblingData) => siblingData?.material === 'other',
            description: 'Custom material name'
          }
        },
        {
          name: 'percentage',
          type: 'number',
          admin: {
            description: 'Percentage of this material (optional)'
          }
        }
      ],
      admin: {
        description: 'Materials used in this item'
      }
    },

    // Crystals/Gemstones (for jewelry and spiritual items)
    {
      name: 'crystals',
      type: 'array',
      admin: {
        condition: (data) => data?.primaryType === 'jewelry-piece' || data?.style === 'crystal-jewelry',
        description: 'Crystals/gemstones featured in this piece'
      },
      fields: [
        {
          name: 'crystal',
          type: 'text',
          required: true,
          admin: {
            description: 'Type of crystal/stone (e.g., "Amethyst", "Rose Quartz", "Tiger Eye")'
          }
        },
        {
          name: 'properties',
          type: 'textarea',
          admin: {
            description: 'Metaphysical properties, healing benefits, or cultural significance'
          }
        },
        {
          name: 'chakra',
          type: 'select',
          options: [
            { label: 'Root Chakra', value: 'root' },
            { label: 'Sacral Chakra', value: 'sacral' },
            { label: 'Solar Plexus Chakra', value: 'solar-plexus' },
            { label: 'Heart Chakra', value: 'heart' },
            { label: 'Throat Chakra', value: 'throat' },
            { label: 'Third Eye Chakra', value: 'third-eye' },
            { label: 'Crown Chakra', value: 'crown' },
            { label: 'All Chakras', value: 'all' }
          ],
          admin: {
            description: 'Associated chakra (if applicable)'
          }
        },
        {
          name: 'origin',
          type: 'text',
          admin: {
            description: 'Where the crystal was sourced from'
          }
        }
      ]
    },

    // Screen Print Details (for printed clothing)
    {
      name: 'printDetails',
      type: 'group',
      admin: {
        condition: (data) => data?.style === 'screen-printed' || data?.style === 'activist-message',
        description: 'Details for screen-printed items'
      },
      fields: [
        {
          name: 'message',
          type: 'text',
          admin: {
            description: 'The message/text on the item'
          }
        },
        {
          name: 'printLocation',
          type: 'select',
          hasMany: true,
          options: [
            { label: 'Front', value: 'front' },
            { label: 'Back', value: 'back' },
            { label: 'Sleeve', value: 'sleeve' },
            { label: 'Chest', value: 'chest' },
            { label: 'All Over', value: 'all-over' }
          ]
        },
        {
          name: 'printColors',
          type: 'array',
          fields: [
            {
              name: 'color',
              type: 'text'
            }
          ],
          admin: {
            description: 'Colors used in the print'
          }
        }
      ]
    },

    // African Print Details
    {
      name: 'africanPrintDetails',
      type: 'group',
      admin: {
        condition: (data) => data?.style === 'african-print' || data?.style === 'cultural-traditional',
        description: 'Details for African print items'
      },
      fields: [
        {
          name: 'printName',
          type: 'text',
          admin: {
            description: 'Name of the African print pattern (e.g., "Kente", "Ankara", "Mudcloth")'
          }
        },
        {
          name: 'origin',
          type: 'text',
          admin: {
            description: 'Cultural origin or region (e.g., "Ghana", "Nigeria", "West Africa")'
          }
        },
        {
          name: 'culturalSignificance',
          type: 'richText',
          admin: {
            description: 'Cultural meaning or significance of the pattern'
          }
        },
        {
          name: 'traditionalUse',
          type: 'textarea',
          admin: {
            description: 'Traditional use or ceremonial significance'
          }
        }
      ]
    },

    // Jewelry Specific Details
    {
      name: 'jewelryDetails',
      type: 'group',
      admin: {
        condition: (data) => data?.primaryType === 'jewelry-piece',
        description: 'Details specific to jewelry items'
      },
      fields: [
        {
          name: 'isHandmade',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Is this a handmade piece?'
          }
        },
        {
          name: 'isOneOff',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Is this a one-of-a-kind piece?'
          }
        },
        {
          name: 'artisan',
          type: 'text',
          admin: {
            description: 'Name of the artisan who made this piece'
          }
        },
        {
          name: 'length',
          type: 'text',
          admin: {
            description: 'Length/dimensions (e.g., "18 inches", "2.5 inch diameter")'
          }
        },
        {
          name: 'weight',
          type: 'text',
          admin: {
            description: 'Weight of the piece (if significant)'
          }
        },
        {
          name: 'chainType',
          type: 'select',
          admin: {
            condition: (data, siblingData) => {
              const types = data?.availableProductTypes || [];
              return types.includes('necklace') || types.includes('bracelet');
            }
          },
          options: [
            { label: 'Box Chain', value: 'box-chain' },
            { label: 'Cable Chain', value: 'cable-chain' },
            { label: 'Rope Chain', value: 'rope-chain' },
            { label: 'Snake Chain', value: 'snake-chain' },
            { label: 'Figaro Chain', value: 'figaro-chain' },
            { label: 'Cord', value: 'cord' },
            { label: 'Leather Cord', value: 'leather-cord' },
            { label: 'Other', value: 'other' }
          ]
        },
        {
          name: 'claspType',
          type: 'select',
          options: [
            { label: 'Lobster Claw', value: 'lobster-claw' },
            { label: 'Spring Ring', value: 'spring-ring' },
            { label: 'Toggle', value: 'toggle' },
            { label: 'Magnetic', value: 'magnetic' },
            { label: 'Hook & Eye', value: 'hook-eye' },
            { label: 'Adjustable/Sliding', value: 'adjustable' },
            { label: 'None', value: 'none' }
          ]
        }
      ]
    },

    // Care Instructions
    {
      name: 'careInstructions',
      type: 'richText',
      admin: {
        description: 'How to care for this item (washing, storage, etc.)'
      }
    },

    // Sizing Information
    {
      name: 'sizingNotes',
      type: 'textarea',
      admin: {
        description: 'Sizing notes, fit information, or measurement details'
      }
    },

    // Product Matrix/Variations
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
            description: 'Unique SKU for this specific combination'
          }
        },
        {
          name: 'productType',
          type: 'select',
          required: true,
          options: [
            { label: 'T-Shirt', value: 't-shirt' },
            { label: 'Baby T-Shirt', value: 'baby-tee' },
            { label: 'Hoodie', value: 'hoodie' },
            { label: 'Sweatshirt', value: 'sweatshirt' },
            { label: 'Tank Top', value: 'tank-top' },
            { label: 'Long Sleeve', value: 'long-sleeve' },
            { label: 'Dashiki', value: 'dashiki' },
            { label: 'Wrap Skirt', value: 'wrap-skirt' },
            { label: 'Wrap Dress', value: 'wrap-dress' },
            { label: 'Blouse', value: 'blouse' },
            { label: 'Kaftan', value: 'kaftan' },
            { label: 'Head Wrap', value: 'head-wrap' },
            { label: 'Necklace', value: 'necklace' },
            { label: 'Bracelet', value: 'bracelet' },
            { label: 'Earrings', value: 'earrings' },
            { label: 'Ring', value: 'ring' },
            { label: 'Anklet', value: 'anklet' },
            { label: 'Jewelry Set', value: 'jewelry-set' },
            { label: 'Hat', value: 'hat' },
            { label: 'Cap', value: 'cap' },
            { label: 'Scarf', value: 'scarf' },
            { label: 'Bag', value: 'bag' },
            { label: 'Belt', value: 'belt' }
          ],
          admin: {
            description: 'Product type for this variation'
          }
        },
        {
          name: 'size',
          type: 'select',
          required: true,
          options: [
            { label: 'XS', value: 'xs' },
            { label: 'Small', value: 's' },
            { label: 'Medium', value: 'm' },
            { label: 'Large', value: 'l' },
            { label: 'XL', value: 'xl' },
            { label: '2XL', value: '2xl' },
            { label: '3XL', value: '3xl' },
            { label: '4XL', value: '4xl' },
            { label: 'S/M', value: 's-m' },
            { label: 'L/XL', value: 'l-xl' },
            { label: 'Size 0', value: '0' },
            { label: 'Size 2', value: '2' },
            { label: 'Size 4', value: '4' },
            { label: 'Size 6', value: '6' },
            { label: 'Size 8', value: '8' },
            { label: 'Size 10', value: '10' },
            { label: 'Size 12', value: '12' },
            { label: 'Size 14', value: '14' },
            { label: 'Size 16', value: '16' },
            { label: 'Size 18', value: '18' },
            { label: 'Size 20', value: '20' },
            { label: 'One Size', value: 'one-size' },
            { label: 'Adjustable', value: 'adjustable' },
            { label: 'Small (16-18")', value: 'small-jewelry' },
            { label: 'Medium (18-20")', value: 'medium-jewelry' },
            { label: 'Large (20-22")', value: 'large-jewelry' },
            { label: 'N/A', value: 'na' }
          ],
          admin: {
            description: 'Size for this variation'
          }
        },
        {
          name: 'color',
          type: 'text',
          required: true,
          admin: {
            description: 'Color for this variation (should match available colors)'
          }
        },
        {
          name: 'materialVariation',
          type: 'text',
          admin: {
            description: 'Specific material for this variation (e.g., "Brass", "Rose Gold")'
          }
        },
        {
          name: 'crystalVariation',
          type: 'text',
          admin: {
            description: 'Featured crystal for this variation (if applicable)'
          }
        },
        {
          name: 'customVariationName',
          type: 'text',
          admin: {
            description: 'Custom name for this variation (e.g., "Red Hoodie Large", "Brass Amethyst")'
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
        description: 'Specific product variations (Type × Size × Color × Material combinations)'
      }
    },

    // Categorization
    {
      name: 'categories',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Clothing', value: 'clothing' },
        { label: 'African Fashion', value: 'african-fashion' },
        { label: 'Jewelry', value: 'jewelry' },
        { label: 'Crystal Jewelry', value: 'crystal-jewelry' },
        { label: 'Handmade Jewelry', value: 'handmade-jewelry' },
        { label: 'Accessories', value: 'accessories' },
        { label: 'Activist Wear', value: 'activist-wear' },
        { label: 'Cultural Wear', value: 'cultural-wear' },
        { label: 'Spiritual Jewelry', value: 'spiritual-jewelry' },
        { label: 'Casual Fashion', value: 'casual-fashion' },
        { label: 'Statement Pieces', value: 'statement-pieces' },
        { label: 'Gift Items', value: 'gift-items' },
        { label: 'Men\'s Fashion', value: 'mens-fashion' },
        { label: 'Women\'s Fashion', value: 'womens-fashion' },
        { label: 'Unisex', value: 'unisex' }
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
            description: 'e.g., "black lives matter", "healing stones", "handmade", "one of a kind"'
          }
        }
      ],
      admin: {
        description: 'Custom tags for organization and search'
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
            { label: 'Black Pride Collection', value: 'black-pride-collection' },
            { label: 'African Heritage', value: 'african-heritage' },
            { label: 'Activist Wear', value: 'activist-wear' },
            { label: 'Handmade Jewelry', value: 'handmade-jewelry' },
            { label: 'Crystal Collection', value: 'crystal-collection' },
            { label: 'Cultural Fashion', value: 'cultural-fashion' },
            { label: 'Chakra Jewelry', value: 'chakra-jewelry' },
            { label: 'Statement Pieces', value: 'statement-pieces' },
            { label: 'New Arrivals', value: 'new-arrivals' },
            { label: 'Bestsellers', value: 'bestsellers' },
            { label: 'Gift Guide', value: 'gift-guide' },
            { label: 'Staff Picks', value: 'staff-picks' },
            { label: 'Sale Items', value: 'sale-items' },
            { label: 'One of a Kind', value: 'one-of-a-kind' },
            { label: 'Healing Stones', value: 'healing-stones' },
            { label: 'Protection Jewelry', value: 'protection-jewelry' }
          ]
        }
      ],
      admin: {
        description: 'Add to curated collections'
      }
    },

    // Target Demographics
    {
      name: 'targetAudience',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Men', value: 'men' },
        { label: 'Women', value: 'women' },
        { label: 'Unisex', value: 'unisex' },
        { label: 'Children', value: 'children' },
        { label: 'Plus Size', value: 'plus-size' },
        { label: 'Young Adults', value: 'young-adults' },
        { label: 'Activists', value: 'activists' },
        { label: 'Culture Enthusiasts', value: 'culture-enthusiasts' },
        { label: 'Crystal Lovers', value: 'crystal-lovers' },
        { label: 'Spiritual Seekers', value: 'spiritual-seekers' }
      ],
      admin: {
        description: 'Target audience for this item'
      }
    },

    // Brand/Designer/Artisan
    {
      name: 'brand',
      type: 'text',
      admin: {
        description: 'Brand or designer name (if applicable)'
      }
    },

    // Images
    {
      name: 'images',
      type: 'array',
      maxRows: 8,
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
            description: 'Which variation this image shows (e.g., "Red Large T-Shirt", "Brass Amethyst Necklace")'
          }
        }
      ],
      admin: {
        description: 'Product images (max 8 - more needed for jewelry close-ups and clothing variations)'
      }
    },

    // External image URLs (e.g., Cloudflare R2)
    {
      name: 'scrapedImageUrls',
      type: 'array',
      fields: [
        {
          name: 'url',
          type: 'text',
        },
      ],
      admin: {
        description: 'External image URLs for imported products'
      }
    },

    // Related Products
    {
      name: 'relatedProducts',
      type: 'relationship',
      relationTo: 'fashion-jewelry' as any,
      hasMany: true,
      admin: {
        description: 'Similar or complementary fashion/jewelry items'
      }
    },
    {
      name: 'complementaryProducts',
      type: 'relationship',
      relationTo: ['fashion-jewelry', 'books'] as any,
      hasMany: true,
      admin: {
        description: 'Products that go well with this item'
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
        { label: 'Vendor Catalog', value: 'vendor-catalog' },
        { label: 'Artisan Direct', value: 'artisan-direct' }
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

        // Auto-generate keywords from crystals, materials, tags, and categories
        if (!data.seo?.keywords) {
          const keywords = [];
          
          // Add crystals
          if (data.crystals) {
            keywords.push(...data.crystals.map((c: any) => c.crystal));
          }
          
          // Add materials
          if (data.materials) {
            keywords.push(...data.materials.map((m: any) => m.material));
          }
          
          // Add tags
          if (data.tags) {
            keywords.push(...data.tags.map((t: any) => t.tag));
          }
          
          // Add categories
          if (data.categories) {
            keywords.push(...data.categories);
          }
          
          // Add style
          if (data.style) {
            keywords.push(data.style);
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

export default FashionJewelry;
