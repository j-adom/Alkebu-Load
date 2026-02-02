#!/usr/bin/env tsx

/**
 * Master Book Data Reconciliation Script
 *
 * Implements Square-First Hybrid approach:
 * 1. Start with Square catalog (source of truth for inventory/pricing)
 * 2. Enrich with ISBNdb (best metadata)
 * 3. Fallback to Google Books
 * 4. Preserve Sanity curated descriptions
 * 5. Score and merge data from all sources
 * 6. Generate manual review queue
 * 7. Output final clean dataset
 *
 * Usage: tsx scripts/reconcile-book-data.ts
 */

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'
import { enrichProductFromIdentifiers } from '../src/app/utils/productEnrichment'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: './.env' })

interface SquareBook {
  itemId: string
  itemName: string
  description: string
  category: string
  variations: Array<{
    variationId: string
    variationName: string
    gtin: string
    sku: string
    price: string
    stockLevel: number
    enabled: boolean
  }>
}

interface SanityBook {
  _id: string
  title: string
  subtitle?: string
  description?: string
  authors?: Array<{ _ref: string; name?: string }>
  defaultBookVariant?: any
  variants?: any[]
  vendor?: any
  tags?: string[]
  genres?: any[]
}

interface ExternalBookData {
  source: 'isbndb' | 'google'
  title?: string
  subtitle?: string
  authors?: string[]
  publisher?: string
  publishedDate?: string
  description?: string
  pageCount?: number
  categories?: string[]
  imageUrl?: string
  isbn13?: string
  isbn10?: string
  language?: string
  confidence: number // 0-100
}

interface ReconciledBook {
  // Identity
  isbn13?: string
  title: string
  subtitle?: string

  // Content (scored merge)
  description: string
  descriptionSource: string

  // Metadata
  authors: string[]
  publisher?: string
  publishedDate?: string
  pageCount?: number
  categories: string[]
  genres: string[]
  tags: string[]

  // Pricing & Inventory (Square authority)
  editions: Array<{
    binding: string
    isbn13?: string
    sku?: string
    squareVariationId?: string
    retailPrice: number // cents
    stockLevel: number
    isAvailable: boolean
  }>

  // Images (best quality)
  images: Array<{
    url: string
    source: string
    width?: number
    height?: number
  }>

  // Provenance
  sources: {
    square: boolean
    sanity: boolean
    isbndb: boolean
    google: boolean
  }
  squareItemId?: string
  sanityId?: string

  // Quality flags
  confidence: number // 0-100
  needsReview: boolean
  reviewReasons: string[]
}

interface ReconciliationStats {
  totalSquareBooks: number
  totalSanityBooks: number
  matched: number
  enrichedFromISBNdb: number
  enrichedFromGoogle: number
  needsManualReview: number
  missingISBN: number
  missingImages: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
}

class BookReconciler {
  private squareBooks: Map<string, SquareBook> = new Map()
  private sanityBooks: Map<string, SanityBook> = new Map()
  private reconciledBooks: ReconciledBook[] = []
  private stats: ReconciliationStats = {
    totalSquareBooks: 0,
    totalSanityBooks: 0,
    matched: 0,
    enrichedFromISBNdb: 0,
    enrichedFromGoogle: 0,
    needsManualReview: 0,
    missingISBN: 0,
    missingImages: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
  }

  async loadSquareCSV(csvPath: string) {
    console.log('📦 Loading Square catalog...')
    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Handle UTF-8 BOM (﻿)
    }) as any[]

    // Group by SKU (this is the actual Item ID in Square)
    const grouped = new Map<string, any>()
    for (const row of records) {
      const itemName = row['Item Name'] as string
      const itemSku = row['SKU'] as string // SKU is the Item ID in Square

      if (!itemName) continue

      // Skip archived items
      if ((row['Archived'] as string)?.toLowerCase() === 'y') continue

      // Use SKU as primary key (Item ID), fallback to Item Name if no SKU
      const itemKey = itemSku || itemName

      if (!grouped.has(itemKey)) {
        grouped.set(itemKey, {
          itemId: itemSku, // SKU is the actual Square Item ID
          itemName: itemName,
          description: row['Description'] as string,
          category: (row['Categories'] || row['Reporting Category']) as string,
          variations: [],
        })
      }

      grouped.get(itemKey)!.variations.push({
        variationId: row['Token'] as string,
        variationName: (row['Variation Name'] || 'Regular') as string,
        gtin: row['GTIN'] as string,
        sku: itemSku, // Store the Item ID/SKU for matching with Sanity
        price: row['Price'] as string,
        stockLevel: parseInt((row['Current Quantity Alkebu-Lan Images'] as string) || '0') || 0,
        enabled: (row['Archived'] as string)?.toLowerCase() !== 'y' && (row['Sellable'] as string)?.toLowerCase() !== 'n',
      })
    }

    this.squareBooks = grouped
    this.stats.totalSquareBooks = grouped.size
    console.log(`✅ Loaded ${grouped.size} Square items`)
  }

  async loadSanityData(jsonPath: string) {
    console.log('📚 Loading Sanity data...')
    if (!fs.existsSync(jsonPath)) {
      console.log('⚠️  Sanity data not found, skipping')
      return
    }

    const allData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    const books = allData.book || []

    for (const book of books) {
      this.sanityBooks.set(book._id, book)

      // Also index by ISBN if available
      const isbn = book.defaultBookVariant?.isbn
      if (isbn) {
        this.sanityBooks.set(`isbn:${isbn}`, book)
      }
    }

    this.stats.totalSanityBooks = books.length
    console.log(`✅ Loaded ${books.length} Sanity books`)
  }

  /**
   * Convert scientific notation from Excel (e.g., 9.79899E+12) to ISBN
   */
  convertScientificToISBN(value: string): string | undefined {
    if (!value) return undefined

    // Check if it's in scientific notation
    if (/^\d\.\d+E\+\d+$/.test(value)) {
      try {
        // Parse as float and convert to string without decimals
        const num = parseFloat(value)
        const isbn = Math.round(num).toString()

        // Validate it's a proper ISBN-13
        if (/^97[89]\d{10}$/.test(isbn)) {
          return isbn
        }
      } catch {
        return undefined
      }
    }

    // Try direct parsing
    const clean = value.replace(/[-\s]/g, '')
    if (/^97[89]\d{10}$/.test(clean)) {
      return clean
    }

    return undefined
  }

  extractISBN(variation: any): string | undefined {
    // Try GTIN first
    if (variation.gtin) {
      const isbn = this.convertScientificToISBN(variation.gtin)
      if (isbn) return isbn
    }

    // Try SKU
    if (variation.sku) {
      const isbn = this.convertScientificToISBN(variation.sku)
      if (isbn) return isbn
    }

    return undefined
  }

  /**
   * Batch fetch book data from ISBNdb API
   * Much faster than individual requests - batches up to 1000 ISBNs per call
   */
  async batchEnrichFromIsbndb(isbns: string[]): Promise<Map<string, ExternalBookData>> {
    const results = new Map<string, ExternalBookData>()

    if (!process.env.ISBNDB_API_KEY) {
      console.log('⚠️  ISBNDB_API_KEY not configured, skipping batch enrichment')
      return results
    }

    // ISBNdb supports up to 1000 ISBNs per batch
    const BATCH_SIZE = 1000
    const batches: string[][] = []

    for (let i = 0; i < isbns.length; i += BATCH_SIZE) {
      batches.push(isbns.slice(i, i + BATCH_SIZE))
    }

    console.log(`\n📚 Batch enriching ${isbns.length} ISBNs from ISBNdb (${batches.length} batch${batches.length > 1 ? 'es' : ''})...`)

    let totalRetrieved = 0
    const startTime = Date.now()

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const batchStartTime = Date.now()

      console.log(`  Batch ${i + 1}/${batches.length}: ${batch.length} ISBNs...`)

      try {
        const isbnsString = `isbns=${batch.join(',')}`
        const response = await axios.post(
          'https://api.premium.isbndb.com/books',
          isbnsString,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': process.env.ISBNDB_API_KEY,
            },
            timeout: 30000, // 30 second timeout for large batches
          }
        )

        if (response.data?.data) {
          const books = response.data.data

          for (const book of books) {
            const isbn = book.isbn13 || book.isbn
            if (!isbn) continue

            const authors = book.authors || []
            const pageCount = book.pages
            const publishedDate = book.date_published
            const imageUrl = book.image
            const description = book.synopsis || book.overview

            results.set(isbn, {
              source: 'isbndb',
              title: book.title,
              subtitle: book.title_long,
              authors,
              publisher: book.publisher,
              publishedDate,
              description,
              pageCount,
              categories: book.subjects || [],
              imageUrl,
              isbn13: isbn,
              confidence: 95,
            })
          }

          totalRetrieved += books.length
          const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1)
          console.log(`    ✅ Retrieved ${books.length} books (${batchTime}s)`)

          // Progress percentage
          const progressPct = ((i + 1) / batches.length * 100).toFixed(0)
          const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(0)
          console.log(`    📊 Progress: ${progressPct}% (${i + 1}/${batches.length} batches, ${elapsedSec}s elapsed)`)
        }
      } catch (error) {
        console.error(`    ❌ Batch ${i + 1} failed:`, error instanceof Error ? error.message : 'Unknown error')
        console.log(`    ⚠️  Continuing with remaining batches...`)
        // Don't stop - continue with next batch
      }

      // Rate limiting: small delay between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Increased to 1 second for safety
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`✅ Total enriched from ISBNdb: ${results.size}/${isbns.length} (${totalTime}s total)`)

    // Show success rate
    const successRate = ((results.size / isbns.length) * 100).toFixed(1)
    console.log(`   Success rate: ${successRate}%`)

    return results
  }

  /**
   * Fallback to individual API enrichment for ISBNs not found in batch
   */
  async enrichFromExternalAPIs(isbn: string): Promise<ExternalBookData | null> {
    try {
      const identifier = { type: 'isbn13' as const, value: isbn }
      const data = await enrichProductFromIdentifiers(identifier)

      if (!data) return null

      // Extract data from enriched product
      const authors = data.authors?.map(a => a.name) || []
      const pageCount = data.editions?.[0]?.pages
      const publishedDate = data.editions?.[0]?.datePublished
      // Fix: ISBNdb returns scrapedImageUrls, not images
      const imageUrl = data.scrapedImageUrls?.[0]?.url || data.images?.[0]?.url
      const description = data.description || data.synopsis || data.excerpt

      return {
        source: data.importSource === 'isbndb' ? 'isbndb' : 'google',
        title: data.title,
        subtitle: data.titleLong,
        authors,
        publisher: data.publisher,
        publishedDate,
        description,
        pageCount,
        categories: data.categories || [],
        imageUrl,
        isbn13: isbn,
        confidence: data.title ? 90 : 50,
      }
    } catch (error) {
      console.log(`  ⚠️  API enrichment failed for ${isbn}`)
      return null
    }
  }

  findSanityMatch(squareBook: SquareBook, isbn?: string): SanityBook | undefined {
    // 1. Try ISBN match first (highest priority)
    if (isbn) {
      const byIsbn = this.sanityBooks.get(`isbn:${isbn}`)
      if (byIsbn) return byIsbn
    }

    // 2. Try SKU match (Square SKU = Item ID)
    if (squareBook.itemId) {
      for (const sanityBook of this.sanityBooks.values()) {
        const sanitySku = sanityBook.defaultBookVariant?.sku ||
                          sanityBook.variants?.find((v: any) => v.sku)?.sku
        if (sanitySku === squareBook.itemId) {
          return sanityBook
        }
      }
    }

    // 3. Try fuzzy title match (fallback)
    const squareTitle = squareBook.itemName.toLowerCase().trim()
    for (const sanityBook of this.sanityBooks.values()) {
      const sanityTitle = sanityBook.title?.toLowerCase().trim()
      if (sanityTitle && squareTitle.includes(sanityTitle)) {
        return sanityBook
      }
    }

    return undefined
  }

  calculateConfidence(book: ReconciledBook): number {
    let score = 0

    // Has ISBN: +40
    if (book.isbn13) score += 40

    // Has external enrichment: +30
    if (book.sources.isbndb) score += 30
    else if (book.sources.google) score += 20

    // Has good metadata: +20
    if (book.authors.length > 0) score += 10
    if (book.description && book.description.length > 50) score += 10

    // Has images: +10
    if (book.images.length > 0) score += 10

    return Math.min(100, score)
  }

  /**
   * Reconcile a book using cached enrichment data (much faster!)
   */
  async reconcileBookWithCache(squareBook: SquareBook, enrichmentCache: Map<string, ExternalBookData>): Promise<ReconciledBook> {
    console.log(`\n🔍 Reconciling: ${squareBook.itemName}`)

    const book: ReconciledBook = {
      title: squareBook.itemName,
      description: '',
      descriptionSource: 'none',
      authors: [],
      categories: [],
      genres: [],
      tags: [],
      editions: [],
      images: [],
      sources: {
        square: true,
        sanity: false,
        isbndb: false,
        google: false,
      },
      squareItemId: squareBook.itemId,
      confidence: 0,
      needsReview: false,
      reviewReasons: [],
    }

    // Extract ISBN from first variation
    const primaryISBN = this.extractISBN(squareBook.variations[0])
    if (primaryISBN) {
      book.isbn13 = primaryISBN
      console.log(`  ✓ ISBN: ${primaryISBN}`)
    } else {
      console.log('  ⚠️  No ISBN found')
      book.needsReview = true
      book.reviewReasons.push('Missing ISBN')
      this.stats.missingISBN++
    }

    // Try to match with Sanity
    const sanityMatch = this.findSanityMatch(squareBook, primaryISBN)
    if (sanityMatch) {
      book.sources.sanity = true
      book.sanityId = sanityMatch._id
      this.stats.matched++

      // Preserve curated Sanity description (high value!)
      if (sanityMatch.description) {
        book.description = sanityMatch.description
        book.descriptionSource = 'sanity'
        console.log('  ✓ Using Sanity description')
      }

      // Preserve tags and genres
      if (sanityMatch.tags) book.tags = sanityMatch.tags

      console.log('  ✓ Matched with Sanity')
    }

    // Get enrichment data from cache (instant lookup!)
    if (primaryISBN) {
      const externalData = enrichmentCache.get(primaryISBN)

      if (externalData) {
        book.sources[externalData.source] = true

        if (externalData.source === 'isbndb') {
          this.stats.enrichedFromISBNdb++
          console.log('  ✓ Enriched from ISBNdb')
        } else {
          this.stats.enrichedFromGoogle++
          console.log('  ✓ Enriched from Google Books')
        }

        // Use external title if better
        if (externalData.title && externalData.title.length > book.title.length) {
          book.title = externalData.title
        }

        if (externalData.subtitle) book.subtitle = externalData.subtitle
        if (externalData.authors) book.authors = externalData.authors
        if (externalData.publisher) book.publisher = externalData.publisher
        if (externalData.publishedDate) book.publishedDate = externalData.publishedDate
        if (externalData.pageCount) book.pageCount = externalData.pageCount
        if (externalData.categories) book.categories = externalData.categories

        // Use external description if we don't have Sanity description
        if (!book.description && externalData.description) {
          book.description = externalData.description
          book.descriptionSource = externalData.source
        }

        // Add image
        if (externalData.imageUrl) {
          book.images.push({
            url: externalData.imageUrl,
            source: externalData.source,
          })
        }
      }
    }

    // Build editions from Square variations
    for (const variation of squareBook.variations) {
      const price = parseFloat(variation.price.replace(/[^0-9.-]+/g, ''))
      const isbn = this.extractISBN(variation)

      book.editions.push({
        binding: variation.variationName || 'Standard Edition',
        isbn13: isbn,
        sku: variation.sku,
        squareVariationId: variation.variationId,
        retailPrice: Math.round(price * 100), // to cents
        stockLevel: variation.stockLevel,
        isAvailable: variation.enabled && variation.stockLevel > 0,
      })
    }

    // Quality checks
    if (book.images.length === 0) {
      book.needsReview = true
      book.reviewReasons.push('Missing cover image')
      this.stats.missingImages++
    }

    if (book.authors.length === 0) {
      book.needsReview = true
      book.reviewReasons.push('Missing author information')
    }

    if (!book.description) {
      book.needsReview = true
      book.reviewReasons.push('Missing description')
      book.description = squareBook.description || 'No description available'
      book.descriptionSource = 'square'
    }

    // Calculate confidence score
    book.confidence = this.calculateConfidence(book)

    if (book.confidence >= 80) this.stats.highConfidence++
    else if (book.confidence >= 50) this.stats.mediumConfidence++
    else this.stats.lowConfidence++

    if (book.needsReview) {
      this.stats.needsManualReview++
      console.log(`  ⚠️  Flagged for review: ${book.reviewReasons.join(', ')}`)
    }

    console.log(`  📊 Confidence: ${book.confidence}%`)

    return book
  }

  async reconcileAll() {
    console.log('\n🔄 Starting reconciliation...\n')

    // Step 1: Filter to books only
    const booksToProcess: SquareBook[] = []
    for (const [_itemName, squareBook] of this.squareBooks) {
      const category = squareBook.category?.toLowerCase() || ''
      const hasBookISBN = squareBook.variations.some(v => this.extractISBN(v))

      if (!category.includes('book') && !hasBookISBN) {
        console.log(`⏭️  Skipping non-book: ${squareBook.itemName}`)
        continue
      }

      booksToProcess.push(squareBook)
    }

    console.log(`📚 Found ${booksToProcess.length} books to process\n`)

    // Step 2: Collect all ISBNs for batch enrichment
    const allIsbns = new Set<string>()
    for (const squareBook of booksToProcess) {
      for (const variation of squareBook.variations) {
        const isbn = this.extractISBN(variation)
        if (isbn) allIsbns.add(isbn)
      }
    }

    // Step 3: Batch enrich from ISBNdb (MUCH faster!)
    const enrichmentCache = await this.batchEnrichFromIsbndb(Array.from(allIsbns))

    // Step 4: Process each book using cached enrichment data
    console.log('\n🔄 Processing books with enriched data...\n')

    const processingStartTime = Date.now()
    let processed = 0

    for (const squareBook of booksToProcess) {
      const reconciledBook = await this.reconcileBookWithCache(squareBook, enrichmentCache)
      this.reconciledBooks.push(reconciledBook)

      processed++

      // Show progress every 50 books for large catalogs
      if (processed % 50 === 0 || processed === booksToProcess.length) {
        const progressPct = ((processed / booksToProcess.length) * 100).toFixed(0)
        const elapsedSec = ((Date.now() - processingStartTime) / 1000).toFixed(0)
        const booksPerSec = (processed / (Date.now() - processingStartTime) * 1000).toFixed(1)
        const remaining = booksToProcess.length - processed
        const etaSec = remaining > 0 ? (remaining / parseFloat(booksPerSec)).toFixed(0) : 0

        console.log(`\n📊 Progress: ${processed}/${booksToProcess.length} (${progressPct}%)`)
        console.log(`   Speed: ${booksPerSec} books/sec | Elapsed: ${elapsedSec}s | ETA: ${etaSec}s\n`)
      }
    }

    const totalProcessingTime = ((Date.now() - processingStartTime) / 1000).toFixed(1)
    console.log(`\n✅ Processed ${booksToProcess.length} books in ${totalProcessingTime}s`)
  }

  saveResults(outputDir: string) {
    console.log('\n💾 Saving results...')

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Save all reconciled books
    const allBooksPath = path.join(outputDir, 'reconciled-books.json')
    fs.writeFileSync(allBooksPath, JSON.stringify(this.reconciledBooks, null, 2))
    console.log(`✅ Saved ${this.reconciledBooks.length} books to ${allBooksPath}`)

    // Save manual review queue
    const reviewQueue = this.reconciledBooks.filter(b => b.needsReview)
    const reviewPath = path.join(outputDir, 'manual-review-queue.json')
    fs.writeFileSync(reviewPath, JSON.stringify(reviewQueue, null, 2))
    console.log(`✅ Saved ${reviewQueue.length} items for manual review to ${reviewPath}`)

    // Save high-confidence books (ready to import)
    const highConfidence = this.reconciledBooks.filter(b => b.confidence >= 80 && !b.needsReview)
    const readyPath = path.join(outputDir, 'ready-to-import.json')
    fs.writeFileSync(readyPath, JSON.stringify(highConfidence, null, 2))
    console.log(`✅ Saved ${highConfidence.length} high-confidence books to ${readyPath}`)

    // Save stats
    const statsPath = path.join(outputDir, 'reconciliation-stats.json')
    fs.writeFileSync(statsPath, JSON.stringify(this.stats, null, 2))
    console.log(`✅ Saved stats to ${statsPath}`)
  }

  printSummary() {
    console.log('\n' + '='.repeat(70))
    console.log('📊 RECONCILIATION SUMMARY')
    console.log('='.repeat(70))
    console.log(`\n📦 Input Sources:`)
    console.log(`├── Square books:           ${this.stats.totalSquareBooks}`)
    console.log(`├── Sanity books:           ${this.stats.totalSanityBooks}`)
    console.log(`└── Matched:                ${this.stats.matched}`)
    console.log(`\n🔍 Enrichment:`)
    console.log(`├── ISBNdb enrichment:      ${this.stats.enrichedFromISBNdb}`)
    console.log(`├── Google Books fallback:  ${this.stats.enrichedFromGoogle}`)
    console.log(`└── Missing ISBN:           ${this.stats.missingISBN}`)
    console.log(`\n✅ Quality:`)
    console.log(`├── High confidence (≥80):  ${this.stats.highConfidence}`)
    console.log(`├── Medium confidence (50-79): ${this.stats.mediumConfidence}`)
    console.log(`├── Low confidence (<50):   ${this.stats.lowConfidence}`)
    console.log(`└── Needs manual review:    ${this.stats.needsManualReview}`)
    console.log(`\n⚠️  Warnings:`)
    console.log(`├── Missing images:         ${this.stats.missingImages}`)
    console.log(`└── Missing ISBN:           ${this.stats.missingISBN}`)
    console.log('\n' + '='.repeat(70))
  }
}

async function main() {
  console.log('🚀 Book Data Reconciliation\n')

  const reconciler = new BookReconciler()

  // Load Square data
  const squareCSV = process.argv[2] || path.join(__dirname, '../data/square-catalog.csv')
  if (!fs.existsSync(squareCSV)) {
    throw new Error(`Square CSV not found: ${squareCSV}`)
  }
  await reconciler.loadSquareCSV(squareCSV)

  // Load Sanity data (optional)
  const sanityJSON = path.join(__dirname, '../data/sanity-export/all-data.json')
  await reconciler.loadSanityData(sanityJSON)

  // Reconcile all books
  await reconciler.reconcileAll()

  // Save results
  const outputDir = path.join(__dirname, '../data/reconciled')
  reconciler.saveResults(outputDir)

  // Print summary
  reconciler.printSummary()

  console.log('\n✅ Reconciliation complete!')
  console.log('\n📝 Next steps:')
  console.log('1. Review: data/reconciled/manual-review-queue.json')
  console.log('2. Import: tsx scripts/import-reconciled-books.ts')
}

main().catch(error => {
  console.error('❌ Reconciliation failed:', error)
  process.exit(1)
})
