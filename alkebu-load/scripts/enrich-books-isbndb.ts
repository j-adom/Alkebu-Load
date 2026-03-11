#!/usr/bin/env tsx
/**
 * Enrich books with full metadata from ISBNdb batch API
 *
 * Fields populated:
 *   - authorsText (array of { name })
 *   - publisherText
 *   - synopsis
 *   - subjects
 *   - images (cover downloaded → uploaded to R2 via Payload Media)
 *   - editions[0]: pages, datePublished, binding, edition
 *
 * Usage:
 *   tsx scripts/enrich-books-isbndb.ts              # process all
 *   tsx scripts/enrich-books-isbndb.ts --limit 100  # process first N
 *   tsx scripts/enrich-books-isbndb.ts --dry-run    # preview without saving
 *   tsx scripts/enrich-books-isbndb.ts --skip-images # skip R2 image upload
 */

import dotenv from 'dotenv'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import path from 'path'


dotenv.config({ path: './.env' })

const PAYLOAD_URL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY || ''
const PAYLOAD_ADMIN_EMAIL = process.env.PAYLOAD_ADMIN_EMAIL || ''
const PAYLOAD_ADMIN_PASSWORD = process.env.PAYLOAD_ADMIN_PASSWORD || ''
const ISBNDB_API_KEY = process.env.ISBNDB_API_KEY || ''
const ISBNDB_BASE_URL = 'https://api2.isbndb.com'

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || ''
const R2_BUCKET = process.env.R2_BUCKET || 'alkebulan-online'
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || ''
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
const R2_PUBLIC_URL_BASE = (process.env.R2_PUBLIC_URL_BASE || 'https://media.alkebulanimages.com').replace(/\/$/, '')

const ISBNDB_BATCH_SIZE = 1000
const PAYLOAD_PAGE_SIZE = 100
const SAVE_CONCURRENCY = 5
const IMAGE_CONCURRENCY = 3
const DELAY_MS = 500

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const SKIP_IMAGES = args.includes('--skip-images')
const limitIdx = args.indexOf('--limit')
const MAX_BOOKS = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity

if (!ISBNDB_API_KEY) {
  console.error('❌ ISBNDB_API_KEY not set in .env')
  process.exit(1)
}

// ── S3/R2 client ──────────────────────────────────────────────────────────────

let s3: S3Client | null = null

if (!SKIP_IMAGES && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  s3 = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })
} else if (!SKIP_IMAGES) {
  console.warn('⚠️  R2 credentials not set — images will be stored as scrapedImageUrls only\n')
}

// ── Auth ──────────────────────────────────────────────────────────────────────

let authToken = ''

async function login(): Promise<void> {
  if (PAYLOAD_API_KEY) {
    authToken = PAYLOAD_API_KEY
    console.log('  🔑 Using PAYLOAD_API_KEY\n')
    return
  }
  if (!PAYLOAD_ADMIN_EMAIL || !PAYLOAD_ADMIN_PASSWORD) {
    throw new Error('No auth: set PAYLOAD_API_KEY or PAYLOAD_ADMIN_EMAIL + PAYLOAD_ADMIN_PASSWORD in .env')
  }
  const res = await fetch(`${PAYLOAD_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PAYLOAD_ADMIN_EMAIL, password: PAYLOAD_ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json() as any
  if (!data.token) throw new Error('Login returned no token')
  authToken = data.token
  console.log('  🔑 Authenticated with Payload\n')
}

async function payloadFetch(path: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  const res = await fetch(`${PAYLOAD_URL}${path}`, { ...options, headers })
  if (!res.ok) throw new Error(`Payload ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

// ── ISBNdb batch ──────────────────────────────────────────────────────────────

interface ISBNdbBook {
  isbn13?: string
  isbn?: string
  title?: string
  title_long?: string
  publisher?: string
  date_published?: string
  pages?: number
  binding?: string
  edition?: string
  synopsis?: string
  image?: string
  subjects?: string[]
  authors?: string[]
  dewey_decimal?: string[]
}

async function fetchISBNdbBatch(isbns: string[]): Promise<Map<string, ISBNdbBook>> {
  const resultMap = new Map<string, ISBNdbBook>()
  if (isbns.length === 0) return resultMap

  try {
    const res = await fetch(`${ISBNDB_BASE_URL}/books`, {
      method: 'POST',
      headers: {
        'Authorization': ISBNDB_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isbns }),
      signal: AbortSignal.timeout(60000),
    })
    if (!res.ok) {
      console.warn(`  ⚠️  ISBNdb batch ${res.status}: ${(await res.text()).slice(0, 100)}`)
      return resultMap
    }
    const data = await res.json() as any
    for (const book of data?.data || []) {
      const isbn = book.isbn13 || book.isbn
      if (isbn) resultMap.set(isbn, book)
    }
  } catch (err: any) {
    console.warn(`  ⚠️  ISBNdb batch error: ${err.message}`)
  }
  return resultMap
}

// ── R2 image upload ───────────────────────────────────────────────────────────

// Returns the Payload media document ID after uploading to R2 directly
async function uploadImageToR2(imageUrl: string, isbn: string): Promise<string | null> {
  if (!s3) return null

  try {
    // Download image
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : contentType.includes('webp') ? 'webp' : 'jpg'
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 1000) return null // skip tiny/broken images

    const key = `book-covers/${isbn}.${ext}`
    const publicUrl = `${R2_PUBLIC_URL_BASE}/${key}`

    // Check if already exists in R2
    try {
      await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))
      // Already exists — create Payload media record pointing to it
      return await createPayloadMediaRecord(key, publicUrl, contentType, buffer.length, isbn)
    } catch {
      // Doesn't exist yet, upload it
    }

    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }))

    return await createPayloadMediaRecord(key, publicUrl, contentType, buffer.length, isbn)
  } catch (err: any) {
    // Non-fatal — fall back to scrapedImageUrls
    return null
  }
}

async function createPayloadMediaRecord(
  key: string,
  publicUrl: string,
  mimeType: string,
  filesize: number,
  isbn: string,
): Promise<string | null> {
  const filename = path.basename(key)
  try {
    // Check if record already exists
    const existing = await payloadFetch(`/api/media?where[filename][equals]=${encodeURIComponent(filename)}&limit=1`)
    if (existing?.docs?.[0]?.id) return existing.docs[0].id

    const doc = await payloadFetch('/api/media', {
      method: 'POST',
      body: JSON.stringify({
        filename,
        mimeType,
        filesize,
        url: publicUrl,
        alt: `Book cover for ISBN ${isbn}`,
      }),
    })
    return doc?.doc?.id || doc?.id || null
  } catch {
    return null
  }
}

// ── Build PATCH payload ───────────────────────────────────────────────────────

function buildPatch(
  payloadBook: any,
  isbndbBook: ISBNdbBook,
  mediaId: string | null,
): Record<string, any> | null {
  const patch: Record<string, any> = {}

  // Authors — populate authorsText if missing
  const existingAuthors: any[] = payloadBook.authorsText || []
  if (existingAuthors.length === 0 && isbndbBook.authors?.length) {
    patch.authorsText = isbndbBook.authors.map(name => ({ name }))
  }

  // Publisher
  if (!payloadBook.publisherText && isbndbBook.publisher) {
    patch.publisherText = isbndbBook.publisher
  }

  // Synopsis
  if (!payloadBook.synopsis && isbndbBook.synopsis) {
    patch.synopsis = isbndbBook.synopsis
  }

  // Subjects
  if ((!payloadBook.subjects || payloadBook.subjects.length === 0) && isbndbBook.subjects?.length) {
    patch.subjects = isbndbBook.subjects.map(s => ({ subject: s }))
  }

  // Image — prefer R2 media link, fall back to scrapedImageUrl
  const hasImages = payloadBook.images?.length > 0
  const hasScraped = payloadBook.scrapedImageUrls?.length > 0
  if (!hasImages && mediaId) {
    patch.images = [{ image: mediaId, alt: payloadBook.title || `Book cover`, isPrimary: true }]
  } else if (!hasImages && !hasScraped && isbndbBook.image) {
    patch.scrapedImageUrls = [{ url: isbndbBook.image }]
  }

  // Edition-level fields — update first edition only
  const edition = payloadBook.editions?.[0]
  if (edition) {
    const editionPatch: Record<string, any> = {}

    if (!edition.pages && isbndbBook.pages) editionPatch.pages = isbndbBook.pages
    if (!edition.datePublished && isbndbBook.date_published) {
      const raw = isbndbBook.date_published
      const parsed = raw.length === 4 ? new Date(`${raw}-01-01`) : new Date(raw)
      if (!isNaN(parsed.getTime())) editionPatch.datePublished = parsed.toISOString()
    }
    if ((!edition.binding || edition.binding === 'unknown') && isbndbBook.binding) {
      editionPatch.binding = isbndbBook.binding.toLowerCase()
    }
    if (!edition.edition && isbndbBook.edition) {
      editionPatch.edition = isbndbBook.edition
    }

    if (Object.keys(editionPatch).length > 0) {
      patch.editions = [{ ...edition, ...editionPatch }]
    }
  }

  return Object.keys(patch).length > 0 ? patch : null
}

// ── Concurrency helper ────────────────────────────────────────────────────────

async function pLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = []
  let idx = 0
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📚 Book Enrichment via ISBNdb Batch API\n')
  if (DRY_RUN) console.log('⚠️  DRY RUN — no changes will be saved\n')
  if (SKIP_IMAGES) console.log('⚠️  --skip-images: skipping R2 image upload\n')
  console.log(`   Payload URL  : ${PAYLOAD_URL}`)
  console.log(`   R2 bucket    : ${s3 ? R2_BUCKET : 'disabled'}`)
  console.log(`   Batch size   : ${ISBNDB_BATCH_SIZE} ISBNs per ISBNdb call`)
  console.log(`   Max books    : ${MAX_BOOKS === Infinity ? 'all' : MAX_BOOKS}\n`)

  // ── Step 1: Collect books needing enrichment ──
  console.log('🔍 Collecting books needing enrichment...')
  const booksToProcess: { id: string; title: string; isbn: string; book: any }[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages && booksToProcess.length < MAX_BOOKS) {
    const data = await payloadFetch(`/api/books?limit=${PAYLOAD_PAGE_SIZE}&page=${page}&depth=1&sort=createdAt`)
    totalPages = data.totalPages || 1

    for (const book of data.docs) {
      if (booksToProcess.length >= MAX_BOOKS) break

      const edition = book.editions?.[0]
      const hasAuthors = (book.authorsText?.length ?? 0) > 0
      const hasPublisher = !!(book.publisherText || book.publisher)
      const hasPages = !!edition?.pages
      const hasDate = !!edition?.datePublished
      const hasSynopsis = !!book.synopsis
      const hasImage = (book.images?.length ?? 0) > 0 || (book.scrapedImageUrls?.length ?? 0) > 0

      if (hasAuthors && hasPublisher && hasPages && hasDate && hasSynopsis && hasImage) continue

      const isbn = edition?.isbn || edition?.isbn10
      if (!isbn) continue

      booksToProcess.push({ id: book.id, title: book.title || 'Unknown', isbn, book })
    }

    process.stdout.write(`\r  Page ${page}/${totalPages} — ${booksToProcess.length} books queued...`)
    page++
  }

  console.log(`\n\n✅ ${booksToProcess.length} books need enrichment\n`)
  if (booksToProcess.length === 0) process.exit(0)

  // ── Step 2: Fetch metadata from ISBNdb in batches ──
  console.log('🌐 Fetching metadata from ISBNdb...\n')
  const isbndbResults = new Map<string, ISBNdbBook>() // bookId → ISBNdb data
  let isbndbCalls = 0

  for (let i = 0; i < booksToProcess.length; i += ISBNDB_BATCH_SIZE) {
    const batch = booksToProcess.slice(i, i + ISBNDB_BATCH_SIZE)
    const isbns = batch.map(b => b.isbn)
    isbndbCalls++

    const isbndbMap = await fetchISBNdbBatch(isbns)

    for (const item of batch) {
      const isbndbBook = isbndbMap.get(item.isbn)
      if (isbndbBook) isbndbResults.set(item.id, isbndbBook)
    }

    const progress = Math.min(i + ISBNDB_BATCH_SIZE, booksToProcess.length)
    process.stdout.write(`\r  Batch ${isbndbCalls} — ${progress}/${booksToProcess.length} ISBNs sent, ${isbndbResults.size} matched...`)

    if (i + ISBNDB_BATCH_SIZE < booksToProcess.length) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  console.log(`\n\n📊 ISBNdb matched: ${isbndbResults.size}/${booksToProcess.length} books\n`)

  if (isbndbResults.size === 0) {
    console.log('Nothing to update.')
    process.exit(0)
  }

  // ── Step 3: Upload images to R2 (if enabled) ──
  const mediaIds = new Map<string, string | null>() // bookId → media doc id

  if (s3 && !DRY_RUN) {
    const booksWithImages = booksToProcess.filter(b => {
      const isbndbBook = isbndbResults.get(b.id)
      return isbndbBook?.image && (b.book.images?.length ?? 0) === 0
    })

    if (booksWithImages.length > 0) {
      console.log(`🖼️  Uploading ${booksWithImages.length} cover images to R2...\n`)
      await login()

      let uploaded = 0, skipped = 0
      const imageTasks = booksWithImages.map(item => async () => {
        const isbndbBook = isbndbResults.get(item.id)!
        const mediaId = await uploadImageToR2(isbndbBook.image!, item.isbn)
        mediaIds.set(item.id, mediaId)
        if (mediaId) uploaded++; else skipped++
        process.stdout.write(`\r  Uploaded ${uploaded}, skipped/failed ${skipped} of ${booksWithImages.length}...`)
      })

      await pLimit(imageTasks, IMAGE_CONCURRENCY)
      console.log(`\n  ✅ ${uploaded} images uploaded to R2\n`)
    }
  }

  // ── Step 4: Build patches ──
  const enrichResults: { id: string; patch: Record<string, any> }[] = []

  for (const item of booksToProcess) {
    const isbndbBook = isbndbResults.get(item.id)
    if (!isbndbBook) continue
    const mediaId = mediaIds.get(item.id) ?? null
    const patch = buildPatch(item.book, isbndbBook, mediaId)
    if (patch) enrichResults.push({ id: item.id, patch })
  }

  console.log(`📝 ${enrichResults.length} books have updates to save\n`)

  if (DRY_RUN) {
    console.log('Sample updates:')
    for (const { id, patch } of enrichResults.slice(0, 5)) {
      const item = booksToProcess.find(b => b.id === id)!
      console.log(`  "${item.title.slice(0, 50)}"`)
      if (patch.authorsText) console.log(`    authors: ${patch.authorsText.map((a: any) => a.name).join(', ')}`)
      if (patch.publisherText) console.log(`    publisher: ${patch.publisherText}`)
      if (patch.synopsis) console.log(`    synopsis: ${patch.synopsis.slice(0, 80)}...`)
      if (patch.images) console.log(`    images: [media:${patch.images[0]}]`)
      if (patch.scrapedImageUrls) console.log(`    scrapedImageUrls: ${patch.scrapedImageUrls[0].url}`)
      if (patch.editions?.[0]?.pages) console.log(`    pages: ${patch.editions[0].pages}`)
    }
    console.log('\nDone (dry run, nothing saved).')
    process.exit(0)
  }

  // ── Step 5: Authenticate and save ──
  if (!authToken) await login()
  console.log(`💾 Saving enrichment data for ${enrichResults.length} books...\n`)

  let saved = 0, failed = 0

  const saveTasks = enrichResults.map(({ id, patch }) => async () => {
    try {
      await payloadFetch(`/api/books/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      saved++
    } catch (err: any) {
      failed++
      const item = booksToProcess.find(b => b.id === id)
      console.error(`  ❌ Failed "${item?.title?.slice(0, 40)}": ${err.message}`)
    }
    if ((saved + failed) % 50 === 0) {
      process.stdout.write(`\r  Saved ${saved}/${enrichResults.length}...`)
    }
  })

  await pLimit(saveTasks, SAVE_CONCURRENCY)

  console.log('\n\n' + '='.repeat(60))
  console.log('✅ Enrichment complete!')
  console.log(`   Books scanned     : ${booksToProcess.length}`)
  console.log(`   ISBNdb matched    : ${isbndbResults.size}`)
  console.log(`   Books updated     : ${saved}`)
  console.log(`   Failures          : ${failed}`)
  console.log(`   ISBNdb API calls  : ${isbndbCalls} (batched)`)
  console.log(`   Images → R2       : ${[...mediaIds.values()].filter(Boolean).length}`)
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message)
  process.exit(1)
})
