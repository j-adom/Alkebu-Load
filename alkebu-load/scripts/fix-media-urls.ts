#!/usr/bin/env tsx

/**
 * Fix Media Collection URLs
 * 
 * This script updates existing media records that have null URLs
 * by setting them based on their existing filename and the R2 public URL base.
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'

const R2_PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL_BASE || 'https://media.alkebulanimages.com'

async function main() {
  console.log('🔧 Fixing Media URLs...\n')

  // Initialize Payload
  console.log('⚡ Initializing Payload...')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })
  console.log('✅ Payload initialized\n')

  // Find media records with null URLs
  console.log('🔍 Finding media records with missing URLs...')
  const mediaWithoutUrls = await payload.find({
    collection: 'media',
    where: {
      url: {
        equals: null,
      },
    },
    limit: 1000, // Process in batches
  })

  console.log(`📊 Found ${mediaWithoutUrls.docs.length} media records without URLs\n`)

  if (mediaWithoutUrls.docs.length === 0) {
    console.log('✅ All media records already have URLs!')
    process.exit(0)
  }

  let updated = 0
  let errors = 0

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
        console.log(`⚠️  No filename for media ${media.id}, using fallback URL`)
      }

      await payload.update({
        collection: 'media',
        id: media.id,
        data: {
          url: url,
        },
      })

      updated++
      console.log(`✅ Updated media ${media.id}: ${url}`)

    } catch (error: any) {
      errors++
      console.error(`❌ Failed to update media ${media.id}: ${error.message}`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Updated: ${updated}`)
  console.log(`❌ Errors:  ${errors}`)
  console.log(`📝 Total:   ${mediaWithoutUrls.docs.length}`)

  if (updated > 0) {
    console.log('\n✅ Media URL fix complete!')
    console.log('You can now restart your application.')
  }

  process.exit(0)
}

main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})