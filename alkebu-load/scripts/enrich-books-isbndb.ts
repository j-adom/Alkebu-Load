#!/usr/bin/env tsx
/**
 * Enrich books with full metadata from ISBNdb batch API
 *
 * For each book missing metadata (publisher, pages, datePublished, synopsis),
 * fetches full data from ISBNdb in batches of 1000 and PATCHes Payload.
 *
 * Fields populated: publisherText, synopsis, subjects, editions[0].pages,
 *                   editions[0].datePublished, editions[0].binding,
 *                   editions[0].edition, scrapedImageUrls (if not already set)
 *
 * Usage:
 *   tsx scripts/enrich-books-isbndb.ts              # process all
 *   tsx scripts/enrich-books-isbndb.ts --limit 100  # process first N
 *   tsx scripts/enrich-books-isbndb.ts --dry-run    # preview without saving
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

const PAYLOAD_URL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY || ''
const PAYLOAD_ADMIN_EMAIL = process.env.PAYLOAD_ADMIN_EMAIL || ''
const PAYLOAD_ADMIN_PASSWORD = process.env.PAYLOAD_ADMIN_PASSWORD || ''
const ISBNDB_API_KEY = process.env.ISBNDB_API_KEY || ''
const ISBNDB_BASE_URL = 'https://api2.isbndb.com'

const ISBNDB_BATCH_SIZE = 1000
const PAYLOAD_PAGE_SIZE = 100
const SAVE_CONCURRENCY = 5
const DELAY_MS = 500

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const MAX_BOOKS = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity

if (!ISBNDB_API_KEY) {
  console.error('❌ ISBNDB_API_KEY not set in .env')
  process.exit(1)
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

// ── Payload REST ──────────────────────────────────────────────────────────────

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
      console.warn(`  ⚠️  ISBNdb batch ${res.status}`)
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

// ── Build PATCH payload ───────────────────────────────────────────────────────

function buildPatch(payloadBook: any, isbndbBook: ISBNdbBook): Record<string, any> | null {
  const patch: Record<string, any> = {}

  // Top-level fields
  if (!payloadBook.publisherText && isbndbBook.publisher) {
    patch.publisherText = isbndbBook.publisher
  }
  if (!payloadBook.synopsis && isbndbBook.synopsis) {
    patch.synopsis = isbndbBook.synopsis
  }

  // subjects — only add if book has none
  if ((!payloadBook.subjects || payloadBook.subjects.length === 0) && isbndbBook.subjects?.length) {
    patch.subjects = isbndbBook.subjects.map(s => ({ subject: s }))
  }

  // scrapedImageUrls — only if none set
  if ((!payloadBook.scrapedImageUrls || payloadBook.scrapedImageUrls.length === 0) && isbndbBook.image) {
    patch.scrapedImageUrls = [{ url: isbndbBook.image }]
  }

  // Edition-level fields — update the first edition
  const edition = payloadBook.editions?.[0]
  if (edition) {
    const editionPatch: Record<string, any> = {}

    if (!edition.pages && isbndbBook.pages) editionPatch.pages = isbndbBook.pages
    if (!edition.datePublished && isbndbBook.date_published) {
      // ISBNdb returns "1996-11-07" or just "1996"
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
      // Payload expects the full editions array with the updated edition
      patch.editions = [{
        ...edition,
        ...editionPatch,
      }]
    }
  }

  return Object.keys(patch).length > 0 ? patch : null
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📚 Book Enrichment via ISBNdb Batch API\n')
  if (DRY_RUN) console.log('⚠️  DRY RUN — no changes will be saved\n')
  console.log(`   Payload URL : ${PAYLOAD_URL}`)
  console.log(`   Batch size  : ${ISBNDB_BATCH_SIZE} ISBNs per ISBNdb call`)
  console.log(`   Max books   : ${MAX_BOOKS === Infinity ? 'all' : MAX_BOOKS}\n`)

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

      // Skip if already fully enriched
      const edition = book.editions?.[0]
      const hasPublisher = book.publisherText || (book.publisher && book.publisher !== null)
      const hasPages = edition?.pages
      const hasDate = edition?.datePublished
      const hasSynopsis = book.synopsis

      if (hasPublisher && hasPages && hasDate && hasSynopsis) continue

      const isbn = edition?.isbn || edition?.isbn10
      if (!isbn) continue

      booksToProcess.push({ id: book.id, title: book.title || 'Unknown', isbn, book })
    }

    process.stdout.write(`\r  Page ${page}/${totalPages} — ${booksToProcess.length} books queued...`)
    page++
  }

  console.log(`\n\n✅ ${booksToProcess.length} books need enrichment\n`)
  if (booksToProcess.length === 0) process.exit(0)

  // ── Step 2: Fetch from ISBNdb in batches ──
  console.log('🌐 Fetching metadata from ISBNdb...\n')
  const enrichResults = new Map<string, { patch: Record<string, any>; book: any }>()
  let isbndbCalls = 0

  for (let i = 0; i < booksToProcess.length; i += ISBNDB_BATCH_SIZE) {
    const batch = booksToProcess.slice(i, i + ISBNDB_BATCH_SIZE)
    const isbns = batch.map(b => b.isbn)
    isbndbCalls++

    const isbndbMap = await fetchISBNdbBatch(isbns)

    for (const item of batch) {
      const isbndbBook = isbndbMap.get(item.isbn)
      if (!isbndbBook) continue
      const patch = buildPatch(item.book, isbndbBook)
      if (patch) enrichResults.set(item.id, { patch, book: item.book })
    }

    const progress = Math.min(i + ISBNDB_BATCH_SIZE, booksToProcess.length)
    process.stdout.write(`\r  Batch ${isbndbCalls} — processed ${progress}/${booksToProcess.length} (${enrichResults.size} to update)...`)

    if (i + ISBNDB_BATCH_SIZE < booksToProcess.length) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  console.log(`\n\n📊 ISBNdb results: ${enrichResults.size} books to update out of ${booksToProcess.length} checked\n`)

  if (DRY_RUN) {
    console.log('Sample updates that would be saved:')
    let shown = 0
    for (const [id, { patch, book }] of enrichResults) {
      const item = booksToProcess.find(b => b.id === id)
      console.log(`  "${item?.title?.slice(0, 45)}"`)
      if (patch.publisherText) console.log(`    publisher: ${patch.publisherText}`)
      if (patch.synopsis) console.log(`    synopsis: ${patch.synopsis.slice(0, 60)}...`)
      if (patch.editions?.[0]?.pages) console.log(`    pages: ${patch.editions[0].pages}`)
      if (patch.editions?.[0]?.datePublished) console.log(`    date: ${patch.editions[0].datePublished.slice(0, 10)}`)
      if (++shown >= 5) break
    }
    console.log('\nDone (dry run, nothing saved).')
    process.exit(0)
  }

  if (enrichResults.size === 0) {
    console.log('Nothing to update.')
    process.exit(0)
  }

  // ── Step 3: Authenticate and save ──
  await login()
  console.log(`💾 Saving enrichment data for ${enrichResults.size} books...\n`)

  const entries = Array.from(enrichResults.entries())
  let saved = 0, failed = 0

  for (let i = 0; i < entries.length; i += SAVE_CONCURRENCY) {
    const batch = entries.slice(i, i + SAVE_CONCURRENCY)
    await Promise.all(batch.map(async ([bookId, { patch }]) => {
      try {
        await payloadFetch(`/api/books/${bookId}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        })
        saved++
      } catch (err: any) {
        failed++
        const item = booksToProcess.find(b => b.id === bookId)
        console.error(`  ❌ Failed "${item?.title?.slice(0, 40)}": ${err.message}`)
      }
    }))
    process.stdout.write(`\r  Saved ${saved}/${enrichResults.size}...`)
  }

  console.log('\n\n' + '='.repeat(60))
  console.log('✅ Enrichment complete!')
  console.log(`   Books checked    : ${booksToProcess.length}`)
  console.log(`   Books updated    : ${saved}`)
  console.log(`   Failures         : ${failed}`)
  console.log(`   ISBNdb API calls : ${isbndbCalls} (batched)`)
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message)
  process.exit(1)
})
