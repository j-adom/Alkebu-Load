import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { externalBookAPI } from '@/app/utils/externalBookAPI';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const isbn = searchParams.get('isbn');
    const sources = searchParams.get('sources')?.split(',') || ['isbndb', 'google-books', 'open-library'];
    const limit = parseInt(searchParams.get('limit') || '10');
    const cache = searchParams.get('cache') !== 'false';

    if (!query && !isbn) {
      return NextResponse.json(
        { error: 'Query parameter "q" or "isbn" is required' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // If ISBN is provided, try exact lookup first
    if (isbn) {
      // Check cache first
      if (cache) {
        const cachedBook = await payload.find({
          collection: 'externalBooks',
          where: {
            isbn: { equals: isbn },
            isStale: { equals: false }
          },
          limit: 1
        });

        if (cachedBook.docs.length > 0) {
          return NextResponse.json({
            books: [cachedBook.docs[0]],
            fromCache: true,
            sources: [cachedBook.docs[0].source],
            totalSearchTime: 0
          });
        }
      }

      // Search external sources by ISBN
      const book = await externalBookAPI.getBookByISBN(isbn, sources);

      if (book) {
        // Cache the result
        if (cache) {
          await externalBookAPI.cacheBookData(payload, book, book.sourceData?.source || 'unknown');
        }

        return NextResponse.json({
          books: [book],
          fromCache: false,
          sources: [book.sourceData?.source || 'unknown'],
          totalSearchTime: 0
        });
      } else {
        return NextResponse.json({
          books: [],
          fromCache: false,
          sources: sources,
          totalSearchTime: 0,
          message: 'Book not found'
        });
      }
    }

    // Search by query
    if (query) {
      // Check cache for recent searches
      if (cache) {
        const recentSearches = await payload.find({
          collection: 'externalBooks',
          where: {
            or: [
              { title: { contains: query } },
              { author: { contains: query } }
            ],
            isStale: { equals: false }
          },
          limit: Math.min(limit, 10)
        });

        if (recentSearches.docs.length > 0) {
          return NextResponse.json({
            books: recentSearches.docs,
            fromCache: true,
            sources: [...new Set(recentSearches.docs.map(book => book.source))],
            totalSearchTime: 0
          });
        }
      }

      // Search external sources
      const searchOptions = {
        includeISBNdb: sources.includes('isbndb'),
        includeGoogleBooks: sources.includes('google-books'),
        includeOpenLibrary: sources.includes('open-library'),
        includeBookshop: sources.includes('bookshop'),
        maxResults: limit
      };

      const searchResult = await externalBookAPI.searchAllSources(query, searchOptions);

      // Cache the results
      if (cache) {
        for (const book of searchResult.results) {
          await externalBookAPI.cacheBookData(payload, book, book.sourceData?.source || 'unknown');
        }
      }

      return NextResponse.json({
        books: searchResult.results,
        fromCache: false,
        sources: searchResult.sources,
        totalSearchTime: searchResult.totalSearchTime
      });
    }

  } catch (error) {
    console.error('External books API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, bookId, isbn } = body;

    if (action === 'import' && bookId) {
      // Import external book to internal catalog
      const payload = await getPayload({ config });

      const externalBook = await payload.findByID({
        collection: 'externalBooks',
        id: bookId
      });

      if (!externalBook) {
        return NextResponse.json(
          { error: 'External book not found' },
          { status: 404 }
        );
      }

      // Check if book already exists in internal catalog
      const existingBook = await payload.find({
        collection: 'books',
        where: {
          'editions.isbn': { equals: externalBook.isbn }
        },
        limit: 1
      });

      if (existingBook.docs.length > 0) {
        return NextResponse.json(
          { error: 'Book already exists in catalog' },
          { status: 409 }
        );
      }

      // Create new book in internal catalog
      const newBook = await payload.create({
        collection: 'books',
        data: {
          title: externalBook.title,
          titleLong: externalBook.titleLong,
          authorsText: externalBook.authors || [],
          publisherText: externalBook.publisher,
          description: externalBook.description,
          synopsis: externalBook.synopsis,
          editions: [{
            isbn: externalBook.isbn,
            isbn10: externalBook.isbn10,
            publisherText: externalBook.publisher,
            datePublished: externalBook.publishedDate,
            binding: externalBook.binding,
            pages: externalBook.pages,
            language: externalBook.language,
            dimensions: externalBook.dimensions,
            isAvailable: externalBook.available
          }],
          rawCategories: externalBook.categories || [],
          subjects: externalBook.subjects || [],
          scrapedImageUrls: externalBook.imageUrls || [],
          importSource: 'manual',
          importDate: new Date().toISOString(),
          isActive: false // Require manual activation
        } as any
      });

      // Mark external book as imported
      await payload.update({
        collection: 'externalBooks',
        id: bookId,
        data: {
          imported: true,
          importedBookId: newBook.id,
          importReason: 'other'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Book imported successfully',
        bookId: newBook.id
      });
    }

    if (action === 'refresh' && isbn) {
      // Refresh cached external book data
      const payload = await getPayload({ config });

      // Get fresh data from external sources
      const freshBook = await externalBookAPI.getBookByISBN(isbn);

      if (freshBook) {
        // Update cached data
        const existingCache = await payload.find({
          collection: 'externalBooks',
          where: {
            isbn: { equals: isbn }
          },
          limit: 1
        });

        if (existingCache.docs.length > 0) {
          await payload.update({
            collection: 'externalBooks',
            id: existingCache.docs[0].id,
            data: {
              ...freshBook,
              lastUpdated: new Date().toISOString(),
              isStale: false
            } as any
          });
        } else {
          await externalBookAPI.cacheBookData(payload, freshBook, freshBook.sourceData?.source || 'unknown');
        }

        return NextResponse.json({
          success: true,
          message: 'Book data refreshed successfully',
          book: freshBook
        });
      } else {
        return NextResponse.json(
          { error: 'Book not found in external sources' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('External books POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}