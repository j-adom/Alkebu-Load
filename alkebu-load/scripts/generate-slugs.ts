#!/usr/bin/env tsx

/**
 * Generate slugs for existing products by touching each record
 * This triggers the beforeValidate hook that auto-generates slugs
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function generateSlugs() {
  console.log('🚀 Generating slugs for products...\n')

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

  for (const product of products.docs) {
    try {
      // Just update the product - the beforeValidate hook will generate the slug
      await payload.update({
        collection: 'fashion-jewelry',
        id: product.id,
        data: {
          name: product.name, // Touch the record to trigger hooks
          price: product.price || 25.00, // Set default price if missing
        },
      })

      // Fetch the updated product to see the generated slug
      const updated = await payload.findByID({
        collection: 'fashion-jewelry',
        id: product.id,
      })

      console.log(`✅ ${product.name} → slug: "${updated.slug}" ($${updated.price})`)
      updated++
    } catch (error: any) {
      console.error(`❌ Error updating ${product.name}:`, error.message)
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`✅ Complete! Updated ${updated} products`)
  console.log('='.repeat(60))

  process.exit(0)
}

generateSlugs().catch((error) => {
  console.error('❌ Failed:', error)
  process.exit(1)
})
