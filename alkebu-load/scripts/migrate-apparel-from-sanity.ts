#!/usr/bin/env tsx

/**
 * Migrate Sanity Apparel to Payload FashionJewelry Collection
 *
 * This script migrates apparel items from Sanity CMS (apparel type with defaultApparelVariant)
 * to Payload's FashionJewelry collection. It handles the transformation of:
 * - Colors and sizes from nested arrays to product variations
 * - Image URLs from Sanity CDN to Cloudflare R2
 * - Tags and categorization
 * - Vendor/brand relationships
 */

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import https from 'https'
import http from 'http'
import crypto from 'crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
const envPath = path.resolve(__dirname, '../.env')
dotenv.config({ path: envPath })

// Verify required environment variables
if (!process.env.PAYLOAD_SECRET) {
  console.error('❌ PAYLOAD_SECRET not found in environment')
  process.exit(1)
}

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || ''
const R2_BUCKET = process.env.R2_BUCKET || ''
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || ''
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '')
// Accept either R2_PUBLIC_BASE_URL or the older R2_PUBLIC_URL_BASE naming
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_URL_BASE || ''

// Optional R2 configuration for dry-run mode
const REQUIRE_R2 = !process.argv.includes('--dry-run')

if (REQUIRE_R2 && (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_ENDPOINT)) {
  console.error('❌ Cloudflare R2 environment variables required for image migration.')
  console.error('   Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_ACCOUNT_ID')
  console.error('   Or run with --dry-run to skip image uploads')
  process.exit(1)
}

const r2Client = REQUIRE_R2 ? new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
}) : null

// Types
interface SanityApparelImage {
  _key: string
  alt: string
  caption?: string
  asset: {
    _id: string
    url: string
    metadata?: any
  }
}

interface SanityApparelColor {
  _key: string
  color: string
  images: SanityApparelImage[]
}

interface SanityApparelSize {
  _key: string
  title: string
}

interface SanityApparelVariant {
  style?: string
  grams?: number
  instock?: boolean
  featured?: boolean
  upCharge?: number
  colors: SanityApparelColor[]
  sizes: SanityApparelSize[]
}

interface SanityApparel {
  _id: string
  _type: string
  _createdAt: string
  _updatedAt: string
  title: string
  slug: {
    current: string
  }
  description?: string
  price?: number
  apparelType?: Array<{
    _id: string
    title: string
    slug: { current: string }
  }>
  defaultApparelVariant?: SanityApparelVariant
  tags?: Array<{
    label: string
    value: string
  }>
  vendor?: {
    _id: string
    title: string
    slug: { current: string }
  }
  brand?: {
    _id: string
    title: string
    slug: { current: string }
  }
  collection?: Array<{
    _id: string
    title: string
    slug: { current: string }
  }>
}

interface MigrationStats {
  total: number
  processed: number
  created: number
  updated: number
  skipped: number
  errors: number
  imagesUploaded: number
  warnings: string[]
}

// Helper functions
function generateSKU(title: string, color: string, size: string): string {
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 20)

  const cleanColor = color
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .substring(0, 3)

  const cleanSize = size
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

  return `${cleanTitle}-${cleanColor}-${cleanSize}`.toUpperCase()
}

function mapSize(sanitySize: string): string {
  const size = sanitySize.toLowerCase().trim()

  const sizeMap: { [key: string]: string } = {
    'xs': 'xs',
    'extra small': 'xs',
    's': 's',
    'small': 's',
    'm': 'm',
    'medium': 'm',
    'l': 'l',
    'large': 'l',
    'xl': 'xl',
    'extra large': 'xl',
    '2xl': '2xl',
    'xxl': '2xl',
    '3xl': '3xl',
    'xxxl': '3xl',
    '4xl': '4xl',
  }

  return sizeMap[size] || size
}

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`))
        return
      }
      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
      response.on('error', reject)
    }).on('error', reject)
  })
}

async function convertToWebP(inputBuffer: Buffer): Promise<Buffer> {
  return sharp(inputBuffer)
    .webp({ quality: 85, effort: 6 })
    .resize({
      width: 1600,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer()
}

function buildR2ObjectKey(filename: string, sku: string): string {
  const safeSku = sku
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40)
  return `fashion/${safeSku}/${filename}`
}

async function uploadToR2(buffer: Buffer, key: string): Promise<string> {
  if (!r2Client) {
    throw new Error('R2 client not initialized')
  }

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/webp',
    })
  )

  if (R2_PUBLIC_BASE_URL) {
    const normalizedBase = R2_PUBLIC_BASE_URL.endsWith('/')
      ? R2_PUBLIC_BASE_URL.slice(0, -1)
      : R2_PUBLIC_BASE_URL
    return `${normalizedBase}/${key}`
  }

  if (R2_ACCOUNT_ID) {
    return `https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`
  }

  return `${R2_ENDPOINT.replace(/\/$/, '')}/${R2_BUCKET}/${key}`
}

function generateFilename(identifier: string, index: number): string {
  const safeIdentifier = identifier
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40)
  const suffix = index > 0 ? `-${index + 1}` : ''
  const base = safeIdentifier || crypto.randomBytes(6).toString('hex')
  return `${base}${suffix}.webp`
}

function textToLexical(text?: string) {
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

async function transformApparel(
  apparel: SanityApparel,
  stats: MigrationStats,
  options: { dryRun: boolean; payload: any }
): Promise<any | null> {
  // Validate required fields
  if (!apparel.title) {
    stats.warnings.push(`Skipping apparel without title: ${apparel._id}`)
    return null
  }

  if (!apparel.defaultApparelVariant) {
    stats.warnings.push(`Skipping apparel without variants: ${apparel.title}`)
    return null
  }

  const variant = apparel.defaultApparelVariant

  if (!variant.colors || variant.colors.length === 0) {
    stats.warnings.push(`Skipping apparel without colors: ${apparel.title}`)
    return null
  }

  if (!variant.sizes || variant.sizes.length === 0) {
    stats.warnings.push(`Skipping apparel without sizes: ${apparel.title}`)
    return null
  }

  // Determine primary type (all these are t-shirts based on the data)
  const primaryType = 'clothing-design'

  // Map apparel type
  const apparelTypes = apparel.apparelType || []
  const firstType = apparelTypes[0]?.title?.toLowerCase() || ''
  let productType = 't-shirt'

  if (firstType.includes('hoodie')) productType = 'hoodie'
  else if (firstType.includes('sweatshirt')) productType = 'sweatshirt'
  else if (firstType.includes('tank')) productType = 'tank-top'

  // Extract unique colors and sizes
  const availableColors = variant.colors.map(c => ({
    colorName: c.color,
    colorCode: undefined // Sanity doesn't store hex codes in this schema
  }))

  const availableSizes = variant.sizes.map(s => mapSize(s.title))

  // Generate all variations (color × size combinations)
  const variations = []
  for (const color of variant.colors) {
    for (const size of variant.sizes) {
      const sku = generateSKU(apparel.title, color.color, size.title)
      variations.push({
        sku,
        productType,
        size: mapSize(size.title),
        color: color.color,
        isAvailable: variant.instock !== false,
      })
    }
  }

  // Handle images - collect from all color variations and create Media records
  const imageUrls: string[] = []
  const mediaIds: Array<{ image: string | number; alt: string; isPrimary: boolean; showsVariation?: string }> = []
  let imageIndex = 0

  for (const color of variant.colors) {
    if (!color.images || color.images.length === 0) continue

    for (const image of color.images) {
      if (imageUrls.length >= 8) break // Max 8 images per product

      const sourceUrl = image.asset?.url
      if (!sourceUrl) continue

      if (options.dryRun) {
        console.log(`      [DRY RUN] Would upload ${sourceUrl}`)
        imageUrls.push(sourceUrl)
        imageIndex++
        continue
      }

      try {
        const dimensions = image.asset?.metadata?.dimensions || { width: 1600, height: 1600 }
        const originalBuffer = await downloadImage(sourceUrl)
        const webpBuffer = await convertToWebP(originalBuffer)
        const filename = generateFilename(apparel.slug.current, imageIndex)
        const primarySKU = variations[0]?.sku || 'unknown'
        const key = buildR2ObjectKey(filename, primarySKU)
        const r2Url = await uploadToR2(webpBuffer, key)
        imageUrls.push(r2Url)
        stats.imagesUploaded++

        // Create Media record in Payload with the R2 URL
        // Payload will recognize this as an external URL and store it as-is
        const altText = image.alt || `${apparel.title} - ${color.color}`
        const mediaRecord = await options.payload.create({
          collection: 'media',
          data: {
            alt: altText,
            url: r2Url,
            mimeType: 'image/webp',
            fileSize: webpBuffer.length,
            r2ObjectKey: key,
            dimensions: {
              width: dimensions.width,
              height: dimensions.height,
            },
          },
        })

        // Add to images array for FashionJewelry
        mediaIds.push({
          image: mediaRecord.id,
          alt: altText,
          isPrimary: imageIndex === 0, // First image is primary
          showsVariation: `${color.color}`,
        })

        imageIndex++
      } catch (error) {
        stats.warnings.push(`Failed to upload image for ${apparel.title}: ${error}`)
      }
    }
  }

  // Extract tags
  const tags = (apparel.tags || []).map(t => ({ tag: t.label || t.value }))

  // Build categories based on tags and type
  const categories: string[] = ['clothing']
  const tagValues = (apparel.tags || []).map(t => t.value?.toLowerCase() || '')

  if (tagValues.includes('history')) categories.push('cultural-wear')
  if (tagValues.includes('slogan')) categories.push('activist-wear')
  if (apparel.title.toLowerCase().includes('black')) categories.push('activist-wear')

  // Determine style
  let style = 'screen-printed'
  if (apparel.title.toLowerCase().includes('black lives matter')) style = 'activist-message'

  // Generate slug from title
  const slug = apparel.slug?.current || apparel.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Calculate base price (use apparel.price or default)
  const basePrice = apparel.price || 25.00;

  // Build the Payload document
  const document = {
    name: apparel.title,
    slug,
    price: basePrice,
    primaryType,
    style,
    description: textToLexical(apparel.description),
    shortDescription: apparel.description?.substring(0, 200),
    availableProductTypes: [productType],
    availableColors,
    availableSizes,
    variations,
    categories,
    tags,
    brand: apparel.brand?.title || apparel.vendor?.title,
    images: mediaIds, // Link to Media collection
    scrapedImageUrls: imageUrls.map(url => ({ url })), // Keep for backup/reference
    printDetails: {
      message: apparel.title,
      printLocation: ['front'] as const,
    },
    targetAudience: ['unisex'] as const,
    importSource: 'artisan-direct' as const,
    importDate: new Date().toISOString(),
    isActive: variant.instock !== false,
    isFeatured: variant.featured || false,
  }

  return { document, primarySku: variations[0]?.sku || slug }
}

async function migrateApparel() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : undefined

  console.log('🚀 Starting Sanity apparel migration to Payload...\n')
  if (dryRun) {
    console.log('⚠️  Running in DRY RUN mode - no database writes or R2 uploads\n')
  }

  // Load data
  const dataPath = path.join(__dirname, '../data/sanity-apparel-export.json')
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Sanity export file not found: ${dataPath}`)
  }

  let apparelItems: SanityApparel[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  if (limit) {
    apparelItems = apparelItems.slice(0, limit)
  }
  console.log(`📥 Loaded ${apparelItems.length} apparel items from Sanity export`)

  // Initialize Payload
  console.log('🔧 Initializing Payload...')
  const { getPayload } = await import('payload')
  const { default: payloadConfig } = await import('../src/payload.config.js')
  const payload = await getPayload({
    config: payloadConfig,
    // @ts-expect-error payload types mismatch
    secret: process.env.PAYLOAD_SECRET,
  })
  console.log('✅ Payload initialized\n')

  const stats: MigrationStats = {
    total: apparelItems.length,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    imagesUploaded: 0,
    warnings: [],
  }

  // Process each apparel item
  for (const apparel of apparelItems) {
    stats.processed++
    console.log(`\n👕 Processing: ${apparel.title || apparel._id}`)

    try {
      const transformed = await transformApparel(apparel, stats, { dryRun, payload })
      if (!transformed) {
        stats.skipped++
        continue
      }

      const { document, primarySku } = transformed

      if (dryRun) {
        console.log(`   [DRY RUN] Would upsert: ${document.name}`)
        console.log(`   [DRY RUN] SKU: ${primarySku}`)
        console.log(`   [DRY RUN] Variations: ${document.variations.length}`)
        console.log(`   [DRY RUN] Images: ${document.scrapedImageUrls.length}`)
        continue
      }

      // Check if product already exists (by slug)
      let existingId: string | number | null = null
      if (document.slug) {
        const existing = await payload.find({
          collection: 'fashion-jewelry',
          limit: 1,
          where: {
            slug: {
              equals: document.slug,
            },
          },
        })
        if (existing.docs.length > 0) {
          existingId = existing.docs[0].id
        }
      }

      if (existingId) {
        await payload.update({
          collection: 'fashion-jewelry',
          id: existingId,
          data: document as any,
        })
        console.log(`   🔄 Updated: ${existingId}`)
        stats.updated++
      } else {
        const created = await payload.create({
          collection: 'fashion-jewelry',
          data: document as any,
        })
        console.log(`   ✅ Created: ${created.id}`)
        stats.created++
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error}`)
      stats.errors++
      stats.warnings.push(`Error processing ${apparel.title}: ${error}`)
    }
  }

  // Save results
  const summaryPath = path.join(__dirname, '../data/apparel-migration-results.json')
  const summary = {
    total: stats.total,
    processed: stats.processed,
    created: stats.created,
    updated: stats.updated,
    skipped: stats.skipped,
    errors: stats.errors,
    imagesUploaded: stats.imagesUploaded,
    warnings: stats.warnings,
  }
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log(dryRun ? '✅ Dry run completed!' : '✅ Migration completed!')
  console.log('='.repeat(60))
  console.log(`📊 Total:            ${stats.total}`)
  console.log(`📦 Processed:        ${stats.processed}`)
  if (!dryRun) {
    console.log(`✅ Created:          ${stats.created}`)
    console.log(`🔄 Updated:          ${stats.updated}`)
    console.log(`🖼️  Images uploaded:  ${stats.imagesUploaded}`)
  }
  console.log(`⏭️  Skipped:          ${stats.skipped}`)
  console.log(`❌ Errors:           ${stats.errors}`)
  console.log(`📂 Summary:          ${summaryPath}`)

  if (stats.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${stats.warnings.length}):`)
    stats.warnings.slice(0, 10).forEach(w => console.log(`   - ${w}`))
    if (stats.warnings.length > 10) {
      console.log(`   ... and ${stats.warnings.length - 10} more (see ${summaryPath})`)
    }
  }

  process.exit(0)
}

// Run migration
migrateApparel().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
