#!/usr/bin/env tsx

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config({ path: './.env' })

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || '',
  dataset: process.env.SANITY_DATASET || 'production',
  token: process.env.SANITY_TOKEN || '',
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function checkProducts() {
  console.log('🔍 Checking all products in Sanity...\n')
  
  // Check drafts
  const drafts = await client.fetch('*[_type == "product" && _id match "drafts.*"]')
  console.log(`📝 Draft products: ${drafts.length}`)
  
  // Check published
  const published = await client.fetch('*[_type == "product" && !(_id match "drafts.*")]')
  console.log(`✅ Published products: ${published.length}`)
  
  console.log(`\n📊 Total products: ${drafts.length + published.length}`)
  
  if (published.length > 0) {
    console.log('\n📦 Published products:')
    published.forEach((p: any) => {
      console.log(`   - ${p.title || 'Untitled'} (${p._id})`)
    })
  }
}

checkProducts().catch(console.error)
