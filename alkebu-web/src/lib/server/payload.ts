import { PAYLOAD_API_URL, PAYLOAD_API_KEY } from '$env/static/private';

export async function payloadGet<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${PAYLOAD_API_URL}${path}`;

  // Only include Authorization header if API key is provided
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {})
  };

  if (PAYLOAD_API_KEY && PAYLOAD_API_KEY.trim()) {
    headers['Authorization'] = `Bearer ${PAYLOAD_API_KEY}`;
  }

  const res = await fetch(url, {
    ...init,
    headers
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Payload API Error (${res.status}):`, text);
    throw new Error(`Payload ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}
 
export interface PayloadCollectionResponse<T> {
  docs: T[];
  totalDocs: number;
  totalPages: number;
  page: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
  pagingCounter: number;
}

export interface PayloadDoc {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Product types based on our Payload collections
export interface Book extends PayloadDoc {
  title: string;
  titleLong?: string;
  slug: string;
  description?: string;
  seoDescription?: string;
  authors?: Author[];
  publisher?: Publisher;
  vendor?: Vendor;
  editions?: BookEdition[];
  categories?: string[];
  collections?: string[];
  images?: Media[];
  pricing?: ProductPricing;
  inventory?: ProductInventory;
  squareItemId?: string;
}

export interface BookEdition {
  isbn13?: string;
  isbn10?: string;
  binding?: string;
  pages?: number;
  publishedDate?: string;
  language?: string;
  dimensions?: {
    height?: number;
    width?: number;
    thickness?: number;
    weight?: number;
  };
}

export interface ProductPricing {
  retailPrice: number; // in cents
  wholesalePrice?: number;
  memberPrice?: number;
  compareAtPrice?: number;
  costPrice?: number;
  shippingWeight?: number; // in ounces
}

export interface ProductInventory {
  trackQuantity?: boolean;
  stockLevel?: number;
  lowStockThreshold?: number;
  allowBackorders?: boolean;
  locations?: {
    [key: string]: {
      stockLevel: number;
      reserved: number;
    };
  };
}

export interface Author extends PayloadDoc {
  name: string;
  slug: string;
  biography?: string;
  birthDate?: string;
  deathDate?: string;
  image?: Media;
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
  };
  bookCount?: number;
}

export interface Publisher extends PayloadDoc {
  name: string;
  slug: string;
  description?: string;
  website?: string;
  location?: string;
  foundedYear?: number;
  bookCount?: number;
}

export interface Vendor extends PayloadDoc {
  name: string;
  slug: string;
  type: 'distributor' | 'wholesaler' | 'publisher' | 'direct';
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
  };
}

export interface Media extends PayloadDoc {
  filename: string;
  mimeType: string;
  filesize: number;
  width?: number;
  height?: number;
  alt?: string;
  url: string;
}

export interface BlogPost extends PayloadDoc {
  title: string;
  slug: string;
  content: any; // Lexical rich text
  excerpt?: string;
  seoDescription?: string;
  featuredImage?: Media;
  author?: Author;
  publishedAt?: string;
  status: 'draft' | 'published';
  categories?: string[];
  relatedProducts?: Book[];
}

export interface Event extends PayloadDoc {
  title: string;
  slug: string;
  description?: string;
  seoDescription?: string;
  content?: any; // Lexical rich text
  startDate: string;
  endDate?: string;
  location?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | string;
  type?: string;
  venue?: { id: string } | string;
  featuredImage?: Media;
  capacity?: number;
  registrationRequired?: boolean;
  price?: number;
  status: 'draft' | 'published' | 'cancelled';
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  };
}

export interface Business extends PayloadDoc {
  name: string;
  slug: string;
  description?: string;
  seoDescription?: string;
  category: string;
  location?: string;
  verified?: boolean;
  specialties?: string[];
  logo?: Media;
  photos?: Media[];
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  hours?: {
    [key: string]: {
      open?: string;
      close?: string;
      closed?: boolean;
    };
  };
  images?: Media[];
  featured?: boolean;
  averageRating?: number;
  reviewCount?: number;
}

// Common query helpers
export async function getProductBySlug(slug: string, collection: 'books' | 'wellness-lifestyle' | 'fashion-jewelry' | 'oils-incense' = 'books') {
  const response = await payloadGet<PayloadCollectionResponse<any>>(`/api/${collection}?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=2`);
  return response.docs[0] || null;
}

export async function getProducts(page = 1, limit = 12, collection: 'books' | 'wellness-lifestyle' | 'fashion-jewelry' | 'oils-incense' = 'books') {
  return await payloadGet<PayloadCollectionResponse<any>>(`/api/${collection}?page=${page}&limit=${limit}&depth=1&sort=-createdAt`);
}

export async function getBlogPostBySlug(slug: string) {
  const response = await payloadGet<PayloadCollectionResponse<BlogPost>>(`/api/blogPosts?where[slug][equals]=${encodeURIComponent(slug)}&where[status][equals]=published&limit=1&depth=2`);
  return response.docs[0] || null;
}

export async function getEventBySlug(slug: string) {
  const response = await payloadGet<PayloadCollectionResponse<Event>>(`/api/events?where[slug][equals]=${encodeURIComponent(slug)}&where[status][equals]=published&limit=1&depth=2`);
  return response.docs[0] || null;
}

export async function getBusinessBySlug(slug: string) {
  const response = await payloadGet<PayloadCollectionResponse<Business>>(`/api/businesses?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=2`);
  return response.docs[0] || null;
}

export async function getBlogPosts(page = 1, limit = 12) {
  return await payloadGet<PayloadCollectionResponse<BlogPost>>(`/api/blogPosts?where[status][equals]=published&page=${page}&limit=${limit}&depth=1&sort=-publishedAt`);
}

export async function getUpcomingEvents(page = 1, limit = 12) {
  const today = new Date().toISOString();
  return await payloadGet<PayloadCollectionResponse<Event>>(`/api/events?where[status][equals]=published&where[startDate][greater_than_equal]=${encodeURIComponent(today)}&page=${page}&limit=${limit}&depth=1&sort=startDate`);
}

export async function getBusinesses(page = 1, limit = 12, category?: string) {
  const categoryFilter = category ? `&where[category][equals]=${encodeURIComponent(category)}` : '';
  return await payloadGet<PayloadCollectionResponse<Business>>(`/api/businesses?page=${page}&limit=${limit}&depth=1&sort=name${categoryFilter}`);
}

/**
 * Get books by the same author(s)
 * Excludes the current book
 */
export async function getBooksByAuthor(
  currentBookId: string,
  authorIds: string[],
  limit = 6
): Promise<Book[]> {
  if (!authorIds || authorIds.length === 0) {
    return [];
  }

  try {
    // Build query for books by any of these authors
    const authorsQuery = authorIds.map(id => `where[authors][in]=${encodeURIComponent(id)}`).join('&');

    const response = await payloadGet<PayloadCollectionResponse<Book>>(
      `/api/books?${authorsQuery}&where[isActive][equals]=true&limit=${limit + 1}&depth=1&sort=-createdAt`
    );

    // Filter out the current book
    return response.docs.filter(book => book.id !== currentBookId).slice(0, limit);
  } catch (error) {
    console.error('Error fetching books by author:', error);
    return [];
  }
}

/**
 * Get related books based on categories, collections, or subjects
 * Excludes the current book and books already shown in "By the Same Author"
 */
export async function getRelatedBooks(
  currentBookId: string,
  categories: string[] = [],
  collections: string[] = [],
  excludeBookIds: string[] = [],
  limit = 6
): Promise<Book[]> {
  const relatedBooks: Book[] = [];
  const seenIds = new Set<string>([currentBookId, ...excludeBookIds]);

  try {
    // Strategy 1: Same collection (most specific)
    if (collections && collections.length > 0 && relatedBooks.length < limit) {
      const collectionsQuery = collections.map(c => `where[collections][in]=${encodeURIComponent(c)}`).join('&');

      try {
        const response = await payloadGet<PayloadCollectionResponse<Book>>(
          `/api/books?${collectionsQuery}&where[isActive][equals]=true&limit=${limit * 2}&depth=1`
        );

        response.docs.forEach(book => {
          if (!seenIds.has(book.id) && relatedBooks.length < limit) {
            relatedBooks.push(book);
            seenIds.add(book.id);
          }
        });
      } catch (error) {
        console.error('Error fetching books by collection:', error);
      }
    }

    // Strategy 2: Same category (broader)
    if (categories && categories.length > 0 && relatedBooks.length < limit) {
      const categoriesQuery = categories.map(c => `where[categories][in]=${encodeURIComponent(c)}`).join('&');

      try {
        const response = await payloadGet<PayloadCollectionResponse<Book>>(
          `/api/books?${categoriesQuery}&where[isActive][equals]=true&limit=${limit * 2}&depth=1`
        );

        response.docs.forEach(book => {
          if (!seenIds.has(book.id) && relatedBooks.length < limit) {
            relatedBooks.push(book);
            seenIds.add(book.id);
          }
        });
      } catch (error) {
        console.error('Error fetching books by category:', error);
      }
    }

    // Strategy 3: Recent books if we still need more
    if (relatedBooks.length < limit) {
      try {
        const response = await payloadGet<PayloadCollectionResponse<Book>>(
          `/api/books?where[isActive][equals]=true&limit=${limit * 2}&depth=1&sort=-createdAt`
        );

        response.docs.forEach(book => {
          if (!seenIds.has(book.id) && relatedBooks.length < limit) {
            relatedBooks.push(book);
            seenIds.add(book.id);
          }
        });
      } catch (error) {
        console.error('Error fetching recent books:', error);
      }
    }

    return relatedBooks.slice(0, limit);
  } catch (error) {
    console.error('Error in getRelatedBooks:', error);
    return [];
  }
}

/**
 * Get related products for non-book items (wellness, apparel, etc.)
 * Based on categories or tags
 */
export async function getRelatedProducts(
  currentProductId: string,
  collection: 'wellness-lifestyle' | 'fashion-jewelry' | 'oils-incense',
  categories: string[] = [],
  limit = 6
): Promise<any[]> {
  const relatedProducts: any[] = [];
  const seenIds = new Set<string>([currentProductId]);

  try {
    // Query by category
    if (categories && categories.length > 0) {
      const categoriesQuery = categories.map(c => `where[categories][in]=${encodeURIComponent(c)}`).join('&');

      try {
        const response = await payloadGet<PayloadCollectionResponse<any>>(
          `/api/${collection}?${categoriesQuery}&where[isActive][equals]=true&limit=${limit * 2}&depth=1`
        );

        response.docs.forEach(product => {
          if (!seenIds.has(product.id) && relatedProducts.length < limit) {
            relatedProducts.push(product);
            seenIds.add(product.id);
          }
        });
      } catch (error) {
        console.error('Error fetching related products by category:', error);
      }
    }

    // Fallback: Recent products
    if (relatedProducts.length < limit) {
      try {
        const response = await payloadGet<PayloadCollectionResponse<any>>(
          `/api/${collection}?where[isActive][equals]=true&limit=${limit * 2}&depth=1&sort=-createdAt`
        );

        response.docs.forEach(product => {
          if (!seenIds.has(product.id) && relatedProducts.length < limit) {
            relatedProducts.push(product);
            seenIds.add(product.id);
          }
        });
      } catch (error) {
        console.error('Error fetching recent products:', error);
      }
    }

    return relatedProducts.slice(0, limit);
  } catch (error) {
    console.error('Error in getRelatedProducts:', error);
    return [];
  }
}
