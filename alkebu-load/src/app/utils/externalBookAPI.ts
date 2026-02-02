import { RateLimiterMemory } from 'rate-limiter-flexible';
import * as cheerio from 'cheerio';

export interface ExternalBookData {
  title: string;
  author: string;
  isbn: string;
  isbn10?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  imageUrls?: string[];
  categories?: string[];
  subjects?: string[];
  pages?: number;
  language?: string;
  binding?: string;
  dimensions?: string;
  available: boolean;
  pricing?: Array<{
    source: string;
    price: number;
    currency: string;
    priceType: 'retail' | 'wholesale' | 'msrp' | 'used';
  }>;
  sourceData?: any;
}

export interface ExternalSearchResult {
  books: ExternalBookData[];
  source: string;
  totalFound: number;
  searchTime: number;
}

class ExternalBookAPI {
  private isbndbLimiter: RateLimiterMemory;
  private googleBooksLimiter: RateLimiterMemory;
  private openLibraryLimiter: RateLimiterMemory;
  private bookshopLimiter: RateLimiterMemory;

  constructor() {
    // Rate limiters for different APIs
    this.isbndbLimiter = new RateLimiterMemory({
      points: 100, // ISBNdb allows more requests per month
      duration: 86400, // Per day (24 hours)
    });

    this.googleBooksLimiter = new RateLimiterMemory({
      points: 1000, // Google Books is generous with free tier
      duration: 86400, // Per day
    });

    this.openLibraryLimiter = new RateLimiterMemory({
      points: 100, // Be respectful to Open Library
      duration: 3600, // Per hour
    });

    this.bookshopLimiter = new RateLimiterMemory({
      points: 30, // Very conservative for scraping
      duration: 3600, // Per hour
    });
  }

  /**
   * Search across all external book sources
   */
  async searchAllSources(query: string, options: {
    includeISBNdb?: boolean;
    includeGoogleBooks?: boolean;
    includeOpenLibrary?: boolean;
    includeBookshop?: boolean;
    maxResults?: number;
  } = {}): Promise<{
    results: ExternalBookData[];
    sources: string[];
    totalSearchTime: number;
  }> {
    const startTime = Date.now();
    const {
      includeISBNdb = true,
      includeGoogleBooks = true,
      includeOpenLibrary = true,
      includeBookshop = false, // Disabled by default due to scraping concerns
      maxResults = 20
    } = options;

    const searchPromises: Promise<ExternalSearchResult>[] = [];
    const sources: string[] = [];

    if (includeISBNdb && process.env.ISBNDB_API_KEY) {
      searchPromises.push(this.searchISBNdb(query, Math.ceil(maxResults / 3)));
      sources.push('ISBNdb');
    }

    if (includeGoogleBooks && process.env.GOOGLE_BOOKS_API_KEY) {
      searchPromises.push(this.searchGoogleBooks(query, Math.ceil(maxResults / 3)));
      sources.push('Google Books');
    }

    if (includeOpenLibrary) {
      searchPromises.push(this.searchOpenLibrary(query, Math.ceil(maxResults / 3)));
      sources.push('Open Library');
    }

    if (includeBookshop) {
      searchPromises.push(this.searchBookshop(query, Math.ceil(maxResults / 4)));
      sources.push('Bookshop.org');
    }

    try {
      const searchResults = await Promise.allSettled(searchPromises);
      const allBooks: ExternalBookData[] = [];

      for (const result of searchResults) {
        if (result.status === 'fulfilled') {
          allBooks.push(...result.value.books);
        } else {
          console.warn('External search failed:', result.reason);
        }
      }

      // Remove duplicates based on ISBN
      const uniqueBooks = this.deduplicateBooks(allBooks);

      // Sort by relevance and limit results
      const sortedBooks = uniqueBooks
        .sort((a, b) => this.calculateRelevanceScore(b, query) - this.calculateRelevanceScore(a, query))
        .slice(0, maxResults);

      return {
        results: sortedBooks,
        sources,
        totalSearchTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Error searching external sources:', error);
      return {
        results: [],
        sources,
        totalSearchTime: Date.now() - startTime
      };
    }
  }

  /**
   * Search ISBNdb API
   */
  async searchISBNdb(query: string, limit: number = 10): Promise<ExternalSearchResult> {
    const startTime = Date.now();

    if (!process.env.ISBNDB_API_KEY) {
      throw new Error('ISBNdb API key not configured');
    }

    try {
      await this.isbndbLimiter.consume('search');

      const response = await fetch(`https://api2.isbndb.com/books/${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': process.env.ISBNDB_API_KEY,
          'User-Agent': 'Alkebulanimages-BookSearch/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`ISBNdb API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const books: ExternalBookData[] = [];

      if (data.books) {
        for (const book of data.books.slice(0, limit)) {
          const bookData: ExternalBookData = {
            title: book.title || '',
            author: Array.isArray(book.authors) ? book.authors.join(', ') : (book.authors || ''),
            isbn: book.isbn13 || book.isbn || '',
            isbn10: book.isbn,
            publisher: book.publisher,
            publishedDate: book.date_published,
            description: book.overview || book.synopsis,
            imageUrls: book.image ? [book.image] : [],
            categories: book.subjects || [],
            subjects: book.subjects || [],
            pages: parseInt(book.pages) || undefined,
            language: book.language,
            binding: book.binding,
            dimensions: book.dimensions,
            available: true,
            sourceData: book
          };

          books.push(bookData);
        }
      }

      return {
        books,
        source: 'isbndb',
        totalFound: data.total || books.length,
        searchTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('ISBNdb search error:', error);
      return {
        books: [],
        source: 'isbndb',
        totalFound: 0,
        searchTime: Date.now() - startTime
      };
    }
  }

  /**
   * Search Google Books API
   */
  async searchGoogleBooks(query: string, limit: number = 10): Promise<ExternalSearchResult> {
    const startTime = Date.now();

    if (!process.env.GOOGLE_BOOKS_API_KEY) {
      throw new Error('Google Books API key not configured');
    }

    try {
      await this.googleBooksLimiter.consume('search');

      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${process.env.GOOGLE_BOOKS_API_KEY}&maxResults=${limit}&printType=books`
      );

      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const books: ExternalBookData[] = [];

      if (data.items) {
        for (const item of data.items) {
          const volumeInfo = item.volumeInfo;
          const saleInfo = item.saleInfo;

          // Find ISBN-13 or fallback to ISBN-10
          const isbn13 = volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier;
          const isbn10 = volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier;
          const isbn = isbn13 || isbn10;

          if (isbn) {
            const bookData: ExternalBookData = {
              title: volumeInfo.title || '',
              author: Array.isArray(volumeInfo.authors) ? volumeInfo.authors.join(', ') : (volumeInfo.authors || ''),
              isbn: isbn,
              isbn10: isbn10,
              publisher: volumeInfo.publisher,
              publishedDate: volumeInfo.publishedDate,
              description: volumeInfo.description,
              imageUrls: volumeInfo.imageLinks ? [
                volumeInfo.imageLinks.thumbnail,
                volumeInfo.imageLinks.small,
                volumeInfo.imageLinks.medium,
                volumeInfo.imageLinks.large
              ].filter(Boolean) : [],
              categories: volumeInfo.categories || [],
              subjects: volumeInfo.categories || [],
              pages: volumeInfo.pageCount,
              language: volumeInfo.language,
              binding: volumeInfo.printType,
              available: saleInfo?.saleability === 'FOR_SALE',
              pricing: saleInfo?.listPrice ? [{
                source: 'Google Books',
                price: saleInfo.listPrice.amount,
                currency: saleInfo.listPrice.currencyCode,
                priceType: 'retail' as const
              }] : [],
              sourceData: item
            };

            books.push(bookData);
          }
        }
      }

      return {
        books,
        source: 'google-books',
        totalFound: data.totalItems || books.length,
        searchTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Google Books search error:', error);
      return {
        books: [],
        source: 'google-books',
        totalFound: 0,
        searchTime: Date.now() - startTime
      };
    }
  }

  /**
   * Search Open Library API
   */
  async searchOpenLibrary(query: string, limit: number = 10): Promise<ExternalSearchResult> {
    const startTime = Date.now();

    try {
      await this.openLibraryLimiter.consume('search');

      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}&format=json`
      );

      if (!response.ok) {
        throw new Error(`Open Library API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const books: ExternalBookData[] = [];

      if (data.docs) {
        for (const doc of data.docs) {
          // Prioritize ISBN-13, fallback to ISBN-10
          const isbn13 = doc.isbn?.find((isbn: string) => isbn.length === 13);
          const isbn10 = doc.isbn?.find((isbn: string) => isbn.length === 10);
          const isbn = isbn13 || isbn10 || doc.isbn?.[0];

          if (isbn) {
            const bookData: ExternalBookData = {
              title: doc.title || '',
              author: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : (doc.author_name || ''),
              isbn: isbn,
              isbn10: isbn10,
              publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : doc.publisher,
              publishedDate: Array.isArray(doc.publish_date) ? doc.publish_date[0] : doc.publish_date,
              description: Array.isArray(doc.first_sentence) ? doc.first_sentence.join(' ') : doc.first_sentence,
              imageUrls: doc.cover_i ? [`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`] : [],
              categories: doc.subject || [],
              subjects: doc.subject || [],
              pages: doc.number_of_pages_median,
              language: Array.isArray(doc.language) ? doc.language[0] : doc.language,
              available: false, // Open Library doesn't provide purchase availability
              sourceData: doc
            };

            books.push(bookData);
          }
        }
      }

      return {
        books,
        source: 'open-library',
        totalFound: data.numFound || books.length,
        searchTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Open Library search error:', error);
      return {
        books: [],
        source: 'open-library',
        totalFound: 0,
        searchTime: Date.now() - startTime
      };
    }
  }

  /**
   * Search Bookshop.org (web scraping - use carefully)
   */
  async searchBookshop(query: string, limit: number = 5): Promise<ExternalSearchResult> {
    const startTime = Date.now();

    try {
      await this.bookshopLimiter.consume('search');

      const response = await fetch(
        `https://bookshop.org/search?keywords=${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': 'Alkebulanimages-BookSearch/1.0 (contact@alkebulanimages.com)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Bookshop.org error: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const books: ExternalBookData[] = [];

      // Parse search results (this would need to be updated based on Bookshop.org's HTML structure)
      $('.book-item').each((index, element) => {
        if (books.length >= limit) return false;

        const $book = $(element);
        const title = $book.find('.book-title').text().trim();
        const author = $book.find('.book-author').text().trim();
        const priceText = $book.find('.book-price').text().trim();
        const imageUrl = $book.find('.book-cover img').attr('src');

        if (title && author) {
          const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || undefined;

          const bookData: ExternalBookData = {
            title,
            author,
            isbn: '', // Would need to extract from detail page
            available: true,
            imageUrls: imageUrl ? [imageUrl] : [],
            pricing: price ? [{
              source: 'Bookshop.org',
              price,
              currency: 'USD',
              priceType: 'retail' as const
            }] : [],
            sourceData: { html: $book.html() }
          };

          books.push(bookData);
        }
      });

      return {
        books,
        source: 'bookshop',
        totalFound: books.length,
        searchTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Bookshop.org search error:', error);
      return {
        books: [],
        source: 'bookshop',
        totalFound: 0,
        searchTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get detailed information about a book by ISBN
   */
  async getBookByISBN(isbn: string, sources: string[] = ['isbndb', 'google-books', 'open-library']): Promise<ExternalBookData | null> {
    const searchPromises: Promise<ExternalSearchResult>[] = [];

    if (sources.includes('isbndb') && process.env.ISBNDB_API_KEY) {
      searchPromises.push(this.searchISBNdb(isbn, 1));
    }

    if (sources.includes('google-books') && process.env.GOOGLE_BOOKS_API_KEY) {
      searchPromises.push(this.searchGoogleBooks(`isbn:${isbn}`, 1));
    }

    if (sources.includes('open-library')) {
      searchPromises.push(this.searchOpenLibrary(`isbn:${isbn}`, 1));
    }

    try {
      const results = await Promise.allSettled(searchPromises);
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.books.length > 0) {
          return result.value.books[0];
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting book by ISBN:', error);
      return null;
    }
  }

  /**
   * Cache external book data in our database
   */
  async cacheBookData(payload: any, bookData: ExternalBookData, source: string) {
    try {
      // Check if book already exists in cache
      const existingBook = await payload.find({
        collection: 'externalBooks',
        where: {
          isbn: { equals: bookData.isbn }
        },
        limit: 1
      });

      if (existingBook.docs.length > 0) {
        // Update existing book
        await payload.update({
          collection: 'externalBooks',
          id: existingBook.docs[0].id,
          data: {
            ...bookData,
            source,
            lastUpdated: new Date().toISOString(),
            searchCount: (existingBook.docs[0].searchCount || 0) + 1
          }
        });
      } else {
        // Create new cache entry
        await payload.create({
          collection: 'externalBooks',
          data: {
            ...bookData,
            source,
            lastUpdated: new Date().toISOString(),
            searchCount: 1
          }
        });
      }
    } catch (error) {
      console.error('Error caching book data:', error);
    }
  }

  /**
   * Remove duplicate books based on ISBN
   */
  private deduplicateBooks(books: ExternalBookData[]): ExternalBookData[] {
    const seen = new Set<string>();
    const unique: ExternalBookData[] = [];

    for (const book of books) {
      if (book.isbn && !seen.has(book.isbn)) {
        seen.add(book.isbn);
        unique.push(book);
      }
    }

    return unique;
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevanceScore(book: ExternalBookData, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    // Title match
    if (book.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // Author match
    if (book.author.toLowerCase().includes(queryLower)) {
      score += 8;
    }

    // Description match
    if (book.description && book.description.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // Category/subject match
    if (book.categories?.some(cat => cat.toLowerCase().includes(queryLower))) {
      score += 3;
    }

    // Boost books with more complete data
    if (book.description) score += 2;
    if (book.imageUrls?.length) score += 1;
    if (book.publisher) score += 1;

    return score;
  }
}

// Export singleton instance
export const externalBookAPI = new ExternalBookAPI();
export default externalBookAPI;