#!/usr/bin/env tsx

/**
 * Sanity Data Export Script
 *
 * This script exports data from Sanity CMS using the Sanity client.
 * It fetches all documents and saves them as JSON files for migration to Payload.
 *
 * Setup:
 * 1. Install Sanity client: pnpm add @sanity/client
 * 2. Set environment variables in .env:
 *    - SANITY_PROJECT_ID
 *    - SANITY_DATASET (usually 'production')
 *    - SANITY_TOKEN (read token from Sanity dashboard)
 * 3. Run: tsx scripts/sanity-export.ts
 */

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: './.env' })

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || '',
  dataset: process.env.SANITY_DATASET || 'production',
  token: process.env.SANITY_TOKEN || '',
  apiVersion: '2024-01-01',
  useCdn: false,
})

// Schema type mappings from Sanity to Payload
const SCHEMA_MAPPINGS = {
  // Books & Related
  book: 'books',
  bookAuthor: 'authors',
  publisher: 'publishers',
  genre: 'genres', // Note: May need to create this collection

  // Content
  post: 'blog-posts',
  category: 'categories', // Note: May need to create this collection
  author: 'authors', // Blog authors -> same as book authors

  // Products
  product: 'wellness-lifestyle', // or other product collections
  vendor: 'vendors',

  // Skip these (Payload-specific or not needed)
  collection: null,
  productType: null,
  productVariant: null,
  bookVariant: null,
  brand: null,
  productColor: null,
  productSize: null,
  apparel: null,
  apparelType: null,
  apparelVariant: null,

  // System/Config
  siteSettings: null,
  homePage: null,
  about: null,
  shop: null,
  contact: null,
}

interface ExportStats {
  [key: string]: number
}

async function exportCollection(type: string): Promise<any[]> {
  console.log(`\n📥 Fetching ${type} documents...`)

  try {
    const query = `*[_type == $type] {
      ...,
      "imageUrls": images[].asset->url,
      "imageAssets": images[].asset->{url, metadata},
      "mainImageUrl": mainImage.asset->url,
      "mainImageAsset": mainImage.asset->{url, metadata},
      "logoUrl": logo.asset->url,
      "logoAsset": logo.asset->{url, metadata}
    }`

    const documents = await client.fetch(query, { type })
    console.log(`✅ Found ${documents.length} ${type} documents`)

    return documents
  } catch (error) {
    console.error(`❌ Error fetching ${type}:`, error instanceof Error ? error.message : 'Unknown error')
    return []
  }
}

async function exportAllData() {
  console.log('🚀 Starting Sanity data export...\n')
  console.log(`📊 Project: ${process.env.SANITY_PROJECT_ID}`)
  console.log(`📊 Dataset: ${process.env.SANITY_DATASET}\n`)

  // Create export directory
  const exportDir = path.join(__dirname, '../data/sanity-export')
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true })
  }

  const stats: ExportStats = {}
  const allData: { [key: string]: any[] } = {}

  // Export each schema type
  for (const [sanityType, payloadCollection] of Object.entries(SCHEMA_MAPPINGS)) {
    if (payloadCollection === null) {
      console.log(`⏭️  Skipping ${sanityType} (not mapped)`)
      continue
    }

    const documents = await exportCollection(sanityType)

    if (documents.length > 0) {
      allData[sanityType] = documents
      stats[sanityType] = documents.length

      // Save individual collection file
      const filename = path.join(exportDir, `${sanityType}.json`)
      fs.writeFileSync(filename, JSON.stringify(documents, null, 2))
      console.log(`💾 Saved to ${filename}`)
    }
  }

  // Save combined export
  const combinedFilename = path.join(exportDir, 'all-data.json')
  fs.writeFileSync(combinedFilename, JSON.stringify(allData, null, 2))
  console.log(`\n💾 Saved combined export to ${combinedFilename}`)

  // Save metadata
  const metadata = {
    exportDate: new Date().toISOString(),
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    stats,
    totalDocuments: Object.values(stats).reduce((sum, count) => sum + count, 0),
  }

  const metadataFilename = path.join(exportDir, 'metadata.json')
  fs.writeFileSync(metadataFilename, JSON.stringify(metadata, null, 2))

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('✅ Export completed successfully!')
  console.log('='.repeat(60))
  console.log('📊 Export Summary:')

  for (const [type, count] of Object.entries(stats)) {
    console.log(`├── ${type.padEnd(20)} ${count} documents`)
  }

  console.log(`\n📝 Total documents:  ${metadata.totalDocuments}`)
  console.log(`📂 Export directory: ${exportDir}`)

  return metadata
}

// Run export
exportAllData().catch((error) => {
  console.error('❌ Export failed:', error)
  process.exit(1)
})
