import { getPayload } from 'payload';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig({ path: './.env' });

/**
 * Script to link books to authors based on authorsText field
 * This will:
 * 1. Find or create authors in the authors collection
 * 2. Link them to books via the authors relationship field
 */

const linkAuthorsToBooks = async () => {
  try {
    console.log('🚀 Starting author linking process...');

    // Import and initialize Payload
    const { default: config } = await import('../src/payload.config');
    let resolvedConfig = config;
    if (config && typeof config.then === 'function') {
      resolvedConfig = await config;
    }

    const payload = await getPayload({ config: resolvedConfig });
    console.log('✅ PayloadCMS initialized');

    // Get all books with authorsText but no linked authors
    const booksData = await payload.find({
      collection: 'books',
      limit: 10000, // Adjust as needed
      depth: 0 // Don't need related data
    });

    console.log(`📚 Found ${booksData.totalDocs} books to process`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const authorCache = new Map<string, number>(); // Cache author name -> ID

    for (const book of booksData.docs) {
      try {
        // Skip if book already has linked authors
        if (book.authors && Array.isArray(book.authors) && book.authors.length > 0) {
          skipped++;
          continue;
        }

        // Skip if no authorsText
        if (!book.authorsText || !Array.isArray(book.authorsText) || book.authorsText.length === 0) {
          skipped++;
          continue;
        }

        const authorIds: number[] = [];

        // Process each author
        for (const authorText of book.authorsText) {
          const authorName = authorText.name?.trim();
          if (!authorName) continue;

          let authorId: number;

          // Check cache first
          if (authorCache.has(authorName)) {
            authorId = authorCache.get(authorName)!;
          } else {
            // Find or create author
            const existingAuthors = await payload.find({
              collection: 'authors',
              where: {
                name: {
                  equals: authorName
                }
              },
              limit: 1
            });

            if (existingAuthors.docs.length > 0) {
              // Author exists
              authorId = existingAuthors.docs[0].id as number;
            } else {
              // Create new author
              const newAuthor = await payload.create({
                collection: 'authors',
                data: {
                  name: authorName,
                  isActive: true,
                  featured: false
                }
              });
              authorId = newAuthor.id as number;
              console.log(`  ✨ Created new author: ${authorName}`);
            }

            // Cache the author ID
            authorCache.set(authorName, authorId);
          }

          authorIds.push(authorId);
        }

        // Update book with linked authors
        if (authorIds.length > 0) {
          await payload.update({
            collection: 'books',
            id: book.id,
            data: {
              authors: authorIds
            }
          });
          updated++;
          console.log(`✅ Linked ${authorIds.length} author(s) to: ${book.title}`);
        }

      } catch (error: any) {
        errors++;
        console.error(`❌ Error processing "${book.title}": ${error.message}`);
      }
    }

    console.log('\n📊 Linking Summary:');
    console.log(`✅ Books updated: ${updated}`);
    console.log(`⏭️  Books skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`👥 Authors in cache: ${authorCache.size}`);

  } catch (error: any) {
    console.error('💥 Fatal error:', error);
  } finally {
    process.exit(0);
  }
};

linkAuthorsToBooks();
