import { getPayload } from 'payload'
import config from '../src/payload.config'
import { createOrFindAuthors, updateAllAuthorsMetadata, extractAuthorNames } from '../src/app/utils/authorManager'

async function migrateAuthors() {
  console.log('📚 Starting author migration...')
  
  const payload = await getPayload({ config })
  const req = { user: null } as any

  try {
    // Get all books
    const books = await payload.find({
      collection: 'books',
      limit: 1000,
      req
    })

    console.log(`📖 Found ${books.docs.length} books to process`)

    let processed = 0
    let skipped = 0

    for (const book of books.docs) {
      try {
        console.log(`\n📖 Processing: ${book.title}`)

        // Skip if already has author relationships
        if (book.authors && Array.isArray(book.authors) && book.authors.length > 0) {
          console.log('⏭️  Book already has author relationships, skipping')
          skipped++
          continue
        }

        // Extract author names from authorsText field (old format)
        let authorNames: string[] = []
        
        if (book.authorsText && Array.isArray(book.authorsText)) {
          authorNames = book.authorsText.map((author: any) => author.name).filter(Boolean)
        } else if (book.authors && Array.isArray(book.authors)) {
          // Handle case where authors is still an array of objects with names
          authorNames = book.authors.map((author: any) => 
            typeof author === 'string' ? author : author.name
          ).filter(Boolean)
        }

        if (authorNames.length === 0) {
          console.log('⚠️  No author names found, skipping')
          skipped++
          continue
        }

        console.log(`👥 Found authors: ${authorNames.join(', ')}`)

        // Create or find authors
        const authorIds = await createOrFindAuthors(payload, req, authorNames)

        if (authorIds.length > 0) {
          // Update book with author relationships
          await payload.update({
            collection: 'books',
            id: book.id,
            data: {
              authors: authorIds,
              authorsText: authorNames.map(name => ({ name })) // Keep original for reference
            },
            req
          })

          console.log(`✅ Updated book with ${authorIds.length} author relationships`)
          processed++
        } else {
          console.log('❌ Failed to create/find authors')
          skipped++
        }

      } catch (error) {
        console.error(`❌ Error processing book ${book.title}:`, error)
        skipped++
      }
    }

    console.log(`\n📊 Migration Summary:`)
    console.log(`   ✅ Processed: ${processed} books`)
    console.log(`   ⏭️  Skipped: ${skipped} books`)

    // Update all author metadata
    console.log('\n📊 Updating author metadata...')
    await updateAllAuthorsMetadata(payload, req)

    console.log('\n🎉 Author migration completed!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

// Run the migration
migrateAuthors().catch(console.error)