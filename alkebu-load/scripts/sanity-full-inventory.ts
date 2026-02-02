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

async function fullInventory() {
  console.log('🔍 Full Sanity inventory check...\n')
  
  // Get all document types
  const allDocs = await client.fetch('*[!(_id match "_*")]')
  const types = new Map()
  
  allDocs.forEach((doc: any) => {
    const type = doc._type
    types.set(type, (types.get(type) || 0) + 1)
  })
  
  console.log('📊 Document types in dataset:')
  for (const [type, count] of Array.from(types.entries()).sort()) {
    console.log(`   ${type.padEnd(30)} ${count}`)
  }
  
  // Check for apparel-related types
  console.log('\n🔍 Looking for apparel/fashion related types...')
  const apparelTypes = ['product', 'apparel', 'clothing', 'jewelry', 'fashion', 'productType', 'productVariant']
  
  for (const type of apparelTypes) {
    const docs = await client.fetch(`*[_type == "${type}"]`)
    if (docs.length > 0) {
      console.log(`\n   ✅ ${type}: ${docs.length} documents`)
      docs.slice(0, 3).forEach((doc: any) => {
        console.log(`      - ${doc.title || doc.name || doc._id}`)
      })
    }
  }
}

fullInventory().catch(console.error)
