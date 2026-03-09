import type { CollectionConfig } from 'payload';

export const CartItems: CollectionConfig = {
  slug: 'cart-items',
  admin: {
    useAsTitle: 'productTitle',
    defaultColumns: ['product', 'quantity', 'unitPrice', 'totalPrice'],
    group: 'E-Commerce',
  },
  access: {
    read: ({ req: { user } }) => {
      if ((user as any)?.role === 'admin') return true;
      return false; // Cart items are accessed through cart operations
    },
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'cart',
      type: 'relationship',
      relationTo: 'carts',
      required: true,
      admin: {
        description: 'Parent cart for this item',
      },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: ['books', 'wellness-lifestyle', 'fashion-jewelry', 'oils-incense'],
      required: true,
      admin: {
        description: 'Product being purchased',
      },
    },
    {
      name: 'productType',
      type: 'text',
      required: true,
      admin: {
        description: 'Type of product (books, wellness-lifestyle, etc.)',
      },
    },
    {
      name: 'productTitle',
      type: 'text',
      required: true,
      admin: {
        description: 'Product title at time of adding to cart',
      },
    },
    {
      name: 'quantity',
      type: 'number',
      required: true,
      min: 1,
      defaultValue: 1,
    },
    {
      name: 'unitPrice',
      type: 'number',
      required: true,
      admin: {
        description: 'Price per unit in cents',
        step: 1,
      },
    },
    {
      name: 'totalPrice',
      type: 'number',
      required: true,
      admin: {
        description: 'Total price for this line item in cents',
        step: 1,
      },
    },
    {
      name: 'discountApplied',
      type: 'number',
      admin: {
        description: 'Discount amount in cents',
        step: 1,
      },
    },
    {
      name: 'stripePriceId',
      type: 'text',
      admin: {
        description: 'Stripe price ID for this item',
      },
    },
    {
      name: 'customization',
      type: 'group',
      fields: [
        {
          name: 'giftWrap',
          type: 'checkbox',
          admin: {
            description: 'Gift wrapping requested',
          },
        },
        {
          name: 'giftMessage',
          type: 'textarea',
          admin: {
            description: 'Gift message if applicable',
          },
        },
        {
          name: 'personalNote',
          type: 'textarea',
          admin: {
            description: 'Special instructions or personalization',
          },
        },
      ],
    },
    {
      name: 'availability',
      type: 'group',
      fields: [
        {
          name: 'inStock',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Item was in stock when added to cart',
          },
        },
        {
          name: 'stockLevel',
          type: 'number',
          admin: {
            description: 'Stock level when added to cart',
          },
        },
        {
          name: 'estimatedShipDate',
          type: 'date',
          admin: {
            description: 'Estimated shipping date if backordered',
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Calculate total price
        if (data.quantity && data.unitPrice) {
          data.totalPrice = data.quantity * data.unitPrice;
          if (data.discountApplied) {
            data.totalPrice -= data.discountApplied;
          }
        }
        return data;
      },
    ],
  },
  timestamps: true,
};