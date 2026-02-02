import type { CollectionConfig } from 'payload';

const BookQuotes: CollectionConfig = {
  slug: 'bookQuotes',
  admin: {
    useAsTitle: 'bookTitle',
    defaultColumns: ['bookTitle', 'customerName', 'status', 'requestDate', 'estimatedPrice'],
    group: 'Commerce'
  },
  fields: [
    // Book Information
    {
      name: 'bookTitle',
      type: 'text',
      required: true,
      admin: {
        description: 'Title of the requested book'
      }
    },
    {
      name: 'author',
      type: 'text',
      admin: {
        description: 'Book author(s)'
      }
    },
    {
      name: 'isbn',
      type: 'text',
      admin: {
        description: 'ISBN (if provided by customer or found via search)'
      }
    },
    {
      name: 'publisher',
      type: 'text',
      admin: {
        description: 'Publisher (if known)'
      }
    },
    {
      name: 'publicationYear',
      type: 'text',
      admin: {
        description: 'Publication year (if known)'
      }
    },
    {
      name: 'edition',
      type: 'text',
      admin: {
        description: 'Specific edition requested (if any)'
      }
    },
    {
      name: 'format',
      type: 'select',
      options: [
        { label: 'Any', value: 'any' },
        { label: 'Hardcover', value: 'hardcover' },
        { label: 'Paperback', value: 'paperback' },
        { label: 'Mass Market', value: 'mass-market' },
        { label: 'eBook', value: 'ebook' },
        { label: 'Audiobook', value: 'audiobook' }
      ],
      defaultValue: 'any',
      admin: {
        description: 'Preferred book format'
      }
    },
    
    // Customer Information
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Registered customer (if applicable)'
      }
    },
    {
      name: 'customerName',
      type: 'text',
      required: true,
      admin: {
        description: 'Customer name'
      }
    },
    {
      name: 'customerEmail',
      type: 'email',
      required: true,
      admin: {
        description: 'Customer email for quote delivery'
      }
    },
    {
      name: 'customerPhone',
      type: 'text',
      admin: {
        description: 'Customer phone number (optional)'
      }
    },
    {
      name: 'preferredContact',
      type: 'select',
      defaultValue: 'email',
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Phone', value: 'phone' },
        { label: 'Either', value: 'either' }
      ],
      admin: {
        description: 'Customer preferred contact method'
      }
    },
    
    // Request Details
    {
      name: 'quantity',
      type: 'number',
      defaultValue: 1,
      min: 1,
      required: true,
      admin: {
        description: 'Number of copies requested'
      }
    },
    {
      name: 'urgency',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'Normal', value: 'normal' },
        { label: 'Rush (within 1 week)', value: 'rush' },
        { label: 'ASAP (within 3 days)', value: 'asap' }
      ],
      admin: {
        description: 'How quickly customer needs the book'
      }
    },
    {
      name: 'maxBudget',
      type: 'number',
      admin: {
        description: 'Customer maximum budget per book (optional)'
      }
    },
    {
      name: 'specialInstructions',
      type: 'textarea',
      admin: {
        description: 'Any special instructions from customer'
      }
    },
    {
      name: 'requestSource',
      type: 'select',
      required: true,
      options: [
        { label: 'Website Search', value: 'website-search' },
        { label: 'In-Store Request', value: 'in-store' },
        { label: 'Phone Call', value: 'phone' },
        { label: 'Email Request', value: 'email' },
        { label: 'Social Media', value: 'social-media' }
      ],
      admin: {
        description: 'How the quote request originated'
      }
    },
    
    // External Search Results (that led to this quote)
    {
      name: 'externalSources',
      type: 'array',
      fields: [
        {
          name: 'source',
          type: 'select',
          options: [
            { label: 'ISBNdb', value: 'isbndb' },
            { label: 'Google Books', value: 'google-books' },
            { label: 'Open Library', value: 'open-library' },
            { label: 'Bookshop.org', value: 'bookshop' },
            { label: 'Other', value: 'other' }
          ]
        },
        {
          name: 'available',
          type: 'checkbox',
          defaultValue: false
        },
        {
          name: 'estimatedPrice',
          type: 'number'
        },
        {
          name: 'estimatedDelivery',
          type: 'text',
          admin: {
            description: 'e.g., "3-5 business days"'
          }
        },
        {
          name: 'sourceUrl',
          type: 'text',
          admin: {
            description: 'Link to the book on external source (if applicable)'
          }
        }
      ],
      admin: {
        description: 'Results from external book searches that led to this quote'
      }
    },
    
    // Quote Status & Processing
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending Review', value: 'pending' },
        { label: 'Researching', value: 'researching' },
        { label: 'Quote Prepared', value: 'quote-prepared' },
        { label: 'Quote Sent', value: 'quote-sent' },
        { label: 'Customer Response Pending', value: 'awaiting-response' },
        { label: 'Approved by Customer', value: 'approved' },
        { label: 'Declined by Customer', value: 'declined' },
        { label: 'Ordered from Supplier', value: 'ordered' },
        { label: 'Book Received', value: 'received' },
        { label: 'Customer Notified', value: 'customer-notified' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Unable to Source', value: 'unable-to-source' }
      ],
      admin: {
        description: 'Current status of quote request'
      }
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Staff member assigned to handle this quote'
      }
    },
    {
      name: 'internalNotes',
      type: 'richText',
      admin: {
        description: 'Internal staff notes about this quote request'
      }
    },
    
    // Quote Details
    {
      name: 'quote',
      type: 'group',
      fields: [
        {
          name: 'pricePerBook',
          type: 'number',
          admin: {
            description: 'Quoted price per book'
          }
        },
        {
          name: 'totalPrice',
          type: 'number',
          admin: {
            description: 'Total quoted price (including tax, shipping, etc.)'
          }
        },
        {
          name: 'supplierCost',
          type: 'number',
          admin: {
            description: 'Our cost from supplier (internal)'
          }
        },
        {
          name: 'markup',
          type: 'number',
          admin: {
            description: 'Markup percentage (internal)'
          }
        },
        {
          name: 'estimatedArrival',
          type: 'text',
          admin: {
            description: 'Estimated time for book to arrive'
          }
        },
        {
          name: 'validUntil',
          type: 'date',
          admin: {
            description: 'Quote expiration date'
          }
        },
        {
          name: 'terms',
          type: 'richText',
          admin: {
            description: 'Quote terms and conditions'
          }
        }
      ]
    },
    
    // Supplier Information
    {
      name: 'supplier',
      type: 'group',
      fields: [
        {
          name: 'name',
          type: 'text',
          admin: {
            description: 'Supplier/vendor name'
          }
        },
        {
          name: 'contact',
          type: 'text',
          admin: {
            description: 'Supplier contact information'
          }
        },
        {
          name: 'orderNumber',
          type: 'text',
          admin: {
            description: 'Supplier order/reference number'
          }
        },
        {
          name: 'trackingNumber',
          type: 'text',
          admin: {
            description: 'Shipping tracking number'
          }
        }
      ]
    },
    
    // Timeline
    {
      name: 'requestDate',
      type: 'date',
      required: true,
      index: true,
      admin: {
        description: 'When quote was first requested',
        readOnly: true
      }
    },
    {
      name: 'quoteDate',
      type: 'date',
      admin: {
        description: 'When quote was prepared and sent to customer'
      }
    },
    {
      name: 'responseDate',
      type: 'date',
      admin: {
        description: 'When customer responded to quote'
      }
    },
    {
      name: 'completionDate',
      type: 'date',
      admin: {
        description: 'When order was completed'
      }
    },
    {
      name: 'lastFollowup',
      type: 'date',
      admin: {
        description: 'Last customer follow-up date'
      }
    },
    
    // Customer Communication
    {
      name: 'communications',
      type: 'array',
      fields: [
        {
          name: 'date',
          type: 'date',
          required: true
        },
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Initial Quote Request', value: 'initial-request' },
            { label: 'Quote Sent', value: 'quote-sent' },
            { label: 'Customer Response', value: 'customer-response' },
            { label: 'Follow-up Email', value: 'followup-email' },
            { label: 'Phone Call', value: 'phone-call' },
            { label: 'Status Update', value: 'status-update' },
            { label: 'Arrival Notification', value: 'arrival-notification' }
          ]
        },
        {
          name: 'subject',
          type: 'text'
        },
        {
          name: 'content',
          type: 'richText'
        },
        {
          name: 'sentBy',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            description: 'Staff member who sent this communication'
          }
        }
      ],
      admin: {
        description: 'Communication history with customer'
      }
    },
    
    // Analytics & Performance
    {
      name: 'searchAnalyticsId',
      type: 'relationship',
      relationTo: 'searchAnalytics',
      admin: {
        description: 'Link to original search that generated this quote'
      }
    },
    {
      name: 'conversionValue',
      type: 'number',
      admin: {
        description: 'Final sale amount if quote converted to sale'
      }
    },
    {
      name: 'profitMargin',
      type: 'number',
      admin: {
        description: 'Profit margin on completed sale (internal)'
      }
    }
  ],
  
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (!data || (operation !== 'create' && operation !== 'update')) {
          return;
        }
        
        // Set request date on create
        if (operation === 'create' && !data.requestDate) {
          data.requestDate = new Date().toISOString();
        }
        
        // Calculate total price from quantity and price per book
        if (data.quote?.pricePerBook && data.quantity) {
          data.quote.totalPrice = data.quote.pricePerBook * data.quantity;
        }
        
        // Set quote date when status changes to quote-sent
        if (data.status === 'quote-sent' && !data.quoteDate) {
          data.quoteDate = new Date().toISOString();
        }
        
        // Set completion date when status changes to completed
        if (data.status === 'completed' && !data.completionDate) {
          data.completionDate = new Date().toISOString();
        }
      }
    ]
  }
};

export default BookQuotes;