#!/usr/bin/env tsx

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'

async function main() {
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  // Get all books and count those with URLs and images
  const { docs: allBooks, totalDocs } = await payload.find({
    collection: 'books',
    limit: 100000,
    pagination: false,
  })

  const withUrls = allBooks.filter(
    (book: any) => book.scrapedImageUrls && book.scrapedImageUrls.length > 0
  ).length

  const withImages = allBooks.filter(
    (book: any) => book.images && book.images.length > 0
  ).length

  console.log('\n📊 Image Statistics:\n')
  console.log(`   Total books: ${totalDocs}`)
  console.log(`   Books with image URLs: ${withUrls} (${((withUrls / totalDocs) * 100).toFixed(1)}%)`)
  console.log(`   Books with uploaded images: ${withImages} (${((withImages / totalDocs) * 100).toFixed(1)}%)`)
  console.log(`   Need processing: ${withUrls - withImages}\n`)

  process.exit(0)
}

main().catch(console.error)
