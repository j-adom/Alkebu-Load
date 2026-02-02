#!/usr/bin/env tsx

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: './.env' })

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || '',
  dataset: process.env.SANITY_DATASET || 'production',
  token: process.env.SANITY_TOKEN || '',
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function exportApparelData() {
  console.log('🚀 Starting Sanity apparel data export (apparel type)...\n')
  console.log(`📊 Project: ${process.env.SANITY_PROJECT_ID}`)
  console.log(`📊 Dataset: ${process.env.SANITY_DATASET}\n`)

  // Query for all 'apparel' type documents with the correct field structure
  const query = `*[_type == "apparel"] {
    _id,
    _type,
    _createdAt,
    _updatedAt,
    title,
    slug,
    description,
    price,
    "apparelType": apparelType[]->{
      _id,
      title,
      slug
    },
    defaultApparelVariant {
      style,
      grams,
      instock,
      featured,
      upCharge,
      colors[] {
        _key,
        color,
        images[] {
          _key,
          alt,
          caption,
          "asset": asset->{
            _id,
            url,
            metadata
          }
        }
      },
      sizes[] {
        _key,
        title
      }
    },
    tags,
    "vendor": vendor->{
      _id,
      title,
      slug
    },
    "collection": collection[]->{
      _id,
      title,
      slug
    },
    "brand": brand->{
      _id,
      title,
      slug
    }
  }`

  try {
    const apparel = await client.fetch(query)
    console.log(`✅ Found ${apparel.length} apparel documents`)

    // Save to data directory
    const dataDir = path.join(__dirname, '../data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const filename = path.join(dataDir, 'sanity-apparel-export.json')
    fs.writeFileSync(filename, JSON.stringify(apparel, null, 2))
    console.log(`💾 Saved to ${filename}`)

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ Export completed successfully!')
    console.log('='.repeat(60))
    console.log(`📝 Total apparel items: ${apparel.length}`)

    // Analyze apparel types
    const apparelTypes = new Map<string, number>()
    apparel.forEach((a: any) => {
      const type = a.apparelType?.title || 'Unknown'
      apparelTypes.set(type, (apparelTypes.get(type) || 0) + 1)
    })

    console.log('\n📊 Apparel Types:')
    for (const [type, count] of apparelTypes.entries()) {
      console.log(`├── ${type.padEnd(30)} ${count} items`)
    }

    // Analyze vendors/brands
    const vendors = new Map<string, number>()
    apparel.forEach((a: any) => {
      const vendor = a.vendor?.title || a.brand?.title || 'No Vendor'
      vendors.set(vendor, (vendors.get(vendor) || 0) + 1)
    })

    console.log('\n📦 Vendors/Brands:')
    for (const [vendor, count] of vendors.entries()) {
      console.log(`├── ${vendor.padEnd(30)} ${count} items`)
    }

    // Sample a few items
    console.log('\n📋 Sample items:')
    apparel.slice(0, 5).forEach((a: any) => {
      console.log(`├── ${a.title || 'Untitled'}`)
      console.log(`│   Type: ${a.apparelType?.title || 'Unknown'}`)
      console.log(`│   Variants: ${(a.variants?.length || 0) + (a.defaultVariant ? 1 : 0)}`)
    })

    return {
      apparel,
      stats: {
        total: apparel.length,
        apparelTypes: Object.fromEntries(apparelTypes),
        vendors: Object.fromEntries(vendors)
      }
    }
  } catch (error) {
    console.error('❌ Error exporting apparel data:', error)
    throw error
  }
}

// Run export
exportApparelData().catch((error) => {
  console.error('❌ Export failed:', error)
  process.exit(1)
})
