#!/usr/bin/env tsx

/**
 * Import books that exist in the Sanity export but were not reconciled from Square.
 *
 * Usage:
 *   pnpm tsx scripts/import-sanity-missing-books.ts [--dry-run] [--limit N]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { getPayload } from 'payload'
import { enrichProductFromIdentifiers } from '../src/app/utils/productEnrichment'

dotenv.config({ path: './.env' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SANITY_EXPORT_PATH = path.join(__dirname, '../data/sanity-books-export.json')
const RECONCILED_PATH = path.join(__dirname, '../data/reconciled/reconciled-books.json')
const MANUAL_REVIEW_PATH = path.join(__dirname, '../data/reconciled/manual-review-queue.json')

const CHECKPOINT_NOTE = 'square' // placeholder if needed later

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

const toCents = (value?: number | string | null): number => {
  if (value === null || value === undefined) return 0
  const numeric = typeof value === 'string' ? parseFloat(value) : value
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.round(numeric * 100))
}

const normalizeBinding = (binding?: string | null): string => {
  if (!binding) return 'paperback'
  const lower = binding.toLowerCase()
  if (lower.includes('hard')) return 'hardcover'
  if (lower.includes('cloth')) return 'hardcover'
  if (lower.includes('mass')) return 'mass-market'
  if (lower.includes('audio')) return 'audiobook'
  if (lower.includes('ebook') || lower.includes('digital')) return 'ebook'
  if (lower.includes('spiral')) return 'paperback'
  return 'paperback'
}

const sanitizeIsbn = (isbn?: string | null): string | undefined => {
  if (!isbn) return undefined
  const cleaned = isbn.replace(/[^0-9Xx]/g, '')
  if (cleaned.length === 10 || cleaned.length === 13) {
    return cleaned.toUpperCase()
  }
  return undefined
}

const normalizeTitle = (title?: string | null): string | undefined => {
  if (!title) return undefined
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function fetchIsbndbMetadata(isbn?: string | null) {
  if (!isbn) return null
  if (isbndbCache.has(isbn)) {
    return isbndbCache.get(isbn)
  }

  const normalized = isbn.replace(/[^0-9Xx]/g, '').toUpperCase()
  if (normalized.length !== 13 && normalized.length !== 10) {
    isbndbCache.set(isbn, null)
    return null
  }

  const identifier = {
    type: normalized.length === 13 ? 'isbn13' : 'isbn10',
    value: normalized,
  } as const

  try {
    const enriched = await enrichProductFromIdentifiers(identifier)
    isbndbCache.set(isbn, enriched)
    isbndbCache.set(normalized, enriched)
    return enriched
  } catch (error) {
    console.error(`   ⚠️  ISBNdb enrichment failed for ${isbn}:`, error instanceof Error ? error.message : error)
    isbndbCache.set(isbn, null)
    isbndbCache.set(normalized, null)
    return null
  }
}

interface ImportStats {
  considered: number
  candidates: number
  created: number
  skippedExisting: number
  skippedTitleMatch: number
  skippedInvalid: number
  errors: number
}

const isbndbCache = new Map<string, any>()

async function preloadExisting(payload: any) {
  const existingSquareIds = new Set<string>()
  const existingIsbns = new Set<string>()
  const existingTitles = new Set<string>()

  let page = 1
  const limit = 500

  while (true) {
    const result = await payload.find({
      collection: 'books',
      page,
      limit,
      depth: 0,
      select: {
        title: true,
        squareItemId: true,
        editions: true,
      },
    })

    for (const doc of result.docs) {
      if (doc.squareItemId) {
        existingSquareIds.add(String(doc.squareItemId).trim())
      }
      if (Array.isArray(doc.editions)) {
        for (const edition of doc.editions) {
          if (edition?.isbn) {
            const sanitized = sanitizeIsbn(String(edition.isbn))
            existingIsbns.add(sanitized || String(edition.isbn).trim())
          }
        }
      }

      if (doc.title) {
        const normalized = normalizeTitle(doc.title)
        if (normalized) existingTitles.add(normalized)
      }
    }

    if (!result.hasNextPage) break
    page += 1
  }

  return { existingSquareIds, existingIsbns, existingTitles }
}

function loadJson(filepath: string) {
  if (!fs.existsSync(filepath)) return []
  return JSON.parse(fs.readFileSync(filepath, 'utf8'))
}

function buildProcessedSets() {
  const reconciled = loadJson(RECONCILED_PATH)
  const manual = loadJson(MANUAL_REVIEW_PATH)

  const processedSquare = new Set<string>()
  const processedIsbn = new Set<string>()
  const processedTitles = new Set<string>()

  const addFromBook = (book: any) => {
    if (!book) return
    if (book.squareItemId) {
      processedSquare.add(String(book.squareItemId).trim())
    }
    if (book.isbn13) {
      processedIsbn.add(sanitizeIsbn(String(book.isbn13)) || String(book.isbn13).trim())
    }
    if (book.title) {
      const normalized = normalizeTitle(book.title)
      if (normalized) processedTitles.add(normalized)
    }
    if (Array.isArray(book.editions)) {
      for (const edition of book.editions) {
        if (edition?.squareVariationId) {
          processedSquare.add(String(edition.squareVariationId).trim())
        }
        if (edition?.isbn13) {
          processedIsbn.add(sanitizeIsbn(String(edition.isbn13)) || String(edition.isbn13).trim())
        }
        if (edition?.isbn) {
          processedIsbn.add(sanitizeIsbn(String(edition.isbn)) || String(edition.isbn).trim())
        }
      }
    }
  }

  reconciled.forEach(addFromBook)
  manual.forEach(addFromBook)

  return { processedSquare, processedIsbn, processedTitles }
}

function deriveSanityIdentifiers(book: any) {
  const sku = book?.defaultBookVariant?.sku
  const isbnCandidate =
    book?.defaultBookVariant?.isbn13 ||
    book?.defaultBookVariant?.isbn ||
    book?.isbn13 ||
    book?.isbn
  const normalizedSku = sku ? String(sku).trim() : undefined
  const sanitizedIsbn = sanitizeIsbn(isbnCandidate)
  const finalIsbn = sanitizedIsbn || normalizedSku || undefined

  return {
    sku: normalizedSku,
    isbn: finalIsbn,
  }
}

async function buildPayloadBook(book: any) {
  const { sku, isbn } = deriveSanityIdentifiers(book)
  const variant = book?.defaultBookVariant || {}
  const priceCents = toCents(variant.price)

  const enriched = await fetchIsbndbMetadata(isbn)
  const enrichedEdition = enriched?.editions?.[0]

  const edition = {
    binding: normalizeBinding(variant.binding || enrichedEdition?.binding),
    isbn: isbn,
    isbn10: enrichedEdition?.isbn10,
    squareVariationId: undefined,
    publisherText: enriched?.publisher || undefined,
    datePublished: enrichedEdition?.datePublished || variant.publishedDate || book.publishedDate || undefined,
    pages: enrichedEdition?.pages || variant.pagecount || book.pageCount || undefined,
    pricing: {
      retailPrice: priceCents,
    },
    inventory: {
      stockLevel: 0,
      allowBackorders: false,
    },
    isAvailable: false,
  }

  const descriptionText =
    enriched?.description ||
    enriched?.synopsis ||
    variant.description ||
    book.description ||
    undefined

  const authorNames = (enriched?.authors || [])
    .map((author: any) => author?.name || author)
    .filter(Boolean)

  const categoriesSet = new Set<string>()
  if (Array.isArray(book.genreTitles)) {
    for (const genre of book.genreTitles) {
      categoriesSet.add(genre)
    }
  }
  if (Array.isArray(enriched?.categories)) {
    for (const category of enriched!.categories!) {
      categoriesSet.add(category)
    }
  }

  const tagSet = new Set<string>()
  const tagsArray: Array<{ tag: string }> = []
  if (Array.isArray(book.tags)) {
    for (const tag of book.tags) {
      const value = String(tag).trim()
      if (value && !tagSet.has(value)) {
        tagSet.add(value)
        tagsArray.push({ tag: value })
      }
    }
  }
  if (Array.isArray(enriched?.subjects)) {
    for (const subject of enriched!.subjects!) {
      const raw = typeof subject === 'string' ? subject : subject?.subject
      const value = raw ? String(raw).trim() : ''
      if (value && !tagSet.has(value)) {
        tagSet.add(value)
        tagsArray.push({ tag: value })
      }
    }
  }

  const subjectsArray: Array<{ subject: string }> = []
  const subjectSet = new Set<string>()
  if (Array.isArray(enriched?.subjects)) {
    for (const subject of enriched!.subjects!) {
      const value = typeof subject === 'string' ? subject : subject?.subject
      const normalized = value ? String(value).trim() : ''
      if (normalized && !subjectSet.has(normalized)) {
        subjectSet.add(normalized)
        subjectsArray.push({ subject: normalized })
      }
    }
  }

  const imageRecords = (enriched?.scrapedImageUrls || enriched?.images || [])
    .map((img: any) => ({ url: img?.url || img }))
    .filter((record: any) => record?.url)

  const payloadBook: any = {
    title: enriched?.title || book.title || 'Untitled Book',
    subtitle: enriched?.titleLong || undefined,
    description: toLexical(descriptionText),
    authors: [],
    authorsText: authorNames.length
      ? authorNames.map((name: string) => ({ name }))
      : undefined,
    publisherText: enriched?.publisher || undefined,
    pageCount: edition.pages || undefined,
    publicationDate: edition.datePublished,
    genres: Array.from(categoriesSet).filter((value) => value && value.trim().length > 0),
    tags: tagsArray,
    subjects: subjectsArray,
    editions: [edition],
    pricing: {
      retailPrice: priceCents,
      requiresShipping: true,
      shippingWeight: variant.weight ? Math.round(Number(variant.weight) * 16) : 16,
    },
    inventory: {
      trackQuantity: false,
      stockLevel: 0,
      lowStockThreshold: 0,
      allowBackorders: false,
      location: 'main_store',
      isConsignment: false,
      dateAdded: new Date().toISOString(),
    },
    squareItemId: sku,
    scrapedImageUrls: imageRecords,
    importSource: enriched?.importSource || 'manual',
    importDate: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    isActive: false,
  }

  return payloadBook
}

async function main() {
  if (!fs.existsSync(SANITY_EXPORT_PATH)) {
    console.error('❌ Sanity export not found:', SANITY_EXPORT_PATH)
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1], 10) : undefined

  console.log('📚 Importing Sanity-only books into Payload')
  if (dryRun) {
    console.log('⚠️  Running in DRY RUN mode – no changes will be made')
  }

  const sanityBooks = loadJson(SANITY_EXPORT_PATH)
  console.log(`📂 Loaded ${sanityBooks.length} books from Sanity export`)

  const { processedSquare, processedIsbn, processedTitles } = buildProcessedSets()
  console.log(`🔍 Processed book identifiers from reconciliation:`)
  console.log(`    Square IDs: ${processedSquare.size}`)
  console.log(`    ISBNs:      ${processedIsbn.size}`)
  console.log(`    Titles:     ${processedTitles.size}`)

  let payload: any = null
  let existingSquareIds = new Set<string>()
  let existingIsbns = new Set<string>()
  let existingTitles = new Set<string>()

  if (!dryRun) {
    const { default: config } = await import('../src/payload.config.js')
    payload = await getPayload({ config })
    console.log('🔌 Connected to Payload')
    const existing = await preloadExisting(payload)
    existingSquareIds = existing.existingSquareIds
    existingIsbns = existing.existingIsbns
    existingTitles = existing.existingTitles
    console.log(`   ↳ Existing Payload books: ${existingSquareIds.size} square IDs, ${existingIsbns.size} ISBNs, ${existingTitles.size} titles`)
  }

  const stats: ImportStats = {
    considered: 0,
    candidates: 0,
    created: 0,
    skippedExisting: 0,
    skippedTitleMatch: 0,
    skippedInvalid: 0,
    errors: 0,
  }

  for (const book of sanityBooks) {
    stats.considered++

    const { sku, isbn } = deriveSanityIdentifiers(book)
    const normalizedTitle = normalizeTitle(book.title)

    const alreadyProcessed =
      (sku && processedSquare.has(sku)) ||
      (isbn && processedIsbn.has(isbn)) ||
      (normalizedTitle && processedTitles.has(normalizedTitle))
    if (alreadyProcessed) {
      stats.skippedExisting++
      continue
    }

    if (!book.title || !isbn) {
      stats.skippedInvalid++
      continue
    }

    const titleExists = normalizedTitle ? existingTitles.has(normalizedTitle) : false
    const existsInPayload =
      (sku && existingSquareIds.has(sku)) ||
      (isbn && existingIsbns.has(isbn)) ||
      titleExists
    if (existsInPayload) {
      if (titleExists) {
        stats.skippedTitleMatch++
      } else {
        stats.skippedExisting++
      }
      continue
    }

    stats.candidates++

    if (limit && stats.created >= limit) {
      continue
    }

    const payloadBook = await buildPayloadBook(book)

    if (dryRun) {
      console.log(`• [DRY RUN] Would import: ${payloadBook.title}`)
      continue
    }

    try {
      await payload.create({
        collection: 'books',
        data: payloadBook,
      })
      stats.created++
      if (payloadBook.squareItemId) existingSquareIds.add(payloadBook.squareItemId)
      if (payloadBook.editions[0]?.isbn) {
        existingIsbns.add(payloadBook.editions[0].isbn)
      }
      if (normalizedTitle) {
        existingTitles.add(normalizedTitle)
      }
      console.log(`✅ Imported: ${payloadBook.title}`)
    } catch (error) {
      stats.errors++
      console.error(`❌ Failed to import ${payloadBook.title}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log('\n📊 Import Summary')
  console.log('------------------')
  console.log(`Considered:        ${stats.considered}`)
  console.log(`Eligible:          ${stats.candidates}`)
  console.log(`Created:           ${stats.created}`)
  console.log(`Skipped (existing):${stats.skippedExisting}`)
  console.log(`Skipped (title):   ${stats.skippedTitleMatch}`)
  console.log(`Skipped (invalid): ${stats.skippedInvalid}`)
  console.log(`Errors:            ${stats.errors}`)

  if (dryRun) {
    console.log('\nRun without --dry-run to apply the changes.')
  }
}

main().catch((error) => {
  console.error('❌ Import failed:', error)
  process.exit(1)
})
