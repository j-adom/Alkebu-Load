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

async function checkVariants() {
  console.log('🔍 Checking apparel variant structure in Sanity...\n')
  
  // Get one sample apparel item with ALL fields
  const sample = await client.fetch(`*[_type == "apparel"][0]`)
  
  console.log('📋 Sample apparel document structure:')
  console.log(JSON.stringify(sample, null, 2))
  
  // Check for apparelVariant type
  const apparelVariants = await client.fetch(`*[_type == "apparelVariant"]`)
  console.log(`\n📦 ApparelVariant documents: ${apparelVariants.length}`)
  
  if (apparelVariants.length > 0) {
    console.log('\n Sample variant:')
    console.log(JSON.stringify(apparelVariants[0], null, 2))
  }
}

checkVariants().catch(console.error)
