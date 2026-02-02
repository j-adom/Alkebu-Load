#!/usr/bin/env tsx

/**
 * Download Book Cover Images & Upload to Payload
 *
 * Downloads missing covers, converts to WebP, uploads to Cloudflare R2,
 * and stores the resulting URL back on the book record.
 *
 * Usage:
 *   tsx scripts/download-book-images.ts [options]
 *
 * Environment:
 *   R2_ACCESS_KEY_ID      Cloudflare R2 access key (required)
 *   R2_SECRET_ACCESS_KEY  Cloudflare R2 secret (required)
 *   R2_BUCKET             Bucket name (required)
 *   R2_ACCOUNT_ID         Account ID (required if R2_ENDPOINT not set)
 *   R2_ENDPOINT           Custom endpoint (optional)
 *   R2_PUBLIC_BASE_URL    Public base URL for uploaded objects (recommended)
 *   SANITY_PROJECT_ID     Used for optional Sanity image fallback
 *   SANITY_DATASET        Used for optional Sanity image fallback
 *
 * Options:
 *   --limit <n>      Process only first N books (for testing)
 *   --force          Re-download images even if they already exist (ignored)
 *   --skip-existing  Skip books that already have uploaded images
 *   --dry-run        Show what would be downloaded without uploading
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import http from 'http'
import sharp from 'sharp'
import crypto from 'crypto'
import imageUrlBuilder from '@sanity/image-url'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { enrichProductFromIdentifiers } from '../src/app/utils/productEnrichment'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface DownloadStats {
  booksProcessed: number
  imagesDownloaded: number
  imagesConverted: number
  imagesUploaded: number
  imagesSkipped: number
  imagesFailed: number
  errors: string[]
}

type UrlRecord = { url: string }[]

const SANITY_EXPORT_PATH = path.join(__dirname, '../data/sanity-books-export.json')
const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || ''
const SANITY_DATASET = process.env.SANITY_DATASET || ''

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || ''
const R2_BUCKET = process.env.R2_BUCKET || ''
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || ''
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '')
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || ''

const r2Enabled = Boolean(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_ENDPOINT)

const isbndbImageCache = new Map<string, string[]>()
const sanityImageLookup = buildSanityImageLookup()
const r2Client = r2Enabled
  ? new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null

function buildSanityImageLookup(): Map<string, string[]> {
  const lookup = new Map<string, string[]>()

  if (!fs.existsSync(SANITY_EXPORT_PATH)) {
    return lookup
  }

  let builder: ReturnType<typeof imageUrlBuilder> | null = null
  if (SANITY_PROJECT_ID && SANITY_DATASET) {
    builder = imageUrlBuilder({ projectId: SANITY_PROJECT_ID, dataset: SANITY_DATASET })
  }

  const rawData = JSON.parse(fs.readFileSync(SANITY_EXPORT_PATH, 'utf8')) as any[]

  if (!builder) {
    console.log('⚠️  SANITY_PROJECT_ID or SANITY_DATASET not configured. Sanity image fallback disabled.')
  }

  for (const record of rawData) {
    const assetRefs: string[] = []

    const gatherImageRefs = (imageField: any) => {
      if (!imageField) return
      if (Array.isArray(imageField)) {
        for (const asset of imageField) {
          gatherImageRefs(asset)
        }
      } else if (imageField.asset?._ref) {
        assetRefs.push(imageField.asset._ref)
      }
    }

    gatherImageRefs(record.images)
    gatherImageRefs(record.mainImage)
    gatherImageRefs(record.defaultBookVariant?.images)
    gatherImageRefs(record.defaultBookVariant?.mainImage)

    if (assetRefs.length === 0) continue

    const urls: string[] = []
    for (const ref of assetRefs) {
      if (builder) {
        try {
          const url = builder.image(ref).width(1200).url()
          if (url) urls.push(url)
        } catch (error) {
          // Ignore builder errors and continue
        }
      }
    }

    if (urls.length === 0) {
      continue
    }

    const addKey = (key?: string | null) => {
      if (!key) return
      const normalized = String(key).trim().toLowerCase()
      if (!normalized) return
      if (!lookup.has(normalized)) {
        lookup.set(normalized, urls)
      }
    }

    addKey(record._id)
    addKey(record.defaultBookVariant?.sku)
    addKey(record.defaultBookVariant?.isbn)
    addKey(record.defaultBookVariant?.isbn13)
    addKey(record.isbn)
    addKey(record.isbn13)
  }

  return lookup
}

async function fetchIsbndbImageUrls(isbn?: string): Promise<string[]> {
  if (!isbn) return []

  if (isbndbImageCache.has(isbn)) {
    return isbndbImageCache.get(isbn) || []
  }

  const identifierType = isbn.length === 13 ? 'isbn13' : isbn.length === 10 ? 'isbn10' : null
  if (!identifierType) {
    isbndbImageCache.set(isbn, [])
    return []
  }

  try {
    const enriched = await enrichProductFromIdentifiers({ type: identifierType as 'isbn13' | 'isbn10', value: isbn })
    const urls = (enriched?.scrapedImageUrls || enriched?.images || [])
      .map((item: any) => item?.url)
      .filter(Boolean)
    isbndbImageCache.set(isbn, urls)
    return urls
  } catch (error) {
    console.error(`   ⚠️  ISBNdb lookup failed for ${isbn}:`, error instanceof Error ? error.message : error)
    isbndbImageCache.set(isbn, [])
    return []
  }
}

function getSanityImageUrls(book: any): string[] {
  const keys: string[] = []

  const addKey = (value?: string) => {
    if (!value) return
    keys.push(String(value).trim().toLowerCase())
  }

  addKey(book.squareItemId)
  const isbn = book.editions?.[0]?.isbn || book.isbn13
  if (isbn) addKey(isbn)

  for (const key of keys) {
    if (key && sanityImageLookup.has(key)) {
      return sanityImageLookup.get(key) || []
    }
  }
  return []
}

async function gatherImageSources(book: any): Promise<UrlRecord> {
  const chosenUrls: string[] = []
  const seen = new Set<string>()

  const addUrl = (url?: string) => {
    if (!url) return false
    if (seen.has(url)) return false
    seen.add(url)
    if (chosenUrls.length === 0) {
      chosenUrls.push(url)
    }
    return chosenUrls.length >= 1
  }

  const addUrlList = (urls: string[]) => {
    for (const url of urls) {
      if (addUrl(url)) break
    }
  }

  if (Array.isArray(book.scrapedImageUrls) && book.scrapedImageUrls.length > 0) {
    for (const record of book.scrapedImageUrls) {
      if (record?.url && addUrl(record.url)) break
    }
  }

  if (chosenUrls.length === 0) {
    const isbn = book.editions?.[0]?.isbn || book.isbn13
    const isbndbUrls = await fetchIsbndbImageUrls(isbn)
    addUrlList(isbndbUrls)
  }

  if (chosenUrls.length === 0) {
    const sanityUrls = getSanityImageUrls(book)
    addUrlList(sanityUrls)
  }

  const result = chosenUrls.map((url) => ({ url }))
  book.scrapedImageUrls = result
  return result
}

/**
 * Generate normalized filename from ISBN and title
 */
function generateFilename(isbn?: string, title?: string, index: number = 0): string {
  let filename = ''

  if (isbn) {
    // Use ISBN as primary identifier
    filename = `isbn-${isbn}`
  } else if (title) {
    // Fallback to sanitized title
    filename = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 50) // Limit length
  } else {
    // Last resort: use random hash
    filename = `book-${crypto.randomBytes(8).toString('hex')}`
  }

  // Add index if multiple images
  if (index > 0) {
    filename += `-${index + 1}`
  }

  return `${filename}.webp`
}

/**
 * Generate alt text for image
 */
function generateAltText(book: any, index: number = 0): string {
  const parts = []

  if (book.title) {
    parts.push(`Cover image for "${book.title}"`)
  }

  if (book.authors && book.authors.length > 0) {
    const authorNames = book.authors.slice(0, 2).map((a: any) => a.name || a).join(', ')
    parts.push(`by ${authorNames}`)
  }

  if (index > 0) {
    parts.push(`(variant ${index + 1})`)
  }

  return parts.join(' ')
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http

    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`))
        return
      }

      const chunks: Buffer[] = []

      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
      response.on('error', reject)
    }).on('error', reject)
  })
}

/**
 * Convert image to WebP format with optimization
 */
async function convertToWebP(inputBuffer: Buffer): Promise<Buffer> {
  return sharp(inputBuffer)
    .webp({
      quality: 85, // Good balance of quality/size
      effort: 6,   // Higher effort for better compression
    })
    .resize({
      width: 1200,  // Max width
      height: 1800, // Max height
      fit: 'inside', // Maintain aspect ratio
      withoutEnlargement: true, // Don't upscale small images
    })
    .toBuffer()
}

function buildR2ObjectKey(filename: string, isbn?: string) {
  const base = isbn ? `books/${isbn}` : 'books'
  return `${base}/${filename}`
}

async function uploadToR2(buffer: Buffer, key: string): Promise<string> {
  if (!r2Client) {
    throw new Error('R2 configuration missing. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_ENDPOINT.')
  }

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/webp',
    })
  )

  if (R2_PUBLIC_BASE_URL) {
    const normalizedBase = R2_PUBLIC_BASE_URL.endsWith('/')
      ? R2_PUBLIC_BASE_URL.slice(0, -1)
      : R2_PUBLIC_BASE_URL
    return `${normalizedBase}/${key}`
  }

  if (R2_ACCOUNT_ID) {
    return `https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`
  }

  // Fallback to endpoint-based URL
  return `${R2_ENDPOINT.replace(/\/$/, '')}/${R2_BUCKET}/${key}`
}

/**
 * Process images for a single book
 */
async function processBookImages(
  book: any,
  stats: DownloadStats,
  options: { dryRun: boolean; force: boolean }
): Promise<string[]> {
  const uploadedUrls: string[] = []

  if (!r2Enabled) {
    throw new Error('Cloudflare R2 environment variables are not configured. Cannot upload images.')
  }

  const sources = await gatherImageSources(book)

  if (!sources || sources.length === 0) {
    stats.imagesSkipped++
    return uploadedUrls
  }

  const primaryISBN = book.editions?.[0]?.isbn || book.isbn13
  console.log(`   📷 Processing ${sources.length} image(s)...`)

  for (let i = 0; i < sources.length; i++) {
    const imageUrl = sources[i].url
    const filename = generateFilename(primaryISBN, book.title, i)
    const altText = generateAltText(book, i)

    try {
      if (options.dryRun) {
        console.log(`      [DRY RUN] Would download: ${imageUrl}`)
        console.log(`      [DRY RUN] Would save as: ${filename}`)
        console.log(`      [DRY RUN] Alt text: ${altText}`)
        stats.imagesSkipped++
        continue
      }

      // Download image
      console.log(`      ⬇️  Downloading...`)
      const imageBuffer = await downloadImage(imageUrl)
      stats.imagesDownloaded++

      // Convert to WebP
      console.log(`      🔄 Converting to WebP...`)
      const webpBuffer = await convertToWebP(imageBuffer)
      stats.imagesConverted++

      // Upload to R2
      console.log(`      ⬆️  Uploading to Cloudflare R2...`)
      const objectKey = buildR2ObjectKey(filename, primaryISBN)
      const r2Url = await uploadToR2(webpBuffer, objectKey)
      stats.imagesUploaded++
      uploadedUrls.push(r2Url)

      console.log(`      ✅ Success: ${filename} → ${r2Url}`)
    } catch (error: any) {
      console.error(`      ❌ Failed: ${error.message}`)
      stats.imagesFailed++
      stats.errors.push(`${book.title} - ${imageUrl}: ${error.message}`)
    }
  }

  return uploadedUrls
}

/**
 * Link uploaded images to book record
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const force = args.includes('--force')
  const skipExisting = args.includes('--skip-existing')

  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : undefined

  console.log('🖼️  Book Cover Image Download & Upload\n')
  if (dryRun) console.log('⚠️  DRY RUN MODE - No images will be downloaded\n')
  if (force) console.log('🔄 FORCE MODE - Re-downloading existing images\n')
  if (skipExisting) console.log('⏭️  SKIP MODE - Skipping books with existing images\n')

  // Initialize Payload
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  console.log('✅ Payload initialized\n')

  if (!r2Enabled) {
    console.error('❌ Cloudflare R2 environment variables are not fully configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_ACCOUNT_ID or R2_ENDPOINT before running this script.')
    return
  }

  if (!R2_PUBLIC_BASE_URL) {
    console.warn('⚠️  R2_PUBLIC_BASE_URL not set. Using default Cloudflare endpoint for public URLs; consider configuring a custom domain for production use.')
  }

  // Fetch all books (we'll filter in memory since array queries don't work)
  console.log('📚 Fetching books...')
  const { docs: allBooks } = await payload.find({
    collection: 'books',
    limit: 100000,
    depth: 2, // Include related data
    pagination: false,
  })

  console.log(`✅ Fetched ${allBooks.length} books`)

  // Focus on books missing actual media images
  let books = allBooks.filter((book: any) =>
    !book.images || book.images.length === 0
  )

  if (skipExisting) {
    // Already the default behavior; kept for compatibility
    books = books.filter((book: any) =>
      !book.images || book.images.length === 0
    )
  }

  if (limit) {
    books = books.slice(0, limit)
  }

  console.log(`✅ Found ${books.length} books to process\n`)

  const stats: DownloadStats = {
    booksProcessed: 0,
    imagesDownloaded: 0,
    imagesConverted: 0,
    imagesUploaded: 0,
    imagesSkipped: 0,
    imagesFailed: 0,
    errors: [],
  }

  const startTime = Date.now()

  // Process each book
  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    console.log(`\n[${i + 1}/${books.length}] 📖 ${book.title}`)

    try {
      const uploadedUrls = await processBookImages(book, stats, { dryRun, force })

      if (!dryRun && uploadedUrls.length > 0) {
        await payload.update({
          collection: 'books',
          id: book.id,
          data: {
            scrapedImageUrls: uploadedUrls.map((url) => ({ url })),
            images: [],
          },
        })
        console.log(`   🔗 Updated book with ${uploadedUrls.length} Cloudflare R2 image(s)`)
      }

      stats.booksProcessed++

      // Progress update every 50 books
      if ((i + 1) % 50 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
        const rate = (stats.booksProcessed / parseFloat(elapsed)).toFixed(2)
        const remaining = books.length - (i + 1)
        const eta = (remaining / parseFloat(rate)).toFixed(0)

        console.log(`\n📊 Progress: ${i + 1}/${books.length} books`)
        console.log(`   Rate: ${rate} books/sec | Elapsed: ${elapsed}s | ETA: ${eta}s`)
        console.log(`   Downloaded: ${stats.imagesDownloaded} | Uploaded: ${stats.imagesUploaded} | Failed: ${stats.imagesFailed}\n`)
      }
    } catch (error: any) {
      console.error(`   ❌ Book processing failed: ${error.message}`)
      stats.errors.push(`${book.title}: ${error.message}`)
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)

  // Print summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 IMAGE PROCESSING SUMMARY')
  console.log('='.repeat(70))
  console.log(`\n⏱️  Performance:`)
  console.log(`├── Total time:     ${totalTime}s`)
  console.log(`├── Books/second:   ${(stats.booksProcessed / parseFloat(totalTime)).toFixed(2)}`)
  console.log(`└── Images/second:  ${(stats.imagesUploaded / parseFloat(totalTime)).toFixed(2)}`)
  console.log(`\n📚 Books:`)
  console.log(`└── Processed: ${stats.booksProcessed}`)
console.log(`\n📷 Images:`)
console.log(`├── Downloaded:  ${stats.imagesDownloaded}`)
console.log(`├── Converted:   ${stats.imagesConverted}`)
console.log(`├── Uploaded (R2):   ${stats.imagesUploaded}`)
console.log(`├── Skipped:     ${stats.imagesSkipped}`)
console.log(`└── Failed:      ${stats.imagesFailed}`)

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors: ${stats.errors.length}`)
    stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`))
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more`)
    }

    // Save errors to file
    const errorFile = path.join(__dirname, '../data/image-download-errors.json')
    fs.writeFileSync(errorFile, JSON.stringify(stats.errors, null, 2))
    console.log(`\n📝 Full error log saved to: ${errorFile}`)
  }

  console.log('\n' + '='.repeat(70))

  if (dryRun) {
    console.log('\n✅ Dry run complete - no images downloaded')
    console.log('   Remove --dry-run to download and upload images')
  } else {
    console.log('\n✅ Image processing complete!')
    console.log('\n📝 Next steps:')
    console.log('1. Review uploaded images: http://localhost:3000/admin/collections/media')
    console.log('2. Check book cover images: http://localhost:3000/admin/collections/books')
    console.log('3. Initialize search: tsx scripts/initialize-search.ts')
  }

  process.exit(0)
}

main().catch(error => {
  console.error('❌ Image processing failed:', error)
  process.exit(1)
})
