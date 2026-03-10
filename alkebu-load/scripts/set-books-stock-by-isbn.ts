#!/usr/bin/env tsx

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'
import config from '../src/payload.config.js'

const RAW_OUT_OF_STOCK_ISBNS = `
9780907015758
9781877662034
9780989114516
9781626566743
9781877662089
9781602811249
9780971494909
9780970245885
9780971446229
9780883783511
9780943412061
9781646066445
9781555234577
9781880463123
7f289f56-5272-4
9780943412252
9781402203190
9781684115341
9781624143151
9781585364749
9780977917525
9781312309913
9781684220403
9781653327515
9781419613050
9781882692019
9781535431668
9780907015970
9781241725808
9780997658804
9780943412290
9780943412221
9781491274293
9780962046315
9781544855905
9780963812735
9780692321058
9780759686151
9781650149165
9781454918868
9780883782781
9780907015635
9780883780770
9781530991846
9781930097759
9780931055522
9780943412146
9781701389212
9780684859996
9780692473429
9781393604433
9780883780480
9780913543818
9780801031199
9781439254349
9780448484105
9780982206119
9780960229475
9780943832074
9780986237980
`

const APPLY = process.argv.includes('--apply')
const PAGE_SIZE = 100

type OutToken = {
  raw: string
  rawLower: string
  digits: string
}

const normalizeDigits = (value: string): string => value.replace(/[^0-9xX]/g, '').toUpperCase()

const outTokens: OutToken[] = RAW_OUT_OF_STOCK_ISBNS
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((raw) => ({
    raw,
    rawLower: raw.toLowerCase(),
    digits: normalizeDigits(raw),
  }))

const outByRaw = new Set(outTokens.map((t) => t.rawLower))
const outByDigits = new Set(outTokens.map((t) => t.digits).filter(Boolean))

const matchedRaw = new Set<string>()
const matchedDigits = new Set<string>()

function matchesOutList(value?: string | null): boolean {
  if (!value) return false
  const rawLower = value.trim().toLowerCase()
  const digits = normalizeDigits(value)

  let matched = false
  if (rawLower && outByRaw.has(rawLower)) {
    matchedRaw.add(rawLower)
    matched = true
  }
  if (digits && outByDigits.has(digits)) {
    matchedDigits.add(digits)
    matched = true
  }
  return matched
}

function hasInventoryDelta(current: any, next: any): boolean {
  return (
    Boolean(current?.trackQuantity) !== Boolean(next?.trackQuantity) ||
    Number(current?.stockLevel || 0) !== Number(next?.stockLevel || 0) ||
    Boolean(current?.allowBackorders) !== Boolean(next?.allowBackorders)
  )
}

async function main() {
  console.log(`\n📚 Setting stock from ISBN list (${outTokens.length} identifiers)`)
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`)

  const payload = await getPayload({ config })

  let page = 1
  let totalBooks = 0
  let changedBooks = 0
  let blockedBooks = 0
  let enabledBooks = 0
  let changedEditions = 0

  while (true) {
    const result = await payload.find({
      collection: 'books',
      limit: PAGE_SIZE,
      page,
      depth: 0,
      pagination: true,
    })

    for (const book of result.docs) {
      totalBooks++

      const editions = Array.isArray(book.editions) ? book.editions : []
      if (editions.length === 0) continue

      let editionChanged = false

      const nextEditions = editions.map((edition: any) => {
        const isBlocked =
          matchesOutList(edition?.isbn) ||
          matchesOutList(edition?.isbn10)

        const existingInventory = edition?.inventory || {}
        const existingStock = Number(existingInventory.stockLevel || 0)

        if (isBlocked) {
          const next = {
            ...edition,
            isAvailable: false,
            inventory: {
              ...existingInventory,
              stockLevel: 0,
              allowBackorders: false,
            },
          }

          if (
            edition?.isAvailable !== false ||
            existingStock !== 0 ||
            Boolean(existingInventory.allowBackorders)
          ) {
            editionChanged = true
            changedEditions++
          }

          return next
        }

        const nextStock = existingStock > 0 ? existingStock : 1
        const next = {
          ...edition,
          isAvailable: true,
          inventory: {
            ...existingInventory,
            stockLevel: nextStock,
            allowBackorders: false,
          },
        }

        if (
          edition?.isAvailable !== true ||
          existingStock !== nextStock ||
          Boolean(existingInventory.allowBackorders)
        ) {
          editionChanged = true
          changedEditions++
        }

        return next
      })

      const hasAnyAvailableEdition = nextEditions.some((edition: any) => {
        const stock = Number(edition?.inventory?.stockLevel || 0)
        return edition?.isAvailable !== false && stock > 0
      })

      const nextBookInventory = {
        ...(book.inventory || {}),
        trackQuantity: true,
        stockLevel: hasAnyAvailableEdition
          ? Math.max(
              1,
              nextEditions.reduce(
                (sum: number, edition: any) => sum + Number(edition?.inventory?.stockLevel || 0),
                0,
              ),
            )
          : 0,
        allowBackorders: false,
      }

      const inventoryChanged = hasInventoryDelta(book.inventory, nextBookInventory)
      const shouldUpdate = editionChanged || inventoryChanged

      if (hasAnyAvailableEdition) {
        enabledBooks++
      } else {
        blockedBooks++
      }

      if (!shouldUpdate) continue

      changedBooks++

      if (APPLY) {
        await payload.update({
          collection: 'books',
          id: book.id,
          data: {
            editions: nextEditions,
            inventory: nextBookInventory,
          } as any,
        })
      }
    }

    process.stdout.write(`\rProcessed ${Math.min(totalBooks, result.totalDocs)}/${result.totalDocs} books...`)

    if (!result.hasNextPage) break
    page++
  }

  console.log('\n')
  console.log('Summary')
  console.log('-------')
  console.log(`Total books scanned: ${totalBooks}`)
  console.log(`Books with at least one available edition: ${enabledBooks}`)
  console.log(`Books with all editions out of stock: ${blockedBooks}`)
  console.log(`Books needing updates: ${changedBooks}`)
  console.log(`Edition rows changed: ${changedEditions}`)

  const unmatched = outTokens
    .filter((token) => !matchedRaw.has(token.rawLower) && !matchedDigits.has(token.digits))
    .map((token) => token.raw)

  if (unmatched.length > 0) {
    console.log('\nIdentifiers not found in any edition ISBN/ISBN10:')
    unmatched.forEach((token) => console.log(`- ${token}`))
  } else {
    console.log('\nAll provided identifiers matched at least one book edition.')
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with `--apply` to persist changes.')
  }
}

main().catch((error) => {
  console.error('\n❌ Failed to update book stock:', error)
  process.exit(1)
})
