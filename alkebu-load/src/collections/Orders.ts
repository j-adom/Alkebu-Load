import type { CollectionConfig } from 'payload';
import { sendOrderStatusUpdate } from '../app/utils/emailService';

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'customer', 'status', 'totalAmount', 'createdAt'],
    group: 'E-Commerce',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') return true;
      if (user) return { customer: { equals: user.id } };
      return false;
    },
    create: () => true,
    update: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'staff',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique order identifier',
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      admin: {
        description: 'Customer who placed the order',
      },
    },
    {
      name: 'guestEmail',
      type: 'email',
      admin: {
        description: 'Email for guest checkout orders',
        condition: (data) => !data.customer,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending Payment', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Processing', value: 'processing' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Returned', value: 'returned' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: ['books', 'wellness-lifestyle', 'fashion-jewelry', 'oils-incense'],
          required: true,
        },
        {
          name: 'productType',
          type: 'text',
          required: true,
        },
        {
          name: 'productTitle',
          type: 'text',
          required: true,
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'unitPrice',
          type: 'number',
          required: true,
          admin: {
            description: 'Price per unit in cents',
          },
        },
        {
          name: 'totalPrice',
          type: 'number',
          required: true,
          admin: {
            description: 'Total price for this line item in cents',
          },
        },
        {
          name: 'stripePriceId',
          type: 'text',
        },
        {
          name: 'customization',
          type: 'group',
          fields: [
            { name: 'giftWrap', type: 'checkbox' },
            { name: 'giftMessage', type: 'textarea' },
            { name: 'personalNote', type: 'textarea' },
          ],
        },
      ],
    },
    {
      name: 'subtotalAmount',
      type: 'number',
      required: true,
      admin: {
        description: 'Subtotal before tax and shipping (cents)',
      },
    },
    {
      name: 'taxAmount',
      type: 'number',
      required: true,
      admin: {
        description: 'Total tax amount (cents)',
      },
    },
    {
      name: 'shippingAmount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Shipping cost (cents)',
      },
    },
    {
      name: 'totalAmount',
      type: 'number',
      required: true,
      admin: {
        description: 'Final total amount (cents)',
      },
    },
    {
      name: 'taxRate',
      type: 'number',
      admin: {
        description: 'Tax rate applied (e.g., 0.07 for 7%)',
      },
    },
    {
      name: 'shippingAddress',
      type: 'group',
      required: true,
      fields: [
        { name: 'firstName', type: 'text', required: true },
        { name: 'lastName', type: 'text', required: true },
        { name: 'company', type: 'text' },
        { name: 'street', type: 'text', required: true },
        { name: 'street2', type: 'text' },
        { name: 'city', type: 'text', required: true },
        { name: 'state', type: 'text', required: true },
        { name: 'zip', type: 'text', required: true },
        { name: 'country', type: 'text', defaultValue: 'US' },
        { name: 'phone', type: 'text' },
      ],
    },
    {
      name: 'billingAddress',
      type: 'group',
      fields: [
        { name: 'sameAsShipping', type: 'checkbox', defaultValue: true },
        { name: 'firstName', type: 'text' },
        { name: 'lastName', type: 'text' },
        { name: 'company', type: 'text' },
        { name: 'street', type: 'text' },
        { name: 'street2', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'zip', type: 'text' },
        { name: 'country', type: 'text' },
      ],
    },
    {
      name: 'payment',
      type: 'group',
      fields: [
        {
          name: 'stripePaymentIntentId',
          type: 'text',
          admin: {
            description: 'Stripe Payment Intent ID',
          },
        },
        {
          name: 'stripeSessionId',
          type: 'text',
          admin: {
            description: 'Stripe Checkout Session ID',
          },
        },
        {
          name: 'provider',
          type: 'text',
          admin: {
            description: 'Payment provider used (stripe, square, etc.)',
          },
        },
        {
          name: 'providerPaymentId',
          type: 'text',
          admin: {
            description: 'Provider payment identifier',
          },
        },
        {
          name: 'providerCustomerId',
          type: 'text',
          admin: {
            description: 'Provider customer identifier (if available)',
          },
        },
        {
          name: 'paymentStatus',
          type: 'select',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Processing', value: 'processing' },
            { label: 'Succeeded', value: 'succeeded' },
            { label: 'Failed', value: 'failed' },
            { label: 'Cancelled', value: 'cancelled' },
            { label: 'Refunded', value: 'refunded' },
          ],
        },
        {
          name: 'paymentMethod',
          type: 'text',
          admin: {
            description: 'Payment method used (card, apple_pay, etc.)',
          },
        },
      ],
    },
    {
      name: 'fulfillment',
      type: 'group',
      fields: [
        {
          name: 'shippingMethod',
          type: 'select',
          options: [
            { label: 'Standard Shipping', value: 'standard' },
            { label: 'Expedited Shipping', value: 'expedited' },
            { label: 'Local Pickup', value: 'pickup' },
            { label: 'In-Store Pickup', value: 'store_pickup' },
          ],
        },
        {
          name: 'trackingNumber',
          type: 'text',
          admin: {
            description: 'Shipping tracking number',
          },
        },
        {
          name: 'carrier',
          type: 'select',
          options: [
            { label: 'USPS', value: 'usps' },
            { label: 'UPS', value: 'ups' },
            { label: 'FedEx', value: 'fedex' },
            { label: 'Local Delivery', value: 'local' },
          ],
        },
        {
          name: 'estimatedDelivery',
          type: 'date',
          admin: {
            description: 'Estimated delivery date',
          },
        },
        {
          name: 'shippedAt',
          type: 'date',
          admin: {
            description: 'Date order was shipped',
          },
        },
        {
          name: 'deliveredAt',
          type: 'date',
          admin: {
            description: 'Date order was delivered',
          },
        },
      ],
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'website',
      options: [
        { label: 'Website', value: 'website' },
        { label: 'Square POS', value: 'square' },
        { label: 'Phone Order', value: 'phone' },
        { label: 'Email Order', value: 'email' },
        { label: 'Quote Request', value: 'quote' },
      ],
    },
    {
      name: 'squareOrderId',
      type: 'text',
      admin: {
        description: 'Square order ID if synced from POS',
      },
    },
    {
      name: 'institutionalOrder',
      type: 'group',
      fields: [
        {
          name: 'isInstitutional',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'institution',
          type: 'relationship',
          relationTo: 'institutional-accounts',
          admin: {
            condition: (data) => data.institutionalOrder?.isInstitutional,
          },
        },
        {
          name: 'purchaseOrderNumber',
          type: 'text',
          admin: {
            condition: (data) => data.institutionalOrder?.isInstitutional,
          },
        },
        {
          name: 'invoiceRequired',
          type: 'checkbox',
          admin: {
            condition: (data) => data.institutionalOrder?.isInstitutional,
          },
        },
      ],
    },
    {
      name: 'customerNotes',
      type: 'textarea',
      admin: {
        description: 'Notes from customer during checkout',
      },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      admin: {
        description: 'Internal staff notes about this order',
      },
    },
    {
      name: 'refunds',
      type: 'array',
      fields: [
        {
          name: 'amount',
          type: 'number',
          required: true,
          admin: {
            description: 'Refund amount in cents',
          },
        },
        {
          name: 'reason',
          type: 'text',
          required: true,
        },
        {
          name: 'stripeRefundId',
          type: 'text',
        },
        {
          name: 'processedAt',
          type: 'date',
          defaultValue: () => new Date().toISOString(),
        },
        {
          name: 'processedBy',
          type: 'relationship',
          relationTo: 'users',
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Generate order number if not exists
        if (!data.orderNumber) {
          const timestamp = Date.now().toString(36).toUpperCase();
          const random = Math.random().toString(36).substr(2, 4).toUpperCase();
          data.orderNumber = `ALK-${timestamp}-${random}`;
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req: { payload } }) => {
        // Handle order status changes
        if (operation === 'update' && doc.status !== previousDoc?.status) {
          console.log(`Order ${doc.orderNumber} status changed: ${previousDoc?.status} → ${doc.status}`);
          
          // Restore stock on cancellation/return
          if ((doc.status === 'cancelled' || doc.status === 'returned') && 
              previousDoc?.status !== 'cancelled' && previousDoc?.status !== 'returned') {
            
            for (const item of doc.items) {
              try {
                // Find product and restore stock
                const product = await payload.findByID({
                  collection: item.productType as any,
                  id: item.product,
                });
                
                if (product?.inventory?.trackQuantity) {
                  await payload.update({
                    collection: item.productType as any,
                    id: item.product,
                    data: {
                      'inventory.stockLevel': (product.inventory.stockLevel || 0) + item.quantity,
                    },
                  });
                  console.log(`Restored ${item.quantity} units of ${item.productTitle}`);
                }
              } catch (error) {
                console.error(`Failed to restore stock for ${item.productTitle}:`, error);
              }
            }
          }
          
          // Update fulfillment dates based on status
          const updateData: any = {};
          
          if (doc.status === 'shipped' && !doc.fulfillment?.shippedAt) {
            updateData['fulfillment.shippedAt'] = new Date().toISOString();
          }
          
          if (doc.status === 'delivered' && !doc.fulfillment?.deliveredAt) {
            updateData['fulfillment.deliveredAt'] = new Date().toISOString();
          }
          
          if (Object.keys(updateData).length > 0) {
            await payload.update({
              collection: 'orders',
              id: doc.id,
              data: updateData,
            });
          }
          
          // Send status update emails to customers
          try {
            const customerEmail = doc.guestEmail || doc.customer?.email;
            if (customerEmail) {
              await sendOrderStatusUpdate(
                customerEmail,
                doc.orderNumber,
                previousDoc?.status || 'pending',
                doc.status,
                doc.fulfillment?.trackingNumber
              );
            }
          } catch (emailError) {
            console.error('Error sending order status update email:', emailError);
          }
        }
      },
    ],
  },
  timestamps: true,
};
