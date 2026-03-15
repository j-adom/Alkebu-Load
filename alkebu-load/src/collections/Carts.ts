import type { CollectionConfig } from 'payload';

export const Carts: CollectionConfig = {
  slug: 'carts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'sessionId', 'status', 'totalAmount', 'lastActivity'],
    group: 'E-Commerce',
  },
  access: {
    read: ({ req: { user } }) => {
      if ((user as any)?.role === 'admin') return true;
      if (user) return { user: { equals: user.id } }; // Only owner can read their cart
      return false;
    },
    create: () => true,
    update: ({ req: { user } }) => {
      if ((user as any)?.role === 'admin') return true;
      if (user) return { user: { equals: user.id } };
      return false;
    },
    delete: ({ req: { user } }) => {
      if ((user as any)?.role === 'admin') return true;
      if (user) return { user: { equals: user.id } };
      return false;
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Cart owner (null for guest carts)',
      },
    },
    {
      name: 'sessionId',
      type: 'text',
      required: true,
      admin: {
        description: 'Session identifier for guest carts',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Checkout', value: 'checkout' },
        { label: 'Abandoned', value: 'abandoned' },
        { label: 'Converted', value: 'converted' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    {
      name: 'items',
      type: 'relationship',
      relationTo: 'cart-items',
      hasMany: true,
      admin: {
        description: 'Items in this cart',
      },
    },
    {
      name: 'totalAmount',
      type: 'number',
      admin: {
        description: 'Total cart value in cents',
        step: 1,
      },
    },
    {
      name: 'totalTax',
      type: 'number',
      admin: {
        description: 'Total tax amount in cents',
        step: 1,
      },
    },
    {
      name: 'shippingAmount',
      type: 'number',
      admin: {
        description: 'Shipping cost in cents',
        step: 1,
      },
    },
    {
      name: 'shippingAddress',
      type: 'group',
      fields: [
        { name: 'firstName', type: 'text' },
        { name: 'lastName', type: 'text' },
        { name: 'company', type: 'text' },
        { name: 'street', type: 'text' },
        { name: 'street2', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'zip', type: 'text' },
        { name: 'country', type: 'text', defaultValue: 'US' },
        { name: 'phone', type: 'text' },
      ],
    },
    {
      name: 'selectedShippingRateId',
      type: 'text',
      admin: {
        description: 'Locked shipping quote ID selected during checkout',
      },
    },
    {
      name: 'shippingCarrier',
      type: 'text',
      admin: {
        description: 'Carrier for the selected shipping quote',
      },
    },
    {
      name: 'shippingService',
      type: 'text',
      admin: {
        description: 'Service name for the selected shipping quote',
      },
    },
    {
      name: 'shippingMethod',
      type: 'text',
      admin: {
        description: 'Normalized shipping method code',
      },
    },
    {
      name: 'shippingQuoteSource',
      type: 'text',
      admin: {
        description: 'Source of the selected shipping quote (shippo or fallback)',
      },
    },
    {
      name: 'shippingQuoteExpiresAt',
      type: 'date',
      admin: {
        description: 'When the selected shipping quote expires',
      },
    },
    {
      name: 'shippingQuoteFingerprint',
      type: 'text',
      admin: {
        description: 'Hash of cart items + shipping address when quote was generated',
      },
    },
    {
      name: 'shippingEstimatedDays',
      type: 'number',
      admin: {
        description: 'Estimated delivery days for the selected quote',
      },
    },
    {
      name: 'taxExempt',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Tax-exempt status for institutional accounts',
      },
    },
    {
      name: 'lastActivity',
      type: 'date',
      admin: {
        description: 'Last time cart was modified',
      },
    },
    {
      name: 'abandonedEmailSent',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether abandoned cart email was sent',
      },
    },
    {
      name: 'abandonedEmailSentAt',
      type: 'date',
      admin: {
        description: 'When abandoned cart email was sent',
        condition: (data) => data.abandonedEmailSent,
      },
    },
    {
      name: 'guestEmail',
      type: 'email',
      admin: {
        description: 'Email for guest checkouts and abandoned cart recovery',
        condition: (data) => !data.user,
      },
    },
    {
      name: 'stripeSessionId',
      type: 'text',
      admin: {
        description: 'Stripe checkout session ID',
      },
    },
    {
      name: 'provider',
      type: 'text',
      admin: {
        description: 'Payment provider handling checkout',
      },
    },
    {
      name: 'providerPaymentId',
      type: 'text',
      admin: {
        description: 'Provider payment/checkout identifier',
      },
    },
    {
      name: 'providerOrderId',
      type: 'text',
      admin: {
        description: 'Provider order identifier when checkout creates an order before payment completion',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal notes about this cart',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        data.lastActivity = new Date().toISOString();
        return data;
      },
    ],
  },
  timestamps: true,
};
