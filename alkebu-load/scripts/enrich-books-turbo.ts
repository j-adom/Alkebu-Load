#!/usr/bin/env tsx

/**
 * TURBO Book Enrichment - Maximum Speed
 * 
 * Ultra-fast version using:
 * - 20 concurrent API calls
 * - Smart pre-filtering to skip complete books
 * - Bulk database operations
 * - Minimal delays
 * - Memory-optimized processing
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'
import fetch from 'node-fetch'

const ISBNDB_API_KEY = process.env.ISBNDB_API_KEY || ''
const ISBNDB_BASE_URL = 'https://api2.isbndb.com'

// Turbo settings for maximum speed
const CONCURRENT_API_CALLS = 20     // 20 simultaneous API calls
const API_DELAY_MS = 10             // Minimal delay
const MEMORY_BATCH_SIZE = 100       // Process in memory-efficient chunks

interface BookUpdate {
  id: string
  data: any
  fieldsCount: number
}

interface TurboStats {
  totalBooks: number
  skipped: number
  processed: number
  enriched: number
  fieldsUpdated: number
  apiCalls: number
  startTime: number
}

// Pre-filter: Only get books that definitely need enrichment
function isBookIncomplete(book: any): boolean {
  // Quick checks for definitely missing critical fields
  return !book.titleLong || 
         !book.description || 
         !book.authorsText || 
         book.authorsText.length === 0 ||
         !book.publisherText ||
         !book.subjects ||
         book.subjects.length === 0
}

async function fetchISBNdbBatch(isbns: string[]): Promise<Map<string, any>> {
  const results = new Map<string, any>()
  
  const promises = isbns.map(async (isbn) => {
    try {
      const response = await fetch(`${ISBNDB_BASE_URL}/book/${isbn}`, {
        headers: {
          'Authorization': ISBNDB_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 3000, // 3 second timeout for speed
      })

      if (response.ok) {
        const data = await response.json()
        if (data.book) {
          results.set(isbn, data.book)
        }
      }
    } catch (error) {
      // Silently skip errors for speed
    }
  })

  await Promise.all(promises)
  return results
}

function buildQuickUpdate(book: any, isbnData: any): { updateData: any, fieldsCount: number } {
  const updates: any = {}
  let count = 0

  // Quick field updates - only the most valuable ones
  if (!book.titleLong && isbnData.title_long) {
    updates.titleLong = isbnData.title_long
    count++
  }

  if (!book.description && isbnData.overview) {
    updates.description = isbnData.overview
    count++
  }

  if ((!book.authorsText || book.authorsText.length === 0) && isbnData.authors) {
    updates.authorsText = isbnData.authors.map((author: string) => ({ name: author }))
    count++
  }

  if (!book.publisherText && isbnData.publisher) {
    updates.publisherText = isbnData.publisher
    count++
  }

  if ((!book.subjects || book.subjects.length === 0) && isbnData.subjects) {
    updates.subjects = isbnData.subjects.map((subject: string) => ({ subject }))
    count++
  }

  // Edition updates for first edition only
  if (book.editions && book.editions.length > 0) {
    const edition = { ...book.editions[0] }
    let editionUpdated = false

    if (!edition.pages && isbnData.pages) {
      edition.pages = isbnData.pages
      editionUpdated = true
      count++
    }

    if (!edition.datePublished && isbnData.date_published) {
      edition.datePublished = isbnData.date_published
      editionUpdated = true
      count++
    }

    if (editionUpdated) {
      updates.editions = [edition, ...book.editions.slice(1)]
    }
  }

  return { updateData: updates, fieldsCount: count }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : 2000 // Default to 2000 for speed

  console.log('🚀 TURBO Book Enrichment - Maximum Speed Mode')
  console.log('='.repeat(60))
  console.log(`⚡ Concurrency: ${CONCURRENT_API_CALLS} parallel API calls`)
  console.log(`🎯 Processing limit: ${limit} books`)
  console.log(`💨 Minimal delays for maximum throughput`)
  if (dryRun) console.log('⚠️  DRY RUN MODE\n')

  if (!ISBNDB_API_KEY) {
    console.error('❌ ISBNDB_API_KEY required')
    process.exit(1)
  }

  console.log('\n⚡ Initializing Payload...')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  // Smart query: get all recent books and filter in memory for speed
  console.log('🔍 Finding incomplete books...')
  const books = await payload.find({
    collection: 'books',
    limit,
    sort: '-createdAt',
  })

  // Additional filtering in memory for speed
  const incompleteBooks = books.docs.filter(isBookIncomplete)
  
  console.log(`📊 Found ${incompleteBooks.length} books needing enrichment (filtered from ${books.docs.length})`)

  if (dryRun) {
    console.log(`\n✅ Would process ${incompleteBooks.length} books`)
    console.log(`⏱️  Estimated time: ${Math.round(incompleteBooks.length / CONCURRENT_API_CALLS * 0.2)} seconds`)
    process.exit(0)
  }

  const stats: TurboStats = {
    totalBooks: incompleteBooks.length,
    skipped: books.docs.length - incompleteBooks.length,
    processed: 0,
    enriched: 0,
    fieldsUpdated: 0,
    apiCalls: 0,
    startTime: Date.now(),
  }

  console.log(`\n🏃‍♂️ Starting TURBO processing...\n`)

  // Process in memory-efficient batches
  for (let i = 0; i < incompleteBooks.length; i += MEMORY_BATCH_SIZE) {
    const batch = incompleteBooks.slice(i, i + MEMORY_BATCH_SIZE)
    const batchNum = Math.floor(i / MEMORY_BATCH_SIZE) + 1
    const totalBatches = Math.ceil(incompleteBooks.length / MEMORY_BATCH_SIZE)

    console.log(`[${batchNum}/${totalBatches}] Processing batch of ${batch.length} books...`)

    // Extract ISBNs
    const booksWithISBN = batch
      .filter(book => book.editions && book.editions.length > 0 && book.editions[0].isbn)
      .map(book => ({
        book,
        isbn: book.editions[0].isbn || book.editions[0].isbn10
      }))
      .filter(item => item.isbn)

    if (booksWithISBN.length === 0) {
      console.log('   ⏭️  No books with ISBNs in this batch, skipping...')
      continue
    }

    // Split into concurrent chunks
    const isbns = booksWithISBN.map(item => item.isbn)
    const chunks = []
    for (let j = 0; j < isbns.length; j += CONCURRENT_API_CALLS) {
      chunks.push(isbns.slice(j, j + CONCURRENT_API_CALLS))
    }

    // Process all chunks
    const allResults = new Map<string, any>()
    for (const chunk of chunks) {
      stats.apiCalls += chunk.length
      const chunkResults = await fetchISBNdbBatch(chunk)
      chunkResults.forEach((value, key) => allResults.set(key, value))
      
      // Minimal delay
      if (chunk !== chunks[chunks.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
      }
    }

    // Prepare database updates
    const updates: BookUpdate[] = []
    for (const { book, isbn } of booksWithISBN) {
      const isbnData = allResults.get(isbn)
      if (isbnData) {
        const { updateData, fieldsCount } = buildQuickUpdate(book, isbnData)
        if (fieldsCount > 0) {
          updates.push({
            id: book.id,
            data: updateData,
            fieldsCount,
          })
        }
      }
    }

    // Bulk database updates
    if (updates.length > 0) {
      const dbPromises = updates.map(update =>
        payload.update({
          collection: 'books',
          id: update.id,
          data: update.data,
        }).catch(error => {
          console.error(`   ❌ DB error for ${update.id}: ${error.message}`)
        })
      )

      await Promise.all(dbPromises)
      
      stats.enriched += updates.length
      stats.fieldsUpdated += updates.reduce((sum, u) => sum + u.fieldsCount, 0)
    }

    stats.processed += batch.length

    // Progress update
    const elapsed = (Date.now() - stats.startTime) / 1000
    const rate = stats.processed / elapsed
    console.log(`   ✅ ${updates.length}/${batch.length} enriched | Rate: ${rate.toFixed(1)} books/sec | Total fields: ${stats.fieldsUpdated}`)
  }

  const totalTime = ((Date.now() - stats.startTime) / 1000).toFixed(1)

  // Final results
  console.log('\n' + '🎉'.repeat(20))
  console.log('🚀 TURBO ENRICHMENT COMPLETE!')
  console.log('🎉'.repeat(20))
  console.log(`\n📊 PERFORMANCE STATS:`)
  console.log(`⏱️  Total time: ${totalTime}s`)
  console.log(`⚡ Average rate: ${(stats.processed / parseFloat(totalTime)).toFixed(1)} books/second`)
  console.log(`📚 Books processed: ${stats.processed}`)
  console.log(`✨ Books enriched: ${stats.enriched} (${((stats.enriched / stats.processed) * 100).toFixed(1)}% success)`)
  console.log(`📝 Fields updated: ${stats.fieldsUpdated}`)
  console.log(`🔗 API calls: ${stats.apiCalls}`)
  console.log(`⏭️  Skipped (already complete): ${stats.skipped}`)

  const avgFieldsPerBook = stats.fieldsUpdated / Math.max(stats.enriched, 1)
  console.log(`\n💡 IMPACT:`)
  console.log(`├── Average ${avgFieldsPerBook.toFixed(1)} fields enriched per successful book`)
  console.log(`├── ${stats.fieldsUpdated} total new data points added to your catalog`)
  console.log(`└── Book data completeness significantly improved!`)

  process.exit(0)
}

main().catch(error => {
  console.error('❌ TURBO enrichment failed:', error)
  process.exit(1)
})