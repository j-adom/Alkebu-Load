#!/usr/bin/env tsx

/**
 * Export Apparel Data from Sanity
 *
 * Exports all apparel/product data from Sanity CMS for migration to Payload FashionJewelry collection
 */

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
  console.log('🚀 Starting Sanity apparel data export...\n')
  console.log(`📊 Project: ${process.env.SANITY_PROJECT_ID}`)
  console.log(`📊 Dataset: ${process.env.SANITY_DATASET}\n`)

  // Query for all product documents with full details
  const query = `*[_type == "product"] {
    _id,
    _type,
    _createdAt,
    _updatedAt,
    title,
    slug,
    "productType": productType->{
      _id,
      title,
      slug
    },
    defaultProductVariant {
      title,
      sku,
      price,
      taxable,
      images[] {
        _key,
        _type,
        asset-> {
          _id,
          url,
          metadata
        }
      },
      "color": color->{
        _id,
        title,
        value
      },
      "size": size->{
        _id,
        title,
        value
      }
    },
    variants[] {
      title,
      sku,
      price,
      taxable,
      images[] {
        _key,
        _type,
        asset-> {
          _id,
          url,
          metadata
        }
      },
      "color": color->{
        _id,
        title,
        value
      },
      "size": size->{
        _id,
        title,
        value
      }
    },
    tags,
    "vendor": vendor->{
      _id,
      title,
      slug
    },
    "collections": collection[]->{
      _id,
      title,
      slug
    },
    "genres": genre[]->{
      _id,
      title,
      slug
    }
  }`

  try {
    const products = await client.fetch(query)
    console.log(`✅ Found ${products.length} product documents`)

    // Save to data directory
    const dataDir = path.join(__dirname, '../data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const filename = path.join(dataDir, 'sanity-apparel-export.json')
    fs.writeFileSync(filename, JSON.stringify(products, null, 2))
    console.log(`💾 Saved to ${filename}`)

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ Export completed successfully!')
    console.log('='.repeat(60))
    console.log(`📝 Total products: ${products.length}`)

    // Analyze product types
    const productTypes = new Map<string, number>()
    products.forEach((p: any) => {
      const type = p.productType?.title || 'Unknown'
      productTypes.set(type, (productTypes.get(type) || 0) + 1)
    })

    console.log('\n📊 Product Types:')
    for (const [type, count] of productTypes.entries()) {
      console.log(`├── ${type.padEnd(30)} ${count} items`)
    }

    // Analyze vendors
    const vendors = new Map<string, number>()
    products.forEach((p: any) => {
      const vendor = p.vendor?.title || 'No Vendor'
      vendors.set(vendor, (vendors.get(vendor) || 0) + 1)
    })

    console.log('\n📦 Vendors:')
    for (const [vendor, count] of vendors.entries()) {
      console.log(`├── ${vendor.padEnd(30)} ${count} items`)
    }

    return {
      products,
      stats: {
        total: products.length,
        productTypes: Object.fromEntries(productTypes),
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
