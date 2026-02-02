import type { CollectionConfig } from 'payload';
import { checkToxicity } from '../app/utils/toxicityCheck';

// Helper to extract plain text from Payload rich text
function extractTextFromRichText(richText: any): string {
  if (!richText) return '';
  if (typeof richText === 'string') return richText;

  // Payload Lexical format
  if (richText.root && richText.root.children) {
    return richText.root.children
      .map((node: any) => extractTextFromNode(node))
      .join(' ');
  }

  return JSON.stringify(richText);
}

function extractTextFromNode(node: any): string {
  if (!node) return '';

  if (node.text) return node.text;

  if (node.children) {
    return node.children
      .map((child: any) => extractTextFromNode(child))
      .join(' ');
  }

  return '';
}

const Comments: CollectionConfig = {
  slug: 'comments',
  admin: {
    useAsTitle: 'content',
    defaultColumns: ['author', 'contentType', 'contentId', 'status', 'createdAt'],
    group: 'Community'
  },
  fields: [
    // Comment Content
    {
      name: 'content',
      type: 'richText',
      required: true,
      admin: {
        description: 'Comment content'
      }
    },
    
    // Author Information
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Registered user who made the comment'
      }
    },
    {
      name: 'guestAuthor',
      type: 'group',
      admin: {
        condition: (data) => !data.author,
        description: 'Guest user information (if not logged in)'
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: {
            description: 'Guest user name'
          }
        },
        {
          name: 'email',
          type: 'email',
          required: true,
          admin: {
            description: 'Guest user email (not displayed publicly)'
          }
        }
      ]
    },
    
    // What this comment is about (Polymorphic relationship)
    {
      name: 'commentableType',
      type: 'select',
      required: true,
      options: [
        { label: 'Blog Post', value: 'blogPosts' },
        { label: 'Event', value: 'events' },
      ],
      admin: {
        description: 'Type of content being commented on'
      }
    },
    {
      name: 'commentable',
      type: 'relationship',
      relationTo: ['blogPosts', 'events'],
      required: true,
      admin: {
        description: 'The blog post or event being commented on'
      }
    },
    
    // Thread Management
    {
      name: 'parentComment',
      type: 'relationship',
      relationTo: 'comments',
      admin: {
        description: 'Parent comment (if this is a reply)'
      }
    },
    {
      name: 'threadLevel',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Nesting level in thread (0 = top level)',
        readOnly: true
      }
    },
    
    // Moderation
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending Review', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Spam', value: 'spam' },
        { label: 'Hidden', value: 'hidden' }
      ],
      admin: {
        description: 'Comment moderation status'
      }
    },
    {
      name: 'moderatedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Staff member who moderated this comment'
      }
    },
    {
      name: 'moderationReason',
      type: 'textarea',
      admin: {
        description: 'Reason for rejection/hiding (if applicable)'
      }
    },
    
    // Toxicity/Spam Detection
    {
      name: 'toxicityScore',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Perspective API toxicity score (0-1)',
        readOnly: true
      }
    },

    // Helpful votes (like/dislike system)
    {
      name: 'helpfulVotes',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of "helpful" votes',
        readOnly: true
      }
    },
    {
      name: 'unhelpfulVotes',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of "unhelpful" votes',
        readOnly: true
      }
    },
    
    // Spam Detection
    {
      name: 'spamScore',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Automated spam detection score',
        readOnly: true
      }
    },
    {
      name: 'ipAddress',
      type: 'text',
      admin: {
        description: 'IP address of commenter (for spam detection)',
        readOnly: true
      }
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: {
        description: 'Browser user agent (for spam detection)',
        readOnly: true
      }
    },
    
    // Timestamps
    {
      name: 'createdAt',
      type: 'date',
      admin: {
        description: 'When comment was created',
        readOnly: true
      }
    },
    {
      name: 'updatedAt',
      type: 'date',
      admin: {
        description: 'When comment was last updated',
        readOnly: true
      }
    },
    {
      name: 'editedAt',
      type: 'date',
      admin: {
        description: 'When comment was last edited by author'
      }
    },
    
    // Flags & Reports
    {
      name: 'flagged',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Comment has been flagged by users'
      }
    },
    {
      name: 'flagCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Number of times this comment has been flagged',
        readOnly: true
      }
    },
    {
      name: 'flagReasons',
      type: 'array',
      fields: [
        {
          name: 'reason',
          type: 'select',
          options: [
            { label: 'Spam', value: 'spam' },
            { label: 'Inappropriate Language', value: 'inappropriate-language' },
            { label: 'Harassment', value: 'harassment' },
            { label: 'Off Topic', value: 'off-topic' },
            { label: 'Misinformation', value: 'misinformation' },
            { label: 'Other', value: 'other' }
          ]
        },
        {
          name: 'flaggedBy',
          type: 'relationship',
          relationTo: 'users'
        },
        {
          name: 'flaggedAt',
          type: 'date'
        }
      ],
      admin: {
        description: 'Reasons why this comment was flagged'
      }
    }
  ],
  
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (!data || operation !== 'create') {
          return data;
        }

        // Extract text content from richText field
        const textContent = extractTextFromRichText(data.content);

        // Check toxicity and auto-moderate
        const toxicity = await checkToxicity(textContent);
        data.toxicityScore = toxicity.score;

        // Auto-approve low toxicity comments on blog posts
        if (data.commentableType === 'blogPosts' && toxicity.score < 0.7) {
          data.status = 'approved';
        } else if (toxicity.score > 0.9) {
          // Auto-reject very toxic comments
          data.status = 'spam';
        } else {
          // Queue for manual review
          data.status = 'pending';
        }

        // Calculate thread level if it's a reply
        if (data.parentComment) {
          try {
            const parent = await req.payload.findByID({
              collection: 'comments',
              id: typeof data.parentComment === 'string'
                ? data.parentComment
                : data.parentComment.id,
            });
            data.threadLevel = (parent.threadLevel || 0) + 1;
          } catch (error) {
            console.error('Error calculating thread level:', error);
            data.threadLevel = 1;
          }
        } else {
          data.threadLevel = 0;
        }

        return data;
      }
    ],

    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create' && doc.status === 'approved') {
          // Increment comment count on the related content
          const commentableCollection = doc.commentableType;
          const commentableId = typeof doc.commentable === 'string'
            ? doc.commentable
            : doc.commentable?.id;

          if (commentableCollection && commentableId) {
            try {
              // Get current item
              const item = await req.payload.findByID({
                collection: commentableCollection,
                id: commentableId,
              });

              // Update comment count
              await req.payload.update({
                collection: commentableCollection,
                id: commentableId,
                data: {
                  commentCount: (item.commentCount || 0) + 1,
                },
              });
            } catch (error) {
              console.error('Error updating comment count:', error);
            }
          }
        }
      }
    ]
  },

  timestamps: true,
};

export default Comments;