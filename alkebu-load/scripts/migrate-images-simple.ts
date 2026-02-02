#!/usr/bin/env tsx

/**
 * Simple Image Migration to R2 (No Database Dependencies)
 * 
 * This script only handles the file upload part without Payload database operations.
 * Use this to test the migration logic and upload files to R2.
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'

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

function extractIsbnFromFilename(filename: string): string | null {
  const match = filename.match(/isbn-(\d{10,13})/i)
  return match ? match[1] : null
}

function isPreGeneratedVariant(filename: string): boolean {
  // Hash-based files: Consider variant if it has multiple dimension patterns
  if (/^[a-f0-9]{32,40}-/.test(filename)) {
    const dimensionMatches = filename.match(/-\d+x\d+/g) || []
    return dimensionMatches.length > 1
  }
  
  // Non-hash files: Consider variant if it has any dimension pattern
  return /-\d+x\d+/.test(filename)
}

function buildR2ObjectKey(filename: string): string {
  const isbn = extractIsbnFromFilename(filename)
  if (isbn) {
    return `books/${isbn}/${filename}`
  }
  return `media/${filename}`
}

async function uploadToR2(filePath: string, objectKey: string, stats: MigrationStats, dryRun: boolean): Promise<string | null> {
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
    const normalizedBase = R2_PUBLIC_URL_BASE.endsWith('/') ? R2_PUBLIC_URL_BASE.slice(0, -1) : R2_PUBLIC_URL_BASE
    return `${normalizedBase}/${objectKey}`
  } catch (error: any) {
    console.error(`      ❌ Upload failed: ${error.message}`)
    stats.filesFailed++
    stats.errors.push(`${filePath}: ${error.message}`)
    return null
  }
}

async function clearR2Bucket(dryRun: boolean): Promise<number> {
  console.log('🗑️  Clearing R2 bucket...')
  
  if (dryRun) {
    console.log('   [DRY RUN] Would clear all objects from bucket')
    return 0
  }

  let totalDeleted = 0
  let continuationToken: string | undefined = undefined

  do {
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

    const objectsToDelete = listResponse.Contents.map(obj => ({
      Key: obj.Key!,
    }))

    console.log(`   Deleting ${objectsToDelete.length} objects...`)

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

function getLocalMediaFiles(): string[] {
  if (!fs.existsSync(MEDIA_DIR)) {
    throw new Error(`Media directory not found: ${MEDIA_DIR}`)
  }

  const files = fs.readdirSync(MEDIA_DIR)
  const imageExtensions = ['.webp', '.png', '.jpg', '.jpeg', '.gif', '.avif']
  
  return files.filter(file => {
    const ext = path.extname(file).toLowerCase()
    const isImage = imageExtensions.includes(ext)
    const isVariant = isPreGeneratedVariant(file)
    return isImage && !isVariant
  })
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const clearBucket = args.includes('--clear-bucket')

  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : undefined

  console.log('🚀 Simple Image Migration → Cloudflare R2\n')
  if (dryRun) console.log('⚠️  DRY RUN MODE - No files will be uploaded\n')
  if (clearBucket) console.log('🗑️  CLEAR MODE - Will clear bucket before uploading\n')

  // Validate R2 configuration
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_ENDPOINT) {
    console.error('❌ Missing R2 configuration')
    process.exit(1)
  }

  // Clear bucket if requested
  if (clearBucket) {
    await clearR2Bucket(dryRun)
    console.log('')
  }

  // Get all local media files
  console.log('📁 Scanning local media directory for ORIGINAL images...')
  const allFiles = getLocalMediaFiles()
  console.log(`✅ Found ${allFiles.length} original image files in ${MEDIA_DIR}`)
  console.log('   (Pre-generated variants are automatically skipped)\n')

  const processFiles = limit ? allFiles.slice(0, limit) : allFiles

  const stats: MigrationStats = {
    totalFiles: allFiles.length,
    filesProcessed: 0,
    filesUploaded: 0,
    filesSkipped: 0,
    filesFailed: 0,
    errors: [],
  }

  const startTime = Date.now()

  // Process each original file
  for (let i = 0; i < processFiles.length; i++) {
    const file = processFiles[i]
    const filePath = path.join(MEDIA_DIR, file)
    const objectKey = buildR2ObjectKey(file)

    console.log(`[${i + 1}/${processFiles.length}] 📷 ${file}`)

    try {
      stats.filesProcessed++

      console.log(`   ⬆️  Uploading to R2...`)
      const url = await uploadToR2(filePath, objectKey, stats, dryRun)

      if (url) {
        console.log(`   ✅ Uploaded: ${url}`)
      }

      // Progress update every 10 files for testing
      if ((i + 1) % 10 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
        const rate = ((i + 1) / parseFloat(elapsed)).toFixed(2)
        console.log(`\n📊 Progress: ${i + 1}/${processFiles.length} | Rate: ${rate} files/sec\n`)
      }
    } catch (error: any) {
      console.error(`   ❌ File processing failed: ${error.message}`)
      stats.errors.push(`${file}: ${error.message}`)
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)

  // Print summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 MIGRATION SUMMARY')
  console.log('='.repeat(50))
  console.log(`⏱️  Total time:     ${totalTime}s`)
  console.log(`📁 Files found:    ${stats.totalFiles}`)
  console.log(`🔄 Processed:      ${stats.filesProcessed}`)
  console.log(`⬆️  Uploaded:       ${stats.filesUploaded}`)
  console.log(`❌ Failed:         ${stats.filesFailed}`)

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors: ${stats.errors.length}`)
    stats.errors.slice(0, 5).forEach(err => console.log(`   - ${err}`))
    if (stats.errors.length > 5) {
      console.log(`   ... and ${stats.errors.length - 5} more`)
    }
  }

  console.log('\n' + '='.repeat(50))
  
  if (dryRun) {
    console.log('\n✅ Dry run complete - no files uploaded')
  } else {
    console.log('\n✅ Upload complete!')
  }
}

main().catch(error => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})