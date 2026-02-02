import { payloadGet } from '$lib/server/payload';
import type { PageServerLoad } from './$types';

interface FashionProduct {
  id: string;
  name: string;
  slug: string;
  description?: any;
  shortDescription?: string;
  brand?: string;
  images?: any[];
  scrapedImageUrls?: Array<{ url: string }>;
  variations?: Array<{
    sku: string;
    size?: string;
    color?: string;
    isAvailable?: boolean;
  }>;
  categories?: string[];
  tags?: Array<{ tag: string }>;
  isFeatured?: boolean;
  isActive?: boolean;
  pricing?: {
    retailPrice?: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface PayloadResponse {
  docs: FashionProduct[];
  totalDocs: number;
  totalPages: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  const page = parseInt(url.searchParams.get('p') || '1');
  const sort = url.searchParams.get('sort') || '-createdAt';
  const limit = 12;

  try {
    // Build the API query
    const sortParam = sort ? `&sort=${encodeURIComponent(sort)}` : '';
    const apiUrl = `/api/fashion-jewelry?page=${page}&limit=${limit}&depth=1${sortParam}`;

    // Fetch products from Payload
    const response = await payloadGet<PayloadResponse>(apiUrl);

    // Extract unique categories from all products
    const categorySet = new Set<string>();
    response.docs.forEach(product => {
      product.categories?.forEach(cat => categorySet.add(cat));
    });

    // For now, create simple category objects
    // TODO: Fetch actual category data from Payload if you have a categories collection
    const categories = Array.from(categorySet).map(cat => ({
      name: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' '),
      slug: { current: cat }
    }));

    // Get featured products
    const featured = response.docs.filter(p => p.isFeatured).slice(0, 4);

    // Set cache headers for performance
    setHeaders({
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      'Vary': 'Accept-Encoding'
    });

    return {
      prods: {
        products: response.docs,
        prodCount: response.totalDocs,
        categories,
        featured
      }
    };
  } catch (error) {
    console.error('Error loading apparel products:', error);

    // Return empty state on error
    return {
      prods: {
        products: [],
        prodCount: 0,
        categories: [],
        featured: []
      }
    };
  }
};
