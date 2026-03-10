#!/usr/bin/env tsx
/**
 * Backfill book images via ISBNdb batch API
 *
 * Finds books with no scrapedImageUrls and no uploaded images,
 * fetches cover image URLs from ISBNdb in batches, and saves them to Payload via REST.
 *
 * Usage:
 *   tsx scripts/backfill-book-images.ts              # process all
 *   tsx scripts/backfill-book-images.ts --limit 500  # process first 500
 *   tsx scripts/backfill-book-images.ts --dry-run    # preview without saving
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

const PAYLOAD_URL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY || ''
const PAYLOAD_ADMIN_EMAIL = process.env.PAYLOAD_ADMIN_EMAIL || ''
const PAYLOAD_ADMIN_PASSWORD = process.env.PAYLOAD_ADMIN_PASSWORD || ''
const ISBNDB_API_KEY = process.env.ISBNDB_API_KEY || ''
const ISBNDB_BASE_URL = 'https://api2.isbndb.com'

const ISBNDB_BATCH_SIZE = 1000 // ISBNdb batch endpoint supports up to 1000
const PAYLOAD_PAGE_SIZE = 100  // books per Payload REST page
const SAVE_CONCURRENCY = 5     // parallel Payload PATCH requests
const DELAY_MS = 500           // pause between ISBNdb batch calls (ms)

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const MAX_BOOKS = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity

if (!ISBNDB_API_KEY) {
  console.error('❌ ISBNDB_API_KEY not set in .env')
  process.exit(1)
}

// ── Payload REST ─────────────────────────────────────────────────────────────

let authToken = ''

async function login(): Promise<void> {
  if (PAYLOAD_API_KEY) {
    authToken = PAYLOAD_API_KEY
    console.log('  🔑 Using PAYLOAD_API_KEY\n')
    return
  }

  if (!PAYLOAD_ADMIN_EMAIL || !PAYLOAD_ADMIN_PASSWORD) {
    throw new Error('No auth credentials: set PAYLOAD_API_KEY or PAYLOAD_ADMIN_EMAIL + PAYLOAD_ADMIN_PASSWORD in .env')
  }

  const res = await fetch(`${PAYLOAD_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PAYLOAD_ADMIN_EMAIL, password: PAYLOAD_ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Payload login failed ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json() as any
  if (!data.token) throw new Error('Payload login returned no token')
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

// ── ISBNdb batch ─────────────────────────────────────────────────────────────

async function fetchISBNdbBatch(isbns: string[]): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>()
  if (isbns.length === 0) return imageMap

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
      console.warn(`  ⚠️  ISBNdb batch ${res.status} for ${isbns.length} ISBNs`)
      return imageMap
    }

    const data = await res.json() as any
    for (const book of data?.data || []) {
      const isbn = book.isbn13 || book.isbn
      const image = book.image
      if (isbn && image) imageMap.set(isbn, image)
    }
  } catch (err: any) {
    console.warn(`  ⚠️  ISBNdb batch error: ${err.message}`)
  }

  return imageMap
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📚 Book Image Backfill via ISBNdb Batch API\n')
  if (DRY_RUN) console.log('⚠️  DRY RUN — no changes will be saved\n')
  console.log(`   Payload URL : ${PAYLOAD_URL}`)
  console.log(`   Batch size  : ${ISBNDB_BATCH_SIZE} ISBNs per ISBNdb call`)
  console.log(`   Max books   : ${MAX_BOOKS === Infinity ? 'all' : MAX_BOOKS}\n`)

  // ── Step 1: Collect all books that need images ──
  console.log('🔍 Collecting books without cover images...')
  const booksToProcess: { id: string; title: string; isbn: string }[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages && booksToProcess.length < MAX_BOOKS) {
    const data = await payloadFetch(`/api/books?limit=${PAYLOAD_PAGE_SIZE}&page=${page}&depth=1&sort=createdAt`)
    totalPages = data.totalPages || 1

    for (const book of data.docs) {
      if (booksToProcess.length >= MAX_BOOKS) break
      if (book.images?.length > 0 || book.scrapedImageUrls?.length > 0) continue

      const isbn = book.editions?.[0]?.isbn || book.editions?.[0]?.isbn10
      if (!isbn) continue

      booksToProcess.push({ id: book.id, title: book.title || 'Unknown', isbn })
    }

    process.stdout.write(`\r  Page ${page}/${totalPages} — ${booksToProcess.length} books queued...`)
    page++
  }

  console.log(`\n\n✅ ${booksToProcess.length} books need cover images\n`)
  if (booksToProcess.length === 0) { process.exit(0) }

  // ── Step 2: Fetch images from ISBNdb in batches ──
  console.log('🌐 Fetching images from ISBNdb...\n')
  const imageResults = new Map<string, string>() // bookId → imageUrl
  let isbndbCalls = 0

  for (let i = 0; i < booksToProcess.length; i += ISBNDB_BATCH_SIZE) {
    const batch = booksToProcess.slice(i, i + ISBNDB_BATCH_SIZE)
    const isbns = batch.map(b => b.isbn)
    isbndbCalls++

    const imageMap = await fetchISBNdbBatch(isbns)

    for (const book of batch) {
      const url = imageMap.get(book.isbn)
      if (url) imageResults.set(book.id, url)
    }

    const progress = Math.min(i + ISBNDB_BATCH_SIZE, booksToProcess.length)
    process.stdout.write(`\r  Batch ${isbndbCalls} — processed ${progress}/${booksToProcess.length} (${imageResults.size} images found)...`)

    if (i + ISBNDB_BATCH_SIZE < booksToProcess.length) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  console.log(`\n\n📊 ISBNdb results: ${imageResults.size} images found out of ${booksToProcess.length} books\n`)

  if (imageResults.size === 0 || DRY_RUN) {
    if (DRY_RUN && imageResults.size > 0) {
      console.log('Sample images that would be saved:')
      let shown = 0
      for (const [id, url] of imageResults) {
        const book = booksToProcess.find(b => b.id === id)
        console.log(`  ${book?.title?.slice(0, 50)} → ${url}`)
        if (++shown >= 5) break
      }
    }
    console.log('\nDone (dry run, nothing saved).')
    process.exit(0)
  }

  // ── Step 3: Authenticate then save to Payload in parallel batches ──
  await login()
  console.log(`💾 Saving ${imageResults.size} images to Payload...\n`)
  const entries = Array.from(imageResults.entries())
  let saved = 0, failed = 0

  for (let i = 0; i < entries.length; i += SAVE_CONCURRENCY) {
    const batch = entries.slice(i, i + SAVE_CONCURRENCY)
    await Promise.all(batch.map(async ([bookId, imageUrl]) => {
      try {
        await payloadFetch(`/api/books/${bookId}`, {
          method: 'PATCH',
          body: JSON.stringify({ scrapedImageUrls: [{ url: imageUrl }] }),
        })
        saved++
      } catch (err: any) {
        failed++
        const book = booksToProcess.find(b => b.id === bookId)
        console.error(`  ❌ Save failed for "${book?.title?.slice(0, 40)}": ${err.message}`)
      }
    }))
    process.stdout.write(`\r  Saved ${saved}/${imageResults.size}...`)
  }

  const totalTime = (process.hrtime()[0]).toString() // rough
  console.log('\n\n' + '='.repeat(60))
  console.log('✅ Backfill complete!')
  console.log(`   Books checked   : ${booksToProcess.length}`)
  console.log(`   Images from API : ${imageResults.size}`)
  console.log(`   Saved to Payload: ${saved}`)
  console.log(`   Failures        : ${failed}`)
  console.log(`   ISBNdb API calls: ${isbndbCalls} (batched)`)
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message)
  process.exit(1)
})
