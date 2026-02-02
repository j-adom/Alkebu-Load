#!/usr/bin/env tsx

/**
 * Fix R2 image URLs to use public endpoint
 * Replaces .r2.cloudflarestorage.com URLs with media.alkebulanimages.com
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const OLD_ENDPOINT_PATTERN = /https:\/\/alkebulan-online\.[a-z0-9]+\.r2\.cloudflarestorage\.com\//g
const NEW_ENDPOINT = process.env.R2_PUBLIC_BASE_URL || 'https://media.alkebulanimages.com'

async function fixImageUrls() {
  console.log('🔧 Fixing R2 image URLs...\n')
  console.log(`Old pattern: https://...r2.cloudflarestorage.com/`)
  console.log(`New endpoint: ${NEW_ENDPOINT}\n`)

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
      let hasChanges = false

      // Fix scrapedImageUrls
      const fixedUrls = product.scrapedImageUrls?.map((item: any) => {
        if (item.url && OLD_ENDPOINT_PATTERN.test(item.url)) {
          const newUrl = item.url.replace(
            OLD_ENDPOINT_PATTERN,
            NEW_ENDPOINT.endsWith('/') ? NEW_ENDPOINT : NEW_ENDPOINT + '/'
          )
          hasChanges = true
          return { ...item, url: newUrl }
        }
        return item
      })

      if (hasChanges) {
        await payload.update({
          collection: 'fashion-jewelry',
          id: product.id,
          data: {
            scrapedImageUrls: fixedUrls,
          },
        })

        console.log(`✅ Updated: ${product.name}`)
        if (fixedUrls && fixedUrls[0]) {
          console.log(`   ${fixedUrls[0].url}`)
        }
        updated++
      } else {
        console.log(`⏭️  Skipped: ${product.name} (URLs already correct)`)
        skipped++
      }
    } catch (error: any) {
      console.error(`❌ Error updating ${product.name}:`, error.message)
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`✅ Complete! Updated ${updated} products, skipped ${skipped}`)
  console.log('='.repeat(60))

  process.exit(0)
}

fixImageUrls().catch((error) => {
  console.error('❌ Failed:', error)
  process.exit(1)
})
