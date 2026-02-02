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

// FlexSearch indices for different content types
class SearchEngine {
  private bookIndex: Document<any>;
  private blogIndex: Document<any>;
  private eventIndex: Document<any>;
  private businessIndex: Document<any>;
  private productIndex: Document<any>;
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
      index: ['title', 'author', 'description', 'tags', 'categories', 'subjects'],
      store: ['title', 'author', 'description', 'imageUrl', 'slug', 'price', 'isbn'],
      tag: ['category', 'availability', 'collection'],
      tokenize: 'forward',
      resolution: 3,
      minlength: 2,
      optimize: true,
      fastupdate: false
    });

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
    });

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
    });

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
    });

    // Products index (wellness, fashion, oils)
    this.productIndex = new Document({
      id: 'id',
      index: ['name', 'description', 'brand', 'tags', 'scent'],
      store: ['name', 'description', 'brand', 'imageUrl', 'price', 'type'],
      tag: ['category', 'type'],
      tokenize: 'forward',
      resolution: 3,
      minlength: 2,
      optimize: true,
      fastupdate: false
    });

    this.isInitialized = true;
  }

  // Add document to appropriate index
  async addDocument(type: string, doc: any) {
    if (!this.isInitialized) {
      this.initializeIndices();
    }

    try {
      switch (type) {
        case 'books':
          await this.bookIndex.addAsync(doc.id, {
            title: doc.title,
            author: doc.authors?.map((a: any) => a.name).join(' ') || doc.author,
            description: doc.description,
            tags: doc.tags?.map((t: any) => t.tag).join(' ') || '',
            categories: doc.categories?.join(' ') || '',
            subjects: doc.subjects?.map((s: any) => s.subject).join(' ') || '',
            imageUrl: doc.images?.[0]?.image?.url || '',
            slug: doc.slug || doc.id,
            price: doc.editions?.[0]?.price || 0,
            isbn: doc.editions?.[0]?.isbn || ''
          });
          break;

        case 'blogPosts':
          await this.blogIndex.addAsync(doc.id, {
            title: doc.title,
            excerpt: doc.excerpt,
            content: doc.content,
            tags: doc.tags?.map((t: any) => t.tag).join(' ') || '',
            author: doc.author?.name || doc.guestAuthor || '',
            imageUrl: doc.featuredImage?.url || '',
            slug: doc.slug,
            publishDate: doc.publishDate
          });
          break;

        case 'events':
          await this.eventIndex.addAsync(doc.id, {
            title: doc.title,
            description: doc.description,
            tags: doc.tags?.map((t: any) => t.tag).join(' ') || '',
            organizer: doc.organizer?.name || doc.guestOrganizer || '',
            startDate: doc.startDate,
            venue: doc.venue?.name || '',
            slug: doc.slug,
            imageUrl: doc.featuredImage?.url || ''
          });
          break;

        case 'businesses':
          await this.businessIndex.addAsync(doc.id, {
            name: doc.name,
            description: doc.description,
            services: doc.services?.map((s: any) => s.service).join(' ') || '',
            tags: doc.tags?.map((t: any) => t.tag).join(' ') || '',
            owner: doc.owner?.name || '',
            address: `${doc.address?.street} ${doc.address?.city}`,
            phone: doc.contact?.phone || '',
            imageUrl: doc.images?.[0]?.image?.url || '',
            slug: doc.slug
          });
          break;

        case 'wellnessLifestyle':
        case 'fashionJewelry':
        case 'oilsIncense':
          await this.productIndex.addAsync(doc.id, {
            name: doc.name,
            description: doc.description,
            brand: doc.brand || '',
            tags: doc.tags?.map((t: any) => t.tag).join(' ') || '',
            scent: doc.scent || doc.baseScent || '',
            imageUrl: doc.images?.[0]?.image?.url || '',
            price: doc.variants?.[0]?.price || doc.variations?.[0]?.price || 0,
            type: type
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
              const doc = await this.bookIndex.store[id as any];
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
              const doc = await this.blogIndex.store[id as any];
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
              const doc = await this.eventIndex.store[id as any];
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
              const doc = await this.businessIndex.store[id as any];
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
              const doc = await this.productIndex.store[id as any];
              if (doc) {
                results.push({
                  id: id as string,
                  type: doc.type as any,
                  title: doc.name,
                  excerpt: doc.description?.substring(0, 200) + '...',
                  imageUrl: doc.imageUrl,
                  price: doc.price,
                  score: 0.6,
                  metadata: { brand: doc.brand, type: doc.type }
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
      // Load existing data from collections
      const [books, blogPosts, events, businesses, wellnessProducts, fashionProducts, oilProducts] = await Promise.all([
        payload.find({ collection: 'books', limit: 1000 }),
        payload.find({ collection: 'blogPosts', limit: 1000, where: { status: { equals: 'published' } } }),
        payload.find({ collection: 'events', limit: 1000, where: { status: { equals: 'published' } } }),
        payload.find({ collection: 'businesses', limit: 1000, where: { status: { equals: 'published' } } }),
        payload.find({ collection: 'wellnessLifestyle', limit: 1000 }),
        payload.find({ collection: 'fashionJewelry', limit: 1000 }),
        payload.find({ collection: 'oilsIncense', limit: 1000 })
      ]);

      // Add documents to search indices
      for (const book of books.docs) {
        await this.addDocument('books', book);
      }

      for (const post of blogPosts.docs) {
        await this.addDocument('blogPosts', post);
      }

      for (const event of events.docs) {
        await this.addDocument('events', event);
      }

      for (const business of businesses.docs) {
        await this.addDocument('businesses', business);
      }

      for (const product of wellnessProducts.docs) {
        await this.addDocument('wellnessLifestyle', product);
      }

      for (const product of fashionProducts.docs) {
        await this.addDocument('fashionJewelry', product);
      }

      for (const product of oilProducts.docs) {
        await this.addDocument('oilsIncense', product);
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