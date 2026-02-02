import { getPayload } from 'payload';
import { config as dotenvConfig } from 'dotenv';
import { findOrCreateAuthor } from '../src/app/utils/authorMatching';

// Load environment variables
dotenvConfig({ path: './.env' });

/**
 * Script to enrich existing books using ISBNdb and Google Books APIs
 * This will:
 * 1. Find books with ISBNs but missing data (authors, descriptions, etc.)
 * 2. Fetch data from external APIs
 * 3. Update books with enriched data
 * 4. Link authors to books
 */

interface ISBNdbBook {
  title?: string;
  title_long?: string;
  authors?: string[];
  publisher?: string;
  date_published?: string;
  synopsis?: string;
  overview?: string;
  subjects?: string[];
  pages?: number;
  language?: string;
  binding?: string;
  image?: string;
}

interface GoogleBooksItem {
  volumeInfo: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    categories?: string[];
    pageCount?: number;
    language?: string;
    imageLinks?: {
      thumbnail?: string;
      small?: string;
    };
  };
}

// Fetch from ISBNdb
async function fetchFromISBNdb(isbn: string): Promise<ISBNdbBook | null> {
  if (!process.env.ISBNDB_API_KEY) {
    console.warn('⚠️  ISBNdb API key not configured');
    return null;
  }

  try {
    const response = await fetch(`https://api2.isbndb.com/book/${isbn}`, {
      headers: {
        'Authorization': process.env.ISBNDB_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Book not found
      }
      throw new Error(`ISBNdb API error: ${response.status}`);
    }

    const data = await response.json();
    return data.book || null;
  } catch (error: any) {
    console.error(`ISBNdb error for ${isbn}:`, error.message);
    return null;
  }
}

// Fetch from Google Books
async function fetchFromGoogleBooks(isbn: string): Promise<GoogleBooksItem | null> {
  try {
    // Google Books works without API key for basic searches
    // Adding API key increases rate limits but is optional
    const url = process.env.GOOGLE_BOOKS_API_KEY
      ? `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${process.env.GOOGLE_BOOKS_API_KEY}`
      : `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }

    const data = await response.json();
    return data.items?.[0] || null;
  } catch (error: any) {
    console.error(`Google Books error for ${isbn}:`, error.message);
    return null;
  }
}

// Merge data from multiple sources
function mergeBookData(existing: any, isbndb: ISBNdbBook | null, google: GoogleBooksItem | null) {
  const updates: any = {};

  // Title
  if (!existing.title && (isbndb?.title || google?.volumeInfo.title)) {
    updates.title = isbndb?.title || google?.volumeInfo.title;
  }
  if (!existing.titleLong && isbndb?.title_long) {
    updates.titleLong = isbndb.title_long;
  }

  // Authors
  const authors = isbndb?.authors || google?.volumeInfo.authors || [];
  if (authors.length > 0 && (!existing.authorsText || existing.authorsText.length === 0)) {
    updates.authorsText = authors.map(name => ({ name }));
  }

  // Publisher
  if (!existing.publisherText && (isbndb?.publisher || google?.volumeInfo.publisher)) {
    updates.publisherText = isbndb?.publisher || google?.volumeInfo.publisher;
  }

  // Description/Synopsis
  if (!existing.synopsis && (isbndb?.synopsis || google?.volumeInfo.description)) {
    updates.synopsis = isbndb?.synopsis || google?.volumeInfo.description?.substring(0, 500);
  }

  // Subjects
  const subjects = isbndb?.subjects || google?.volumeInfo.categories || [];
  if (subjects.length > 0 && (!existing.subjects || existing.subjects.length === 0)) {
    updates.subjects = subjects.map(subject => ({ subject }));
  }

  // Image URLs
  const imageUrls: string[] = [];
  if (isbndb?.image) imageUrls.push(isbndb.image);
  if (google?.volumeInfo.imageLinks?.thumbnail) imageUrls.push(google.volumeInfo.imageLinks.thumbnail);
  if (google?.volumeInfo.imageLinks?.small) imageUrls.push(google.volumeInfo.imageLinks.small);

  if (imageUrls.length > 0 && (!existing.scrapedImageUrls || existing.scrapedImageUrls.length === 0)) {
    updates.scrapedImageUrls = imageUrls.map(url => ({ url }));
  }

  // Update edition data if missing
  if (existing.editions && existing.editions.length > 0) {
    const edition = existing.editions[0];
    const editionUpdates: any = {};

    if (!edition.pages && (isbndb?.pages || google?.volumeInfo.pageCount)) {
      editionUpdates.pages = isbndb?.pages || google?.volumeInfo.pageCount;
    }
    if (!edition.language && (isbndb?.language || google?.volumeInfo.language)) {
      editionUpdates.language = isbndb?.language || google?.volumeInfo.language;
    }
    if (!edition.binding && isbndb?.binding) {
      editionUpdates.binding = isbndb.binding.toLowerCase();
    }
    if (!edition.datePublished && (isbndb?.date_published || google?.volumeInfo.publishedDate)) {
      editionUpdates.datePublished = isbndb?.date_published || google?.volumeInfo.publishedDate;
    }
    if (!edition.publisherText && (isbndb?.publisher || google?.volumeInfo.publisher)) {
      editionUpdates.publisherText = isbndb?.publisher || google?.volumeInfo.publisher;
    }

    if (Object.keys(editionUpdates).length > 0) {
      updates.editions = [{
        ...edition,
        ...editionUpdates
      }];
    }
  }

  return updates;
}

// Link authors after enrichment using smart fuzzy matching
async function linkAuthors(payload: any, bookId: number, authorsText: Array<{ name: string }>) {
  const authorIds: number[] = [];

  for (const authorText of authorsText) {
    const authorName = authorText.name?.trim();
    if (!authorName) continue;

    // Use smart fuzzy matching to find or create author
    const author = await findOrCreateAuthor(payload, authorName);

    if (author.wasCreated) {
      console.log(`    ✨ Created author: ${author.name}`);
    } else {
      console.log(`    🔗 Matched existing: ${author.name}`);
    }

    authorIds.push(author.id);
  }

  if (authorIds.length > 0) {
    await payload.update({
      collection: 'books',
      id: bookId,
      data: {
        authors: authorIds
      }
    });
  }
}

const enrichBooks = async () => {
  try {
    console.log('🚀 Starting book enrichment from ISBNdb and Google Books...\n');

    if (!process.env.ISBNDB_API_KEY) {
      console.warn('⚠️  ISBNdb API key not configured - will only use Google Books');
      console.log('   Get ISBNdb key at: https://isbndb.com\n');
    }

    if (!process.env.GOOGLE_BOOKS_API_KEY) {
      console.log('ℹ️  Google Books API key not configured - using public API (lower rate limits)');
      console.log('   Get API key at: https://console.cloud.google.com for higher limits\n');
    }

    // Import and initialize Payload
    const { default: config } = await import('../src/payload.config');
    let resolvedConfig = config;
    if (config && typeof config.then === 'function') {
      resolvedConfig = await config;
    }

    const payload = await getPayload({ config: resolvedConfig });
    console.log('✅ PayloadCMS initialized\n');

    // Get all books
    const booksData = await payload.find({
      collection: 'books',
      limit: 10000,
      depth: 0
    });

    console.log(`📚 Found ${booksData.totalDocs} books to process\n`);

    let enriched = 0;
    let skipped = 0;
    let errors = 0;
    let apiCalls = 0;

    const BATCH_SIZE = 10; // Process in batches to respect rate limits
    const DELAY_MS = 1000; // 1 second delay between batches

    for (let i = 0; i < booksData.docs.length; i++) {
      const book = booksData.docs[i];

      try {
        // Skip if book has no ISBN
        if (!book.editions || book.editions.length === 0 || !book.editions[0].isbn) {
          skipped++;
          continue;
        }

        const isbn = book.editions[0].isbn;

        // Skip if book already has author data
        if (book.authorsText && book.authorsText.length > 0) {
          skipped++;
          continue;
        }

        // Fetch from external APIs
        console.log(`[${i + 1}/${booksData.docs.length}] 📖 ${book.title} (ISBN: ${isbn})`);

        const [isbndbData, googleData] = await Promise.all([
          fetchFromISBNdb(isbn),
          fetchFromGoogleBooks(isbn)
        ]);

        apiCalls += 2;

        if (!isbndbData && !googleData) {
          console.log(`  ⚠️  No data found from external sources`);
          skipped++;
          continue;
        }

        // Merge and update
        const updates = mergeBookData(book, isbndbData, googleData);

        if (Object.keys(updates).length === 0) {
          console.log(`  ⏭️  No new data to add`);
          skipped++;
          continue;
        }

        await payload.update({
          collection: 'books',
          id: book.id,
          data: updates
        });

        // Link authors if we added them
        if (updates.authorsText) {
          await linkAuthors(payload, book.id as number, updates.authorsText);
        }

        enriched++;
        console.log(`  ✅ Enriched with: ${Object.keys(updates).join(', ')}`);

        // Rate limiting: pause after each batch
        if ((i + 1) % BATCH_SIZE === 0) {
          console.log(`\n⏸️  Pausing ${DELAY_MS}ms to respect rate limits...\n`);
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }

      } catch (error: any) {
        errors++;
        console.error(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('\n📊 Enrichment Summary:');
    console.log(`✅ Books enriched: ${enriched}`);
    console.log(`⏭️  Books skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📡 API calls made: ${apiCalls}`);

  } catch (error: any) {
    console.error('💥 Fatal error:', error);
  } finally {
    process.exit(0);
  }
};

enrichBooks();
