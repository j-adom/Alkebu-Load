/**
 * Auto-enrichment utility for Books collection
 * Fetches book data from ISBNdb and Google Books when ISBN is added
 */

import { findOrCreateAuthor } from './authorMatching';
import type { GoogleBooksVolumeInfo, IsbndbBook } from './bookImport';
import { buildBookMetadataPatch } from './bookImport';

// Fetch from ISBNdb
async function fetchFromISBNdb(isbn: string): Promise<IsbndbBook | null> {
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
async function fetchFromGoogleBooks(isbn: string): Promise<{ volumeInfo?: GoogleBooksVolumeInfo } | null> {
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

    const { updateData, fieldsUpdated } = buildBookMetadataPatch(data, {
      isbndbBook: isbndbData,
      googleVolumeInfo: googleData?.volumeInfo,
      markChecked: true,
    });

    Object.assign(data, updateData);

    if (operation === 'create' && !data.importSource && (isbndbData || googleData?.volumeInfo)) {
      data.importSource = isbndbData ? 'isbndb' : 'google-books';
    }

    console.log(`✅ Auto-enrichment complete for: ${data.title || isbn} (${fieldsUpdated} field(s) updated)`);

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
