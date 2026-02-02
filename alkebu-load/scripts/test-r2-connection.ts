#!/usr/bin/env tsx

/**
 * Test R2 connection and basic operations
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3'

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || ''
const R2_BUCKET = process.env.R2_BUCKET || ''
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || ''
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '')
const R2_PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL_BASE || ''

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

async function main() {
  console.log('🔧 Testing R2 Connection...\n')
  
  // Validate configuration
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_ENDPOINT) {
    console.error('❌ Missing R2 configuration. Please set:')
    console.error('   - R2_ACCESS_KEY_ID')
    console.error('   - R2_SECRET_ACCESS_KEY') 
    console.error('   - R2_BUCKET')
    console.error('   - R2_ACCOUNT_ID or R2_ENDPOINT')
    process.exit(1)
  }

  console.log('📋 Configuration:')
  console.log(`   Bucket: ${R2_BUCKET}`)
  console.log(`   Endpoint: ${R2_ENDPOINT}`)
  console.log(`   Public URL: ${R2_PUBLIC_URL_BASE}`)
  console.log('')

  try {
    // Test bucket access
    console.log('🪣 Testing bucket access...')
    const listResponse = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        MaxKeys: 5,
      })
    )
    
    console.log(`✅ Successfully connected to bucket`)
    console.log(`   Objects found: ${listResponse.KeyCount || 0}`)
    
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      console.log('   Sample objects:')
      listResponse.Contents.slice(0, 3).forEach(obj => {
        console.log(`   - ${obj.Key} (${obj.Size} bytes)`)
      })
    }

    // Test upload with small file
    console.log('\n🔼 Testing upload...')
    const testContent = 'R2 migration test file'
    const testKey = `test/migration-test-${Date.now()}.txt`
    
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain',
      })
    )
    
    console.log(`✅ Successfully uploaded test file: ${testKey}`)
    console.log(`   Public URL: ${R2_PUBLIC_URL_BASE}/${testKey}`)
    
    console.log('\n✅ R2 connection test successful!')
    console.log('\nReady to proceed with migration.')
    
  } catch (error: any) {
    console.error('❌ R2 connection failed:', error.message)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})