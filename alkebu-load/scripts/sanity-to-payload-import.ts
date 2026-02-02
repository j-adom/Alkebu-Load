#!/usr/bin/env tsx

/**
 * Sanity to Payload Migration Script
 *
 * This script imports data from Sanity JSON exports into Payload CMS.
 * It handles schema transformation and relationship mapping.
 *
 * Prerequisites:
 * 1. Run sanity-export.ts first to export data from Sanity
 * 2. Ensure Payload is running and configured
 * 3. Run: tsx scripts/sanity-to-payload-import.ts
 */

import dotenv from 'dotenv'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import fs from 'fs'
import path from 'path'
import type { SanityImageAsset } from '@sanity/image-url/lib/types/types'

dotenv.config({ path: './.env' })

// Portable Text to Lexical conversion
const portableTextToLexical = (portableText?: any) => {
  if (!portableText || !Array.isArray(portableText)) return undefined

  const children = portableText.map((block: any) => {
    if (block._type === 'block') {
      const textChildren = (block.children || []).map((child: any) => ({
        detail: 0,
        format: child.marks?.includes('strong') ? 1 : 0,
        mode: 'normal',
        style: '',
        text: child.text || '',
        type: 'text',
        version: 1,
      }))

      return {
        children: textChildren,
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      }
    }

    return null
  }).filter(Boolean)

  return {
    root: {
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

const textToLexical = (text?: string) => {
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

interface MigrationContext {
  payload: any
  authorMap: Map<string, string> // Sanity ID -> Payload ID
  publisherMap: Map<string, string>
  vendorMap: Map<string, string>
  genreMap: Map<string, string>
}

/**
 * Import Authors (from bookAuthor)
 */
async function importAuthors(sanityData: any[], ctx: MigrationContext) {
  console.log('\n📚 Importing Authors...')
  let created = 0
  let skipped = 0

  for (const sanityAuthor of sanityData) {
    try {
      // Check if already exists by name
      const existing = await ctx.payload.find({
        collection: 'authors',
        where: {
          name: {
            equals: sanityAuthor.name,
          },
        },
        limit: 1,
      })

      let payloadId: string

      if (existing.docs.length > 0) {
        payloadId = existing.docs[0].id
        skipped++
      } else {
        const payloadAuthor = {
          name: sanityAuthor.name,
          bio: portableTextToLexical(sanityAuthor.description),
        }

        const result = await ctx.payload.create({
          collection: 'authors',
          data: payloadAuthor,
        })

        payloadId = result.id
        created++
        console.log(`  ✅ Created: ${sanityAuthor.name}`)
      }

      // Map Sanity ID to Payload ID
      ctx.authorMap.set(sanityAuthor._id, payloadId)
    } catch (error) {
      console.error(`  ❌ Failed to import ${sanityAuthor.name}:`, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  console.log(`✅ Authors: ${created} created, ${skipped} skipped`)
}

/**
 * Import Publishers
 */
async function importPublishers(sanityData: any[], ctx: MigrationContext) {
  console.log('\n🏢 Importing Publishers...')
  let created = 0
  let skipped = 0

  for (const sanityPublisher of sanityData) {
    try {
      const existing = await ctx.payload.find({
        collection: 'publishers',
        where: {
          name: {
            equals: sanityPublisher.name,
          },
        },
        limit: 1,
      })

      let payloadId: string

      if (existing.docs.length > 0) {
        payloadId = existing.docs[0].id
        skipped++
      } else {
        const payloadPublisher = {
          name: sanityPublisher.name,
          description: portableTextToLexical(sanityPublisher.description),
          // TODO: Handle logo image migration
        }

        const result = await ctx.payload.create({
          collection: 'publishers',
          data: payloadPublisher,
        })

        payloadId = result.id
        created++
        console.log(`  ✅ Created: ${sanityPublisher.name}`)
      }

      ctx.publisherMap.set(sanityPublisher._id, payloadId)
    } catch (error) {
      console.error(`  ❌ Failed to import ${sanityPublisher.name}:`, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  console.log(`✅ Publishers: ${created} created, ${skipped} skipped`)
}

/**
 * Import Vendors
 */
async function importVendors(sanityData: any[], ctx: MigrationContext) {
  console.log('\n🏪 Importing Vendors...')
  let created = 0
  let skipped = 0

  for (const sanityVendor of sanityData) {
    try {
      const existing = await ctx.payload.find({
        collection: 'vendors',
        where: {
          name: {
            equals: sanityVendor.title,
          },
        },
        limit: 1,
      })

      let payloadId: string

      if (existing.docs.length > 0) {
        payloadId = existing.docs[0].id
        skipped++
      } else {
        const payloadVendor = {
          name: sanityVendor.title,
          description: portableTextToLexical(sanityVendor.description),
          // TODO: Handle logo image migration
        }

        const result = await ctx.payload.create({
          collection: 'vendors',
          data: payloadVendor,
        })

        payloadId = result.id
        created++
        console.log(`  ✅ Created: ${sanityVendor.title}`)
      }

      ctx.vendorMap.set(sanityVendor._id, payloadId)
    } catch (error) {
      console.error(`  ❌ Failed to import ${sanityVendor.title}:`, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  console.log(`✅ Vendors: ${created} created, ${skipped} skipped`)
}

/**
 * Import Books
 */
async function importBooks(sanityData: any[], ctx: MigrationContext) {
  console.log('\n📖 Importing Books...')
  let created = 0
  let updated = 0
  let skipped = 0

  for (const sanityBook of sanityData) {
    try {
      console.log(`\n  Processing: ${sanityBook.title}`)

      // Map authors
      const authorIds = sanityBook.authors
        ?.map((ref: any) => ctx.authorMap.get(ref._ref))
        .filter(Boolean) || []

      // Map vendor
      const vendorId = sanityBook.vendor?._ref
        ? ctx.vendorMap.get(sanityBook.vendor._ref)
        : undefined

      // Build editions from variants
      const editions = []

      // Add default variant
      if (sanityBook.defaultBookVariant) {
        const variant = sanityBook.defaultBookVariant
        const publisherId = variant.publisher?._ref
          ? ctx.publisherMap.get(variant.publisher._ref)
          : undefined

        editions.push({
          binding: variant.binding || 'Paperback',
          isbn13: variant.isbn,
          pricing: {
            retailPrice: toCents(variant.price),
          },
          inventory: {
            stockLevel: variant.stocklevel || 0,
            allowBackorders: false,
          },
          isAvailable: variant.instock ?? true,
          isFeatured: variant.featured ?? false,
          publisher: publisherId,
          publicationDate: variant.publishedDate,
          pageCount: variant.pagecount,
          weight: variant.weight ? Math.round(variant.weight * 16) : undefined, // lbs to oz
          // TODO: Handle images
        })
      }

      // Add other variants
      if (sanityBook.variants) {
        for (const variant of sanityBook.variants) {
          const publisherId = variant.publisher?._ref
            ? ctx.publisherMap.get(variant.publisher._ref)
            : undefined

          editions.push({
            binding: variant.binding || 'Paperback',
            isbn13: variant.isbn,
            pricing: {
              retailPrice: toCents(variant.price),
            },
            inventory: {
              stockLevel: variant.stocklevel || 0,
              allowBackorders: false,
            },
            isAvailable: variant.instock ?? true,
            isFeatured: variant.featured ?? false,
            publisher: publisherId,
            publicationDate: variant.publishedDate,
            pageCount: variant.pagecount,
            weight: variant.weight ? Math.round(variant.weight * 16) : undefined,
          })
        }
      }

      const now = new Date().toISOString()
      const primaryPrice = editions.find(e => e.pricing?.retailPrice > 0)?.pricing?.retailPrice || 0
      const totalStock = editions.reduce((sum, e) => sum + (e.inventory?.stockLevel || 0), 0)

      const payloadBook = {
        title: sanityBook.title,
        subtitle: sanityBook.subtitle,
        description: textToLexical(sanityBook.description),
        authors: authorIds,
        editions,
        importSource: 'sanity-migration',
        importDate: now,
        lastUpdated: now,
        isActive: true,
        pricing: {
          retailPrice: primaryPrice,
          requiresShipping: true,
          shippingWeight: editions[0]?.weight || 16,
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
        seo: {
          metaTitle: sanityBook.title,
          metaDescription: sanityBook.description?.substring(0, 160),
        },
      }

      // Check if exists by title
      const existing = await ctx.payload.find({
        collection: 'books',
        where: {
          title: {
            equals: sanityBook.title,
          },
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        await ctx.payload.update({
          collection: 'books',
          id: existing.docs[0].id,
          data: payloadBook,
        })
        console.log(`  ✅ Updated: ${sanityBook.title}`)
        updated++
      } else {
        await ctx.payload.create({
          collection: 'books',
          data: payloadBook,
        })
        console.log(`  ✅ Created: ${sanityBook.title}`)
        created++
      }
    } catch (error) {
      console.error(`  ❌ Failed to import ${sanityBook.title}:`, error instanceof Error ? error.message : 'Unknown error')
      skipped++
    }
  }

  console.log(`\n✅ Books: ${created} created, ${updated} updated, ${skipped} skipped`)
}

/**
 * Import Blog Posts
 */
async function importBlogPosts(sanityData: any[], ctx: MigrationContext) {
  console.log('\n📝 Importing Blog Posts...')
  let created = 0
  let updated = 0
  let skipped = 0

  for (const sanityPost of sanityData) {
    try {
      console.log(`\n  Processing: ${sanityPost.title}`)

      // Map authors
      const authorIds = sanityPost.authors
        ?.map((ref: any) => {
          const authorRef = ref._ref || ref.author?._ref
          return ctx.authorMap.get(authorRef)
        })
        .filter(Boolean) || []

      const payloadPost = {
        title: sanityPost.title,
        content: portableTextToLexical(sanityPost.body),
        excerpt: portableTextToLexical(sanityPost.excerpt),
        publishedDate: sanityPost.publishedAt || new Date().toISOString(),
        authors: authorIds,
        tags: sanityPost.tags || [],
        status: sanityPost.publishedAt ? 'published' : 'draft',
        // TODO: Handle featured image
        // TODO: Handle categories
      }

      // Check if exists by title
      const existing = await ctx.payload.find({
        collection: 'blog-posts',
        where: {
          title: {
            equals: sanityPost.title,
          },
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        await ctx.payload.update({
          collection: 'blog-posts',
          id: existing.docs[0].id,
          data: payloadPost,
        })
        console.log(`  ✅ Updated: ${sanityPost.title}`)
        updated++
      } else {
        await ctx.payload.create({
          collection: 'blog-posts',
          data: payloadPost,
        })
        console.log(`  ✅ Created: ${sanityPost.title}`)
        created++
      }
    } catch (error) {
      console.error(`  ❌ Failed to import ${sanityPost.title}:`, error instanceof Error ? error.message : 'Unknown error')
      skipped++
    }
  }

  console.log(`\n✅ Blog Posts: ${created} created, ${updated} updated, ${skipped} skipped`)
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting Sanity → Payload migration...\n')

  const payload = await getPayload({ config })

  const ctx: MigrationContext = {
    payload,
    authorMap: new Map(),
    publisherMap: new Map(),
    vendorMap: new Map(),
    genreMap: new Map(),
  }

  // Load exported Sanity data
  const exportDir = path.join(__dirname, '../data/sanity-export')
  const allDataPath = path.join(exportDir, 'all-data.json')

  if (!fs.existsSync(allDataPath)) {
    throw new Error(`Export file not found: ${allDataPath}\nPlease run sanity-export.ts first.`)
  }

  console.log(`📂 Loading data from: ${allDataPath}\n`)
  const allData = JSON.parse(fs.readFileSync(allDataPath, 'utf-8'))

  // Import in dependency order
  if (allData.bookAuthor) {
    await importAuthors(allData.bookAuthor, ctx)
  }

  if (allData.publisher) {
    await importPublishers(allData.publisher, ctx)
  }

  if (allData.vendor) {
    await importVendors(allData.vendor, ctx)
  }

  if (allData.book) {
    await importBooks(allData.book, ctx)
  }

  if (allData.post) {
    await importBlogPosts(allData.post, ctx)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Migration completed!')
  console.log('='.repeat(60))
  console.log('\n💡 Next steps:')
  console.log('1. Review imported data in Payload admin')
  console.log('2. Migrate images (see docs/sanity-migration.md)')
  console.log('3. Run search index: tsx scripts/initialize-search.ts')
}

runMigration().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
