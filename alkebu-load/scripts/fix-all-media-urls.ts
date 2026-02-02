#!/usr/bin/env tsx

/**
 * Fix All Media Collection URLs
 * 
 * Runs in a loop to fix all media records with null URLs
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'

const R2_PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL_BASE || 'https://media.alkebulanimages.com'

async function fixBatch(payload: any): Promise<{ updated: number; remaining: number }> {
  // Find media records with null URLs
  const mediaWithoutUrls = await payload.find({
    collection: 'media',
    where: {
      url: {
        equals: null,
      },
    },
    limit: 1000, // Process in batches
  })

  if (mediaWithoutUrls.docs.length === 0) {
    return { updated: 0, remaining: 0 }
  }

  let updated = 0

  // Update each record
  for (const media of mediaWithoutUrls.docs) {
    try {
      // Generate URL based on filename
      let url = ''
      
      if (media.filename) {
        // Check if filename contains ISBN
        const isbnMatch = media.filename.match(/isbn-(\d{10,13})/i)
        if (isbnMatch) {
          const isbn = isbnMatch[1]
          url = `${R2_PUBLIC_URL_BASE}/books/${isbn}/${media.filename}`
        } else {
          url = `${R2_PUBLIC_URL_BASE}/media/${media.filename}`
        }
      } else {
        // Fallback: use a generic URL based on the media ID
        url = `${R2_PUBLIC_URL_BASE}/media/media-${media.id}`
      }

      await payload.update({
        collection: 'media',
        id: media.id,
        data: {
          url: url,
        },
      })

      updated++

    } catch (error: any) {
      console.error(`❌ Failed to update media ${media.id}: ${error.message}`)
    }
  }

  return { updated, remaining: mediaWithoutUrls.totalDocs - updated }
}

async function main() {
  console.log('🔧 Fixing All Media URLs...\n')

  // Initialize Payload
  console.log('⚡ Initializing Payload...')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })
  console.log('✅ Payload initialized\n')

  let totalUpdated = 0
  let batchCount = 0

  while (true) {
    batchCount++
    console.log(`📦 Processing batch ${batchCount}...`)
    
    const { updated, remaining } = await fixBatch(payload)
    totalUpdated += updated
    
    console.log(`   ✅ Updated ${updated} records in this batch`)
    console.log(`   📊 Total updated so far: ${totalUpdated}`)
    
    if (updated === 0) {
      console.log('\n🎉 All done! No more records to update.')
      break
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 FINAL SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Total records updated: ${totalUpdated}`)
  console.log(`📦 Total batches processed: ${batchCount}`)

  console.log('\n✅ All media URLs fixed!')
  console.log('Your application should now work without URL errors.')

  process.exit(0)
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})