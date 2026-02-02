#!/usr/bin/env tsx

/**
 * Enrich Books with ISBNdb Data
 * 
 * This script finds book records with missing fields and attempts to populate them
 * using ISBNdb API data based on the book's ISBN(s).
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'
import fetch from 'node-fetch'

const ISBNDB_API_KEY = process.env.ISBNDB_API_KEY || ''
const ISBNDB_BASE_URL = 'https://api2.isbndb.com'

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

interface EnrichmentStats {
  booksScanned: number
  booksEnriched: number
  fieldsUpdated: number
  apiCallsMade: number
  apiErrors: number
  errors: string[]
}

async function fetchFromISBNdb(isbn: string): Promise<ISBNdbResponse | null> {
  if (!ISBNDB_API_KEY) {
    throw new Error('ISBNDB_API_KEY not configured')
  }

  try {
    const url = `${ISBNDB_BASE_URL}/book/${isbn}`
    const response = await fetch(url, {
      headers: {
        'Authorization': ISBNDB_API_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null // Book not found in ISBNdb
      }
      throw new Error(`ISBNdb API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as ISBNdbResponse
    return data

  } catch (error: any) {
    throw new Error(`ISBNdb fetch failed: ${error.message}`)
  }
}

function identifyMissingFields(book: any): string[] {
  const missing = []

  // Check core fields
  if (!book.titleLong || book.titleLong.trim() === '') missing.push('titleLong')
  if (!book.description || book.description.trim() === '') missing.push('description')
  if (!book.synopsis || book.synopsis.trim() === '') missing.push('synopsis')
  if (!book.excerpt || book.excerpt.trim() === '') missing.push('excerpt')
  
  // Check if we have minimal author info
  if (!book.authorsText || book.authorsText.length === 0) missing.push('authorsText')
  if (!book.publisherText || book.publisherText.trim() === '') missing.push('publisherText')

  // Check categorization
  if (!book.subjects || book.subjects.length === 0) missing.push('subjects')
  if (!book.deweyDecimal || book.deweyDecimal.length === 0) missing.push('deweyDecimal')

  // Check edition details for first edition
  if (book.editions && book.editions.length > 0) {
    const firstEdition = book.editions[0]
    if (!firstEdition.pages || firstEdition.pages === 0) missing.push('pages')
    if (!firstEdition.binding) missing.push('binding')
    if (!firstEdition.dimensions) missing.push('dimensions')
    if (!firstEdition.datePublished) missing.push('datePublished')
  }

  return missing
}

function buildUpdateData(book: any, isbndbData: ISBNdbResponse): any {
  const updateData: any = {}
  let fieldsUpdated = 0

  const isbnBook = isbndbData.book
  if (!isbnBook) return { updateData, fieldsUpdated }

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

async function enrichBook(payload: any, book: any, stats: EnrichmentStats): Promise<void> {
  const missingFields = identifyMissingFields(book)
  
  if (missingFields.length === 0) {
    console.log(`   ✅ Book "${book.title}" - No missing fields`)
    return
  }

  console.log(`   📋 Missing fields: ${missingFields.join(', ')}`)

  // Get ISBN from first edition
  let isbn = null
  if (book.editions && book.editions.length > 0) {
    isbn = book.editions[0].isbn || book.editions[0].isbn10
  }

  if (!isbn) {
    console.log(`   ⚠️  No ISBN found, skipping enrichment`)
    return
  }

  console.log(`   🔍 Fetching data from ISBNdb for ISBN: ${isbn}`)
  
  try {
    stats.apiCallsMade++
    const isbndbData = await fetchFromISBNdb(isbn)
    
    if (!isbndbData || !isbndbData.book) {
      console.log(`   ❌ No data found in ISBNdb for ISBN: ${isbn}`)
      return
    }

    const { updateData, fieldsUpdated } = buildUpdateData(book, isbndbData)

    if (fieldsUpdated === 0) {
      console.log(`   ℹ️  ISBNdb data available but no fields needed updating`)
      return
    }

    // Update the book record
    await payload.update({
      collection: 'books',
      id: book.id,
      data: updateData,
    })

    stats.booksEnriched++
    stats.fieldsUpdated += fieldsUpdated
    console.log(`   ✅ Enriched with ${fieldsUpdated} fields from ISBNdb`)

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))

  } catch (error: any) {
    stats.apiErrors++
    stats.errors.push(`Book ${book.id} (${book.title}): ${error.message}`)
    console.log(`   ❌ Failed to enrich: ${error.message}`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : undefined

  console.log('📚 Book Enrichment with ISBNdb Data\n')
  if (dryRun) console.log('⚠️  DRY RUN MODE - No data will be updated\n')

  if (!ISBNDB_API_KEY) {
    console.error('❌ ISBNDB_API_KEY not configured in .env file')
    process.exit(1)
  }

  // Initialize Payload
  console.log('⚡ Initializing Payload...')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })
  console.log('✅ Payload initialized\n')

  // Find books that might need enrichment
  console.log('🔍 Finding books that might need enrichment...')
  const books = await payload.find({
    collection: 'books',
    limit: limit || 1000, // Default to 1000, can be overridden
    sort: '-createdAt', // Start with newest books
  })

  console.log(`📊 Found ${books.docs.length} books to analyze\n`)

  const stats: EnrichmentStats = {
    booksScanned: 0,
    booksEnriched: 0,
    fieldsUpdated: 0,
    apiCallsMade: 0,
    apiErrors: 0,
    errors: [],
  }

  const startTime = Date.now()

  // Process each book
  for (const [index, book] of books.docs.entries()) {
    console.log(`\n[${index + 1}/${books.docs.length}] 📖 "${book.title}"`)
    stats.booksScanned++

    if (dryRun) {
      const missingFields = identifyMissingFields(book)
      if (missingFields.length > 0) {
        console.log(`   [DRY RUN] Would enrich: ${missingFields.join(', ')}`)
      } else {
        console.log(`   [DRY RUN] No enrichment needed`)
      }
    } else {
      await enrichBook(payload, book, stats)
    }

    // Progress update every 20 books
    if ((index + 1) % 20 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      const rate = ((index + 1) / parseFloat(elapsed)).toFixed(2)
      console.log(`\n📊 Progress: ${index + 1}/${books.docs.length} | Rate: ${rate} books/sec`)
      console.log(`   Enriched: ${stats.booksEnriched} | API calls: ${stats.apiCallsMade} | Errors: ${stats.apiErrors}`)
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)

  // Print summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 ENRICHMENT SUMMARY')
  console.log('='.repeat(70))
  console.log(`⏱️  Total time: ${totalTime}s`)
  console.log(`📚 Books scanned: ${stats.booksScanned}`)
  console.log(`✨ Books enriched: ${stats.booksEnriched}`)
  console.log(`📝 Fields updated: ${stats.fieldsUpdated}`)
  console.log(`🔗 API calls made: ${stats.apiCallsMade}`)
  console.log(`❌ API errors: ${stats.apiErrors}`)

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors encountered:`)
    stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`))
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more`)
    }
  }

  console.log('\n' + '='.repeat(70))
  
  if (dryRun) {
    console.log('\n✅ Dry run complete - no data was updated')
  } else {
    console.log('\n✅ Enrichment complete!')
  }

  console.log('\n💡 Usage:')
  console.log('   --dry-run     Show what would be enriched without updating')
  console.log('   --limit N     Process only first N books')

  process.exit(0)
}

main().catch(error => {
  console.error('❌ Enrichment failed:', error)
  process.exit(1)
})