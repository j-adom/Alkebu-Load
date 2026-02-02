#!/usr/bin/env tsx

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'

async function main() {
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  const books = await payload.find({
    collection: 'books',
    limit: 0, // Just get count
  })

  const authors = await payload.find({
    collection: 'authors',
    limit: 0,
  })

  const publishers = await payload.find({
    collection: 'publishers',
    limit: 0,
  })

  console.log('\n📊 Import Statistics:\n')
  console.log(`   Books: ${books.totalDocs}`)
  console.log(`   Authors: ${authors.totalDocs}`)
  console.log(`   Publishers: ${publishers.totalDocs}\n`)

  // Get some sample books
  const sampleBooks = await payload.find({
    collection: 'books',
    limit: 5,
    sort: '-createdAt',
  })

  console.log('📚 Recent Books:')
  sampleBooks.docs.forEach((book: any) => {
    console.log(`   - ${book.title}`)
    console.log(`     Authors: ${book.authors?.length || 0} | Editions: ${book.editions?.length || 0} | Confidence: ${book.confidence || 'N/A'}%`)
  })

  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
