#!/usr/bin/env tsx

/**
 * Migrate Apparel Data from Sanity to Payload
 *
 * Transforms Sanity product data into Payload FashionJewelry collection format
 * and imports it into the Payload database using the Local API
 */

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import https from 'https'
import http from 'http'
import crypto from 'crypto'
import imageUrlBuilder from '@sanity/image-url'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env from alkebu-load directory
const envPath = path.resolve(__dirname, '../.env')
dotenv.config({ path: envPath })

// Verify secret is loaded
if (!process.env.PAYLOAD_SECRET) {
  console.error('❌ PAYLOAD_SECRET not found in environment')
  console.error(`   Tried loading from: ${envPath}`)
  process.exit(1)
}

const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || ''
const SANITY_DATASET = process.env.SANITY_DATASET || ''
const SANITY_TOKEN = process.env.SANITY_TOKEN || ''

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || ''
const R2_BUCKET = process.env.R2_BUCKET || ''
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || ''
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '')
// Accept either R2_PUBLIC_BASE_URL or the older R2_PUBLIC_URL_BASE naming
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_URL_BASE || ''

if (!SANITY_PROJECT_ID || !SANITY_DATASET) {
  console.error('❌ SANITY_PROJECT_ID and SANITY_DATASET must be configured to fetch apparel images from Sanity.')
  process.exit(1)
}

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_ENDPOINT) {
  console.error('❌ Cloudflare R2 environment variables (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ACCOUNT_ID/R2_ENDPOINT) must be configured.')
  process.exit(1)
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

const sanityImageBuilder = imageUrlBuilder({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  token: SANITY_TOKEN || undefined,
})

// Import payload after env is loaded
interface SanityProduct {
  _id: string
  _type: string
  _createdAt: string
  _updatedAt: string
  title: string | null
  slug: {
    _type: string
    current: string
  } | null
  productType: {
    _id: string
    title: string
    slug: {
      _type: string
      current: string
    }
  } | null
  defaultProductVariant: {
    title: string
    sku: string
    price: number | null
    taxable: boolean | null
    images: any[] | null
    color: {
      _id: string
      title: string
      value: string
    } | null
    size: {
      _id: string
      title: string
      value: string
    } | null
  } | null
  variants: Array<{
    title: string
    sku: string
    price: number | null
    taxable: boolean | null
    images: any[] | null
    color: {
      _id: string
      title: string
      value: string
    } | null
    size: {
      _id: string
      title: string
      value: string
    } | null
  }>
  tags: string[] | null
  vendor: {
    _id: string
    title: string
    slug: {
      _type: string
      current: string
    }
  } | null
  collections: Array<{
    _id: string
    title: string
    slug: {
      _type: string
      current: string
    }
  }> | null
  genres: any[] | null
}

interface PayloadFashionJewelry {
  name: string
  primaryType: 'clothing-design' | 'jewelry-piece' | 'fashion-accessory'
  style?: string
  description?: any
  shortDescription?: string
  availableProductTypes: string[]
  availableColors: Array<{
    colorName: string
    colorCode?: string
  }>
  availableSizes: string[]
  variations: Array<{
    sku: string
    productType: string
    size: string
    color: string
    customVariationName?: string
    isAvailable: boolean
  }>
  categories?: string[]
  tags?: Array<{ tag: string }>
  collections?: Array<{ collectionName: string }>
  importSource: 'manual' | 'square-import' | 'csv-import' | 'vendor-catalog' | 'artisan-direct'
  importDate: string
  isActive: boolean
  isFeatured: boolean
}

interface MigrationStats {
  total: number
  processed: number
  created: number
  updated: number
  skipped: number
  errors: number
  imagesUploaded: number
  unmappedFields: Set<string>
}

const MAX_IMAGES_PER_PRODUCT = 5

function recordUnmapped(stats: MigrationStats, field: string) {
  stats.unmappedFields.add(field)
}

function normalizeSkuRaw(value?: string | null) {
  if (!value) return undefined
  return String(value).trim()
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

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client
      .get(url, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode}: ${url}`))
          return
        }
        const chunks: Buffer[] = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => resolve(Buffer.concat(chunks)))
        response.on('error', reject)
      })
      .on('error', reject)
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
  return `fashion/${safeSku || 'product'}/${filename}`
}

async function uploadToR2(buffer: Buffer, key: string): Promise<string> {
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

function gatherSanityAssetRefs(product: SanityProduct): string[] {
  const refs = new Set<string>()

  const collectFromImages = (images: any[] | null | undefined) => {
    if (!images) return
    for (const image of images) {
      if (!image) continue
      if (typeof image === 'string') {
        refs.add(image)
      } else if (image.asset?._ref) {
        refs.add(image.asset._ref)
      }
    }
  }

  collectFromImages(product.defaultProductVariant?.images)
  collectFromImages(product.variants?.flatMap((variant) => variant.images || []))

  return Array.from(refs)
}

async function buildImageUrls(
  product: SanityProduct,
  sku: string,
  options: { dryRun: boolean },
  stats: MigrationStats
): Promise<string[]> {
  const assetRefs = gatherSanityAssetRefs(product)
  if (assetRefs.length === 0) {
    return []
  }

  const urls: string[] = []

  for (let i = 0; i < assetRefs.length && urls.length < MAX_IMAGES_PER_PRODUCT; i++) {
    const ref = assetRefs[i]
    let sourceUrl = ''

    try {
      sourceUrl = sanityImageBuilder.image(ref).width(1600).fit('max').url()
    } catch (error) {
      console.warn(`   ⚠️  Failed to build Sanity image URL for ${ref}:`, error)
      continue
    }

    if (!sourceUrl) continue

    if (options.dryRun) {
      console.log(`      [DRY RUN] Would upload ${sourceUrl}`)
      urls.push(sourceUrl)
      continue
    }

    try {
      const originalBuffer = await downloadImage(sourceUrl)
      const webpBuffer = await convertToWebP(originalBuffer)
      const filename = generateFilename(sku, i)
      const key = buildR2ObjectKey(filename, sku)
      const r2Url = await uploadToR2(webpBuffer, key)
      urls.push(r2Url)
      stats.imagesUploaded++
    } catch (error) {
      console.error(`      ❌ Failed to upload image for SKU ${sku}:`, error)
      stats.errors++
    }
  }

  return urls
}
// Map Sanity product types to Payload primaryType
function mapPrimaryType(sanityType: string | null): 'clothing-design' | 'jewelry-piece' | 'fashion-accessory' {
  const type = (sanityType || '').toLowerCase()

  if (type.includes('clothing') || type.includes('apparel') || type.includes('shirt') || type.includes('hoodie')) {
    return 'clothing-design'
  }
  if (type.includes('jewelry') || type.includes('necklace') || type.includes('bracelet') || type.includes('ring')) {
    return 'jewelry-piece'
  }
  return 'fashion-accessory'
}

// Map Sanity product type to Payload availableProductTypes
function mapProductTypes(sanityType: string | null, title: string | null): string[] {
  const type = (sanityType || '').toLowerCase()
  const itemTitle = (title || '').toLowerCase()

  // Try to infer from title if type is unknown
  if (itemTitle.includes('shirt') || itemTitle.includes('tee') || type.includes('clothing')) {
    return ['t-shirt']
  }
  if (itemTitle.includes('hoodie')) {
    return ['hoodie']
  }
  if (itemTitle.includes('sweatshirt')) {
    return ['sweatshirt']
  }
  if (itemTitle.includes('tank')) {
    return ['tank-top']
  }
  if (itemTitle.includes('necklace')) {
    return ['necklace']
  }
  if (itemTitle.includes('bracelet')) {
    return ['bracelet']
  }
  if (itemTitle.includes('earring')) {
    return ['earrings']
  }
  if (itemTitle.includes('ring')) {
    return ['ring']
  }

  // Default to t-shirt for clothing, or fashion accessory
  return type.includes('clothing') ? ['t-shirt'] : ['bag']
}

// Map Sanity sizes to Payload size values
function mapSize(sanitySize: string | null): string {
  if (!sanitySize) return 'one-size'

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
    'one size': 'one-size',
    'onesize': 'one-size',
  }

  return sizeMap[size] || 'one-size'
}

// Transform Sanity product to Payload FashionJewelry format
async function transformProduct(
  sanityProduct: SanityProduct,
  stats: MigrationStats,
  options: { dryRun: boolean }
): Promise<{ document: PayloadFashionJewelry & { scrapedImageUrls?: Array<{ url: string }>; brand?: string }; primarySku: string } | null> {
  if (!sanityProduct.title) {
    console.log(`⏭️  Skipping product without title: ${sanityProduct._id}`)
    recordUnmapped(stats, 'title')
    return null
  }

  const baseVariant = sanityProduct.defaultProductVariant || sanityProduct.variants[0]
  if (!baseVariant) {
    console.log(`⏭️  Skipping product without variants: ${sanityProduct.title}`)
    recordUnmapped(stats, 'defaultProductVariant')
    return null
  }

  const primarySku = normalizeSkuRaw(baseVariant.sku || sanityProduct.slug?.current)
  if (!primarySku) {
    console.log(`⏭️  Skipping product without SKU: ${sanityProduct.title}`)
    recordUnmapped(stats, 'variant.sku')
    return null
  }

  if (baseVariant.price !== null && baseVariant.price !== undefined) {
    recordUnmapped(stats, 'defaultProductVariant.price')
  }

  const primaryType = mapPrimaryType(sanityProduct.productType?.title || null)
  const availableProductTypes = mapProductTypes(sanityProduct.productType?.title || null, sanityProduct.title)

  if (sanityProduct.productType?.slug?.current) {
    recordUnmapped(stats, 'productType.slug')
  }

  const colorMap = new Map<string, { colorName: string; colorCode?: string }>()
  const sizeSet = new Set<string>()
  const variationSkus = new Set<string>()
  const variations: PayloadFashionJewelry['variations'] = []

  const registerVariant = (variant: SanityProduct['defaultProductVariant'], index: number, isDefault: boolean) => {
    if (!variant) return
    const rawSku = normalizeSkuRaw(variant.sku || `${sanityProduct.slug?.current || 'variant'}-${index}`)
    if (!rawSku || variationSkus.has(rawSku)) return
    variationSkus.add(rawSku)

    const colorName = variant.color?.title?.trim() || 'Black'
    const colorValue = variant.color?.value?.trim()
    if (colorName) {
      const existing = colorMap.get(colorName) || { colorName }
      if (colorValue && /^#?[0-9a-f]{6}$/i.test(colorValue)) {
        existing.colorCode = colorValue.startsWith('#') ? colorValue : `#${colorValue}`
      }
      colorMap.set(colorName, existing)
    }

    const mappedSize = mapSize(variant.size?.title || null)
    sizeSet.add(mappedSize)

    variations.push({
      sku: rawSku,
      productType: availableProductTypes[0],
      size: mappedSize,
      color: colorName,
      customVariationName: variant.title || (isDefault ? 'Default Variation' : undefined),
      isAvailable: true,
    })

    if (variant.taxable !== null && variant.taxable !== undefined) {
      recordUnmapped(stats, 'variant.taxable')
    }
    if (variant.price !== null && variant.price !== undefined) {
      recordUnmapped(stats, 'variant.price')
    }
  }

  registerVariant(baseVariant, 0, true)
  sanityProduct.variants.forEach((variant, index) => registerVariant(variant, index, false))

  if (variations.length === 0) {
    variations.push({
      sku: primarySku,
      productType: availableProductTypes[0],
      size: 'one-size',
      color: 'Black',
      isAvailable: true,
    })
    colorMap.set('Black', { colorName: 'Black' })
    sizeSet.add('one-size')
  }

  if (sanityProduct.defaultProductVariant?.taxable !== undefined && sanityProduct.defaultProductVariant.taxable !== null) {
    recordUnmapped(stats, 'defaultProductVariant.taxable')
  }

  const availableColors = Array.from(colorMap.values())
  const availableSizes = sizeSet.size > 0 ? Array.from(sizeSet) : ['one-size']

  const productTypeTitle = (sanityProduct.productType?.title || '').toLowerCase()
  const categories: string[] = []
  if (productTypeTitle.includes('clothing') || productTypeTitle.includes('apparel')) {
    categories.push('clothing')
  }
  if (productTypeTitle.includes('jewelry')) {
    categories.push('jewelry')
  }
  if (categories.length === 0) {
    categories.push('fashion')
  }

  const tags = (sanityProduct.tags || []).map((tag) => ({ tag }))
  const collections = (sanityProduct.collections || []).map((collection) => ({
    collectionName: collection.title || collection.slug?.current || 'collection',
  }))

  if (sanityProduct.collections?.some((collection) => collection.slug?.current)) {
    recordUnmapped(stats, 'collections.slug')
  }

  if (sanityProduct.genres) {
    recordUnmapped(stats, 'genres')
  }

  if (sanityProduct.vendor?.slug) {
    recordUnmapped(stats, 'vendor.slug')
  }

  const imageUrls = await buildImageUrls(sanityProduct, primarySku, options, stats)

  const document: PayloadFashionJewelry & { scrapedImageUrls?: Array<{ url: string }>; brand?: string } = {
    name: sanityProduct.title,
    primaryType,
    style: sanityProduct.productType?.title || undefined,
    availableProductTypes,
    availableColors,
    availableSizes,
    variations,
    categories,
    tags,
    collections,
    brand: sanityProduct.vendor?.title || undefined,
    scrapedImageUrls: imageUrls.map((url) => ({ url })),
    importSource: 'artisan-direct',
    importDate: new Date().toISOString(),
    isActive: true,
    isFeatured: false,
  }

  return { document, primarySku }
}

async function migrateApparel() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : undefined

  console.log('🚀 Starting apparel migration to Payload...\n')
  if (dryRun) {
    console.log('⚠️  Running in DRY RUN mode - no database writes or R2 uploads will occur\n')
  }
  if (!R2_PUBLIC_BASE_URL) {
    console.log('⚠️  R2_PUBLIC_BASE_URL not set. Uploaded URLs will use the default R2 endpoint.\n')
  }

  const dataPath = path.join(__dirname, '../data/sanity-apparel-export.json')
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Sanity export file not found: ${dataPath}`)
  }

  let sanityProducts: SanityProduct[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  if (limit) {
    sanityProducts = sanityProducts.slice(0, limit)
  }
  console.log(`📥 Loaded ${sanityProducts.length} products from Sanity export`)

  console.log('🔧 Initializing Payload...')
  const { getPayload } = await import('payload')
  const { default: payloadConfig } = await import('../src/payload.config.js')
  const payload = await getPayload({
    config: payloadConfig,
    // @ts-expect-error payload types mismatch when providing secret directly
    secret: process.env.PAYLOAD_SECRET,
  })
  console.log('✅ Payload initialized\n')

  const stats: MigrationStats = {
    total: sanityProducts.length,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    imagesUploaded: 0,
    unmappedFields: new Set<string>(),
  }

  for (const sanityProduct of sanityProducts) {
    stats.processed++
    console.log(`\n📦 Processing: ${sanityProduct.title || sanityProduct._id}`)

    try {
      const transformed = await transformProduct(sanityProduct, stats, { dryRun })
      if (!transformed) {
        stats.skipped++
        continue
      }

      const { document, primarySku } = transformed

      if (dryRun) {
        console.log(`   [DRY RUN] Would upsert product with SKU ${primarySku}`)
        console.log(`   [DRY RUN] Available product types: ${document.availableProductTypes.join(', ')}`)
        console.log(`   [DRY RUN] Variations: ${document.variations.length}`)
        console.log(`   [DRY RUN] Image URLs: ${(document.scrapedImageUrls || []).map((url) => url.url).join(', ') || 'none'}`)
        continue
      }

      let existingId: string | null = null
      if (primarySku) {
        const existing = await payload.find({
          collection: 'fashion-jewelry',
          limit: 1,
          where: {
            'variations.sku': {
              equals: primarySku,
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
        console.log(`   🔄 Updated existing product ${existingId}`)
        stats.updated++
      } else {
        const created = await payload.create({
          collection: 'fashion-jewelry',
          data: document as any,
        })
        console.log(`   ✅ Created product ${created.id}`)
        stats.created++
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${sanityProduct.title || sanityProduct._id}:`, error)
      stats.errors++
    }
  }

  const summaryPath = path.join(__dirname, '../data/apparel-migration-results.json')
  const summary = {
    total: stats.total,
    processed: stats.processed,
    created: stats.created,
    updated: stats.updated,
    skipped: stats.skipped,
    errors: stats.errors,
    imagesUploaded: stats.imagesUploaded,
    unmappedFields: Array.from(stats.unmappedFields).sort(),
  }
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

  console.log('\n' + '='.repeat(60))
  console.log(dryRun ? '✅ Dry run completed!' : '✅ Migration completed!')
  console.log('='.repeat(60))
  console.log(`📊 Total products:        ${stats.total}`)
  console.log(`📦 Processed:             ${stats.processed}`)
  if (!dryRun) {
    console.log(`✅ Created:               ${stats.created}`)
    console.log(`🔄 Updated:               ${stats.updated}`)
    console.log(`🖼️  Images uploaded:       ${stats.imagesUploaded}`)
  }
  console.log(`⏭️  Skipped:               ${stats.skipped}`)
  console.log(`❌ Errors:                ${stats.errors}`)
  console.log(`📂 Summary saved to:      ${summaryPath}`)
  if (stats.unmappedFields.size > 0) {
    console.log(`📝 Unmapped Sanity fields: ${Array.from(stats.unmappedFields).join(', ')}`)
  } else {
    console.log('📝 Unmapped Sanity fields: none')
  }

  process.exit(0)
}

// Run migration
migrateApparel().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
