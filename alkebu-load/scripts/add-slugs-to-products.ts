#!/usr/bin/env tsx

/**
 * Add slugs and prices to existing FashionJewelry products
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function addSlugsAndPrices() {
  console.log('🚀 Adding slugs and prices to existing products...\n')

  const { getPayload } = await import('payload')
  const { default: payloadConfig } = await import('../src/payload.config.js')

  const payload = await getPayload({
    config: payloadConfig,
    secret: process.env.PAYLOAD_SECRET!,
  })

  console.log('✅ Payload initialized\n')

  // Get all products
  const products = await payload.find({
    collection: 'fashion-jewelry',
    limit: 100,
  })

  console.log(`📦 Found ${products.totalDocs} products\n`)

  let updated = 0
  let skipped = 0

  for (const product of products.docs) {
    try {
      // Generate slug if missing
      const slug = product.slug || product.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      // Set default price if missing
      const price = product.price || 25.00

      // Only update if slug or price is missing
      if (!product.slug || !product.price) {
        await payload.update({
          collection: 'fashion-jewelry',
          id: product.id,
          data: {
            slug,
            price,
          },
        })
        console.log(`✅ Updated: ${product.name} → ${slug} ($${price})`)
        updated++
      } else {
        console.log(`⏭️  Skipped: ${product.name} (already has slug and price)`)
        skipped++
      }
    } catch (error) {
      console.error(`❌ Error updating ${product.name}:`, error)
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`✅ Complete! Updated ${updated} products, skipped ${skipped}`)
  console.log('='.repeat(60))

  process.exit(0)
}

addSlugsAndPrices().catch((error) => {
  console.error('❌ Failed:', error)
  process.exit(1)
})
