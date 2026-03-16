#!/usr/bin/env tsx

import dotenv from 'dotenv'

import { normalizeBookBinding, normalizePublishedDate } from '../src/app/utils/bookImport'
import { fetchISBNdbBatchBooks, type ISBNdbBatchBook } from './lib/isbndbBatch'

dotenv.config({ path: './.env' })

const PAYLOAD_URL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY || ''
const PAYLOAD_ADMIN_EMAIL = process.env.PAYLOAD_ADMIN_EMAIL || ''
const PAYLOAD_ADMIN_PASSWORD = process.env.PAYLOAD_ADMIN_PASSWORD || ''
const ISBNDB_API_KEY = process.env.ISBNDB_API_KEY || ''
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const limitIndex = args.indexOf('--limit')
const LIMIT = limitIndex >= 0 ? Number.parseInt(args[limitIndex + 1], 10) : Number.POSITIVE_INFINITY
const PAGE_SIZE = 100
const ISBNDB_BATCH_SIZE = Math.max(1, Math.min(1000, Number.parseInt(process.env.ISBNDB_BATCH_SIZE || '50', 10)))
const SAVE_CONCURRENCY = 5
const DELAY_MS = 500

type DimensionValue = {
  unit?: string
  value?: number
}

type ISBNdbBook = ISBNdbBatchBook & {
  isbn13?: string
  isbn?: string
  binding?: string | null
  pages?: number | null
  date_published?: string | null
  edition?: string | null
  dimensions?: string | null
  dimensions_structured?: {
    length?: DimensionValue
    width?: DimensionValue
    height?: DimensionValue
    weight?: DimensionValue
  } | null
}

type Edition = {
  isbn?: string | null
  isbn10?: string | null
  binding?: string | null
  edition?: string | null
  pages?: number | null
  datePublished?: string | null
  dimensions?: string | null
  pricing?: {
    shippingWeight?: number | null
  } | null
}

type BookDoc = {
  id: string
  title?: string | null
  pricing?: {
    shippingWeight?: number | null
  } | null
  editions?: Edition[] | null
}

type Stats = {
  scanned: number
  queued: number
  updated: number
  matchedISBNdb: number
  exactWeightBooks: number
  reusedTopLevelWeightBooks: number
  fallbackWeightBooks: number
  metadataPatchedBooks: number
  manualReviewBooks: number
}

let authToken = ''

const stats: Stats = {
  scanned: 0,
  queued: 0,
  updated: 0,
  matchedISBNdb: 0,
  exactWeightBooks: 0,
  reusedTopLevelWeightBooks: 0,
  fallbackWeightBooks: 0,
  metadataPatchedBooks: 0,
  manualReviewBooks: 0,
}

const readString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

const hasPositiveWeight = (weight: number | null | undefined): boolean =>
  typeof weight === 'number' && Number.isFinite(weight) && weight > 0

const normalizeBinding = (binding?: string | null): string =>
  normalizeBookBinding(binding) || binding?.toLowerCase().trim() || ''

const getBindingFallbackWeight = (binding?: string | null): number => {
  const normalizedBinding = normalizeBinding(binding)

  if (normalizedBinding === 'hardcover') return 16
  if (normalizedBinding === 'ebook' || normalizedBinding === 'audiobook') return 0
  return 8
}

const isReliableTopLevelWeight = (weight: number | null | undefined, binding?: string | null): boolean => {
  if (!hasPositiveWeight(weight)) return false
  if (weight !== 16) return true
  return normalizeBinding(binding) === 'hardcover'
}

const toOunces = (value?: number, unit?: string): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined
  }

  const normalizedUnit = unit?.toLowerCase().trim()

  switch (normalizedUnit) {
    case 'oz':
    case 'ounce':
    case 'ounces':
      return Math.round(value * 100) / 100
    case 'lb':
    case 'lbs':
    case 'pound':
    case 'pounds':
      return Math.round(value * 16 * 100) / 100
    case 'g':
    case 'gram':
    case 'grams':
      return Math.round((value / 28.349523125) * 100) / 100
    case 'kg':
    case 'kilogram':
    case 'kilograms':
      return Math.round(value * 35.27396195 * 100) / 100
    default:
      return undefined
  }
}

const buildDimensionsText = (book?: ISBNdbBook | null): string | undefined => {
  if (!book) return undefined

  let dimensionsText = readString(book.dimensions)
  const structured = book.dimensions_structured
  if (!structured) return dimensionsText

  const parts: string[] = []
  const pushDimension = (label: string, dimension?: DimensionValue) => {
    if (typeof dimension?.value === 'number' && Number.isFinite(dimension.value) && dimension.unit) {
      parts.push(`${label}: ${dimension.value}${dimension.unit}`)
    }
  }

  pushDimension('H', structured.height)
  pushDimension('W', structured.width)
  pushDimension('L', structured.length)
  pushDimension('Weight', structured.weight)

  if (parts.length > 0) {
    dimensionsText = parts.join(', ')
  }

  return dimensionsText
}

const extractISBN = (book: BookDoc): string | undefined => {
  const editions = Array.isArray(book.editions) ? book.editions : []

  for (const edition of editions) {
    const isbn = readString(edition?.isbn) || readString(edition?.isbn10)
    if (isbn) return isbn
  }

  return undefined
}

const needsBackfill = (book: BookDoc): boolean => {
  const editions = Array.isArray(book.editions) ? book.editions : []
  const primaryEdition = editions[0]
  const topLevelWeight = book.pricing?.shippingWeight

  if (!isReliableTopLevelWeight(topLevelWeight, primaryEdition?.binding)) {
    return true
  }

  for (const edition of editions) {
    if (!hasPositiveWeight(edition?.pricing?.shippingWeight)) return true
  }

  return !primaryEdition?.binding || !primaryEdition?.pages || !primaryEdition?.datePublished || !primaryEdition?.dimensions
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
    throw new Error(`Login failed: ${response.status} ${await response.text()}`)
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

async function fetchBooks(page: number) {
  const params = new URLSearchParams({
    depth: '1',
    limit: String(PAGE_SIZE),
    page: String(page),
    sort: 'id',
  })

  return payloadFetch(`/api/books?${params.toString()}`) as Promise<{
    docs: BookDoc[]
    hasNextPage: boolean
    nextPage?: number | null
  }>
}

async function fetchISBNdbBatch(isbns: string[]): Promise<Map<string, ISBNdbBook>> {
  return fetchISBNdbBatchBooks(isbns, {
    apiKey: ISBNDB_API_KEY,
    logger: (message) => console.log(`  ${message}`),
  }) as Promise<Map<string, ISBNdbBook>>
}

function buildWeightUpdate(book: BookDoc, isbndbBook?: ISBNdbBook) {
  const editions = Array.isArray(book.editions) ? book.editions : []
  const originalEditionsJson = JSON.stringify(editions)
  const exactWeightOz = toOunces(
    isbndbBook?.dimensions_structured?.weight?.value,
    isbndbBook?.dimensions_structured?.weight?.unit,
  )
  const normalizedBindingFromISBNdb = normalizeBookBinding(isbndbBook?.binding)
  const normalizedPublishedDate = normalizePublishedDate(isbndbBook?.date_published)
  const dimensionsText = buildDimensionsText(isbndbBook)
  const existingTopLevelWeight = book.pricing?.shippingWeight

  let usedFallback = false
  let usedApiWeight = false
  let reusedTopLevelWeight = false
  let manualReview = false
  let metadataPatched = false

  const nextEditions = editions.map((edition) => {
    const nextEdition: Edition = {
      ...edition,
      pricing: {
        ...(edition?.pricing || {}),
      },
    }

    const resolvedBinding = normalizeBookBinding(edition?.binding) || normalizedBindingFromISBNdb || undefined
    if (!edition?.binding && resolvedBinding) {
      nextEdition.binding = resolvedBinding
      metadataPatched = true
    }

    if (!edition?.pages && isbndbBook?.pages) {
      nextEdition.pages = isbndbBook.pages
      metadataPatched = true
    }

    if (!edition?.datePublished && normalizedPublishedDate) {
      nextEdition.datePublished = normalizedPublishedDate
      metadataPatched = true
    }

    if (!edition?.dimensions && dimensionsText) {
      nextEdition.dimensions = dimensionsText
      metadataPatched = true
    }

    if (!edition?.edition && isbndbBook?.edition) {
      nextEdition.edition = isbndbBook.edition
      metadataPatched = true
    }

    const existingEditionWeight = edition?.pricing?.shippingWeight
    let resolvedWeight = existingEditionWeight

    if (!hasPositiveWeight(existingEditionWeight)) {
      if (exactWeightOz !== undefined) {
        resolvedWeight = exactWeightOz
        usedApiWeight = true
      } else if (isReliableTopLevelWeight(existingTopLevelWeight, resolvedBinding || edition?.binding)) {
        resolvedWeight = existingTopLevelWeight
        reusedTopLevelWeight = true
      } else {
        resolvedWeight = getBindingFallbackWeight(resolvedBinding || edition?.binding)
        usedFallback = true
        if (!resolvedBinding) {
          manualReview = true
        }
      }
    }

    if (resolvedWeight !== existingEditionWeight) {
      nextEdition.pricing = {
        ...(nextEdition.pricing || {}),
        shippingWeight: resolvedWeight,
      }
    }

    return nextEdition
  })

  let resolvedTopLevelWeight = existingTopLevelWeight

  if (!isReliableTopLevelWeight(existingTopLevelWeight, nextEditions[0]?.binding)) {
    if (exactWeightOz !== undefined) {
      resolvedTopLevelWeight = exactWeightOz
      usedApiWeight = true
    } else {
      const firstEditionWeight = nextEditions.find((edition) => hasPositiveWeight(edition?.pricing?.shippingWeight))
        ?.pricing?.shippingWeight

      if (hasPositiveWeight(firstEditionWeight)) {
        resolvedTopLevelWeight = firstEditionWeight
      } else {
        resolvedTopLevelWeight = getBindingFallbackWeight(nextEditions[0]?.binding)
        usedFallback = true
        if (!nextEditions.length) {
          manualReview = true
        }
      }
    }
  }

  const editionsChanged = JSON.stringify(nextEditions) !== originalEditionsJson
  const topLevelChanged = resolvedTopLevelWeight !== existingTopLevelWeight

  return {
    changed: editionsChanged || topLevelChanged,
    data: {
      ...(editionsChanged ? { editions: nextEditions } : {}),
      pricing: {
        ...(book.pricing || {}),
        shippingWeight: resolvedTopLevelWeight,
      },
    },
    usedFallback,
    usedApiWeight,
    reusedTopLevelWeight,
    manualReview,
    metadataPatched,
    matchedISBNdb: Boolean(isbndbBook),
  }
}

async function main() {
  console.log('BOOK SHIPPING WEIGHT BACKFILL')
  console.log(JSON.stringify({
    dryRun: DRY_RUN,
    payloadUrl: PAYLOAD_URL,
    limit: Number.isFinite(LIMIT) ? LIMIT : 'all',
    isbndbBulkEnabled: Boolean(ISBNDB_API_KEY),
    isbndbBatchSize: ISBNDB_BATCH_SIZE,
  }, null, 2))

  const booksToProcess: Array<{ book: BookDoc; isbn?: string }> = []
  let page = 1

  while (booksToProcess.length < LIMIT) {
    const result = await fetchBooks(page)
    if (!result.docs.length) break

    for (const book of result.docs) {
      if (booksToProcess.length >= LIMIT) break

      stats.scanned += 1
      if (!needsBackfill(book)) continue

      booksToProcess.push({
        book,
        isbn: extractISBN(book),
      })
    }

    if (!result.hasNextPage) break
    page = result.nextPage || page + 1
  }

  stats.queued = booksToProcess.length

  const isbndbResults = new Map<string, ISBNdbBook>()

  if (ISBNDB_API_KEY) {
    console.log(`Fetching ISBNdb batch data for ${booksToProcess.length} queued books...`)

    for (let index = 0; index < booksToProcess.length; index += ISBNDB_BATCH_SIZE) {
      const batch = booksToProcess.slice(index, index + ISBNDB_BATCH_SIZE)
      const batchISBNs = Array.from(
        new Set(
          batch
            .map((item) => item.isbn)
            .filter((isbn): isbn is string => Boolean(isbn)),
        ),
      )

      const batchResults = await fetchISBNdbBatch(batchISBNs)
      for (const item of batch) {
        if (!item.isbn) continue
        const isbndbBook = batchResults.get(item.isbn)
        if (isbndbBook) {
          isbndbResults.set(item.book.id, isbndbBook)
        }
      }

      const progress = Math.min(index + ISBNDB_BATCH_SIZE, booksToProcess.length)
      process.stdout.write(`\r  ISBNdb batches processed ${progress}/${booksToProcess.length} (${isbndbResults.size} matches)...`)

      if (index + ISBNDB_BATCH_SIZE < booksToProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
      }
    }

    process.stdout.write('\n')
  } else {
    console.log('ISBNDB_API_KEY not configured; using fallback-only mode.')
  }

  const updates = booksToProcess
    .map(({ book }) => ({
      book,
      update: buildWeightUpdate(book, isbndbResults.get(book.id)),
    }))
    .filter((item) => item.update.changed)

  for (const { update } of updates) {
    if (update.matchedISBNdb) stats.matchedISBNdb += 1
    if (update.usedApiWeight) stats.exactWeightBooks += 1
    if (update.reusedTopLevelWeight) stats.reusedTopLevelWeightBooks += 1
    if (update.usedFallback) stats.fallbackWeightBooks += 1
    if (update.metadataPatched) stats.metadataPatchedBooks += 1
    if (update.manualReview) stats.manualReviewBooks += 1
  }

  if (DRY_RUN) {
    console.log(JSON.stringify({
      ...stats,
      updatesPreview: updates.slice(0, 5).map(({ book, update }) => ({
        id: book.id,
        title: book.title,
        matchedISBNdb: update.matchedISBNdb,
        usedApiWeight: update.usedApiWeight,
        usedFallback: update.usedFallback,
        metadataPatched: update.metadataPatched,
        data: update.data,
      })),
    }, null, 2))
    return
  }

  if (!updates.length) {
    console.log(JSON.stringify(stats, null, 2))
    return
  }

  await login()
  console.log(`Saving ${updates.length} book updates to Payload...`)

  for (let index = 0; index < updates.length; index += SAVE_CONCURRENCY) {
    const batch = updates.slice(index, index + SAVE_CONCURRENCY)
    await Promise.all(batch.map(async ({ book, update }) => {
      await payloadFetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        body: JSON.stringify(update.data),
      })
      stats.updated += 1
    }))
    process.stdout.write(`\r  Saved ${stats.updated}/${updates.length} book updates...`)
  }

  process.stdout.write('\n')
  console.log(JSON.stringify(stats, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
