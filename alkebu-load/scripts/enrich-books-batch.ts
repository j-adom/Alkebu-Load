import { getPayload } from 'payload';
import { config as dotenvConfig } from 'dotenv';
import { findOrCreateAuthor } from '../src/app/utils/authorMatching';

// Load environment variables
dotenvConfig({ path: './.env' });

/**
 * BATCH ENRICHMENT - Much faster!
 * Uses ISBNdb batch API to fetch 400-500 books per request
 * Reduces API calls from 3,700 to ~10-20 batches
 */

interface ISBNdbBook {
  isbn13?: string;
  isbn?: string;
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

interface BatchBookData {
  isbn: string;
  title?: string;
  titleLong?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  subjects?: string[];
  pages?: number;
  language?: string;
  binding?: string;
  imageUrl?: string;
}

// Batch fetch from ISBNdb (400 ISBNs per request)
async function batchFetchFromISBNdb(isbns: string[]): Promise<Map<string, BatchBookData>> {
  if (!process.env.ISBNDB_API_KEY) {
    console.warn('⚠️  ISBNdb API key required for batch processing');
    return new Map();
  }

  const results = new Map<string, BatchBookData>();

  try {
    // ISBNdb batch endpoint accepts up to 1000 ISBNs
    // We'll use 400 to be safe
    console.log(`  📡 Fetching ${isbns.length} ISBNs from ISBNdb...`);

    const response = await fetch(`https://api2.isbndb.com/books/${isbns.join(',')}`, {
      headers: {
        'Authorization': process.env.ISBNDB_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`  ❌ ISBNdb batch error: ${response.status}`);
      return results;
    }

    const data = await response.json();
    const books = data.books || [];

    console.log(`  ✅ Found data for ${books.length}/${isbns.length} books`);

    for (const book of books) {
      const isbn = book.isbn13 || book.isbn;
      if (!isbn) continue;

      results.set(isbn, {
        isbn,
        title: book.title,
        titleLong: book.title_long,
        authors: book.authors || [],
        publisher: book.publisher,
        publishedDate: book.date_published,
        description: book.synopsis || book.overview,
        subjects: book.subjects || [],
        pages: book.pages,
        language: book.language,
        binding: book.binding,
        imageUrl: book.image
      });
    }

    return results;

  } catch (error: any) {
    console.error(`  ❌ ISBNdb batch error:`, error.message);
    return results;
  }
}

// Link authors for a book
async function linkAuthors(payload: any, bookId: number, authorNames: string[]) {
  const authorIds: number[] = [];

  for (const authorName of authorNames) {
    if (!authorName?.trim()) continue;

    const author = await findOrCreateAuthor(payload, authorName.trim());
    authorIds.push(author.id);
  }

  if (authorIds.length > 0) {
    await payload.update({
      collection: 'books',
      id: bookId,
      data: { authors: authorIds }
    });
  }

  return authorIds.length;
}

const batchEnrichBooks = async () => {
  try {
    console.log('🚀 BATCH ENRICHMENT - Processing books in batches of 400\n');

    if (!process.env.ISBNDB_API_KEY) {
      console.error('❌ ISBNdb API key required for batch processing');
      console.error('   Set ISBNDB_API_KEY in .env file');
      console.error('   Get a key at: https://isbndb.com\n');
      process.exit(1);
    }

    const { default: config } = await import('../src/payload.config');
    let resolvedConfig = config;
    if (config && typeof config.then === 'function') {
      resolvedConfig = await config;
    }

    const payload = await getPayload({ config: resolvedConfig });
    console.log('✅ PayloadCMS initialized\n');

    // Get all books that need enrichment
    const booksData = await payload.find({
      collection: 'books',
      limit: 10000,
      depth: 0
    });

    // Filter books that need enrichment (have ISBN, no authors)
    const booksToEnrich = booksData.docs.filter(book => {
      if (!book.editions || book.editions.length === 0 || !book.editions[0].isbn) {
        return false;
      }
      if (book.authorsText && book.authorsText.length > 0) {
        return false; // Already has authors
      }
      return true;
    });

    console.log(`📚 Found ${booksToEnrich.length} books to enrich (out of ${booksData.totalDocs} total)\n`);

    // Group books into batches of 400 ISBNs
    const BATCH_SIZE = 400;
    const batches: Array<{ isbn: string; bookId: number }[]> = [];

    for (let i = 0; i < booksToEnrich.length; i += BATCH_SIZE) {
      const batch = booksToEnrich.slice(i, i + BATCH_SIZE).map(book => ({
        isbn: book.editions[0].isbn,
        bookId: book.id as number
      }));
      batches.push(batch);
    }

    console.log(`📦 Processing ${batches.length} batches of up to ${BATCH_SIZE} books each\n`);

    let totalEnriched = 0;
    let totalAuthorsCreated = 0;
    let totalAuthorsLinked = 0;

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchNum = batchIndex + 1;

      console.log(`\n📦 BATCH ${batchNum}/${batches.length} - ${batch.length} books`);
      console.log('='.repeat(60));

      // Fetch batch data from ISBNdb
      const isbns = batch.map(b => b.isbn);
      const bookDataMap = await batchFetchFromISBNdb(isbns);

      // Process each book in the batch
      for (const { isbn, bookId } of batch) {
        const bookData = bookDataMap.get(isbn);

        if (!bookData || !bookData.authors || bookData.authors.length === 0) {
          continue; // No data found for this ISBN
        }

        try {
          // Build updates
          const updates: any = {
            authorsText: bookData.authors.map(name => ({ name }))
          };

          if (bookData.title) updates.title = bookData.title;
          if (bookData.titleLong) updates.titleLong = bookData.titleLong;
          if (bookData.publisher) updates.publisherText = bookData.publisher;
          if (bookData.description) updates.synopsis = bookData.description.substring(0, 500);
          if (bookData.subjects && bookData.subjects.length > 0) {
            updates.subjects = bookData.subjects.map(s => ({ subject: s }));
          }
          if (bookData.imageUrl) {
            updates.scrapedImageUrls = [{ url: bookData.imageUrl }];
          }

          // Update edition data
          if (bookData.pages || bookData.language || bookData.binding || bookData.publishedDate) {
            const book = await payload.findByID({
              collection: 'books',
              id: bookId,
              depth: 0
            });

            if (book.editions && book.editions.length > 0) {
              const edition = { ...book.editions[0] };
              if (bookData.pages) edition.pages = bookData.pages;
              if (bookData.language) edition.language = bookData.language;
              if (bookData.binding) edition.binding = bookData.binding.toLowerCase();
              if (bookData.publishedDate) edition.datePublished = bookData.publishedDate;
              updates.editions = [edition];
            }
          }

          // Update the book
          await payload.update({
            collection: 'books',
            id: bookId,
            data: updates
          });

          // Link authors
          const linkedCount = await linkAuthors(payload, bookId, bookData.authors);

          totalEnriched++;
          totalAuthorsLinked += linkedCount;

          // Progress indicator every 50 books
          if (totalEnriched % 50 === 0) {
            console.log(`  📊 Progress: ${totalEnriched} books enriched...`);
          }

        } catch (error: any) {
          console.error(`  ❌ Error enriching book ${isbn}:`, error.message);
        }
      }

      console.log(`\n✅ Batch ${batchNum} complete: Enriched ${totalEnriched} books so far`);

      // Small delay between batches (1 second)
      if (batchIndex < batches.length - 1) {
        console.log(`⏸️  Pausing 1 second before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 FINAL SUMMARY:');
    console.log(`✅ Total books enriched: ${totalEnriched}`);
    console.log(`👥 Total authors linked: ${totalAuthorsLinked}`);
    console.log(`📦 Total batches processed: ${batches.length}`);
    console.log(`📡 Total API calls: ${batches.length} (vs ${booksToEnrich.length} without batching!)`);
    console.log(`\n⚡ Batch processing is ${Math.round(booksToEnrich.length / batches.length)}x faster!\n`);

  } catch (error: any) {
    console.error('💥 Fatal error:', error);
  } finally {
    process.exit(0);
  }
};

batchEnrichBooks();
