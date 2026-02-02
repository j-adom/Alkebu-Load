#!/usr/bin/env tsx

/**
 * Migrate Local Media Images to Cloudflare R2 + Cloudflare Images
 *
 * Uploads ORIGINAL images only (skipping pre-generated variants) to Cloudflare R2
 * and updates the database to point to the new R2 URLs.
 *
 * Uses Cloudflare Images for on-demand transformations instead of storing multiple sizes.
 *
 * This script:
 * 1. Scans the local media directory and identifies ORIGINAL images (skips variants)
 * 2. Uploads only original images to Cloudflare R2
 * 3. Creates/updates media records in Payload with R2 URLs
 * 4. Updates book records to link to the migrated media
 * 5. Variants are generated on-demand via Cloudflare Images transformations
 *
 * Usage:
 *   tsx scripts/migrate-local-images-to-r2.ts [options]
 *
 * Environment (required):
 *   R2_ACCESS_KEY_ID      Cloudflare R2 access key
 *   R2_SECRET_ACCESS_KEY  Cloudflare R2 secret
 *   R2_BUCKET             Bucket name
 *   R2_ACCOUNT_ID         Account ID (if R2_ENDPOINT not set)
 *   R2_ENDPOINT           Custom endpoint (optional)
 *   R2_PUBLIC_URL_BASE    Public base URL for uploaded objects (used with Cloudflare Images)
 *
 * Options:
 *   --limit <n>      Process only first N original images (for testing)
 *   --dry-run        Show what would be uploaded without actually uploading
 *   --skip-existing  Skip files that already exist in R2
 *   --clear-bucket   Clear all objects from R2 bucket before uploading
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// R2 Configuration
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || ''
const R2_BUCKET = process.env.R2_BUCKET || ''
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || ''
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '')
const R2_PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL_BASE || ''

const MEDIA_DIR = path.join(__dirname, '../media')

interface MigrationStats {
  totalFiles: number
  filesProcessed: number
  filesUploaded: number
  filesSkipped: number
  filesFailed: number
  mediaRecordsCreated: number
  mediaRecordsUpdated: number
  bookRecordsUpdated: number
  errors: string[]
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

/**
 * Get MIME type from file extension
 */
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * Extract ISBN from filename if present
 * Looks for patterns like: isbn-9781234567890-*.webp
 */
function extractIsbnFromFilename(filename: string): string | null {
  const match = filename.match(/isbn-(\d{10,13})/i)
  return match ? match[1] : null
}

/**
 * Extract base hash from filename (the first hash segment)
 * Example: 47f13cb11df8acb46862ae5659b321d550f73d30-1650x726.webp -> 47f13cb11df8acb46862ae5659b321d550f73d30
 */
function extractBaseHash(filename: string): string | null {
  // Match hash pattern at start of filename (hex string of 32-40 chars)
  const match = filename.match(/^([a-f0-9]{32,40})/i)
  return match ? match[1] : null
}

/**
 * Check if file is a pre-generated variant
 * We want to skip these and only upload originals
 * 
 * Variants have patterns like:
 * - hash-1275x1700-400x300.webp (thumbnail variant)
 * - hash-1275x1700-768x1024.webp (card variant)
 * - hash-1275x1700-768x1024-400x300.webp (nested variant)
 * 
 * Originals have patterns like:
 * - hash-1275x1700.webp (hash-based original)
 * - regular-filename.jpg (non-hash original)
 */
function isPreGeneratedVariant(filename: string): boolean {
  // Hash-based files: Consider variant if it has multiple dimension patterns
  if (/^[a-f0-9]{32,40}-/.test(filename)) {
    // Count dimension patterns like -400x300
    const dimensionMatches = filename.match(/-\d+x\d+/g) || []
    // If more than one dimension pattern, it's a variant
    return dimensionMatches.length > 1
  }
  
  // Non-hash files: Consider variant if it has any dimension pattern
  return /-\d+x\d+/.test(filename)
}


/**
 * Build R2 object key (path in bucket)
 */
function buildR2ObjectKey(filename: string): string {
  const isbn = extractIsbnFromFilename(filename)
  if (isbn) {
    return `books/${isbn}/${filename}`
  }

  // Use media subdirectory for non-ISBN images
  return `media/${filename}`
}

/**
 * Upload file to R2
 */
async function uploadToR2(
  filePath: string,
  objectKey: string,
  stats: MigrationStats,
  dryRun: boolean
): Promise<string | null> {
  try {
    if (dryRun) {
      console.log(`      [DRY RUN] Would upload to: ${objectKey}`)
      return `${R2_PUBLIC_URL_BASE}/${objectKey}`
    }

    const fileBuffer = fs.readFileSync(filePath)
    const mimeType = getMimeType(filePath)

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: mimeType,
      })
    )

    stats.filesUploaded++

    // Build public URL
    const normalizedBase = R2_PUBLIC_URL_BASE.endsWith('/')
      ? R2_PUBLIC_URL_BASE.slice(0, -1)
      : R2_PUBLIC_URL_BASE

    return `${normalizedBase}/${objectKey}`
  } catch (error: any) {
    console.error(`      ❌ Upload failed: ${error.message}`)
    stats.filesFailed++
    stats.errors.push(`${filePath}: ${error.message}`)
    return null
  }
}

/**
 * Check if object already exists in R2
 */
async function objectExistsInR2(objectKey: string): Promise<boolean> {
  try {
    await r2Client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET,
        Key: objectKey,
      })
    )
    return true
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return false
    }
    throw error
  }
}

/**
 * Clear all objects from R2 bucket
 */
async function clearR2Bucket(dryRun: boolean): Promise<number> {
  console.log('🗑️  Clearing R2 bucket...')
  
  if (dryRun) {
    console.log('   [DRY RUN] Would clear all objects from bucket')
    return 0
  }

  let totalDeleted = 0
  let continuationToken: string | undefined = undefined

  do {
    // List objects in bucket
    const listResponse = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    )

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      break
    }

    // Prepare objects for deletion
    const objectsToDelete = listResponse.Contents.map(obj => ({
      Key: obj.Key!,
    }))

    console.log(`   Deleting ${objectsToDelete.length} objects...`)

    // Delete objects in batch
    const deleteResponse = await r2Client.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: {
          Objects: objectsToDelete,
          Quiet: false,
        },
      })
    )

    const deletedCount = deleteResponse.Deleted?.length || 0
    totalDeleted += deletedCount

    if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
      console.warn(`   ⚠️  Failed to delete ${deleteResponse.Errors.length} objects`)
      deleteResponse.Errors.forEach(error => {
        console.warn(`      - ${error.Key}: ${error.Message}`)
      })
    }

    continuationToken = listResponse.NextContinuationToken
  } while (continuationToken)

  console.log(`✅ Cleared ${totalDeleted} objects from R2 bucket`)
  return totalDeleted
}

/**
 * Get all ORIGINAL image files from media directory (skip pre-generated variants)
 */
function getLocalMediaFiles(): string[] {
  if (!fs.existsSync(MEDIA_DIR)) {
    throw new Error(`Media directory not found: ${MEDIA_DIR}`)
  }

  const files = fs.readdirSync(MEDIA_DIR)

  // Only include image files, excluding pre-generated variants
  const imageExtensions = ['.webp', '.png', '.jpg', '.jpeg', '.gif', '.avif']
  return files.filter(file => {
    const ext = path.extname(file).toLowerCase()
    const isImage = imageExtensions.includes(ext)
    const isVariant = isPreGeneratedVariant(file)

    // Only include images that are NOT variants
    return isImage && !isVariant
  })
}


/**
 * Main migration function
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const skipExisting = args.includes('--skip-existing')
  const clearBucket = args.includes('--clear-bucket')

  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : undefined

  console.log('🚀 Local Media → Cloudflare R2 Migration\n')
  if (dryRun) console.log('⚠️  DRY RUN MODE - No files will be uploaded\n')
  if (skipExisting) console.log('⏭️  SKIP MODE - Skipping files that exist in R2\n')
  if (clearBucket) console.log('🗑️  CLEAR MODE - Will clear bucket before uploading\n')

  // Validate R2 configuration
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_ENDPOINT) {
    console.error('❌ Missing R2 configuration. Please set:')
    console.error('   - R2_ACCESS_KEY_ID')
    console.error('   - R2_SECRET_ACCESS_KEY')
    console.error('   - R2_BUCKET')
    console.error('   - R2_ACCOUNT_ID or R2_ENDPOINT')
    process.exit(1)
  }

  if (!R2_PUBLIC_URL_BASE) {
    console.warn('⚠️  R2_PUBLIC_URL_BASE not set. Using default Cloudflare endpoint.')
  }

  // Initialize Payload
  console.log('🔧 Initializing Payload...')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })
  console.log('✅ Payload initialized\n')

  // Clear bucket if requested
  if (clearBucket) {
    await clearR2Bucket(dryRun)
    console.log('')
  }

  // Get all local media files (originals only, variants excluded)
  console.log('📁 Scanning local media directory for ORIGINAL images...')
  const allFiles = getLocalMediaFiles()
  console.log(`✅ Found ${allFiles.length} original image files in ${MEDIA_DIR}`)
  console.log('   (Pre-generated variants like -400x300, -768x1024 are automatically skipped)\n')

  // Limit if requested
  const processFiles = limit ? allFiles.slice(0, limit) : allFiles

  const stats: MigrationStats = {
    totalFiles: allFiles.length,
    filesProcessed: 0,
    filesUploaded: 0,
    filesSkipped: 0,
    filesFailed: 0,
    mediaRecordsCreated: 0,
    mediaRecordsUpdated: 0,
    bookRecordsUpdated: 0,
    errors: [],
  }

  const startTime = Date.now()

  // Process each original file
  for (let i = 0; i < processFiles.length; i++) {
    const file = processFiles[i]
    const filePath = path.join(MEDIA_DIR, file)
    const objectKey = buildR2ObjectKey(file)

    console.log(`\n[${i + 1}/${processFiles.length}] 📷 ${file}`)

    try {
      stats.filesProcessed++

      // Check if already exists
      if (skipExisting && !dryRun) {
        const exists = await objectExistsInR2(objectKey)
        if (exists) {
          console.log(`   ⏭️  Skipped (exists in R2)`)
          stats.filesSkipped++
          continue
        }
      }

      console.log(`   ⬆️  Uploading to R2...`)
      const url = await uploadToR2(filePath, objectKey, stats, dryRun)

      if (!url) {
        continue
      }

      console.log(`   ✅ Uploaded: ${url}`)

      // Find or create media record
      if (!dryRun) {
        const baseHash = extractBaseHash(file)

        // Try to find existing media record by filename hash
        const existingMedia = await payload.find({
          collection: 'media',
          where: {
            filename: {
              contains: baseHash || file,
            },
          },
          limit: 1,
        })

        let mediaId: number | string

        if (existingMedia.docs.length > 0) {
          // Update existing media record
          const media = existingMedia.docs[0]
          await payload.update({
            collection: 'media',
            id: media.id,
            data: {
              url: url,
              filename: file,
            },
          })
          mediaId = media.id
          stats.mediaRecordsUpdated++
          console.log(`   🔗 Updated media record: ${media.id}`)
        } else {
          // Create new media record
          const newMedia = await payload.create({
            collection: 'media',
            data: {
              alt: `Book cover image`,
              url: url,
              filename: file,
            },
          })
          mediaId = newMedia.id
          stats.mediaRecordsCreated++
          console.log(`   ➕ Created media record: ${newMedia.id}`)
        }

        // Try to link to book record if ISBN is present
        const isbn = extractIsbnFromFilename(file)
        if (isbn) {
          console.log(`   🔍 Looking for book with ISBN: ${isbn}`)

          const books = await payload.find({
            collection: 'books',
            where: {
              or: [
                {
                  'editions.isbn': {
                    equals: isbn,
                  },
                },
                {
                  'editions.isbn10': {
                    equals: isbn,
                  },
                },
              ],
            },
            limit: 1,
          })

          if (books.docs.length > 0) {
            const book = books.docs[0]

            // Check if image is already linked
            const existingImages = book.images || []
            const alreadyLinked = existingImages.some((img: any) =>
              (typeof img.image === 'string' && img.image === String(mediaId)) ||
              (typeof img.image === 'number' && img.image === mediaId) ||
              (typeof img.image === 'object' && img.image?.id === mediaId)
            )

            if (!alreadyLinked) {
              await payload.update({
                collection: 'books',
                id: book.id,
                data: {
                  images: [
                    ...existingImages,
                    {
                      image: mediaId,
                      alt: `Cover image for "${book.title}"`,
                      isPrimary: existingImages.length === 0, // First image is primary
                    },
                  ],
                },
              })
              stats.bookRecordsUpdated++
              console.log(`   📚 Linked to book: ${book.title}`)
            } else {
              console.log(`   📚 Already linked to book: ${book.title}`)
            }
          } else {
            console.log(`   ⚠️  No book found with ISBN: ${isbn}`)
          }
        }
      }

      // Progress update every 50 files
      if ((i + 1) % 50 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
        const rate = ((i + 1) / parseFloat(elapsed)).toFixed(2)
        const remaining = processFiles.length - (i + 1)
        const eta = (remaining / parseFloat(rate)).toFixed(0)

        console.log(`\n📊 Progress: ${i + 1}/${processFiles.length} files`)
        console.log(`   Rate: ${rate} files/sec | Elapsed: ${elapsed}s | ETA: ${eta}s`)
        console.log(`   Uploaded: ${stats.filesUploaded} | Skipped: ${stats.filesSkipped} | Failed: ${stats.filesFailed}\n`)
      }
    } catch (error: any) {
      console.error(`   ❌ File processing failed: ${error.message}`)
      stats.errors.push(`${file}: ${error.message}`)
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)

  // Print summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 MIGRATION SUMMARY')
  console.log('='.repeat(70))
  console.log(`\n⏱️  Performance:`)
  console.log(`├── Total time:     ${totalTime}s`)
  console.log(`└── Files/second:   ${(stats.filesProcessed / parseFloat(totalTime)).toFixed(2)}`)
  console.log(`\n📁 Files:`)
  console.log(`├── Total found:    ${stats.totalFiles}`)
  console.log(`├── Processed:      ${stats.filesProcessed}`)
  console.log(`├── Uploaded:       ${stats.filesUploaded}`)
  console.log(`├── Skipped:        ${stats.filesSkipped}`)
  console.log(`└── Failed:         ${stats.filesFailed}`)
  console.log(`\n🗄️  Database:`)
  console.log(`├── Media created:  ${stats.mediaRecordsCreated}`)
  console.log(`├── Media updated:  ${stats.mediaRecordsUpdated}`)
  console.log(`└── Books linked:   ${stats.bookRecordsUpdated}`)

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors: ${stats.errors.length}`)
    stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`))
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more`)
    }

    // Save errors to file
    const errorFile = path.join(__dirname, '../data/migration-errors.json')
    fs.mkdirSync(path.dirname(errorFile), { recursive: true })
    fs.writeFileSync(errorFile, JSON.stringify(stats.errors, null, 2))
    console.log(`\n📝 Full error log saved to: ${errorFile}`)
  }

  console.log('\n' + '='.repeat(70))

  if (dryRun) {
    console.log('\n✅ Dry run complete - no files uploaded')
    console.log('   Remove --dry-run to perform actual migration')
  } else {
    console.log('\n✅ Migration complete!')
    console.log('\n📝 Next steps:')
    console.log('1. Review uploaded images in R2 bucket')
    console.log('2. Check media collection: http://localhost:3000/admin/collections/media')
    console.log('3. Check book images: http://localhost:3000/admin/collections/books')
    console.log('4. Consider removing local media files after verification')
  }

  process.exit(0)
}

main().catch(error => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
