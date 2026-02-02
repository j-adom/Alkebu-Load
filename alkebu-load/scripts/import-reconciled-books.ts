#!/usr/bin/env tsx

/**
 * Import Reconciled Books to Payload
 *
 * Imports the final reconciled book dataset into Payload CMS.
 * Handles author/publisher creation, image uploads, and relationship linking.
 *
 * Usage:
 *   tsx scripts/import-reconciled-books.ts [options]
 *
 * Options:
 *   --dry-run           Validate without importing
 *   --high-confidence   Only import high-confidence books (≥80)
 *   --file <path>       Custom reconciled data file (default: data/reconciled/reconciled-books.json)
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const toLexical = (text?: string) => {
  if (!text || !text.trim()) return undefined

  return {
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: text.trim(),
              type: 'text',
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

interface ImportContext {
  payload: any
  authorCache: Map<string, string> // name -> ID
  publisherCache: Map<string, string> // name -> ID
  dryRun: boolean
}

interface ImportError {
  title: string
  isbn?: string
  squareItemId?: string
  error: string
}

interface ImportStats {
  booksCreated: number
  booksUpdated: number
  booksSkipped: number
  authorsCreated: number
  publishersCreated: number
  errors: ImportError[]
}

const CHECKPOINT_PATH = path.join(__dirname, '../data/import-checkpoint.json')
const ERROR_LOG_PATH = path.join(__dirname, '../data/import-errors.json')

function ensureDirExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function preloadAuthors(ctx: ImportContext) {
  if (ctx.dryRun) return

  console.log('📥 Preloading authors...')

  let page = 1
  const limit = 500

  while (true) {
    const result = await ctx.payload.find({
      collection: 'authors',
      limit,
      page,
      depth: 0,
      pagination: true,
    })

    for (const author of result.docs) {
      if (author?.name && author?.id) {
        ctx.authorCache.set(author.name, author.id)
      }
    }

    if (!result.hasNextPage) break
    page++
  }

  console.log(`   ↳ Cached ${ctx.authorCache.size} authors`)
}

async function preloadPublishers(ctx: ImportContext) {
  if (ctx.dryRun) return

  console.log('📥 Preloading publishers...')

  let page = 1
  const limit = 500

  while (true) {
    const result = await ctx.payload.find({
      collection: 'publishers',
      limit,
      page,
      depth: 0,
      pagination: true,
    })

    for (const publisher of result.docs) {
      if (publisher?.name && publisher?.id) {
        ctx.publisherCache.set(publisher.name, publisher.id)
      }
    }

    if (!result.hasNextPage) break
    page++
  }

  console.log(`   ↳ Cached ${ctx.publisherCache.size} publishers`)
}

/**
 * Normalize binding values from Square/external sources to schema values
 */
function normalizeBinding(binding?: string): string | undefined {
  if (!binding) return undefined

  const lower = binding.toLowerCase()

  // Map common variations to schema values
  if (lower.includes('hard') || lower.includes('cloth')) return 'hardcover'
  if (lower.includes('paper') || lower.includes('soft')) return 'paperback'
  if (lower.includes('mass') || lower.includes('market')) return 'mass-market'
  if (lower.includes('ebook') || lower.includes('digital') || lower.includes('kindle')) return 'ebook'
  if (lower.includes('audio')) return 'audiobook'

  // Default to paperback for unknown bindings
  return 'paperback'
}

async function ensureAuthor(name: string, ctx: ImportContext, stats: ImportStats): Promise<string | undefined> {
  if (!name) return undefined

  // Check cache
  if (ctx.authorCache.has(name)) {
    return ctx.authorCache.get(name)
  }

  if (ctx.dryRun) {
    console.log(`  [DRY RUN] Would create/find author: ${name}`)
    return 'dry-run-id'
  }

  // Check if exists
  const existing = await ctx.payload.find({
    collection: 'authors',
    where: {
      name: { equals: name },
    },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    const id = existing.docs[0].id
    ctx.authorCache.set(name, id)
    return id
  }

  // Create new
  try {
    const result = await ctx.payload.create({
      collection: 'authors',
      data: { name },
    })
    ctx.authorCache.set(name, result.id)
    console.log(`    ✓ Created author: ${name}`)
    stats.authorsCreated++
    return result.id
  } catch (error) {
    console.error(`    ✗ Failed to create author ${name}:`, error)
    return undefined
  }
}

async function ensurePublisher(name: string, ctx: ImportContext, stats: ImportStats): Promise<string | undefined> {
  if (!name) return undefined

  // Check cache
  if (ctx.publisherCache.has(name)) {
    return ctx.publisherCache.get(name)
  }

  if (ctx.dryRun) {
    console.log(`  [DRY RUN] Would create/find publisher: ${name}`)
    return 'dry-run-id'
  }

  // Check if exists
  const existing = await ctx.payload.find({
    collection: 'publishers',
    where: {
      name: { equals: name },
    },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    const id = existing.docs[0].id
    ctx.publisherCache.set(name, id)
    return id
  }

  // Create new
  try {
    const result = await ctx.payload.create({
      collection: 'publishers',
      data: { name },
    })
    ctx.publisherCache.set(name, result.id)
    console.log(`    ✓ Created publisher: ${name}`)
    stats.publishersCreated++
    return result.id
  } catch (error) {
    console.error(`    ✗ Failed to create publisher ${name}:`, error)
    return undefined
  }
}

async function importBook(book: any, ctx: ImportContext, stats: ImportStats) {
  console.log(`\n📖 ${book.title}`)
  console.log(`   Sources: ${Object.entries(book.sources).filter(([k, v]) => v).map(([k]) => k).join(', ')}`)
  console.log(`   Confidence: ${book.confidence}%`)

  if (ctx.dryRun) {
    console.log('   [DRY RUN] Would import this book')
    stats.booksCreated++
    return
  }

  try {
    // Ensure authors exist
    const authorIds = []
    for (const authorName of book.authors || []) {
      const authorId = await ensureAuthor(authorName, ctx, stats)
      if (authorId) authorIds.push(authorId)
    }

    const imageList = Array.isArray(book.images) ? book.images : []

    // Ensure publishers exist (from editions)
    for (const edition of book.editions) {
      if (edition.publisher) {
        edition.publisherId = await ensurePublisher(edition.publisher, ctx, stats)
      }
    }

    const now = new Date().toISOString()
    const totalStock = book.editions.reduce((sum: number, e: any) => sum + Math.max(0, Number(e.stockLevel ?? 0)), 0)
    const primaryPrice = Math.max(
      0,
      Math.round(
        Number(
          book.editions.find((e: any) => Number(e.retailPrice ?? 0) > 0)?.retailPrice ?? 0,
        ),
      ),
    )

    // Build Payload book data
    const payloadBook = {
      title: book.title,
      subtitle: book.subtitle,
      description: toLexical(book.description),
      authors: authorIds,

      // Metadata
      pageCount: book.pageCount,
      publicationDate: book.publishedDate,
      genres: book.categories, // Map categories to genres
      tags: book.tags,

      // Editions
      editions: book.editions.map((edition: any) => {
        const retailPriceCents = Math.max(0, Math.round(Number(edition.retailPrice ?? 0)))
        const stockLevel = Math.max(0, Number(edition.stockLevel ?? 0))

        return {
          binding: normalizeBinding(edition.binding), // Normalize Square binding values
          isbn: edition.isbn13, // Schema uses 'isbn' not 'isbn13'
          isbn10: edition.isbn10,
          squareVariationId: edition.squareVariationId,
          pricing: {
            retailPrice: retailPriceCents,
          },
          inventory: {
            stockLevel,
            allowBackorders: false,
          },
          isAvailable: edition.isAvailable ?? stockLevel > 0,
          publisher: edition.publisherId,
        }
      }),

      // Pricing & Inventory
      pricing: {
        retailPrice: primaryPrice,
        requiresShipping: true,
        shippingWeight: 16,
      },
      inventory: {
        trackQuantity: true,
        stockLevel: totalStock,
        lowStockThreshold: 5,
        allowBackorders: false,
        location: 'main_store',
        isConsignment: false,
        dateAdded: now,
      },

      // Square integration
      squareItemId: book.squareItemId,

      // Image URLs from external sources (ISBNdb, Google Books, etc.)
      scrapedImageUrls: imageList.map((img: any) => ({
        url: img.url
      })),

      // Import metadata
      importSource: 'csv-import', // Use valid option from schema
      importDate: now,
      lastUpdated: now,
      isActive: book.editions.some((e: any) => e.isAvailable),

      // SEO
      seo: {
        metaTitle: book.title,
        metaDescription: book.description?.substring(0, 160),
      },
    }

    // Check if book already exists
    const existing = await ctx.payload.find({
      collection: 'books',
      where: {
        or: [
          book.squareItemId ? { squareItemId: { equals: book.squareItemId } } : null,
          book.isbn13 ? { 'editions.isbn': { equals: book.isbn13 } } : null,
        ].filter(Boolean),
      },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      await ctx.payload.update({
        collection: 'books',
        id: existing.docs[0].id,
        data: payloadBook,
      })
      console.log('   ✅ Updated')
      stats.booksUpdated++

      // Log image URLs stored
      if (imageList.length > 0) {
        console.log(`   📷 ${imageList.length} image URL(s) stored`)
      }
    } else {
      await ctx.payload.create({
        collection: 'books',
        data: payloadBook,
      })
      console.log('   ✅ Created')
      stats.booksCreated++

      // Log image URLs stored
      if (imageList.length > 0) {
        console.log(`   📷 ${imageList.length} image URL(s) stored`)
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isbnFromBook = book.isbn13 || book.isbn || (book.editions?.find((e: any) => e.isbn13)?.isbn13)
    console.error(`   ❌ Failed to import "${book.title}": ${errorMessage}`)
    stats.errors.push({
      title: book.title,
      isbn: isbnFromBook,
      squareItemId: book.squareItemId,
      error: errorMessage,
    })
    stats.booksSkipped++
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const highConfidenceOnly = args.includes('--high-confidence')

  const fileArgIndex = args.indexOf('--file')
  const customFile = fileArgIndex >= 0 ? args[fileArgIndex + 1] : null
  const dataFile = customFile || path.join(__dirname, '../data/reconciled/reconciled-books.json')

  console.log('🚀 Importing Reconciled Books to Payload\n')
  if (dryRun) console.log('⚠️  DRY RUN MODE - No changes will be made\n')

  // Load reconciled data
  if (!fs.existsSync(dataFile)) {
    throw new Error(`Reconciled data not found: ${dataFile}\nRun reconcile-book-data.ts first.`)
  }

  console.log(`📂 Loading: ${dataFile}`)
  const allBooks = JSON.parse(fs.readFileSync(dataFile, 'utf-8'))

  // Filter books
  let booksToImport = allBooks
  if (highConfidenceOnly) {
    booksToImport = allBooks.filter((b: any) => b.confidence >= 80)
    console.log(`✅ Filtered to ${booksToImport.length} high-confidence books (≥80)\n`)
  } else {
    console.log(`✅ Loaded ${booksToImport.length} books\n`)
  }

  // Debug: Check if secret is loaded
  if (!process.env.PAYLOAD_SECRET) {
    throw new Error('PAYLOAD_SECRET not found in environment. Check your .env file.')
  }

  // Initialize Payload - dynamically import config after dotenv
  let payload = null
  if (!dryRun) {
    const { default: config } = await import('../src/payload.config.js')
    payload = await getPayload({ config })
  }

  const ctx: ImportContext = {
    payload,
    authorCache: new Map(),
    publisherCache: new Map(),
    dryRun,
  }

  const stats: ImportStats = {
    booksCreated: 0,
    booksUpdated: 0,
    booksSkipped: 0,
    authorsCreated: 0,
    publishersCreated: 0,
    errors: [],
  }

  // Resume support
  const resume = args.includes('--resume')
  let resumeOffset = 0
  const totalAvailable = booksToImport.length

  if (resume) {
    if (fs.existsSync(CHECKPOINT_PATH)) {
      try {
        const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'))
        resumeOffset = checkpoint.lastProcessed || 0
        if (resumeOffset > 0 && resumeOffset < totalAvailable) {
          booksToImport = booksToImport.slice(resumeOffset)
          console.log(`🔁 Resuming import from record ${resumeOffset + 1} (skipping ${resumeOffset})\n`)
        } else {
          console.log('ℹ️  Checkpoint found but resume offset out of range; starting from beginning\n')
          resumeOffset = 0
        }
      } catch (error) {
        console.warn('⚠️  Failed to read checkpoint file, starting from beginning\n')
      }
    } else {
      console.log('ℹ️  No checkpoint found, starting fresh\n')
    }
  }

  // Preload caches for faster lookups
  if (!dryRun) {
    await preloadAuthors(ctx)
    await preloadPublishers(ctx)
  }

  // Import all books with progress tracking
  const startTime = Date.now()
  let imagesStored = 0
  let processedCount = 0
  const totalToProcess = resumeOffset + booksToImport.length

  for (let i = 0; i < booksToImport.length; i++) {
    const book = booksToImport[i]
    await importBook(book, ctx, stats)
    processedCount++

    const imageCount = Array.isArray(book.images) ? book.images.length : 0
    if (imageCount > 0) {
      imagesStored += imageCount
    }

    const absoluteProcessed = resumeOffset + processedCount

    if (processedCount % 100 === 0 || i === booksToImport.length - 1) {
      const progressPct = ((absoluteProcessed / totalToProcess) * 100).toFixed(1)
      const elapsedMs = Math.max(1, Date.now() - startTime)
      const elapsedSec = (elapsedMs / 1000).toFixed(0)
      const booksPerSecValue = processedCount / (elapsedMs / 1000)
      const booksPerSec = booksPerSecValue.toFixed(2)
      const remaining = totalToProcess - absoluteProcessed
      const etaSec = remaining > 0 && booksPerSecValue > 0 ? (remaining / booksPerSecValue).toFixed(0) : '∞'

      console.log(`\n📊 Progress: ${absoluteProcessed}/${totalToProcess} (${progressPct}%)`)
      console.log(`   Speed: ${booksPerSec} books/sec | Elapsed: ${elapsedSec}s | ETA: ${etaSec}s`)
      console.log(`   Created: ${stats.booksCreated} | Updated: ${stats.booksUpdated} | Errors: ${stats.errors.length}\n`)

      if (absoluteProcessed % 500 === 0) {
        ensureDirExists(path.dirname(CHECKPOINT_PATH))
        fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({
          lastProcessed: absoluteProcessed,
          timestamp: new Date().toISOString(),
          stats: {
            created: stats.booksCreated,
            updated: stats.booksUpdated,
            skipped: stats.booksSkipped,
            errors: stats.errors.length,
          },
        }, null, 2))
        console.log(`💾 Checkpoint saved: ${absoluteProcessed} books processed`)
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)

  // Print summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(70))
  console.log(`\n⏱️  Performance:`)
  const totalTimeNumber = parseFloat(totalTime) || (processedCount > 0 ? 1 : 0)
  const summaryRate = totalTimeNumber > 0 ? (processedCount / totalTimeNumber).toFixed(2) : '0.00'
  console.log(`├── Total time:     ${totalTime}s`)
  console.log(`├── Books/second:   ${summaryRate}`)
  console.log(`└── Total processed: ${resumeOffset + processedCount}`)
  console.log(`\n📚 Books:`)
  console.log(`├── Created:   ${stats.booksCreated}`)
  console.log(`├── Updated:   ${stats.booksUpdated}`)
  console.log(`└── Skipped:   ${stats.booksSkipped}`)
  console.log(`\n👥 Relationships:`)
  console.log(`├── Authors:    ${ctx.authorCache.size} (${stats.authorsCreated} new)`)
  console.log(`└── Publishers: ${ctx.publisherCache.size} (${stats.publishersCreated} new)`)
  console.log(`\n📷 Images:`)
  console.log(`└── Image URLs stored: ${imagesStored}`)

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors: ${stats.errors.length}`)
    stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err.title}: ${err.error}`))
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more`)
    }

    // Save errors to file
    ensureDirExists(path.dirname(ERROR_LOG_PATH))
    fs.writeFileSync(ERROR_LOG_PATH, JSON.stringify(stats.errors, null, 2))
    console.log(`\n📝 Full error log saved to: ${ERROR_LOG_PATH}`)
  }

  if (!dryRun && stats.errors.length === 0 && fs.existsSync(CHECKPOINT_PATH)) {
    fs.unlinkSync(CHECKPOINT_PATH)
  }

  console.log('\n' + '='.repeat(70))

  if (dryRun) {
    console.log('\n✅ Dry run complete - no changes made')
    console.log('   Remove --dry-run to perform actual import')
  } else {
    console.log('\n✅ Import complete!')
    console.log('\n📝 Next steps:')
    console.log('1. Review imported books: http://localhost:3000/admin/collections/books')
    console.log('2. Download & process images: tsx scripts/download-book-images.ts')
    console.log('3. Initialize search: tsx scripts/initialize-search.ts')
  }
}

main().catch(error => {
  console.error('❌ Import failed:', error)
  process.exit(1)
})
