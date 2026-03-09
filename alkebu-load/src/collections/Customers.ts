import type { CollectionConfig } from 'payload';

export const Customers: CollectionConfig = {
  slug: 'customers',
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: ['email', 'firstName', 'lastName', 'totalOrders', 'totalSpent'],
    group: 'E-Commerce',
  },
  auth: {
    tokenExpiration: 7200, // 2 hours
    verify: true,
    maxLoginAttempts: 5,
    lockTime: 600000, // 10 minutes
  },
  access: {
    read: ({ req: { user } }) => {
      if ((user as any)?.role === 'admin') return true;
      if (user) return { id: { equals: user.id } };
      return false;
    },
    create: () => true,
    update: ({ req: { user }, id }) => {
      if ((user as any)?.role === 'admin') return true;
      return user?.id === id;
    },
    delete: ({ req: { user } }) => (user as any)?.role === 'admin',
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
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
      name: 'displayName',
      type: 'text',
      admin: {
        description: 'Auto-generated from first + last name',
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            if (data?.firstName && data?.lastName) {
              return `${data.firstName} ${data.lastName}`;
            }
            return data?.displayName;
          },
        ],
      },
    },
    {
      name: 'phone',
      type: 'text',
      admin: {
        description: 'Primary phone number',
      },
    },
    {
      name: 'dateOfBirth',
      type: 'date',
      admin: {
        description: 'For age verification and marketing',
      },
    },
    {
      name: 'shippingAddresses',
      type: 'array',
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
          name: 'company',
          type: 'text',
        },
        {
          name: 'street',
          type: 'text',
          required: true,
        },
        {
          name: 'street2',
          type: 'text',
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
    {
      name: 'preferences',
      type: 'group',
      fields: [
        {
          name: 'marketingEmails',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Opt-in for marketing emails',
          },
        },
        {
          name: 'newsletterSubscribed',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'smsNotifications',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'favoriteGenres',
          type: 'relationship',
          relationTo: 'books',
          hasMany: true,
          admin: {
            description: 'Preferred book genres for recommendations',
          },
        },
        {
          name: 'language',
          type: 'select',
          defaultValue: 'en',
          options: [
            { label: 'English', value: 'en' },
            { label: 'Spanish', value: 'es' },
            { label: 'French', value: 'fr' },
          ],
        },
      ],
    },
    {
      name: 'loyaltyStatus',
      type: 'group',
      fields: [
        {
          name: 'points',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Loyalty points balance',
          },
        },
        {
          name: 'tier',
          type: 'select',
          defaultValue: 'bronze',
          options: [
            { label: 'Bronze', value: 'bronze' },
            { label: 'Silver', value: 'silver' },
            { label: 'Gold', value: 'gold' },
            { label: 'VIP', value: 'vip' },
          ],
        },
        {
          name: 'squareCustomerId',
          type: 'text',
          admin: {
            description: 'Square customer ID for loyalty sync',
          },
        },
      ],
    },
    {
      name: 'accountStatus',
      type: 'group',
      fields: [
        {
          name: 'isActive',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'taxExempt',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Tax-exempt status for institutions',
          },
        },
        {
          name: 'taxExemptNumber',
          type: 'text',
          admin: {
            condition: (data) => data.accountStatus?.taxExempt,
            description: 'Tax exemption certificate number',
          },
        },
        {
          name: 'institution',
          type: 'relationship',
          relationTo: 'institutional-accounts',
          admin: {
            condition: (data) => data.accountStatus?.taxExempt,
            description: 'Associated institutional account',
          },
        },
      ],
    },
    {
      name: 'orderHistory',
      type: 'group',
      fields: [
        {
          name: 'totalOrders',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Total number of orders placed',
          },
        },
        {
          name: 'totalSpent',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Total amount spent (cents)',
          },
        },
        {
          name: 'firstOrderDate',
          type: 'date',
          admin: {
            description: 'Date of first order',
          },
        },
        {
          name: 'lastOrderDate',
          type: 'date',
          admin: {
            description: 'Date of most recent order',
          },
        },
        {
          name: 'averageOrderValue',
          type: 'number',
          admin: {
            description: 'Average order value (cents)',
          },
        },
      ],
    },
    {
      name: 'socialAuth',
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
          name: 'facebookId',
          type: 'text',
          admin: {
            description: 'Facebook OAuth ID',
          },
        },
        {
          name: 'profileImage',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Profile picture',
          },
        },
      ],
    },
    {
      name: 'cart',
      type: 'json',
      admin: {
        hidden: true,
        description: 'Current shopping cart (stored as JSON for performance)',
      },
    },
    {
      name: 'wishlist',
      type: 'json',
      admin: {
        hidden: true,
        description: 'Customer wishlist (stored as JSON)',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal staff notes about this customer',
      },
    },
  ],
  timestamps: true,
};