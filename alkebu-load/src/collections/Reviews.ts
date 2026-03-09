import type { CollectionConfig } from 'payload';

const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'rating', 'reviewableType', 'author', 'status', 'createdAt'],
    group: 'Community',
  },
  fields: [
    // === POLYMORPHIC RELATIONSHIP ===
    // Can review either a Product OR a Business
    {
      name: 'reviewableType',
      type: 'select',
      required: true,
      options: [
        { label: 'Book', value: 'books' },
        { label: 'Wellness & Lifestyle', value: 'wellness-lifestyle' },
        { label: 'Fashion & Jewelry', value: 'fashion-jewelry' },
        { label: 'Oils & Incense', value: 'oils-incense' },
        { label: 'Business', value: 'businesses' },
      ],
      admin: {
        description: 'What is being reviewed?',
      },
    },
    {
      name: 'reviewable',
      type: 'relationship',
      relationTo: ['books', 'wellness-lifestyle', 'fashion-jewelry', 'oils-incense', 'businesses'],
      required: true,
      admin: {
        description: 'The product or business being reviewed',
      },
    },

    // === REVIEW CONTENT ===
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 100,
      admin: {
        description: 'Brief headline (e.g., "Amazing book!")',
      },
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      minLength: 50,
      maxLength: 5000,
      admin: {
        description: 'Full review (minimum 50 characters)',
      },
    },
    {
      name: 'rating',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      admin: {
        description: 'Star rating (1-5)',
      },
    },
    {
      name: 'wouldRecommend',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Would you recommend this to others?',
      },
    },

    // === VERIFICATION ===
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        description: 'Verified purchase/visit',
      },
    },
    {
      name: 'verifiedOrder',
      type: 'relationship',
      relationTo: 'orders',
      admin: {
        readOnly: true,
        description: 'Order that verifies this purchase',
        condition: (data) => data.verified,
      },
    },

    // === AUTHOR INFO ===
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Who wrote this review',
      },
    },
    {
      name: 'authorName',
      type: 'text',
      admin: {
        description: 'Display name (defaults to user name)',
      },
    },

    // === MEDIA ===
    {
      name: 'images',
      type: 'array',
      maxRows: 5,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
        },
      ],
      admin: {
        description: 'Photos from the customer (max 5)',
      },
    },

    // === ENGAGEMENT ===
    {
      name: 'helpfulVotes',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Number of "helpful" votes',
      },
    },
    {
      name: 'notHelpfulVotes',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Number of "not helpful" votes',
      },
    },
    {
      name: 'voters',
      type: 'array',
      admin: {
        readOnly: true,
        description: 'Users who voted (prevent duplicate votes)',
      },
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
        },
        {
          name: 'vote',
          type: 'select',
          options: [
            { label: 'Helpful', value: 'helpful' },
            { label: 'Not Helpful', value: 'not-helpful' },
          ],
        },
      ],
    },

    // === MODERATION ===
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending Review', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Flagged', value: 'flagged' },
      ],
      admin: {
        description: 'Moderation status',
      },
    },
    {
      name: 'moderatorNotes',
      type: 'textarea',
      admin: {
        description: 'Internal notes from moderators',
        condition: (data, siblingData, { user }) =>
          (user as any)?.role === 'admin' || (user as any)?.role === 'staff',
      },
    },
    {
      name: 'flagReason',
      type: 'select',
      options: [
        { label: 'Spam', value: 'spam' },
        { label: 'Inappropriate', value: 'inappropriate' },
        { label: 'Fake Review', value: 'fake' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        condition: (data) => data.status === 'flagged' || data.status === 'rejected',
      },
    },

    // === METADATA ===
    {
      name: 'isEdited',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        description: 'Whether review was edited after posting',
      },
    },
    {
      name: 'editedAt',
      type: 'date',
      admin: {
        readOnly: true,
        condition: (data) => data.isEdited,
      },
    },
  ],

  hooks: {
    beforeChange: [
      // Auto-verify if user has purchased this product
      async ({ data, req, operation }) => {
        if (operation === 'create' &&
          data.reviewableType !== 'businesses' &&
          data.author) {

          // Check if user has ordered this product
          const orders = await req.payload.find({
            collection: 'orders',
            where: {
              and: [
                { customer: { equals: data.author } },
                { status: { equals: 'completed' } },
              ],
            },
            limit: 100,
          });

          // Check if any order contains this product
          for (const order of orders.docs) {
            if (order.items && Array.isArray(order.items)) {
              const hasProduct = order.items.some((item: any) =>
                item.product?.id === data.reviewable ||
                item.product === data.reviewable
              );

              if (hasProduct) {
                data.verified = true;
                data.verifiedOrder = order.id;
                break;
              }
            }
          }
        }

        return data;
      },

      // Set author name from user
      async ({ data, req }) => {
        if (!data.authorName && data.author) {
          const user = await req.payload.findByID({
            collection: 'users',
            id: typeof data.author === 'string' ? data.author : data.author.id,
          });

          data.authorName = user.name ||
            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            'Anonymous';
        }

        return data;
      },

      // Track edits
      async ({ data, operation, originalDoc }) => {
        if (operation === 'update' && originalDoc) {
          if (originalDoc.body !== data.body ||
            originalDoc.title !== data.title ||
            originalDoc.rating !== data.rating) {
            data.isEdited = true;
            data.editedAt = new Date();
          }
        }

        return data;
      },
    ],

    afterChange: [
      // Update product/business average rating
      async ({ doc, req }) => {
        if (doc.status === 'approved') {
          const reviewableCollection = doc.reviewableType;
          const reviewableId = typeof doc.reviewable === 'string'
            ? doc.reviewable
            : doc.reviewable?.id;

          // Calculate new average rating
          const allReviews = await req.payload.find({
            collection: 'reviews',
            where: {
              and: [
                { reviewableType: { equals: reviewableCollection } },
                { reviewable: { equals: reviewableId } },
                { status: { equals: 'approved' } },
              ],
            },
            limit: 1000,
          });

          if (allReviews.docs.length > 0) {
            const avgRating = allReviews.docs.reduce((sum, review) =>
              sum + (review.rating || 0), 0
            ) / allReviews.docs.length;

            const reviewCount = allReviews.docs.length;

            // Update the product/business
            try {
              await req.payload.update({
                collection: reviewableCollection,
                id: reviewableId,
                data: {
                  averageRating: Math.round(avgRating * 10) / 10, // 4.3
                  reviewCount,
                },
              });
            } catch (error) {
              console.error(`Error updating ${reviewableCollection} ratings:`, error);
            }
          }
        }
      },
    ],
  },

  access: {
    // Anyone can read approved reviews
    read: ({ req: { user } }) => {
      if ((user as any)?.role === 'admin' || (user as any)?.role === 'staff') {
        return true; // Admins see all
      }

      return {
        status: {
          equals: 'approved',
        },
      };
    },

    // Only authenticated users can create reviews
    create: ({ req: { user } }) => !!user,

    // Users can edit their own reviews (before approval)
    update: ({ req: { user } }) => {
      if ((user as any)?.role === 'admin' || (user as any)?.role === 'staff') {
        return true;
      }

      if (user) {
        return {
          author: {
            equals: user.id,
          },
          status: {
            in: ['pending', 'rejected'], // Can't edit after approval
          },
        };
      }

      return false;
    },

    // Only admins can delete
    delete: ({ req: { user } }) => (user as any)?.role === 'admin',
  },

  timestamps: true,
};

export default Reviews;
