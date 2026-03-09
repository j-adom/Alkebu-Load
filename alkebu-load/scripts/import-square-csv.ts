#!/usr/bin/env tsx

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { parse } from 'csv-parse/sync'
import fs from 'fs'
import path from 'path'
import { enrichProductFromIdentifiers } from '../src/app/utils/productEnrichment'

dotenv.config({ path: './.env' })

interface SquareCSVRow {
  'Token': string
  'Categories': string
  'Item Name': string
  'Description': string
  'SKU': string
  'Variation Name': string
  'Price': string
  'Current Quantity Alkebu-Lan Images': string
  'Archived': string
  'GTIN': string
  'Item Type': string
  'Sellable': string
}

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

const toCents = (priceStr: string): number => {
  const price = parseFloat(priceStr.replace(/[^0-9.-]+/g, ''))
  return Number.isFinite(price) ? Math.round(price * 100) : 0
}

/**
 * Check if a GTIN is a book identifier (ISBN-13 starting with 978 or 979)
 */
function isBookGTIN(gtin: string): boolean {
  if (!gtin) return false
  const cleanGtin = gtin.replace(/[-\s]/g, '')
  return /^97[89]\d{10}$/.test(cleanGtin)
}

/**
 * Group CSV rows by Item ID
 */
interface ProductGroup {
  itemId: string
  itemName: string
  description: string
  category: string
  variations: SquareCSVRow[]
}

function groupByItem(rows: SquareCSVRow[]): Map<string, ProductGroup> {
  const groups = new Map<string, ProductGroup>()

  for (const row of rows) {
    const itemId = row['Token']
    if (!itemId) continue

    // Only include items that have a valid ISBN-13 in GTIN or SKU
    const gtin = row['GTIN'] || row['SKU']
    if (!isBookGTIN(gtin)) continue

    const existing = groups.get(itemId)
    if (existing) {
      existing.variations.push(row)
    } else {
      groups.set(itemId, {
        itemId,
        itemName: row['Item Name'],
        description: row['Description'],
        category: row['Categories'],
        variations: [row],
      })
    }
  }

  return groups
}

/**
 * Check if product is a book based on category or GTIN
 */
async function checkIfBook(group: ProductGroup): Promise<{
  isBook: boolean
  enrichedData?: any
  gtin?: string
}> {
  // Check category first
  if (group.category?.toLowerCase().includes('book')) {
    console.log(`  ✓ Categorized as Book (Square category: "${group.category}")`)
    return { isBook: true }
  }

  // Check GTIN in any variation
  for (const variation of group.variations) {
    const gtin = variation.GTIN || variation.SKU
    if (gtin && isBookGTIN(gtin)) {
      console.log(`  ✓ Found book GTIN: ${gtin}`)

      // Try to enrich from book APIs
      try {
        const identifier = { type: 'isbn13' as const, value: gtin.replace(/[-\s]/g, '') }
        const enrichedData = await enrichProductFromIdentifiers(identifier)

        if (enrichedData && enrichedData.title) {
          console.log(`  ✓ Confirmed as book: "${enrichedData.title}"`)
          return { isBook: true, enrichedData, gtin }
        }
      } catch (error) {
        console.log('  → Book verification skipped:', error instanceof Error ? error.message : 'Unknown error')
      }

      // Even if enrichment fails, GTIN suggests it's a book
      return { isBook: true, gtin }
    }
  }

  return { isBook: false }
}

/**
 * Build book data from CSV group
 */
function buildBookData(group: ProductGroup, enrichedData?: any) {
  const now = new Date().toISOString()

  const editions = group.variations.map((variation) => {
    const stockLevel = Math.max(0, parseInt(variation['Current Quantity Alkebu-Lan Images']) || 0)
    const gtin = variation.GTIN || variation.SKU
    const variationName = (variation['Variation Name'] || '').toLowerCase()
    let binding: 'hardcover' | 'paperback' | 'mass-market' | 'ebook' | 'audiobook' = 'paperback'
    if (variationName.includes('hard')) binding = 'hardcover'
    else if (variationName.includes('mass')) binding = 'mass-market'
    else if (variationName.includes('ebook') || variationName.includes('digital')) binding = 'ebook'
    else if (variationName.includes('audio')) binding = 'audiobook'

    return {
      binding,
      isbn: gtin && isBookGTIN(gtin) ? gtin.replace(/[-\s]/g, '') : undefined,
      squareVariationId: variation['Token'],
      pricing: {
        retailPrice: toCents(variation.Price),
      },
      inventory: {
        stockLevel,
        allowBackorders: false,
      },
      isAvailable: stockLevel > 0 && variation.Archived?.toLowerCase() !== 'y' && variation.Sellable?.toLowerCase() === 'y',
    }
  })

  const totalStock = editions.reduce(
    (sum, edition) => sum + (edition.inventory?.stockLevel || 0),
    0,
  )

  const primaryPrice =
    editions.find((edition) => (edition.pricing?.retailPrice ?? 0) > 0)?.pricing?.retailPrice ?? 0

  // Use enriched data if available, otherwise use Square data
  const title = enrichedData?.title || group.itemName || 'Untitled'
  const description = enrichedData?.description || group.description

  const bookData: any = {
    title,
    description: toLexical(description),
    squareItemId: group.itemId,
    importSource: 'csv-import',
    importDate: now,
    lastUpdated: now,
    isActive: group.variations.some(v => v.Archived?.toLowerCase() !== 'y' && v.Sellable?.toLowerCase() === 'y'),
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
    editions,
  }

  // Add enriched fields if available
  if (enrichedData) {
    if (enrichedData.authors?.length) {
      bookData.authorNames = enrichedData.authors
    }
    if (enrichedData.publisher) {
      bookData.publisherName = enrichedData.publisher
    }
    if (enrichedData.publicationDate) {
      bookData.publicationDate = enrichedData.publicationDate
    }
    if (enrichedData.pageCount) {
      bookData.pageCount = enrichedData.pageCount
    }
    if (enrichedData.categories?.length) {
      bookData.genres = enrichedData.categories
    }
  }

  return bookData
}

async function importFromCSV(csvPath: string, skipExisting: boolean) {
  console.log('📚 Starting Square CSV → Payload import (Books only)\n')
  if (skipExisting) console.log('⚡ Mode: skip-existing (only creating new books)\n')
  console.log(`📂 Reading CSV file: ${csvPath}\n`)

  // Read and parse CSV
  const fileContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as SquareCSVRow[]

  console.log(`✅ Parsed ${records.length} rows from CSV\n`)

  // Group by Item ID
  const groups = groupByItem(records)
  console.log(`📦 Found ${groups.size} unique items with valid ISBN-13\n`)

  const payload = await getPayload({ config })

  let created = 0
  let updated = 0
  let skippedNotBooks = 0
  let skippedExisting = 0
  let skippedErrors = 0

  for (const [itemId, group] of groups) {
    console.log(`\n🔍 Processing: ${group.itemName}`)

    // Check if this is a book
    const bookCheck = await checkIfBook(group)

    if (!bookCheck.isBook) {
      console.log(`  ⏭️  Skipping - not a book`)
      skippedNotBooks++
      continue
    }

    try {
      // Check if already exists
      const existing = await payload.find({
        collection: 'books',
        where: { squareItemId: { equals: itemId } },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        if (skipExisting) {
          console.log(`  ⏭️  Already imported, skipping`)
          skippedExisting++
          continue
        }
        const bookData = buildBookData(group, bookCheck.enrichedData)
        await payload.update({
          collection: 'books',
          id: existing.docs[0].id,
          data: bookData,
        })
        console.log(`  ✅ Updated in Payload`)
        updated++
      } else {
        const bookData = buildBookData(group, bookCheck.enrichedData)
        await payload.create({
          collection: 'books',
          data: bookData,
        })
        console.log(`  ✅ Created in Payload`)
        created++
      }
    } catch (error) {
      console.error(`  ❌ Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`)
      skippedErrors++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Import completed.')
  console.log('='.repeat(60))
  console.log(`📊 Results:`)
  console.log(`├── Created:              ${created}`)
  console.log(`├── Updated:              ${updated}`)
  console.log(`├── Skipped (not books):  ${skippedNotBooks}`)
  console.log(`├── Skipped (existing):   ${skippedExisting}`)
  console.log(`└── Skipped (errors):     ${skippedErrors}`)
  console.log(`\n📝 Total items:           ${groups.size}`)
  console.log(`📚 Books imported:        ${created + updated}`)
}

// Get CSV path from command line or use default
const csvPath = process.argv[2] || path.join(__dirname, '../data/square-catalog.csv')
const skipExisting = process.argv.includes('--skip-existing')

importFromCSV(csvPath, skipExisting).catch((error) => {
  console.error('❌ Import failed:', error)
  process.exit(1)
})
