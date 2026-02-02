import type { CollectionConfig } from 'payload'

const Vendors: CollectionConfig = {
  slug: 'vendors',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'isActive', 'productCount'],
    group: 'Business'
  },
  fields: [
    // Basic Vendor Information
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Vendor or supplier name'
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
    
    // Vendor Type
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Distributor', value: 'distributor' },
        { label: 'Wholesaler', value: 'wholesaler' },
        { label: 'Direct Manufacturer', value: 'manufacturer' },
        { label: 'Dropshipper', value: 'dropshipper' },
        { label: 'Local Supplier', value: 'local' },
        { label: 'International Supplier', value: 'international' }
      ],
      admin: {
        description: 'Type of vendor relationship'
      }
    },
    
    // Contact Information
    {
      name: 'contact',
      type: 'group',
      fields: [
        {
          name: 'email',
          type: 'email',
          admin: {
            description: 'Primary contact email'
          }
        },
        {
          name: 'phone',
          type: 'text',
          admin: {
            description: 'Primary contact phone'
          }
        },
        {
          name: 'website',
          type: 'text',
          admin: {
            description: 'Vendor website URL'
          }
        },
        {
          name: 'contactPerson',
          type: 'text',
          admin: {
            description: 'Primary contact person name'
          }
        }
      ]
    },
    
    // Address Information
    {
      name: 'address',
      type: 'group',
      fields: [
        {
          name: 'street',
          type: 'text'
        },
        {
          name: 'city',
          type: 'text'
        },
        {
          name: 'state',
          type: 'text'
        },
        {
          name: 'postalCode',
          type: 'text'
        },
        {
          name: 'country',
          type: 'text',
          defaultValue: 'United States'
        }
      ]
    },
    
    // Business Terms
    {
      name: 'terms',
      type: 'group',
      fields: [
        {
          name: 'paymentTerms',
          type: 'select',
          options: [
            { label: 'Net 15', value: 'net-15' },
            { label: 'Net 30', value: 'net-30' },
            { label: 'Net 60', value: 'net-60' },
            { label: 'COD', value: 'cod' },
            { label: 'Prepaid', value: 'prepaid' },
            { label: 'Credit Card', value: 'credit-card' }
          ],
          admin: {
            description: 'Payment terms with this vendor'
          }
        },
        {
          name: 'minimumOrder',
          type: 'number',
          admin: {
            description: 'Minimum order amount ($)'
          }
        },
        {
          name: 'shippingTerms',
          type: 'select',
          options: [
            { label: 'FOB Origin', value: 'fob-origin' },
            { label: 'FOB Destination', value: 'fob-destination' },
            { label: 'Free Shipping', value: 'free-shipping' },
            { label: 'Flat Rate', value: 'flat-rate' }
          ]
        },
        {
          name: 'leadTime',
          type: 'text',
          admin: {
            description: 'Typical lead time for orders (e.g., "2-3 business days")'
          }
        }
      ]
    },
    
    // Performance Metrics
    {
      name: 'metrics',
      type: 'group',
      fields: [
        {
          name: 'rating',
          type: 'number',
          min: 1,
          max: 5,
          admin: {
            description: 'Vendor performance rating (1-5 stars)'
          }
        },
        {
          name: 'onTimeDelivery',
          type: 'number',
          min: 0,
          max: 100,
          admin: {
            description: 'On-time delivery percentage'
          }
        },
        {
          name: 'qualityRating',
          type: 'number',
          min: 1,
          max: 5,
          admin: {
            description: 'Product quality rating (1-5 stars)'
          }
        }
      ]
    },
    
    // Categories
    {
      name: 'categories',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Books', value: 'books' },
        { label: 'Wellness & Lifestyle', value: 'wellness-lifestyle' },
        { label: 'Fashion & Jewelry', value: 'fashion-jewelry' },
        { label: 'Art & Culture', value: 'art-culture' },
        { label: 'Home & Garden', value: 'home-garden' },
        { label: 'Electronics', value: 'electronics' },
        { label: 'Health & Beauty', value: 'health-beauty' },
        { label: 'Food & Beverages', value: 'food-beverages' }
      ],
      admin: {
        description: 'Product categories this vendor supplies'
      }
    },
    
    // Notes and Documentation
    {
      name: 'notes',
      type: 'richText',
      admin: {
        description: 'Internal notes about this vendor'
      }
    },
    
    // Status
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Is this vendor currently active?'
      }
    },
    {
      name: 'isPrimary',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Is this a primary/preferred vendor?'
      }
    },
    
    // Virtual field for product count
    {
      name: 'productCount',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Number of products from this vendor (automatically calculated)'
      }
    }
  ],
  
  // Endpoints for custom functionality
  endpoints: [
    {
      path: '/:id/products',
      method: 'get',
      handler: async (req, res, next) => {
        try {
          const { id } = req.params
          const { payload } = req
          
          // Find all products from this vendor across different collections
          const [books, wellness, fashion] = await Promise.all([
            payload.find({
              collection: 'books',
              where: { vendor: { equals: id } },
              limit: 100
            }),
            payload.find({
              collection: 'wellness-lifestyle',
              where: { vendor: { equals: id } },
              limit: 100
            }),
            payload.find({
              collection: 'fashion-jewelry',
              where: { vendor: { equals: id } },
              limit: 100
            })
          ])
          
          const allProducts = [
            ...books.docs.map(p => ({ ...p, collection: 'books' })),
            ...wellness.docs.map(p => ({ ...p, collection: 'wellness-lifestyle' })),
            ...fashion.docs.map(p => ({ ...p, collection: 'fashion-jewelry' }))
          ]
          
          res.json({
            vendor: id,
            totalProducts: allProducts.length,
            products: allProducts
          })
        } catch (error) {
          next(error)
        }
      }
    }
  ],
  
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (!data || (operation !== 'create' && operation !== 'update')) {
          return
        }
        
        // Auto-generate contact person from name if not provided
        if (!data.contact?.contactPerson && data.name) {
          data.contact = { 
            ...data.contact, 
            contactPerson: `${data.name} Representative` 
          }
        }
      }
    ]
  }
}

export default Vendors