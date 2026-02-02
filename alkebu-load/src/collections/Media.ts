// collections/Media.ts
import type { CollectionConfig } from 'payload';

/**
 * Helper function to generate Cloudflare Images URLs for different sizes
 * Uses Cloudflare Images URL format: https://domain.com/cdn-cgi/imagedelivery/{accountHash}/{imageId}/{variant}
 */
function generateCloudflareImageUrl(baseUrl: string, variant: string): string {
  if (!baseUrl || !baseUrl.includes('imagedelivery')) {
    return baseUrl; // Return original if not a Cloudflare Images URL
  }
  
  // Extract the base Cloudflare Images URL (up to the last slash)
  const baseParts = baseUrl.split('/');
  if (baseParts.length >= 3) {
    baseParts[baseParts.length - 1] = variant;
    return baseParts.join('/');
  }
  
  return baseUrl;
}

const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    // For R2 + Cloudflare Images setup, we disable local file handling
    // Images are stored in R2 and served through Cloudflare Images
    disableLocalStorage: true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'filename',
      type: 'text',
      admin: {
        description: 'Original filename from upload',
      },
    },
    {
      name: 'url',
      type: 'text',
      required: false, // Made optional to allow migration from existing records
      admin: {
        description: 'R2 + Cloudflare Images base URL',
      },
    },
    {
      name: 'cloudflareImageId',
      type: 'text',
      admin: {
        description: 'Cloudflare Images ID for transformations',
      },
    },
    {
      name: 'r2ObjectKey',
      type: 'text',
      admin: {
        description: 'R2 bucket object key/path',
      },
    },
    {
      name: 'dimensions',
      type: 'group',
      fields: [
        {
          name: 'width',
          type: 'number',
        },
        {
          name: 'height',
          type: 'number',
        },
      ],
      admin: {
        description: 'Original image dimensions',
      },
    },
    {
      name: 'fileSize',
      type: 'number',
      admin: {
        description: 'File size in bytes',
      },
    },
    {
      name: 'mimeType',
      type: 'text',
      admin: {
        description: 'MIME type (e.g., image/webp, image/jpeg)',
      },
    },
  ],
  // Public read access
  access: {
    read: () => true,
  },
  
  // Add virtual fields for Cloudflare Images variants
  hooks: {
    afterRead: [
      ({ doc }) => {
        if (doc?.url && doc.url.includes('imagedelivery')) {
          // Add virtual size URLs using Cloudflare Images variants
          doc.sizes = {
            thumbnail: generateCloudflareImageUrl(doc.url, 'thumbnail'),
            card: generateCloudflareImageUrl(doc.url, 'card'), 
            tablet: generateCloudflareImageUrl(doc.url, 'tablet'),
            hero: generateCloudflareImageUrl(doc.url, 'hero'),
          };
        }
        return doc;
      },
    ],
  },

};

export default Media;