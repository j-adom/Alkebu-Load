#!/usr/bin/env tsx

/**
 * Bulk ISBN Import Script
 * 
 * Staff can paste ISBNs (one per line) and this script will:
 * 1. Fetch book data from ISBNdb/Google Books
 * 2. Create new book records with populated metadata
 * 3. Download and upload cover images to Payload Media
 * 4. Add to specified categories/collections
 * 
 * Usage:
 *   1. Create a file 'isbn-list.txt' with ISBNs (one per line)
 *   2. Run: ISBNDB_API_KEY=your-key pnpm tsx scripts/bulk-isbn-import.ts
 *   3. Optional flags:
 *      --dry-run (preview without creating)
 *      --download-images (fetch cover images, default: true)
 *      --category "category-name" (auto-assign category)
 *      --collection "collection-name" (auto-assign collection)
 *      --vendor "vendor-id" (link to vendor)
 *      --retail-price 2000 (price in cents, if not found)
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { createWriteStream } from 'fs'

const ISBNDB_API_KEY = process.env.ISBNDB_API_KEY || ''
const ISBNDB_BASE_URL = 'https://api2.isbndb.com'
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || ''

interface BulkStats {
  totalISBNs: number
  processed: number
  created: number
  skipped: number
  errors: number
  imagesDownloaded: number
  startTime: number
}

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
    isbn?: string
    isbn13?: string
  }
}

async function fetchFromISBNdb(isbn: string): Promise<ISBNdbResponse | null> {
  try {
    const url = `${ISBNDB_BASE_URL}/book/${isbn}`
    const response = await fetch(url, {
      headers: {
        'Authorization': ISBNDB_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    } as any)

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json() as ISBNdbResponse
  } catch (error) {
    console.error(`  ❌ ISBNdb error: ${error}`)
    return null
  }
}

async function fetchFromGoogleBooks(isbn: string): Promise<any> {
  try {
    if (!GOOGLE_BOOKS_API_KEY) return null

    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${GOOGLE_BOOKS_API_KEY}`
    const response = await fetch(url, { timeout: 5000 } as any)

    if (!response.ok) return null
    const data = await response.json() as any

    if (!data.items || data.items.length === 0) return null
    return data.items[0].volumeInfo
  } catch (error) {
    console.error(`  ❌ Google Books error: ${error}`)
    return null
  }
}

async function downloadBookImage(imageUrl: string, isbn: string): Promise<Buffer | null> {
  try {
    if (!imageUrl) return null

    const response = await fetch(imageUrl, {
      timeout: 5000,
      headers: { 'User-Agent': 'Alkebulanimages-BookImport/1.0' }
    } as any)

    if (!response.ok) return null

    const buffer = await response.buffer()
    return buffer as Buffer
  } catch (error) {
    console.error(`  ⚠️  Could not download image: ${error}`)
    return null
  }
}

async function createBookFromISBN(
  payload: any,
  isbn: string,
  options: any,
  stats: BulkStats
): Promise<boolean> {
  try {
    // Check if already exists
    const existing = await payload.find({
      collection: 'books',
      where: {
        or: [
          { 'editions.isbn': { equals: isbn } },
          { 'editions.isbn10': { equals: isbn } }
        ]
      },
      limit: 1
    })

    if (existing.docs.length > 0) {
      console.log(`  ⏭️  Already exists: ${isbn}`)
      stats.skipped++
      return false
    }

    // Fetch data
    console.log(`  📖 Fetching data for ${isbn}...`)
    let isbndbData = await fetchFromISBNdb(isbn)
    let googleData = null

    if (!isbndbData?.book) {
      googleData = await fetchFromGoogleBooks(isbn)
    }

    if (!isbndbData?.book && !googleData) {
      console.log(`  ❌ No data found for ${isbn}`)
      stats.errors++
      return false
    }

    const source = isbndbData?.book || googleData
    const title = source.title || source.title_long || 'Unknown Title'

    console.log(`  ✅ Found: "${title}"`)

    // Prepare book data
    const bookData: any = {
      title: title,
      titleLong: isbndbData?.book?.title_long || googleData?.title,
      description: isbndbData?.book?.overview || googleData?.description,
      synopsis: isbndbData?.book?.synopsis,
      excerpt: isbndbData?.book?.excerpt,
      authorsText: isbndbData?.book?.authors?.map((name: string) => ({ name })) || [],
      publisherText: isbndbData?.book?.publisher || googleData?.publisher,
      subjects: (isbndbData?.book?.subjects || googleData?.categories || []).map((s: string) => ({ subject: s })),
      editions: [
        {
          isbn: isbn,
          isbn10: isbndbData?.book?.isbn,
          binding: isbndbData?.book?.binding || 'paperback',
          pages: isbndbData?.book?.pages || googleData?.pageCount,
          datePublished: isbndbData?.book?.date_published || googleData?.publishedDate,
          publisherText: isbndbData?.book?.publisher || googleData?.publisher
        }
      ],
      pricing: {
        retailPrice: options.retailPrice || 1999, // Default $19.99 if not specified
        requiresShipping: true
      },
      inventory: {
        trackQuantity: true,
        stockLevel: 0,
        location: 'main_store'
      },
      isbndbChecked: true,
      lastEnrichedAt: new Date().toISOString(),
      importSource: isbndbData?.book ? 'isbndb' : 'google-books'
    }

    // Add category if specified
    if (options.category) {
      bookData.categories = [options.category]
    }

    // Add collection if specified
    if (options.collection) {
      bookData.collections = [{ collectionName: options.collection }]
    }

    // Add vendor if specified
    if (options.vendor) {
      bookData.vendor = options.vendor
    }

    // Download and upload image if enabled
    if (options.downloadImages) {
      const imageUrl = isbndbData?.book?.image || googleData?.imageLinks?.thumbnail
      if (imageUrl) {
        console.log(`  🖼️  Downloading cover image...`)
        const imageBuffer = await downloadBookImage(imageUrl, isbn)

        if (imageBuffer) {
          try {
            // Upload to Payload Media collection
            const fileName = `book-cover-${isbn}.jpg`
            const uploadedFile = await payload.create({
              collection: 'media',
              data: {
                alt: `Cover for ${title}`
              },
              file: new File([imageBuffer], fileName, { type: 'image/jpeg' })
            })

            // Add to book images
            bookData.images = [
              {
                image: uploadedFile.id,
                alt: `Cover for ${title}`,
                isPrimary: true
              }
            ]

            stats.imagesDownloaded++
            console.log(`  ✅ Image uploaded`)
          } catch (error) {
            console.log(`  ⚠️  Could not upload image: ${error}`)
          }
        }
      }
    }

    // Create book record
    const created = await payload.create({
      collection: 'books',
      data: bookData
    })

    console.log(`  ✨ Created book: ${created.id}`)
    stats.created++
    return true
  } catch (error: any) {
    console.error(`  ❌ Error creating book: ${error.message}`)
    stats.errors++
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const downloadImages = !args.includes('--no-images')

  // Parse options
  const categoryIndex = args.indexOf('--category')
  const category = categoryIndex >= 0 ? args[categoryIndex + 1] : null

  const collectionIndex = args.indexOf('--collection')
  const collection = collectionIndex >= 0 ? args[collectionIndex + 1] : null

  const vendorIndex = args.indexOf('--vendor')
  const vendor = vendorIndex >= 0 ? args[vendorIndex + 1] : null

  const priceIndex = args.indexOf('--retail-price')
  const retailPrice = priceIndex >= 0 ? parseInt(args[priceIndex + 1]) : null

  const fileIndex = args.indexOf('--file')
  const inputFile = fileIndex >= 0 ? args[fileIndex + 1] : 'isbn-list.txt'

  console.log('📚 Bulk ISBN Book Import\n')
  console.log(`📁 Reading ISBNs from: ${inputFile}`)

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`)
    console.error(`\nCreate a file named '${inputFile}' with one ISBN per line, then try again.`)
    process.exit(1)
  }

  // Read ISBN list
  const content = fs.readFileSync(inputFile, 'utf-8')
  const isbns = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'))

  console.log(`\n📖 Found ${isbns.length} ISBNs to import\n`)

  if (dryRun) {
    console.log(`⚠️  DRY RUN MODE - No books will be created\n`)
  }

  if (!ISBNDB_API_KEY) {
    console.error('❌ ISBNDB_API_KEY not configured')
    process.exit(1)
  }

  // Initialize Payload
  console.log('⚡ Initializing Payload...')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })
  console.log('✅ Payload initialized\n')

  const stats: BulkStats = {
    totalISBNs: isbns.length,
    processed: 0,
    created: 0,
    skipped: 0,
    errors: 0,
    imagesDownloaded: 0,
    startTime: Date.now()
  }

  const options = {
    category,
    collection,
    vendor,
    retailPrice,
    downloadImages
  }

  // Process each ISBN
  for (const [index, isbn] of isbns.entries()) {
    console.log(`[${index + 1}/${isbns.length}] ISBN: ${isbn}`)

    if (!dryRun) {
      await createBookFromISBN(payload, isbn, options, stats)
    }

    stats.processed++

    // Small delay between requests
    if (index < isbns.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  const totalTime = ((Date.now() - stats.startTime) / 1000).toFixed(1)

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📚 BULK ISBN IMPORT COMPLETE!')
  console.log('='.repeat(80))
  console.log(`⏱️  Total time: ${totalTime}s`)
  console.log(`📖 ISBNs processed: ${stats.processed}`)
  console.log(`✨ Books created: ${stats.created}`)
  console.log(`⏭️  Books skipped (already exist): ${stats.skipped}`)
  console.log(`❌ Errors: ${stats.errors}`)
  console.log(`🖼️  Images downloaded: ${stats.imagesDownloaded}`)

  if (dryRun) {
    console.log('\n✅ Dry run complete - no changes made')
  } else {
    console.log('\n✅ Books imported successfully!')
  }

  process.exit(0)
}

main().catch(error => {
  console.error('❌ Bulk import failed:', error)
  process.exit(1)
})
