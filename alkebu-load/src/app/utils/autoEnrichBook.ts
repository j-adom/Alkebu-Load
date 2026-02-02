/**
 * Auto-enrichment utility for Books collection
 * Fetches book data from ISBNdb and Google Books when ISBN is added
 */

import { findOrCreateAuthor } from './authorMatching';

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
    return null;
  }

  try {
    const response = await fetch(`https://api2.isbndb.com/book/${isbn}`, {
      headers: {
        'Authorization': process.env.ISBNDB_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.book || null;
  } catch (error) {
    console.error('ISBNdb fetch error:', error);
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

    if (!response.ok) return null;

    const data = await response.json();
    return data.items?.[0] || null;
  } catch (error) {
    console.error('Google Books fetch error:', error);
    return null;
  }
}

/**
 * Auto-enrich book data from ISBN
 * Call this from beforeValidate hook
 */
export async function autoEnrichBookFromISBN(data: any, operation: string) {
  // Only enrich on create, or on update if ISBN changed
  if (operation !== 'create' && operation !== 'update') {
    return data;
  }

  // Check if we have an ISBN
  const isbn = data.editions?.[0]?.isbn;
  if (!isbn) {
    return data;
  }

  // Skip if already has author data (don't override existing data)
  if (data.authorsText && data.authorsText.length > 0) {
    return data;
  }

  console.log(`🔍 Auto-enriching book from ISBN: ${isbn}`);

  try {
    // Fetch from both sources in parallel
    const [isbndbData, googleData] = await Promise.all([
      fetchFromISBNdb(isbn),
      fetchFromGoogleBooks(isbn)
    ]);

    if (!isbndbData && !googleData) {
      console.log(`⚠️  No external data found for ISBN: ${isbn}`);
      return data;
    }

    // Enrich title
    if (!data.title && (isbndbData?.title || googleData?.volumeInfo.title)) {
      data.title = isbndbData?.title || googleData?.volumeInfo.title;
      console.log(`  ✅ Added title: ${data.title}`);
    }
    if (!data.titleLong && isbndbData?.title_long) {
      data.titleLong = isbndbData.title_long;
    }

    // Enrich authors
    const authors = isbndbData?.authors || googleData?.volumeInfo.authors || [];
    if (authors.length > 0) {
      data.authorsText = authors.map((name: string) => ({ name }));
      console.log(`  ✅ Added authors: ${authors.join(', ')}`);
    }

    // Enrich publisher
    if (!data.publisherText && (isbndbData?.publisher || googleData?.volumeInfo.publisher)) {
      data.publisherText = isbndbData?.publisher || googleData?.volumeInfo.publisher;
      console.log(`  ✅ Added publisher: ${data.publisherText}`);
    }

    // Enrich description/synopsis
    if (!data.synopsis && (isbndbData?.synopsis || googleData?.volumeInfo.description)) {
      data.synopsis = isbndbData?.synopsis || googleData?.volumeInfo.description?.substring(0, 500);
      console.log(`  ✅ Added synopsis`);
    }

    // Enrich subjects
    const subjects = isbndbData?.subjects || googleData?.volumeInfo.categories || [];
    if (subjects.length > 0 && (!data.subjects || data.subjects.length === 0)) {
      data.subjects = subjects.map((subject: string) => ({ subject }));
      console.log(`  ✅ Added subjects: ${subjects.join(', ')}`);
    }

    // Enrich image URLs
    const imageUrls: string[] = [];
    if (isbndbData?.image) imageUrls.push(isbndbData.image);
    if (googleData?.volumeInfo.imageLinks?.thumbnail) imageUrls.push(googleData.volumeInfo.imageLinks.thumbnail);
    if (googleData?.volumeInfo.imageLinks?.small) imageUrls.push(googleData.volumeInfo.imageLinks.small);

    if (imageUrls.length > 0 && (!data.scrapedImageUrls || data.scrapedImageUrls.length === 0)) {
      data.scrapedImageUrls = imageUrls.map((url: string) => ({ url }));
      console.log(`  ✅ Added ${imageUrls.length} image URL(s)`);
    }

    // Enrich edition data
    if (data.editions && data.editions.length > 0) {
      const edition = data.editions[0];

      if (!edition.pages && (isbndbData?.pages || googleData?.volumeInfo.pageCount)) {
        edition.pages = isbndbData?.pages || googleData?.volumeInfo.pageCount;
      }
      if (!edition.language && (isbndbData?.language || googleData?.volumeInfo.language)) {
        edition.language = isbndbData?.language || googleData?.volumeInfo.language;
      }
      if (!edition.binding && isbndbData?.binding) {
        edition.binding = isbndbData.binding.toLowerCase();
      }
      if (!edition.datePublished && (isbndbData?.date_published || googleData?.volumeInfo.publishedDate)) {
        edition.datePublished = isbndbData?.date_published || googleData?.volumeInfo.publishedDate;
      }
      if (!edition.publisherText && (isbndbData?.publisher || googleData?.volumeInfo.publisher)) {
        edition.publisherText = isbndbData?.publisher || googleData?.volumeInfo.publisher;
      }

      data.editions[0] = edition;
    }

    // Mark as auto-imported if this was a create operation
    if (operation === 'create' && !data.importSource) {
      data.importSource = 'auto-enriched';
    }

    console.log(`✅ Auto-enrichment complete for: ${data.title || isbn}`);

  } catch (error) {
    console.error('Error during auto-enrichment:', error);
    // Don't fail the operation, just log the error
  }

  return data;
}

/**
 * Link authors after book is created/updated
 * Call this from afterChange hook
 * Uses smart fuzzy matching to avoid duplicate authors
 */
export async function autoLinkAuthors(doc: any, req: any) {
  // Only link if we have authorsText but no linked authors
  if (!doc.authorsText || doc.authorsText.length === 0) {
    return;
  }

  if (doc.authors && doc.authors.length > 0) {
    return; // Already has linked authors
  }

  console.log(`🔗 Auto-linking authors for: ${doc.title}`);

  try {
    const authorIds: number[] = [];

    for (const authorText of doc.authorsText) {
      const authorName = authorText.name?.trim();
      if (!authorName) continue;

      // Use smart fuzzy matching to find or create author
      const author = await findOrCreateAuthor(req.payload, authorName);

      if (author.wasCreated) {
        console.log(`  ✨ Created author: ${author.name}`);
      } else {
        console.log(`  🔗 Matched existing author: ${author.name}`);
      }

      authorIds.push(author.id);
    }

    // Update book with linked authors (avoid infinite loop by checking first)
    if (authorIds.length > 0) {
      await req.payload.update({
        collection: 'books',
        id: doc.id,
        data: {
          authors: authorIds
        }
      });
      console.log(`  ✅ Linked ${authorIds.length} author(s)`);
    }

  } catch (error) {
    console.error('Error during auto-linking authors:', error);
    // Don't fail the operation
  }
}
