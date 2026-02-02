#!/usr/bin/env tsx

/**
 * Fast Batch Book Enrichment with ISBNdb
 * 
 * Much faster version using:
 * - Concurrent API calls (10 at once)
 * - Batch database updates 
 * - Reduced delays
 * - Progress tracking
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'
import fetch from 'node-fetch'

const ISBNDB_API_KEY = process.env.ISBNDB_API_KEY || ''
const ISBNDB_BASE_URL = 'https://api2.isbndb.com'

// Concurrency settings
const CONCURRENT_API_CALLS = 10  // Process 10 books simultaneously
const API_DELAY_MS = 50          // Reduced delay between batches
const DB_BATCH_SIZE = 20         // Update database in batches of 20

interface ISBNdbResponse {
  book?: {
    title?: string
    title_long?: string
    authors?: string[]
    publisher?: string
    date_published?: string
    pages?: number
    overview?: string
    synopsis?: string
    excerpt?: string
    subjects?: string[]
    image?: string
    binding?: string
    dimensions?: string
    language?: string
    isbn?: string
    isbn13?: string
    dewey_decimal?: string
  }
}

interface EnrichmentResult {
  bookId: string
  updateData: any
  fieldsUpdated: number
  success: boolean
  error?: string
}

interface FastStats {
  totalBooks: number
  processed: number
  enriched: number
  fieldsUpdated: number
  apiCalls: number
  apiErrors: number
  dbUpdates: number
  startTime: number
}

async function fetchFromISBNdb(isbn: string): Promise<ISBNdbResponse | null> {
  const url = `${ISBNDB_BASE_URL}/book/${isbn}`
  const response = await fetch(url, {
    headers: {
      'Authorization': ISBNDB_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 5000, // 5 second timeout
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null // Book not found
    }
    throw new Error(`API error: ${response.status}`)
  }

  return await response.json() as ISBNdbResponse
}

function buildUpdateData(book: any, isbndbData: ISBNdbResponse): { updateData: any, fieldsUpdated: number } {
  const updateData: any = {}
  let fieldsUpdated = 0

  const isbnBook = isbndbData.book
  if (!isbnBook) return { updateData, fieldsUpdated }

  // Mark as checked and set enrichment timestamp
  if (!book.isbndbChecked) {
    updateData.isbndbChecked = true
    fieldsUpdated++
  }
  updateData.lastEnrichedAt = new Date().toISOString()
  fieldsUpdated++

  // Update basic info
  if (!book.titleLong && isbnBook.title_long) {
    updateData.titleLong = isbnBook.title_long
    fieldsUpdated++
  }

  if (!book.description && isbnBook.overview) {
    updateData.description = isbnBook.overview
    fieldsUpdated++
  }

  if (!book.synopsis && isbnBook.synopsis) {
    updateData.synopsis = isbnBook.synopsis
    fieldsUpdated++
  }

  if (!book.excerpt && isbnBook.excerpt) {
    updateData.excerpt = isbnBook.excerpt
    fieldsUpdated++
  }

  // Update authors if missing
  if ((!book.authorsText || book.authorsText.length === 0) && isbnBook.authors) {
    updateData.authorsText = isbnBook.authors.map(author => ({ name: author }))
    fieldsUpdated++
  }

  // Update publisher if missing
  if (!book.publisherText && isbnBook.publisher) {
    updateData.publisherText = isbnBook.publisher
    fieldsUpdated++
  }

  // Update subjects
  if ((!book.subjects || book.subjects.length === 0) && isbnBook.subjects) {
    updateData.subjects = isbnBook.subjects.map(subject => ({ subject }))
    fieldsUpdated++
  }

  // Update Dewey Decimal
  if ((!book.deweyDecimal || book.deweyDecimal.length === 0) && isbnBook.dewey_decimal) {
    updateData.deweyDecimal = [{ code: isbnBook.dewey_decimal }]
    fieldsUpdated++
  }

  // Update edition-specific fields
  if (book.editions && book.editions.length > 0) {
    const firstEdition = book.editions[0]
    const editionUpdates: any = { ...firstEdition }
    let editionFieldsUpdated = false

    if (!firstEdition.pages && isbnBook.pages) {
      editionUpdates.pages = isbnBook.pages
      editionFieldsUpdated = true
      fieldsUpdated++
    }

    if (!firstEdition.binding && isbnBook.binding) {
      editionUpdates.binding = isbnBook.binding.toLowerCase()
      editionFieldsUpdated = true
      fieldsUpdated++
    }

    if (!firstEdition.dimensions && isbnBook.dimensions) {
      editionUpdates.dimensions = isbnBook.dimensions
      editionFieldsUpdated = true
      fieldsUpdated++
    }

    if (!firstEdition.datePublished && isbnBook.date_published) {
      editionUpdates.datePublished = isbnBook.date_published
      editionFieldsUpdated = true
      fieldsUpdated++
    }

    if (editionFieldsUpdated) {
      updateData.editions = [editionUpdates, ...book.editions.slice(1)]
    }
  }

  // Add scraped image URL if we don't have images
  if ((!book.scrapedImageUrls || book.scrapedImageUrls.length === 0) && isbnBook.image) {
    updateData.scrapedImageUrls = [{ url: isbnBook.image }]
    fieldsUpdated++
  }

  return { updateData, fieldsUpdated }
}

async function processBooksChunk(books: any[], stats: FastStats): Promise<EnrichmentResult[]> {
  const promises = books.map(async (book): Promise<EnrichmentResult> => {
    try {
      // Get ISBN from first edition
      let isbn = null
      if (book.editions && book.editions.length > 0) {
        isbn = book.editions[0].isbn || book.editions[0].isbn10
      }

      if (!isbn) {
        return {
          bookId: book.id,
          updateData: {},
          fieldsUpdated: 0,
          success: false,
          error: 'No ISBN found'
        }
      }

      stats.apiCalls++
      const isbndbData = await fetchFromISBNdb(isbn)
      
      if (!isbndbData || !isbndbData.book) {
        return {
          bookId: book.id,
          updateData: {},
          fieldsUpdated: 0,
          success: false,
          error: 'No data in ISBNdb'
        }
      }

      const { updateData, fieldsUpdated } = buildUpdateData(book, isbndbData)

      if (fieldsUpdated === 0) {
        return {
          bookId: book.id,
          updateData: {},
          fieldsUpdated: 0,
          success: false,
          error: 'No fields needed updating'
        }
      }

      return {
        bookId: book.id,
        updateData,
        fieldsUpdated,
        success: true,
      }

    } catch (error: any) {
      stats.apiErrors++
      return {
        bookId: book.id,
        updateData: {},
        fieldsUpdated: 0,
        success: false,
        error: error.message
      }
    }
  })

  return Promise.all(promises)
}

async function updateBooksInDatabase(payload: any, results: EnrichmentResult[], stats: FastStats): Promise<void> {
  const successfulResults = results.filter(r => r.success && r.fieldsUpdated > 0)
  
  if (successfulResults.length === 0) return

  // Update books in parallel (but limit concurrency to avoid overwhelming DB)
  const dbPromises = successfulResults.map(async (result) => {
    try {
      await payload.update({
        collection: 'books',
        id: result.bookId,
        data: result.updateData,
      })
      stats.dbUpdates++
      stats.fieldsUpdated += result.fieldsUpdated
    } catch (error: any) {
      console.error(`   ❌ DB update failed for book ${result.bookId}: ${error.message}`)
    }
  })

  await Promise.all(dbPromises)
}

function printProgress(stats: FastStats, currentBatch: number, totalBatches: number) {
  const elapsed = (Date.now() - stats.startTime) / 1000
  const rate = stats.processed / elapsed
  const eta = totalBatches > currentBatch ? ((totalBatches - currentBatch) * CONCURRENT_API_CALLS) / rate : 0
  
  console.log(`\n📊 Batch ${currentBatch}/${totalBatches} Complete:`)
  console.log(`   ⚡ Processed: ${stats.processed}/${stats.totalBooks} books`)
  console.log(`   ✨ Enriched: ${stats.enriched} books`)
  console.log(`   📝 Fields updated: ${stats.fieldsUpdated}`)
  console.log(`   🔗 API calls: ${stats.apiCalls} (${stats.apiErrors} errors)`)
  console.log(`   💾 DB updates: ${stats.dbUpdates}`)
  console.log(`   ⏱️  Rate: ${rate.toFixed(1)} books/sec | ETA: ${Math.round(eta)}s`)
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : undefined

  console.log('🚀 FAST Batch Book Enrichment with ISBNdb\n')
  console.log(`⚡ Concurrency: ${CONCURRENT_API_CALLS} simultaneous API calls`)
  console.log(`📦 Batch size: ${DB_BATCH_SIZE} database updates per batch`)
  if (dryRun) console.log('⚠️  DRY RUN MODE - No data will be updated\n')

  if (!ISBNDB_API_KEY) {
    console.error('❌ ISBNDB_API_KEY not configured')
    process.exit(1)
  }

  // Initialize Payload
  console.log('⚡ Initializing Payload...')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })
  console.log('✅ Payload initialized\n')

  // Find books that need enrichment - simple query to avoid schema issues
  console.log('🔍 Finding books that need enrichment...')
  const books = await payload.find({
    collection: 'books',
    limit: limit || 1000,
    sort: '-createdAt',
    where: {
      and: [
        {
          'editions.isbn': {
            exists: true
          }
        },
        {
          or: [
            { isbndbChecked: { equals: false } },
            { isbndbChecked: { exists: false } }
          ]
        }
      ]
    }
  })

  console.log(`📊 Found ${books.docs.length} books that could benefit from enrichment\n`)

  if (dryRun) {
    console.log('✅ Dry run - would process these books with fast batch method')
    console.log(`   Estimated time: ${Math.round((books.docs.length / CONCURRENT_API_CALLS) * (API_DELAY_MS / 1000))} seconds`)
    process.exit(0)
  }

  const stats: FastStats = {
    totalBooks: books.docs.length,
    processed: 0,
    enriched: 0,
    fieldsUpdated: 0,
    apiCalls: 0,
    apiErrors: 0,
    dbUpdates: 0,
    startTime: Date.now(),
  }

  // Process books in chunks
  const chunks = []
  for (let i = 0; i < books.docs.length; i += CONCURRENT_API_CALLS) {
    chunks.push(books.docs.slice(i, i + CONCURRENT_API_CALLS))
  }

  console.log(`🏃‍♂️ Starting fast processing: ${chunks.length} batches of ${CONCURRENT_API_CALLS} books each\n`)

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const batchNum = chunkIndex + 1
    
    console.log(`[Batch ${batchNum}/${chunks.length}] Processing ${chunk.length} books...`)

    // Process API calls concurrently
    const results = await processBooksChunk(chunk, stats)
    
    // Update database with successful results
    await updateBooksInDatabase(payload, results, stats)
    
    // Update stats
    stats.processed += chunk.length
    stats.enriched += results.filter(r => r.success).length

    // Print progress every few batches
    if (batchNum % 5 === 0 || batchNum === chunks.length) {
      printProgress(stats, batchNum, chunks.length)
    }

    // Small delay between batches to be nice to the API
    if (batchNum < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
    }
  }

  const totalTime = ((Date.now() - stats.startTime) / 1000).toFixed(1)

  // Final summary
  console.log('\n' + '='.repeat(80))
  console.log('🎉 FAST ENRICHMENT COMPLETE!')
  console.log('='.repeat(80))
  console.log(`⏱️  Total time: ${totalTime}s`)
  console.log(`📚 Books processed: ${stats.processed}`)
  console.log(`✨ Books enriched: ${stats.enriched} (${((stats.enriched / stats.processed) * 100).toFixed(1)}% success rate)`)
  console.log(`📝 Total fields updated: ${stats.fieldsUpdated}`)
  console.log(`🔗 API calls made: ${stats.apiCalls} (${stats.apiErrors} errors)`)
  console.log(`💾 Database updates: ${stats.dbUpdates}`)
  console.log(`⚡ Average rate: ${(stats.processed / parseFloat(totalTime)).toFixed(1)} books/second`)
  console.log('\n✅ Your book collection is now significantly more complete!')

  process.exit(0)
}

main().catch(error => {
  console.error('❌ Fast enrichment failed:', error)
  process.exit(1)
})