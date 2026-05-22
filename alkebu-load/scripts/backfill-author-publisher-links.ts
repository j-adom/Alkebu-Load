#!/usr/bin/env tsx

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'
import { autoLinkAuthors } from '../src/app/utils/autoEnrichBook'
import { autoLinkPublisher } from '../src/app/utils/autoLinkPublisher'

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })
  const req: any = { payload }

  let scanned = 0
  let authorsLinked = 0
  let publishersLinked = 0
  let skipped = 0
  let failed = 0

  const PAGE_SIZE = 100
  let page = 1

  while (true) {
    const result = await payload.find({
      collection: 'books',
      depth: 1,
      limit: PAGE_SIZE,
      page,
    })

    if (result.docs.length === 0) break

    for (const book of result.docs as any[]) {
      scanned++

      const needsAuthors =
        (!book.authors || book.authors.length === 0) &&
        Array.isArray(book.authorsText) &&
        book.authorsText.length > 0

      const needsPublisher = !book.publisher && book.publisherText?.trim()

      if (!needsAuthors && !needsPublisher) {
        skipped++
        continue
      }

      if (DRY_RUN) {
        if (needsAuthors) authorsLinked++
        if (needsPublisher) publishersLinked++
        console.log(
          `[dry-run] would link ${needsAuthors ? 'authors' : ''}${needsAuthors && needsPublisher ? '+' : ''}${needsPublisher ? 'publisher' : ''} for: ${book.title}`,
        )
        continue
      }

      try {
        if (needsAuthors) {
          await autoLinkAuthors(book, req)
          authorsLinked++
        }
        if (needsPublisher) {
          await autoLinkPublisher(book, req)
          publishersLinked++
        }
      } catch (err) {
        failed++
        console.error(`Failed to link for book ${book.id} (${book.title}):`, err)
      }
    }

    if (page * PAGE_SIZE >= result.totalDocs) break
    page++
  }

  console.log('\n=== Backfill Summary ===')
  console.log(`Mode:                  ${DRY_RUN ? 'DRY RUN' : 'APPLIED'}`)
  console.log(`Books scanned:         ${scanned}`)
  console.log(`Books needing authors: ${authorsLinked}`)
  console.log(`Books needing pub:     ${publishersLinked}`)
  console.log(`Already linked / no-op:${skipped}`)
  console.log(`Failed:                ${failed}`)

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
