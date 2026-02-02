// collections/Users.ts
import type { CollectionConfig } from 'payload';

const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  fields: [
    // === BASIC PROFILE ===
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'firstName',
      type: 'text',
      admin: {
        description: 'First name (synced from Square if available)',
      },
    },
    {
      name: 'lastName',
      type: 'text',
      admin: {
        description: 'Last name (synced from Square if available)',
      },
    },
    {
      name: 'phone',
      type: 'text',
      admin: {
        description: 'Primary phone number (synced from Square if available)',
      },
    },
    
    // === ROLES & PERMISSIONS ===
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Customer', value: 'customer' },
        { label: 'Editor', value: 'editor' },
        { label: 'Staff', value: 'staff' },
      ],
      defaultValue: 'customer',
      required: true,
    },
    
    // === AUTHENTICATION ===
    {
      name: 'emailVerified',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether the user has verified their email address',
      },
    },
    {
      name: 'oauthAccounts',
      type: 'group',
      fields: [
        {
          name: 'googleId',
          type: 'text',
          admin: {
            description: 'Google OAuth ID',
          },
        },
        {
          name: 'googleProfile',
          type: 'json',
          admin: {
            description: 'Google profile data',
          },
        },
        {
          name: 'facebookId',
          type: 'text',
          admin: {
            description: 'Facebook OAuth ID',
          },
        },
        {
          name: 'facebookProfile',
          type: 'json',
          admin: {
            description: 'Facebook profile data',
          },
        },
      ],
    },
    
    // === SQUARE POS INTEGRATION ===
    {
      name: 'square',
      type: 'group',
      admin: {
        description: 'Square POS integration - automatically synced',
      },
      fields: [
        {
          name: 'customerId',
          type: 'text',
          unique: true,
          admin: {
            readOnly: true,
            description: 'Square customer ID',
          },
        },
        {
          name: 'loyaltyId',
          type: 'text',
          admin: {
            readOnly: true,
            description: 'Square loyalty account ID',
          },
        },
        {
          name: 'lastSync',
          type: 'date',
          admin: {
            readOnly: true,
            description: 'Last successful Square data sync',
          },
        },
      ],
    },
    
    // === LOYALTY & STATS ===
    {
      name: 'loyaltyPoints',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Current loyalty points (synced from Square)',
        readOnly: true,
      },
    },
    {
      name: 'stats',
      type: 'group',
      admin: {
        description: 'Auto-calculated from order history',
      },
      fields: [
        {
          name: 'totalSpent',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Lifetime spending across all orders',
          },
        },
        {
          name: 'orderCount',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Total number of orders placed',
          },
        },
        {
          name: 'lastOrderDate',
          type: 'date',
          admin: {
            readOnly: true,
            description: 'Date of most recent order',
          },
        },
        {
          name: 'averageOrderValue',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Average order value (totalSpent / orderCount)',
          },
        },
      ],
    },
    
    // === PURCHASE & ENGAGEMENT HISTORY ===
    {
      name: 'orders',
      type: 'relationship',
      relationTo: 'orders',
      hasMany: true,
      admin: {
        readOnly: true,
        description: 'Order history (auto-populated)',
        condition: (data) => data.role === 'customer',
      },
    },
    {
      name: 'comments',
      type: 'relationship',
      relationTo: 'comments',
      hasMany: true,
      admin: {
        readOnly: true,
        description: 'Comment history (auto-populated)',
      },
    },
    {
      name: 'reviews',
      type: 'relationship',
      relationTo: 'reviews',
      hasMany: true,
      admin: {
        readOnly: true,
        description: 'Product/business reviews (auto-populated)',
      },
    },
    {
      name: 'wishlists',
      type: 'relationship',
      relationTo: ['books', 'wellness-lifestyle', 'fashion-jewelry', 'oils-incense'],
      hasMany: true,
      admin: {
        description: 'Saved products for later (wishlist/favorites)',
        condition: (data) => data.role === 'customer',
      },
    },
    
    // === ADDRESSES ===
    {
      name: 'shippingAddresses',
      type: 'array',
      admin: {
        condition: (data) => data.role === 'customer',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: {
            description: 'Address label (Home, Work, etc.)',
          },
        },
        {
          name: 'isDefault',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'firstName',
          type: 'text',
          required: true,
        },
        {
          name: 'lastName',
          type: 'text',
          required: true,
        },
        {
          name: 'street',
          type: 'text',
          required: true,
        },
        {
          name: 'apartment',
          type: 'text',
          admin: {
            description: 'Apartment, suite, unit, etc.',
          },
        },
        {
          name: 'city',
          type: 'text',
          required: true,
        },
        {
          name: 'state',
          type: 'text',
          required: true,
        },
        {
          name: 'zip',
          type: 'text',
          required: true,
        },
        {
          name: 'country',
          type: 'text',
          defaultValue: 'US',
        },
        {
          name: 'phone',
          type: 'text',
        },
      ],
    },
    
    // === TAX & INSTITUTIONAL ===
    {
      name: 'taxExempt',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        condition: (data) => data.role === 'customer',
        description: 'Tax-exempt status for institutional customers',
      },
    },
    {
      name: 'institution',
      type: 'relationship',
      relationTo: 'institutional-accounts',
      admin: {
        condition: (data) => data.taxExempt && data.role === 'customer',
        description: 'Associated institutional account',
      },
    },
    
    // === PREFERENCES & SETTINGS ===
    {
      name: 'preferences',
      type: 'group',
      admin: {
        condition: (data) => data.role === 'customer',
      },
      fields: [
        {
          name: 'emailOptIn',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Opt-in for marketing emails',
          },
        },
        {
          name: 'smsOptIn',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Opt-in for SMS notifications',
          },
        },
        {
          name: 'favoriteCategories',
          type: 'select',
          hasMany: true,
          options: [
            { label: 'Fiction', value: 'fiction' },
            { label: 'Non-Fiction', value: 'non-fiction' },
            { label: 'Poetry', value: 'poetry' },
            { label: 'Wellness', value: 'wellness' },
            { label: 'Fashion', value: 'fashion' },
            { label: 'Spiritual', value: 'spiritual' },
          ],
          admin: {
            description: 'Preferred product categories for recommendations',
          },
        },
      ],
    },
    
    // === METADATA ===
    {
      name: 'source',
      type: 'select',
      options: [
        { label: 'Online', value: 'online' },
        { label: 'In-Store', value: 'in-store' },
        { label: 'Both', value: 'both' },
      ],
      defaultValue: 'online',
      admin: {
        readOnly: true,
        description: 'How the customer was acquired',
      },
    },
    {
      name: 'customerNotes',
      type: 'textarea',
      admin: {
        description: 'Internal staff notes about this customer',
        condition: (data, siblingData, { user }) => user?.role === 'admin' || user?.role === 'staff',
      },
    },
  ],
  
  // === HOOKS ===
  hooks: {
    afterChange: [
      // Auto-calculate stats when orders relationship changes
      async ({ doc, req, operation, previousDoc }) => {
        // Only recalculate for customers with orders
        if (doc.role !== 'customer' || !doc.orders || doc.orders.length === 0) {
          return doc;
        }
        
        // Skip if orders haven't changed
        if (operation === 'update' && 
            JSON.stringify(previousDoc?.orders) === JSON.stringify(doc.orders)) {
          return doc;
        }
        
        try {
          // Fetch full order details
          const orders = await req.payload.find({
            collection: 'orders',
            where: {
              customer: {
                equals: doc.id,
              },
            },
            limit: 1000, // Adjust based on expected max orders per customer
            sort: '-createdAt',
          });
          
          // Calculate stats
          const totalSpent = orders.docs.reduce((sum, order) => {
            return sum + (order.total || 0);
          }, 0);
          
          const orderCount = orders.docs.length;
          const lastOrderDate = orders.docs[0]?.createdAt || null;
          const averageOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
          
          // Update user stats
          await req.payload.update({
            collection: 'users',
            id: doc.id,
            data: {
              stats: {
                totalSpent,
                orderCount,
                lastOrderDate,
                averageOrderValue,
              },
            },
          });
          
          console.log(`Updated stats for user ${doc.email}: ${orderCount} orders, $${totalSpent.toFixed(2)} total`);
        } catch (error) {
          console.error(`Error calculating stats for user ${doc.id}:`, error);
        }
        
        return doc;
      },
      
      // Update source field based on Square and online activity
      async ({ doc, req, operation }) => {
        if (operation === 'update') {
          let newSource = doc.source;
          
          const hasSquareId = !!doc.square?.customerId;
          const hasOnlineOrders = doc.orders?.length > 0;
          
          if (hasSquareId && hasOnlineOrders) {
            newSource = 'both';
          } else if (hasSquareId) {
            newSource = 'in-store';
          } else if (hasOnlineOrders) {
            newSource = 'online';
          }
          
          if (newSource !== doc.source) {
            await req.payload.update({
              collection: 'users',
              id: doc.id,
              data: { source: newSource },
            });
          }
        }
        
        return doc;
      },
    ],
  },
  
  // === ACCESS CONTROL ===
  access: {
    // Customers can read their own data, admins can read all
    read: ({ req: { user } }) => {
      if (user?.role === 'admin' || user?.role === 'staff') {
        return true;
      }
      
      if (user) {
        return {
          id: {
            equals: user.id,
          },
        };
      }
      
      return false;
    },
    
    // Customers can update their own data (except computed fields)
    update: ({ req: { user } }) => {
      if (user?.role === 'admin') {
        return true;
      }
      
      if (user) {
        return {
          id: {
            equals: user.id,
          },
        };
      }
      
      return false;
    },
    
    // Only admins can delete users
    delete: ({ req: { user } }) => {
      return user?.role === 'admin';
    },
  },
};

export default Users;