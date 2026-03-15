#!/usr/bin/env tsx

import dotenv from 'dotenv'

import { buildBookMetadataPatch, type GoogleBooksVolumeInfo, type IsbndbBook } from '../src/app/utils/bookImport'

dotenv.config({ path: './.env' })

const PAYLOAD_URL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY || ''
const PAYLOAD_ADMIN_EMAIL = process.env.PAYLOAD_ADMIN_EMAIL || ''
const PAYLOAD_ADMIN_PASSWORD = process.env.PAYLOAD_ADMIN_PASSWORD || ''
const ISBNDB_API_KEY = process.env.ISBNDB_API_KEY || ''
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || ''

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const limitIndex = args.indexOf('--limit')
const LIMIT = limitIndex >= 0 ? Number.parseInt(args[limitIndex + 1], 10) : 100
const PAGE_SIZE = 25
const SAVE_CONCURRENCY = 5

let authToken = ''

type PayloadBook = {
  id: string
  title?: string
  titleLong?: string
  authorsText?: Array<{ name?: string }>
  publisherText?: string
  description?: unknown
  synopsis?: string
  excerpt?: string
  subjects?: Array<{ subject?: string }>
  rawCategories?: Array<{ category?: string }>
  deweyDecimal?: Array<{ code?: string }>
  scrapedImageUrls?: Array<{ url?: string }>
  collections?: Array<{ collectionName?: string }>
  reviews?: Array<{ review?: string }>
  editions?: Array<Record<string, any>>
  pricing?: Record<string, any>
  isbndbChecked?: boolean
}

type ISBNdbResponse = { book?: IsbndbBook }

const needsEnrichment = (book: PayloadBook): boolean => {
  const edition = book.editions?.[0] || {}

  return !book.titleLong ||
    (book.authorsText?.length ?? 0) === 0 ||
    !book.publisherText ||
    !book.synopsis ||
    (book.subjects?.length ?? 0) === 0 ||
    (book.scrapedImageUrls?.length ?? 0) === 0 ||
    !edition.pages ||
    !edition.datePublished ||
    !edition.binding ||
    !edition.language ||
    !edition.publisherText ||
    !edition.pricing?.shippingWeight ||
    !book.pricing?.shippingWeight
}

async function login(): Promise<void> {
  if (PAYLOAD_API_KEY) {
    authToken = PAYLOAD_API_KEY
    return
  }

  if (!PAYLOAD_ADMIN_EMAIL || !PAYLOAD_ADMIN_PASSWORD) {
    throw new Error('Set PAYLOAD_API_KEY or PAYLOAD_ADMIN_EMAIL + PAYLOAD_ADMIN_PASSWORD in .env')
  }

  const response = await fetch(`${PAYLOAD_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: PAYLOAD_ADMIN_EMAIL,
      password: PAYLOAD_ADMIN_PASSWORD,
    }),
  })

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${(await response.text()).slice(0, 200)}`)
  }

  const data = await response.json() as { token?: string }
  if (!data.token) {
    throw new Error('Login returned no token')
  }

  authToken = data.token
}

async function payloadFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetch(`${PAYLOAD_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new Error(`Payload ${response.status} ${path}: ${(await response.text()).slice(0, 300)}`)
  }

  return response.json()
}

async function fetchFromISBNdb(isbn: string): Promise<IsbndbBook | null> {
  if (!ISBNDB_API_KEY) return null

  try {
    const response = await fetch(`https://api2.isbndb.com/book/${encodeURIComponent(isbn)}`, {
      headers: {
        Authorization: ISBNDB_API_KEY,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`ISBNdb ${response.status}`)
    }

    const data = await response.json() as ISBNdbResponse
    return data.book || null
  } catch (error) {
    console.error(`ISBNdb error for ${isbn}:`, error)
    return null
  }
}

async function fetchFromGoogleBooks(isbn: string): Promise<GoogleBooksVolumeInfo | null> {
  try {
    const params = new URLSearchParams({ q: `isbn:${isbn}`, maxResults: '1', printType: 'books' })
    if (GOOGLE_BOOKS_API_KEY) {
      params.set('key', GOOGLE_BOOKS_API_KEY)
    }

    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`Google Books ${response.status}`)
    }

    const data = await response.json() as { items?: Array<{ volumeInfo?: GoogleBooksVolumeInfo }> }
    return data.items?.[0]?.volumeInfo || null
  } catch (error) {
    console.error(`Google Books error for ${isbn}:`, error)
    return null
  }
}

async function mapLimit<T>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<void>) {
  let index = 0

  async function run() {
    while (index < items.length) {
      const current = index++
      await worker(items[current], current)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, run))
}

async function collectBooks(): Promise<PayloadBook[]> {
  const books: PayloadBook[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage && books.length < LIMIT) {
    const result = await payloadFetch(`/api/books?limit=${PAGE_SIZE}&page=${page}&depth=0&sort=-updatedAt`) as {
      docs: PayloadBook[]
      hasNextPage: boolean
    }

    for (const book of result.docs) {
      const edition = book.editions?.[0]
      const isbn = edition?.isbn || edition?.isbn10
      if (!isbn) continue
      if (!needsEnrichment(book)) continue

      books.push(book)
      if (books.length >= LIMIT) break
    }

    hasNextPage = result.hasNextPage
    page += 1
  }

  return books
}

async function main() {
  console.log('📚 Book Metadata Enrichment Review\n')
  console.log(`   Payload URL: ${PAYLOAD_URL}`)
  console.log(`   Limit      : ${LIMIT}`)
  if (DRY_RUN) console.log('   Mode       : dry-run')
  console.log('')

  await login()

  const books = await collectBooks()
  console.log(`🔍 Queued ${books.length} books with missing metadata\n`)

  let patched = 0
  let fieldUpdates = 0
  let isbnMatches = 0
  let googleMatches = 0

  const patches: Array<{ id: string; title: string; patch: Record<string, unknown>; fieldsUpdated: number; source: string }> = []

  await mapLimit(books, 4, async (book) => {
    const edition = book.editions?.[0] || {}
    const isbn = edition.isbn || edition.isbn10
    if (!isbn) return

    const [isbndbBook, googleVolumeInfo] = await Promise.all([
      fetchFromISBNdb(isbn),
      fetchFromGoogleBooks(isbn),
    ])

    if (isbndbBook) isbnMatches += 1
    if (googleVolumeInfo) googleMatches += 1

    const { updateData, fieldsUpdated } = buildBookMetadataPatch(book, {
      isbndbBook,
      googleVolumeInfo,
      markChecked: true,
    })

    if (fieldsUpdated === 0) return

    patched += 1
    fieldUpdates += fieldsUpdated
    patches.push({
      id: book.id,
      title: book.title || isbn,
      patch: updateData,
      fieldsUpdated,
      source: isbndbBook ? (googleVolumeInfo ? 'ISBNdb + Google Books' : 'ISBNdb') : 'Google Books',
    })
  })

  console.log(`✅ ISBNdb matches: ${isbnMatches}`)
  console.log(`✅ Google matches: ${googleMatches}`)
  console.log(`📝 Books with patchable metadata: ${patched}`)
  console.log(`🧩 Total fields that can be filled: ${fieldUpdates}\n`)

  for (const item of patches.slice(0, 10)) {
    console.log(`- ${item.title} (${item.source}, ${item.fieldsUpdated} fields)`)
    console.log(`  Fields: ${Object.keys(item.patch).join(', ')}`)
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. No changes saved.')
    return
  }

  await mapLimit(patches, SAVE_CONCURRENCY, async (item) => {
    await payloadFetch(`/api/books/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify(item.patch),
    })
  })

  console.log(`\n💾 Saved patches for ${patches.length} books.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
