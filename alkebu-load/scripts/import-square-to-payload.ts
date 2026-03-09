#!/usr/bin/env tsx

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import {
  syncSquareToPayload,
  type PayloadProduct,
} from './square-payload-sync'
import { enrichProductFromIdentifiers } from '../src/app/utils/productEnrichment'

dotenv.config({ path: './.env' })

interface SquareProductGroup {
  base: PayloadProduct
  variations: PayloadProduct[]
}

interface CategoryCheckResult {
  isBook: boolean
  squareCategory?: string
  gtin?: string
  enrichedData?: any
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

const toCents = (value?: number) =>
  Number.isFinite(value) ? Math.round((value ?? 0) * 100) : 0

/**
 * Check if a GTIN is a book identifier (ISBN-13 starting with 978 or 979)
 */
function isBookGTIN(gtin: string): boolean {
  const cleanGtin = gtin.replace(/[-\s]/g, '')
  // ISBN-13 starts with 978 or 979
  return /^97[89]\d{10}$/.test(cleanGtin)
}

/**
 * Extract GTIN/UPC from product variations
 */
function extractGTIN(product: PayloadProduct): string | undefined {
  // Check UPC field first
  if (product.upc) {
    const cleanGtin = product.upc.replace(/[-\s]/g, '')
    if (/^\d{13}$/.test(cleanGtin)) {
      return cleanGtin
    }
  }

  // Check SKU field as fallback
  if (product.sku) {
    const cleanGtin = product.sku.replace(/[-\s]/g, '')
    if (/^\d{13}$/.test(cleanGtin)) {
      return cleanGtin
    }
  }

  return undefined
}

/**
 * Determine if a Square product should be categorized as a book
 * 1. If Square category is "Books" → Book
 * 2. If no category or other category, check for 13-digit GTIN starting with 978/979
 * 3. If GTIN found, attempt to enrich from book APIs to confirm
 */
async function checkIfBook(product: PayloadProduct, squareCategories: Map<string, any>): Promise<CategoryCheckResult> {
  const result: CategoryCheckResult = {
    isBook: false,
    squareCategory: product.categoryId
  }

  // Step 1: Check Square category
  if (product.categoryId) {
    const category = squareCategories.get(product.categoryId)
    const categoryName = category?.categoryData?.name?.toLowerCase() || ''

    result.squareCategory = categoryName

    if (categoryName.includes('book')) {
      result.isBook = true
      console.log(`  ✓ Categorized as Book (Square category: "${categoryName}")`)
      return result
    }

    console.log(`  → Square category: "${categoryName}" (not book)`)
  } else {
    console.log('  → No Square category assigned')
  }

  // Step 2: Check for book GTIN (ISBN-13)
  const gtin = extractGTIN(product)

  if (gtin && isBookGTIN(gtin)) {
    result.gtin = gtin
    console.log(`  ✓ Found book GTIN: ${gtin}`)

    // Step 3: Attempt to enrich from book APIs to confirm it's a book
    try {
      console.log('  → Attempting to verify as book via external APIs...')
      const identifier = { type: 'isbn13' as const, value: gtin }
      const enrichedData = await enrichProductFromIdentifiers(identifier)

      if (enrichedData && enrichedData.title) {
        result.isBook = true
        result.enrichedData = enrichedData
        console.log(`  ✓ Confirmed as book: "${enrichedData.title}"`)
        return result
      } else {
        console.log('  ✗ GTIN lookup failed - not a book or API unavailable')
      }
    } catch (error) {
      console.log('  ✗ Book verification failed:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  return result
}

function groupBySquareItem(products: PayloadProduct[]): Map<string, SquareProductGroup> {
  const grouped = new Map<string, SquareProductGroup>()

  for (const product of products) {
    if (!product.squareItemId) continue

    const existing = grouped.get(product.squareItemId)

    if (existing) {
      if (!existing.base.description && product.description) {
        existing.base.description = product.description
      }
      existing.variations.push(product)
    } else {
      grouped.set(product.squareItemId, {
        base: product,
        variations: [product],
      })
    }
  }

  return grouped
}

function buildBookData(group: SquareProductGroup) {
  const { base, variations } = group
  if (!variations.length) return null

  const now = new Date().toISOString()

  const editions = variations.map((variation) => {
    const stockLevel = Math.max(
      0,
      Number(variation.inventory?.quantity ?? 0),
    )

    return {
      binding: variation.variationName || base.variationName || 'Standard Edition',
      isbn13: variation.upc || variation.sku || undefined,
      squareVariationId: variation.squareVariationId,
      pricing: {
        retailPrice: toCents(variation.price || base.price),
      },
      inventory: {
        stockLevel,
        allowBackorders: false,
      },
      isAvailable: stockLevel > 0,
    }
  })

  const totalStock = editions.reduce(
    (sum, edition) => sum + (edition.inventory?.stockLevel || 0),
    0,
  )

  const primaryPrice =
    editions.find((edition) => (edition.pricing?.retailPrice ?? 0) > 0)?.pricing
      ?.retailPrice ?? toCents(base.price)

  return {
    title: base.title || 'Square Product',
    description: toLexical(base.description),
    squareItemId: base.squareItemId,
    importSource: 'square-webhook',
    importDate: now,
    lastUpdated: now,
    isActive: base.isActive ?? true,
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
}

async function importSquareProducts() {
  console.log('🚀 Starting Square → Payload import (Books only)…\n')

  const payload = await getPayload({ config })

  // Fetch Square products and categories
  console.log('📦 Fetching Square catalog...')
  const squareProducts = await syncSquareToPayload()

  // Fetch Square categories for categorization
  const { SquareClient } = await import('square')
  const squareClient = new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN!
  })

  console.log('📂 Fetching Square categories...')
  const categoriesMap = new Map<string, any>()

  try {
    const catalogPage = await squareClient.catalog.list({
      types: 'CATEGORY'
    })

    if (catalogPage.data.length) {
      for (const category of catalogPage.data) {
        if (category.id) {
          categoriesMap.set(category.id, category)
        }
      }
      console.log(`✅ Found ${categoriesMap.size} Square categories\n`)
    }
  } catch (error) {
    console.warn('⚠️ Could not fetch Square categories:', error instanceof Error ? error.message : 'Unknown error')
  }

  let groupedProducts = groupBySquareItem(squareProducts)

  const totalItems = groupedProducts.size
  const importLimit = process.env.SQUARE_IMPORT_LIMIT
    ? Number.parseInt(process.env.SQUARE_IMPORT_LIMIT, 10)
    : 0

  if (importLimit > 0 && totalItems > importLimit) {
    console.log(`🔢 Limiting import to first ${importLimit} Square items (of ${totalItems} total)`)
    const limited = new Map<string, SquareProductGroup>()
    const keys = Array.from(groupedProducts.keys()).slice(0, importLimit)
    for (const key of keys) {
      const group = groupedProducts.get(key)
      if (group) {
        limited.set(key, group)
      }
    }
    groupedProducts = limited
  }

  let created = 0
  let updated = 0
  let skippedNotBooks = 0
  let skippedErrors = 0

  for (const [squareItemId, group] of groupedProducts) {
    console.log(`\n🔍 Processing: ${group.base.title}`)

    // Check if this product is a book
    const categoryCheck = await checkIfBook(group.base, categoriesMap)

    if (!categoryCheck.isBook) {
      console.log(`  ⏭️  Skipping - not a book\n`)
      skippedNotBooks++
      continue
    }

    const bookData = buildBookData(group)

    if (!bookData) {
      console.log(`  ❌ Failed to build book data\n`)
      skippedErrors++
      continue
    }

    // If we have enriched data from the category check, merge it
    if (categoryCheck.enrichedData) {
      console.log('  📚 Merging enriched book data...')

      // Merge enriched data
      if (categoryCheck.enrichedData.title) {
        bookData.title = categoryCheck.enrichedData.title
      }
      if (categoryCheck.enrichedData.description) {
        bookData.description = toLexical(categoryCheck.enrichedData.description)
      }
      // Add more enriched fields as needed
    }

    try {
      const existing = await payload.find({
        collection: 'books',
        where: {
          squareItemId: {
            equals: squareItemId,
          },
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        await payload.update({
          collection: 'books',
          id: existing.docs[0].id,
          data: bookData,
        })
        console.log(`  ✅ Updated in Payload`)
        updated++
      } else {
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
  console.log(`├── Created:         ${created}`)
  console.log(`├── Updated:         ${updated}`)
  console.log(`├── Skipped (not books): ${skippedNotBooks}`)
  console.log(`└── Skipped (errors):    ${skippedErrors}`)
  console.log(`\n📝 Total processed:  ${groupedProducts.size}`)
  console.log(`📚 Books imported:   ${created + updated}`)
}

importSquareProducts().catch((error) => {
  console.error('❌ Import failed:', error)
  process.exit(1)
})
