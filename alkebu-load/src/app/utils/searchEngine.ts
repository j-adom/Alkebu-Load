import FlexSearch, { Document } from 'flexsearch';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Types for search results
export interface SearchResult {
  id: string;
  title: string;
  type: 'books' | 'blogPosts' | 'events' | 'businesses' | 'wellnessLifestyle' | 'fashionJewelry' | 'oilsIncense';
  excerpt?: string;
  author?: string;
  imageUrl?: string;
  price?: number;
  slug?: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface ExternalBookResult {
  id: string;
  title: string;
  author: string;
  isbn: string;
  source: 'isbndb' | 'google-books' | 'open-library' | 'bookshop';
  imageUrl?: string;
  description?: string;
  price?: number;
  available: boolean;
  estimatedDelivery?: string;
}

export interface SearchResponse {
  internal: SearchResult[];
  external: ExternalBookResult[];
  totalResults: number;
  searchTime: number;
  suggestions?: string[];
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

type SearchBootstrapTarget = {
  collection: string;
  type: SearchResult['type'];
  where?: Record<string, unknown>;
};

export const SEARCH_INDEX_BOOTSTRAP_TARGETS: SearchBootstrapTarget[] = [
  {
    collection: 'books',
    type: 'books',
    where: { availabilityStatus: { not_equals: 'discontinued' } },
  },
  { collection: 'blogPosts', type: 'blogPosts', where: { status: { equals: 'published' } } },
  { collection: 'events', type: 'events', where: { status: { equals: 'published' } } },
  { collection: 'businesses', type: 'businesses', where: { status: { equals: 'published' } } },
  {
    collection: 'wellness-lifestyle',
    type: 'wellnessLifestyle',
    // Curation gate: Square carries bulk supply SKUs and miscategorized items
    // (a djembe drum, a line item named "Shipping") that must never be
    // searchable until a human approves them.
    where: { publishOnline: { equals: true } },
  },
  { collection: 'fashion-jewelry', type: 'fashionJewelry' },
  {
    collection: 'oils-incense',
    type: 'oilsIncense',
    // Same curation gate as wellness-lifestyle.
    where: { publishOnline: { equals: true } },
  },
];

export function getSearchBootstrapTargets(availableCollectionSlugs?: string[]): SearchBootstrapTarget[] {
  if (!availableCollectionSlugs || availableCollectionSlugs.length === 0) {
    return SEARCH_INDEX_BOOTSTRAP_TARGETS;
  }

  const available = new Set(availableCollectionSlugs);
  return SEARCH_INDEX_BOOTSTRAP_TARGETS.filter(({ collection }) => available.has(collection));
}

function getAvailableCollectionSlugs(payload: any): string[] {
  const runtimeCollections = Object.keys(payload?.collections ?? {});
  if (runtimeCollections.length > 0) {
    return runtimeCollections;
  }

  const configuredCollections = (payload?.config?.collections ?? [])
    .map((collection: any) => collection?.slug)
    .filter(Boolean);

  return configuredCollections;
}

function extractLexicalText(node: unknown): string {
  if (!node || typeof node !== 'object') {
    return '';
  }

  const lexicalNode = node as Record<string, unknown>;
  const text = lexicalNode.text;
  if (typeof text === 'string') {
    return text;
  }

  const children = lexicalNode.children;
  if (Array.isArray(children)) {
    return children
      .map((child) => extractLexicalText(child))
      .filter(Boolean)
      .join(' ');
  }

  return '';
}

export function toSearchText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => toSearchText(entry))
      .filter(Boolean)
      .join(' ');
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    if (record.root && typeof record.root === 'object') {
      return extractLexicalText(record.root);
    }

    return Object.values(record)
      .map((entry) => toSearchText(entry))
      .filter(Boolean)
      .join(' ');
  }

  return '';
}

// FlexSearch indices for different content types
class SearchEngine {
  private bookIndex!: Document<any>;
  private blogIndex!: Document<any>;
  private eventIndex!: Document<any>;
  private businessIndex!: Document<any>;
  private productIndex!: Document<any>;
  private isInitialized = false;
  private rateLimiter: RateLimiterMemory;

  constructor() {
    // Rate limiter for external API calls
    this.rateLimiter = new RateLimiterMemory({
      points: 10, // Number of requests
      duration: 60, // Per 60 seconds
    });

    this.initializeIndices();
  }

  private initializeIndices() {
    // Books index
    this.bookIndex = new Document({
      id: 'id',
      index: ['title', 'author', 'description', 'tags', 'categories', 'subjects', 'isbns'],
      store: ['title', 'author', 'description', 'imageUrl', 'slug', 'price', 'isbn', 'isbns'],
      tag: ['category', 'availability', 'collection'],
      tokenize: 'forward',
      resolution: 3,
      minlength: 2,
      optimize: true,
      fastupdate: false
    } as any);

    // Blog posts index
    this.blogIndex = new Document({
      id: 'id',
      index: ['title', 'excerpt', 'content', 'tags', 'author'],
      store: ['title', 'excerpt', 'author', 'imageUrl', 'slug', 'publishDate'],
      tag: ['category', 'status'],
      tokenize: 'forward',
      resolution: 3,
      minlength: 2,
      optimize: true,
      fastupdate: false
    } as any);

    // Events index
    this.eventIndex = new Document({
      id: 'id',
      index: ['title', 'description', 'tags', 'organizer'],
      store: ['title', 'description', 'startDate', 'venue', 'slug', 'imageUrl'],
      tag: ['eventType', 'status'],
      tokenize: 'forward',
      resolution: 3,
      minlength: 2,
      optimize: true,
      fastupdate: false
    } as any);

    // Business directory index
    this.businessIndex = new Document({
      id: 'id',
      index: ['name', 'description', 'services', 'tags', 'owner'],
      store: ['name', 'description', 'address', 'phone', 'imageUrl', 'slug'],
      tag: ['category', 'neighborhood'],
      tokenize: 'forward',
      resolution: 3,
      minlength: 2,
      optimize: true,
      fastupdate: false
    } as any);

    // Products index (wellness, fashion, oils)
    this.productIndex = new Document({
      id: 'id',
      index: ['name', 'description', 'brand', 'tags', 'scent'],
      store: ['name', 'description', 'brand', 'imageUrl', 'price', 'type', 'slug', 'productType'],
      tag: ['category', 'type'],
      tokenize: 'forward',
      resolution: 3,
      minlength: 2,
      optimize: true,
      fastupdate: false
    } as any);

    this.isInitialized = true;
  }

  // Add document to appropriate index
  async addDocument(type: string, doc: any) {
    if (!this.isInitialized) {
      this.initializeIndices();
    }

    try {
      switch (type) {
        case 'books': {
          if (doc?.availabilityStatus === 'discontinued') {
            return;
          }

          const editions: any[] = doc.editions || [];
          // Prefer in-stock edition, then most recently published, then first
          const inStock = editions.find((e: any) => (e.inventory?.stockLevel ?? 0) > 0);
          const mostRecent = editions
            .filter((e: any) => e.datePublished)
            .sort((a: any, b: any) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime())[0];
          const bestEdition = inStock || mostRecent || editions[0];
          const isbn = bestEdition?.isbn || bestEdition?.isbn10 || '';
          const bookSlug = isbn ? `${doc.slug || doc.id}/${isbn}` : (doc.slug || doc.id);
          const isbns = editions.map((e: any) => e.isbn || e.isbn10 || '').filter(Boolean).join(' ');
          // authorsText (denormalized array of {name}) is the populated source
          // for imported books; authors relationship is mostly empty.
          const authorNamesForIndex = [
            ...(Array.isArray(doc.authors) ? doc.authors.map((a: any) => a?.name).filter(Boolean) : []),
            ...(Array.isArray(doc.authorsText) ? doc.authorsText.map((a: any) => a?.name).filter(Boolean) : []),
          ].filter(Boolean).join(' ') || doc.author || ''
          await this.bookIndex.addAsync(doc.id, {
            title: toSearchText(doc.title),
            author: toSearchText(authorNamesForIndex),
            description: toSearchText(doc.description ?? doc.synopsis ?? doc.excerpt),
            tags: toSearchText(doc.tags?.map((t: any) => t.tag) || ''),
            categories: toSearchText(doc.categories),
            subjects: toSearchText(doc.subjects?.map((s: any) => s.subject) || ''),
            imageUrl: toSearchText(doc.images?.[0]?.image?.url || doc.images?.[0]?.url || ''),
            slug: bookSlug,
            price: bestEdition?.pricing?.retailPrice || 0,
            isbn,
            isbns,
          });
          break;
        }

        case 'blogPosts':
          await this.blogIndex.addAsync(doc.id, {
            title: toSearchText(doc.title),
            excerpt: toSearchText(doc.excerpt),
            content: toSearchText(doc.content),
            tags: toSearchText(doc.tags?.map((t: any) => t.tag) || ''),
            author: toSearchText(doc.author?.name || doc.guestAuthor || ''),
            imageUrl: toSearchText(doc.featuredImage?.url || ''),
            slug: doc.slug,
            publishDate: doc.publishDate
          });
          break;

        case 'events':
          await this.eventIndex.addAsync(doc.id, {
            title: toSearchText(doc.title),
            description: toSearchText(doc.description ?? doc.shortDescription),
            tags: toSearchText(doc.tags?.map((t: any) => t.tag) || ''),
            organizer: toSearchText(doc.organizer?.name || doc.guestOrganizer || ''),
            startDate: doc.startDate,
            venue: toSearchText(doc.venue?.name || doc.venue || ''),
            slug: doc.slug,
            imageUrl: toSearchText(doc.featuredImage?.url || '')
          });
          break;

        case 'businesses':
          await this.businessIndex.addAsync(doc.id, {
            name: toSearchText(doc.name),
            description: toSearchText(doc.description ?? doc.shortDescription),
            services: toSearchText(doc.services?.map((s: any) => s.service) || ''),
            tags: toSearchText(doc.tags?.map((t: any) => t.tag) || ''),
            owner: toSearchText(doc.owner?.name || ''),
            address: toSearchText(`${doc.address?.street || ''} ${doc.address?.city || ''}`),
            phone: toSearchText(doc.contact?.phone || ''),
            imageUrl: toSearchText(doc.images?.[0]?.image?.url || doc.images?.[0]?.url || ''),
            slug: doc.slug
          });
          break;

        case 'wellnessLifestyle':
        case 'fashionJewelry':
        case 'oilsIncense':
          await this.productIndex.addAsync(doc.id, {
            name: toSearchText(doc.name || doc.title),
            description: toSearchText(doc.description),
            brand: toSearchText(doc.brand?.name || doc.brand || ''),
            tags: toSearchText(doc.tags?.map((t: any) => t.tag) || ''),
            scent: toSearchText(doc.scent || doc.baseScent || ''),
            imageUrl: toSearchText(doc.images?.[0]?.image?.url || doc.images?.[0]?.url || ''),
            price: doc.variants?.[0]?.price || doc.variations?.[0]?.price || 0,
            type: type,
            slug: doc.slug,
            // OilsIncense-only field; undefined for wellnessLifestyle/fashionJewelry.
            // Carried through so the storefront can route oils-incense hits to the
            // correct section (health-and-beauty vs home-goods) instead of
            // guessing from the collection-level `type` alone.
            productType: doc.productType
          });
          break;
      }
    } catch (error) {
      console.error(`Error adding document to ${type} index:`, error);
    }
  }

  // Search across all indices
  async search(query: string, options: {
    types?: string[];
    limit?: number;
    filters?: Record<string, string[]>;
    includeExternal?: boolean;
  } = {}): Promise<SearchResponse> {
    const startTime = Date.now();
    const { types = ['books', 'blogPosts', 'events', 'businesses', 'products'], limit = 20, filters = {}, includeExternal = false } = options;

    const results: SearchResult[] = [];
    const suggestions: string[] = [];

    try {
      // Search books
      if (types.includes('books')) {
        const bookResults = await this.bookIndex.searchAsync(query, { limit: Math.floor(limit / types.length) + 5 });
        for (const result of bookResults) {
          if (Array.isArray(result.result)) {
            for (const id of result.result) {
              const doc = await (this.bookIndex as any).store[id as any];
              if (doc) {
                results.push({
                  id: id as string,
                  type: 'books',
                  title: doc.title,
                  author: doc.author,
                  excerpt: doc.description?.substring(0, 200) + '...',
                  imageUrl: doc.imageUrl,
                  slug: doc.slug,
                  price: doc.price,
                  score: 1.0,
                  metadata: { isbn: doc.isbn }
                });
              }
            }
          }
        }
      }

      // Search blog posts
      if (types.includes('blogPosts')) {
        const blogResults = await this.blogIndex.searchAsync(query, { limit: Math.floor(limit / types.length) + 5 });
        for (const result of blogResults) {
          if (Array.isArray(result.result)) {
            for (const id of result.result) {
              const doc = await (this.blogIndex as any).store[id as any];
              if (doc) {
                results.push({
                  id: id as string,
                  type: 'blogPosts',
                  title: doc.title,
                  author: doc.author,
                  excerpt: doc.excerpt,
                  imageUrl: doc.imageUrl,
                  slug: doc.slug,
                  score: 0.8,
                  metadata: { publishDate: doc.publishDate }
                });
              }
            }
          }
        }
      }

      // Search events
      if (types.includes('events')) {
        const eventResults = await this.eventIndex.searchAsync(query, { limit: Math.floor(limit / types.length) + 5 });
        for (const result of eventResults) {
          if (Array.isArray(result.result)) {
            for (const id of result.result) {
              const doc = await (this.eventIndex as any).store[id as any];
              if (doc) {
                results.push({
                  id: id as string,
                  type: 'events',
                  title: doc.title,
                  excerpt: doc.description?.substring(0, 200) + '...',
                  imageUrl: doc.imageUrl,
                  slug: doc.slug,
                  score: 0.9,
                  metadata: { startDate: doc.startDate, venue: doc.venue }
                });
              }
            }
          }
        }
      }

      // Search businesses
      if (types.includes('businesses')) {
        const businessResults = await this.businessIndex.searchAsync(query, { limit: Math.floor(limit / types.length) + 5 });
        for (const result of businessResults) {
          if (Array.isArray(result.result)) {
            for (const id of result.result) {
              const doc = await (this.businessIndex as any).store[id as any];
              if (doc) {
                results.push({
                  id: id as string,
                  type: 'businesses',
                  title: doc.name,
                  excerpt: doc.description?.substring(0, 200) + '...',
                  imageUrl: doc.imageUrl,
                  slug: doc.slug,
                  score: 0.7,
                  metadata: { address: doc.address, phone: doc.phone }
                });
              }
            }
          }
        }
      }

      // Search products
      if (types.includes('products')) {
        const productResults = await this.productIndex.searchAsync(query, { limit: Math.floor(limit / types.length) + 5 });
        for (const result of productResults) {
          if (Array.isArray(result.result)) {
            for (const id of result.result) {
              const doc = await (this.productIndex as any).store[id as any];
              if (doc) {
                results.push({
                  id: id as string,
                  type: doc.type as any,
                  title: doc.name,
                  excerpt: doc.description?.substring(0, 200) + '...',
                  imageUrl: doc.imageUrl,
                  price: doc.price,
                  slug: doc.slug,
                  score: 0.6,
                  metadata: { brand: doc.brand, type: doc.type, productType: doc.productType }
                });
              }
            }
          }
        }
      }

      // Sort results by score
      results.sort((a, b) => b.score - a.score);

      const searchTime = Date.now() - startTime;
      let externalResults: ExternalBookResult[] = [];

      // If no internal results and external search is enabled, search external sources
      if (results.length === 0 && includeExternal) {
        externalResults = await this.searchExternalBooks(query);
      }

      return {
        internal: results.slice(0, limit),
        external: externalResults,
        totalResults: results.length + externalResults.length,
        searchTime,
        suggestions,
        facets: this.generateFacets(results)
      };

    } catch (error) {
      console.error('Search error:', error);
      return {
        internal: [],
        external: [],
        totalResults: 0,
        searchTime: Date.now() - startTime,
        suggestions,
        facets: {}
      };
    }
  }

  // Search external book sources
  private async searchExternalBooks(query: string): Promise<ExternalBookResult[]> {
    const results: ExternalBookResult[] = [];

    try {
      // Respect rate limits
      await this.rateLimiter.consume('external-search');

      // Search multiple external sources in parallel
      const [isbndbResults, googleBooksResults, openLibraryResults] = await Promise.allSettled([
        this.searchISBNdb(query),
        this.searchGoogleBooks(query),
        this.searchOpenLibrary(query)
      ]);

      // Process ISBNdb results
      if (isbndbResults.status === 'fulfilled') {
        results.push(...isbndbResults.value);
      }

      // Process Google Books results
      if (googleBooksResults.status === 'fulfilled') {
        results.push(...googleBooksResults.value);
      }

      // Process Open Library results
      if (openLibraryResults.status === 'fulfilled') {
        results.push(...openLibraryResults.value);
      }

      // Remove duplicates based on ISBN
      const uniqueResults = results.reduce((acc, book) => {
        if (!acc.find(existing => existing.isbn === book.isbn)) {
          acc.push(book);
        }
        return acc;
      }, [] as ExternalBookResult[]);

      return uniqueResults.slice(0, 10); // Limit external results
    } catch (error) {
      console.error('External search error:', error);
      return [];
    }
  }

  // Search ISBNdb API
  private async searchISBNdb(query: string): Promise<ExternalBookResult[]> {
    const results: ExternalBookResult[] = [];

    if (!process.env.ISBNDB_API_KEY) {
      return results;
    }

    try {
      const response = await fetch(`https://api2.isbndb.com/books/${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': process.env.ISBNDB_API_KEY,
          'User-Agent': 'Alkebulanimages-BookSearch/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.books) {
          for (const book of data.books.slice(0, 5)) {
            results.push({
              id: book.isbn13 || book.isbn,
              title: book.title || '',
              author: book.authors?.join(', ') || '',
              isbn: book.isbn13 || book.isbn,
              source: 'isbndb',
              imageUrl: book.image,
              description: book.overview,
              available: true,
              estimatedDelivery: '3-5 business days'
            });
          }
        }
      }
    } catch (error) {
      console.error('ISBNdb search error:', error);
    }

    return results;
  }

  // Search Google Books API
  private async searchGoogleBooks(query: string): Promise<ExternalBookResult[]> {
    const results: ExternalBookResult[] = [];

    if (!process.env.GOOGLE_BOOKS_API_KEY) {
      return results;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${process.env.GOOGLE_BOOKS_API_KEY}&maxResults=5`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.items) {
          for (const item of data.items) {
            const volumeInfo = item.volumeInfo;
            const isbn = volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier ||
              volumeInfo.industryIdentifiers?.[0]?.identifier;

            if (isbn) {
              results.push({
                id: item.id,
                title: volumeInfo.title || '',
                author: volumeInfo.authors?.join(', ') || '',
                isbn: isbn,
                source: 'google-books',
                imageUrl: volumeInfo.imageLinks?.thumbnail,
                description: volumeInfo.description,
                available: false, // Google Books doesn't provide availability
                estimatedDelivery: 'Contact for quote'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Google Books search error:', error);
    }

    return results;
  }

  // Search Open Library API
  private async searchOpenLibrary(query: string): Promise<ExternalBookResult[]> {
    const results: ExternalBookResult[] = [];

    try {
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.docs) {
          for (const doc of data.docs) {
            const isbn = doc.isbn?.[0];
            if (isbn) {
              results.push({
                id: doc.key,
                title: doc.title || '',
                author: doc.author_name?.join(', ') || '',
                isbn: isbn,
                source: 'open-library',
                imageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
                description: doc.first_sentence?.join(' '),
                available: false,
                estimatedDelivery: 'Contact for quote'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Open Library search error:', error);
    }

    return results;
  }

  // Generate facets for filtering
  private generateFacets(results: SearchResult[]): Record<string, Array<{ value: string; count: number }>> {
    const facets: Record<string, Array<{ value: string; count: number }>> = {
      type: [],
      price: [],
      availability: []
    };

    // Type facet
    const typeCounts = results.reduce((acc, result) => {
      acc[result.type] = (acc[result.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    facets.type = Object.entries(typeCounts).map(([value, count]) => ({ value, count }));

    // Price facet (for products)
    const priceRanges = ['$0-$20', '$20-$50', '$50-$100', '$100+'];
    facets.price = priceRanges.map(range => ({ value: range, count: 0 }));

    return facets;
  }

  // Initialize search index with existing data
  async initializeWithData(payload: any) {
    try {
      const availableCollections = getAvailableCollectionSlugs(payload);
      const bootstrapTargets = getSearchBootstrapTargets(availableCollections);

      const results = await Promise.all(
        bootstrapTargets.map(async ({ collection, type, where }) => ({
          type,
          result: await payload.find({
            collection,
            limit: 1000,
            ...(where ? { where } : {}),
          }),
        })),
      );

      for (const { type, result } of results) {
        for (const doc of result.docs) {
          await this.addDocument(type, doc);
        }
      }

      console.log('Search indices initialized with existing data');
    } catch (error) {
      console.error('Error initializing search indices:', error);
    }
  }
}

// Export singleton instance
export const searchEngine = new SearchEngine();
export default searchEngine;
