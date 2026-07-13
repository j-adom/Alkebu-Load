import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv';
import { bookGenres } from '$lib/data/catalog';

export async function payloadGet<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${getPayloadApiUrl()}${path}`;

  // Only include Authorization header if API key is provided
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
    ...getPayloadAuthHeader(),
  };

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

const validBookCategorySlugs = new Set(bookGenres.map((genre) => genre.slug));

function normalizeBookCategoryFilters(categories: string[] = []): string[] {
  return categories.filter((category) => validBookCategorySlugs.has(category));
}

export type BookAvailabilityStatus = 'available' | 'request-only' | 'discontinued';

export function appendBookStorefrontFilters(params: URLSearchParams): URLSearchParams {
  params.set('where[availabilityStatus][not_equals]', 'discontinued');
  return params;
}

export function buildBookStorefrontPath(params: URLSearchParams): string {
  return `/api/books?${appendBookStorefrontFilters(params).toString()}`;
}

// Product types based on our Payload collections
export interface Book extends PayloadDoc {
  title: string;
  titleLong?: string;
  slug: string;
  availabilityStatus?: BookAvailabilityStatus;
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
  venue?: {
    id?: string;
    name?: string;
    address?: string;
    isVirtual?: boolean;
    virtualLink?: string;
    accessInstructions?: string;
  } | string;
  featuredImage?: Media;
  // Related content (populated with depth>=1). Each is the relevant product/business doc.
  relatedBooks?: any[];
  relatedWellnessProducts?: any[];
  relatedFashionJewelry?: any[];
  relatedOilsIncense?: any[];
  relatedBusinesses?: Business[];
  capacity?: number;
  registrationRequired?: boolean;
  registrationUrl?: string;
  registrationDetails?: {
    maxAttendees?: number;
    registrationDeadline?: string;
    price?: number;
    paymentRequired?: boolean;
    registrationInstructions?: any;
  };
  price?: number;
  cost?: number | string;
  contactInfo?: {
    email?: string;
    phone?: string;
  };
  contactEmail?: string;
  contactPhone?: string;
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
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      linkedin?: string;
      tiktok?: string;
    };
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    neighborhood?: string;
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
  const params = new URLSearchParams({
    'where[slug][equals]': slug,
    limit: '1',
    depth: '2',
  });
  const path = collection === 'books'
    ? buildBookStorefrontPath(params)
    : `/api/${collection}?${params.toString()}`;
  const response = await payloadGet<PayloadCollectionResponse<any>>(path);
  return response.docs[0] || null;
}

export async function getProducts(page = 1, limit = 12, collection: 'books' | 'wellness-lifestyle' | 'fashion-jewelry' | 'oils-incense' = 'books') {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    depth: '1',
    sort: '-createdAt',
  });
  const path = collection === 'books'
    ? buildBookStorefrontPath(params)
    : `/api/${collection}?${params.toString()}`;
  return await payloadGet<PayloadCollectionResponse<any>>(path);
}

export async function getBlogPostBySlug(slug: string) {
  const response = await payloadGet<PayloadCollectionResponse<BlogPost>>(`/api/blogPosts?where[slug][equals]=${encodeURIComponent(slug)}&where[status][equals]=published&limit=1&depth=2`);
  const post = response.docs[0] || null;
  if (!post) return null;

  // BlogPost's TS interface doesn't declare these (the frontend doesn't render
  // them today), but depth=2 still populates them on the raw API response —
  // filter the same gated products as events, belt-and-braces.
  const raw = post as unknown as { relatedWellnessProducts?: any[]; relatedOilsIncense?: any[] };
  if (Array.isArray(raw.relatedWellnessProducts)) {
    raw.relatedWellnessProducts = raw.relatedWellnessProducts.filter(
      (p) => typeof p !== 'object' || isPublishedGatedProduct(p)
    );
  }
  if (Array.isArray(raw.relatedOilsIncense)) {
    raw.relatedOilsIncense = raw.relatedOilsIncense.filter(
      (p) => typeof p !== 'object' || isPublishedGatedProduct(p)
    );
  }

  return post;
}

// publishOnline is the human curation gate for wellness/oils products (Square's
// feed includes miscategorized and unvetted items). The collection-level access
// control already restricts anonymous reads to published docs, but a populated
// relationship on this event doc could still surface an unpublished one if this
// server-side fetch ever carries an authenticated PAYLOAD_API_KEY — filter here
// too as belt-and-braces.
function isPublishedGatedProduct(product: any): boolean {
  return Boolean(product) && typeof product === 'object' && product.publishOnline === true;
}

export async function getEventBySlug(slug: string) {
  const response = await payloadGet<PayloadCollectionResponse<Event>>(`/api/events?where[slug][equals]=${encodeURIComponent(slug)}&where[status][equals]=published&limit=1&depth=2`);
  const event = response.docs[0] || null;
  if (!event) return null;

  if (Array.isArray(event.relatedWellnessProducts)) {
    event.relatedWellnessProducts = event.relatedWellnessProducts.filter(
      (p) => typeof p !== 'object' || isPublishedGatedProduct(p)
    );
  }
  if (Array.isArray(event.relatedOilsIncense)) {
    event.relatedOilsIncense = event.relatedOilsIncense.filter(
      (p) => typeof p !== 'object' || isPublishedGatedProduct(p)
    );
  }

  return event;
}

export async function getBusinessBySlug(slug: string) {
  const response = await payloadGet<PayloadCollectionResponse<Business>>(`/api/businesses?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=2`);
  return response.docs[0] || null;
}

export async function getBlogPosts(page = 1, limit = 12) {
  return await payloadGet<PayloadCollectionResponse<BlogPost>>(`/api/blogPosts?where[status][equals]=published&page=${page}&limit=${limit}&depth=1&sort=-publishDate`);
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
    const params = new URLSearchParams(authorsQuery);
    params.set('limit', String(limit + 1));
    params.set('depth', '1');
    params.set('sort', '-createdAt');

    const response = await payloadGet<PayloadCollectionResponse<Book>>(
      buildBookStorefrontPath(params)
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
    const addUnique = (docs: Book[]) => {
      for (const book of docs) {
        if (!seenIds.has(book.id) && relatedBooks.length < limit) {
          relatedBooks.push(book);
          seenIds.add(book.id);
        }
      }
    };

    // Strategy 1: Same curated collection (most specific)
    // collections from Payload is array of objects: [{ collectionName: 'civil-rights-movement' }]
    if (collections.length > 0 && relatedBooks.length < limit) {
      const collectionValues = collections
        .map((c: any) => (typeof c === 'string' ? c : c.collectionName))
        .filter(Boolean);
      if (collectionValues.length > 0) {
        const q = collectionValues.map((c: string) => `where[collections.collectionName][in]=${encodeURIComponent(c)}`).join('&');
        try {
          const params = new URLSearchParams(q);
          params.set('limit', String(limit * 2));
          params.set('depth', '1');
          const res = await payloadGet<PayloadCollectionResponse<Book>>(
            buildBookStorefrontPath(params)
          );
          addUnique(res.docs);
        } catch (e) {
          console.error('Error fetching books by collection:', e);
        }
      }
    }

    // Strategy 2: Same category (broader)
    const normalizedCategories = normalizeBookCategoryFilters(categories);
    if (normalizedCategories.length > 0 && relatedBooks.length < limit) {
      const q = normalizedCategories.map(c => `where[categories][in]=${encodeURIComponent(c)}`).join('&');
      try {
        const params = new URLSearchParams(q);
        params.set('limit', String(limit * 2));
        params.set('depth', '1');
        const res = await payloadGet<PayloadCollectionResponse<Book>>(
          buildBookStorefrontPath(params)
        );
        addUnique(res.docs);
      } catch (e) {
        console.error('Error fetching books by category:', e);
      }
    }

    // Strategy 3: Recent books as fallback
    if (relatedBooks.length < limit) {
      try {
        const params = new URLSearchParams({
          limit: String(limit * 2),
          depth: '1',
          sort: '-createdAt',
        });
        const res = await payloadGet<PayloadCollectionResponse<Book>>(
          buildBookStorefrontPath(params)
        );
        addUnique(res.docs);
      } catch (e) {
        console.error('Error fetching recent books:', e);
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

  // wellness-lifestyle / oils-incense are gated behind a human-reviewed
  // publishOnline flag (Square carries bulk supply SKUs and miscategorized
  // items). A "related products" rail must honor the same gate the detail
  // page and grid do, or an unreviewed product's name/price leaks onto a
  // live product page even though its own detail URL still 404s.
  const publishFilter =
    collection === 'wellness-lifestyle' || collection === 'oils-incense'
      ? '&where[publishOnline][equals]=true'
      : '';

  try {
    // Query by category
    if (categories && categories.length > 0) {
      const categoriesQuery = categories.map(c => `where[categories][in]=${encodeURIComponent(c)}`).join('&');

      try {
        const response = await payloadGet<PayloadCollectionResponse<any>>(
          `/api/${collection}?${categoriesQuery}&where[isActive][equals]=true${publishFilter}&limit=${limit * 2}&depth=1`
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
          `/api/${collection}?where[isActive][equals]=true${publishFilter}&limit=${limit * 2}&depth=1&sort=-createdAt`
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
