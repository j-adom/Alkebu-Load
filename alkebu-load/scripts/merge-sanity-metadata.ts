#!/usr/bin/env tsx

/**
 * Merge Sanity Categories & Tags into Payload Books
 *
 * Exports categories and tags from Sanity books, matches them to Payload books by ISBN,
 * and updates the Payload books with the additional metadata.
 *
 * Usage:
 *   tsx scripts/merge-sanity-metadata.ts [options]
 *
 * Options:
 *   --dry-run        Show what would be updated without making changes
 *   --limit <n>      Process only first N books (for testing)
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { createClient } from '@sanity/client'
import { getPayload } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface SanityBook {
  _id: string
  title: string
  isbn?: string
  isbn13?: string
  variantRefs?: any[]
  defaultBookVariant?: any
  categoryRefs?: string[]
  categoryTitles?: string[]
  categorySlugs?: string[]
  tags?: string[]
  genreRefs?: string[]
  genreTitles?: string[]
  genreSlugs?: string[]
  collectionRefs?: string[]
  collectionTitles?: string[]
  collectionSlugs?: string[]
  subjects?: string[]
}

interface MergeStats {
  sanityBooksTotal: number
  sanityBooksWithISBN: number
  payloadBooksTotal: number
  booksMatched: number
  booksUpdated: number
  booksSkipped: number
  categoriesAdded: number
  tagsAdded: number
  errors: string[]
}

/**
 * Initialize Sanity client
 */
function createSanityClient() {
  if (!process.env.SANITY_PROJECT_ID) {
    throw new Error('SANITY_PROJECT_ID not found in .env')
  }

  return createClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET || 'production',
    token: process.env.SANITY_TOKEN || '',
    apiVersion: '2024-01-01',
    useCdn: false,
  })
}

/**
 * Export books from Sanity with categories and tags
 */
async function exportSanityBooks(sanityClient: any): Promise<SanityBook[]> {
  console.log('📥 Fetching books from Sanity...\n')

  try {
    // Fetch books with expanded references for categories, genres, collections
    // Note: In Sanity, the _id often contains the ISBN itself
    const query = `*[_type == "book"] {
      _id,
      title,
      isbn,
      isbn13,
      "variantRefs": variants,
      defaultBookVariant,
      "categoryRefs": categories[]._ref,
      "categoryTitles": categories[]->.title,
      "categorySlugs": categories[]->.slug.current,
      tags,
      "genreRefs": genres[]._ref,
      "genreTitles": genres[]->.title,
      "genreSlugs": genres[]->.slug.current,
      "collectionRefs": collections[]._ref,
      "collectionTitles": collections[]->.title,
      "collectionSlugs": collections[]->.slug.current,
      subjects
    }`

    const books = await sanityClient.fetch(query)
    console.log(`✅ Found ${books.length} books in Sanity\n`)

    // Log sample for debugging
    if (books.length > 0) {
      const sample = books[0]
      console.log('📝 Sample book structure:')
      console.log(`   _id: ${sample._id}`)
      console.log(`   title: ${sample.title}`)
      console.log(`   categoryTitles: ${JSON.stringify(sample.categoryTitles)}`)
      console.log(`   tags: ${JSON.stringify(sample.tags)}\n`)
    }

    return books
  } catch (error) {
    console.error('❌ Error fetching from Sanity:', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

/**
 * Extract all ISBNs from a Sanity book record
 */
function extractISBNs(book: SanityBook): string[] {
  const isbns = new Set<string>()

  // Check if _id is an ISBN (common pattern in Sanity)
  if (book._id && /^97[89]\d{10}$/.test(book._id)) {
    isbns.add(book._id)
  }

  // Main ISBN fields
  if (book.isbn13) isbns.add(book.isbn13.replace(/[-\s]/g, ''))
  if (book.isbn) isbns.add(book.isbn.replace(/[-\s]/g, ''))

  return Array.from(isbns).filter(isbn => isbn && /^97[89]\d{10}$/.test(isbn))
}

/**
 * Extract categories from Sanity book
 */
function extractCategories(book: SanityBook): string[] {
  const categories = new Set<string>()

  // Category titles
  if (book.categoryTitles) {
    book.categoryTitles.forEach(title => title && categories.add(title))
  }

  // Category slugs (fallback)
  if (book.categorySlugs && (!book.categoryTitles || book.categoryTitles.length === 0)) {
    book.categorySlugs.forEach(slug => slug && categories.add(slug))
  }

  // Genre titles
  if (book.genreTitles) {
    book.genreTitles.forEach(title => title && categories.add(title))
  }

  // Collection titles
  if (book.collectionTitles) {
    book.collectionTitles.forEach(title => title && categories.add(title))
  }

  // Subjects
  if (book.subjects) {
    book.subjects.forEach(subject => subject && categories.add(subject))
  }

  return Array.from(categories)
}

/**
 * Extract tags from Sanity book
 */
function extractTags(book: SanityBook): string[] {
  const tags = new Set<string>()

  if (book.tags) {
    for (const tag of book.tags) {
      if (tag && typeof tag === 'string') {
        tags.add(tag.trim())
      }
    }
  }

  return Array.from(tags)
}

/**
 * Create ISBN → Sanity metadata lookup map
 */
function createSanityLookup(sanityBooks: SanityBook[]): Map<string, { categories: string[], tags: string[], title: string }> {
  const lookup = new Map()

  for (const book of sanityBooks) {
    const isbns = extractISBNs(book)
    const categories = extractCategories(book)
    const tags = extractTags(book)

    if (isbns.length === 0) continue

    const metadata = {
      categories,
      tags,
      title: book.title,
    }

    // Map all ISBNs to this metadata
    for (const isbn of isbns) {
      lookup.set(isbn, metadata)
    }
  }

  return lookup
}

/**
 * Find matching Sanity metadata for a Payload book
 */
function findSanityMetadata(
  payloadBook: any,
  sanityLookup: Map<string, any>
): { categories: string[], tags: string[] } | null {
  // Try all edition ISBNs
  if (payloadBook.editions) {
    for (const edition of payloadBook.editions) {
      if (edition.isbn) {
        const clean = edition.isbn.replace(/[-\s]/g, '')
        const metadata = sanityLookup.get(clean)
        if (metadata) return metadata
      }
      if (edition.isbn10) {
        const clean = edition.isbn10.replace(/[-\s]/g, '')
        const metadata = sanityLookup.get(clean)
        if (metadata) return metadata
      }
    }
  }

  return null
}

/**
 * Merge categories and subjects into Payload book
 */
function mergeMetadata(
  payloadBook: any,
  sanityMetadata: { categories: string[], tags: string[] }
): { categories: string[], subjects: Array<{ subject: string }>, hasChanges: boolean } {
  const existingCategories = new Set(payloadBook.categories || [])
  const existingSubjects = new Set((payloadBook.subjects || []).map((s: any) => s.subject))

  let categoriesAdded = 0
  let subjectsAdded = 0

  // Map Sanity categories to Payload schema options
  const validCategoryValues = [
    'history', 'biography-autobiography', 'literature-fiction',
    'religion-spirituality', 'politics-social-science',
    'education-academia', 'business-economics', 'health-wellness',
    'children-young-adult', 'arts-culture'
  ]

  // Add new categories (only if they match valid options)
  for (const category of sanityMetadata.categories) {
    const normalized = category.toLowerCase().replace(/\s+/g, '-')

    // Try to match to valid options
    const match = validCategoryValues.find(valid =>
      normalized.includes(valid.split('-')[0]) || valid.includes(normalized)
    )

    if (match && !existingCategories.has(match)) {
      existingCategories.add(match)
      categoriesAdded++
    }
  }

  // Add subjects (tags from Sanity go to subjects)
  for (const tag of sanityMetadata.tags) {
    if (!existingSubjects.has(tag)) {
      existingSubjects.add(tag)
      subjectsAdded++
    }
  }

  // Also add non-matching categories as subjects
  for (const category of sanityMetadata.categories) {
    const normalized = category.toLowerCase().replace(/\s+/g, '-')
    const match = validCategoryValues.find(valid =>
      normalized.includes(valid.split('-')[0]) || valid.includes(normalized)
    )

    if (!match && !existingSubjects.has(category)) {
      existingSubjects.add(category)
      subjectsAdded++
    }
  }

  const hasChanges = categoriesAdded > 0 || subjectsAdded > 0

  return {
    categories: Array.from(existingCategories),
    subjects: Array.from(existingSubjects).map(subject => ({ subject })),
    hasChanges,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : undefined

  console.log('🔄 Sanity → Payload Metadata Merge\n')
  if (dryRun) console.log('⚠️  DRY RUN MODE - No changes will be made\n')

  const stats: MergeStats = {
    sanityBooksTotal: 0,
    sanityBooksWithISBN: 0,
    payloadBooksTotal: 0,
    booksMatched: 0,
    booksUpdated: 0,
    booksSkipped: 0,
    categoriesAdded: 0,
    tagsAdded: 0,
    errors: [],
  }

  // Step 1: Export from Sanity
  const sanityClient = createSanityClient()
  const sanityBooks = await exportSanityBooks(sanityClient)
  stats.sanityBooksTotal = sanityBooks.length

  // Step 2: Create ISBN lookup map
  console.log('🗂️  Creating ISBN → Sanity metadata lookup...\n')
  const sanityLookup = createSanityLookup(sanityBooks)
  stats.sanityBooksWithISBN = sanityLookup.size
  console.log(`✅ Indexed ${sanityLookup.size} unique ISBNs from Sanity\n`)

  // Save Sanity data for reference
  const sanityExportPath = path.join(__dirname, '../data/sanity-books-export.json')
  fs.writeFileSync(sanityExportPath, JSON.stringify(sanityBooks, null, 2))
  console.log(`💾 Saved Sanity export to: ${sanityExportPath}\n`)

  // Step 3: Load Payload books
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  console.log('📚 Fetching books from Payload...\n')
  const { docs: payloadBooks, totalDocs } = await payload.find({
    collection: 'books',
    limit: limit || 10000,
    depth: 1,
  })
  stats.payloadBooksTotal = totalDocs
  console.log(`✅ Found ${payloadBooks.length} books in Payload\n`)

  // Step 4: Match and merge
  console.log('🔄 Matching and merging metadata...\n')
  const startTime = Date.now()

  for (let i = 0; i < payloadBooks.length; i++) {
    const book = payloadBooks[i]

    try {
      // Find matching Sanity data
      const sanityMetadata = findSanityMetadata(book, sanityLookup)

      if (!sanityMetadata) {
        stats.booksSkipped++
        continue
      }

      stats.booksMatched++

      // Merge metadata
      const merged = mergeMetadata(book, sanityMetadata)

      if (!merged.hasChanges) {
        console.log(`[${i + 1}/${payloadBooks.length}] ⏭️  ${book.title} - No new metadata`)
        stats.booksSkipped++
        continue
      }

      const categoriesAdded = merged.categories.length - (book.categories?.length || 0)
      const subjectsAdded = merged.subjects.length - (book.subjects?.length || 0)

      console.log(`[${i + 1}/${payloadBooks.length}] 🔄 ${book.title}`)
      console.log(`   ✓ Matched with Sanity`)
      console.log(`   ✓ Adding ${categoriesAdded} categories, ${subjectsAdded} subjects/tags`)

      if (!dryRun) {
        await payload.update({
          collection: 'books',
          id: book.id,
          data: {
            categories: merged.categories,
            subjects: merged.subjects,
          },
        })
        console.log(`   ✅ Updated`)
      } else {
        console.log(`   [DRY RUN] Would update`)
      }

      stats.booksUpdated++
      stats.categoriesAdded += categoriesAdded
      stats.tagsAdded += subjectsAdded

      // Progress update every 100 books
      if ((i + 1) % 100 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
        const rate = ((i + 1) / parseFloat(elapsed)).toFixed(1)
        console.log(`\n📊 Progress: ${i + 1}/${payloadBooks.length}`)
        console.log(`   Rate: ${rate} books/sec | Matched: ${stats.booksMatched} | Updated: ${stats.booksUpdated}\n`)
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`)
      stats.errors.push(`${book.title}: ${error.message}`)
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)

  // Print summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 MERGE SUMMARY')
  console.log('='.repeat(70))
  console.log(`\n⏱️  Performance:`)
  console.log(`├── Total time:     ${totalTime}s`)
  console.log(`└── Books/second:   ${(payloadBooks.length / parseFloat(totalTime)).toFixed(2)}`)
  console.log(`\n📊 Sanity Data:`)
  console.log(`├── Total books:    ${stats.sanityBooksTotal}`)
  console.log(`└── Books with ISBN: ${stats.sanityBooksWithISBN}`)
  console.log(`\n📚 Payload Books:`)
  console.log(`├── Total:          ${stats.payloadBooksTotal}`)
  console.log(`├── Matched:        ${stats.booksMatched}`)
  console.log(`├── Updated:        ${stats.booksUpdated}`)
  console.log(`└── Skipped:        ${stats.booksSkipped}`)
  console.log(`\n🏷️  Metadata Added:`)
  console.log(`├── Categories:     ${stats.categoriesAdded}`)
  console.log(`└── Tags:           ${stats.tagsAdded}`)

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors: ${stats.errors.length}`)
    stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`))
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more`)
    }
  }

  console.log('\n' + '='.repeat(70))

  if (dryRun) {
    console.log('\n✅ Dry run complete - no changes made')
    console.log('   Remove --dry-run to update Payload books')
  } else {
    console.log('\n✅ Merge complete!')
    console.log('\n📝 Next steps:')
    console.log('1. Review updated books: http://localhost:3000/admin/collections/books')
    console.log('2. Re-initialize search to index new metadata: tsx scripts/initialize-search.ts')
  }

  process.exit(0)
}

main().catch(error => {
  console.error('❌ Merge failed:', error)
  process.exit(1)
})
