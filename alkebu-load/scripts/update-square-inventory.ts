#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { parse } from 'csv-parse/sync'
import { SquareClient, SquareEnvironment } from 'square'
import { randomUUID } from 'crypto'

dotenv.config({ path: './.env' })

type MatchMode = 'auto' | 'isbn' | 'sku' | 'upc'

interface Options {
  file: string
  sheet?: string
  locationId?: string
  idCol?: string
  qtyCol?: string
  variationIdCol?: string
  match: MatchMode
  apply: boolean
  batchSize: number
  skipZero: boolean
  allowDuplicates: boolean
  environment?: 'production' | 'sandbox'
  state: string
}

type Row = Record<string, string | number | null | undefined>

const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
const normalizeIdentifier = (value: string) =>
  value.replace(/[\s-]+/g, '').toUpperCase()

const ISBN_HEADERS = [
  'isbn',
  'isbn13',
  'isbn_13',
  'isbn-13',
  'isbn10',
  'isbn_10',
  'isbn-10',
  'bookisbn',
  'book isbn',
  'gtin',
  'gtin13',
]

const SKU_HEADERS = [
  'sku',
  'item sku',
  'variation sku',
  'product sku',
  'square sku',
  'seller sku',
]

const UPC_HEADERS = [
  'upc',
  'barcode',
  'ean',
  'ean13',
  'gtin',
  'gtin13',
]

const VARIATION_ID_HEADERS = [
  'square variation id',
  'variation id',
  'item variation id',
  'catalog object id',
  'catalogobjectid',
  'variationid',
  'squarevariationid',
]

const QTY_HEADERS = [
  'quantity',
  'qty',
  'stock',
  'on hand',
  'on_hand',
  'inventory',
  'count',
  'current quantity',
  'current quantity main store',
  'current_quantity',
  'currentquantitymainstore',
  'available',
  'in stock',
  'onhand',
  'qoh',
]

const toCandidates = (values: string[]) => values.map(normalizeHeader)

const ISBN_CANDIDATES = toCandidates(ISBN_HEADERS)
const SKU_CANDIDATES = toCandidates(SKU_HEADERS)
const UPC_CANDIDATES = toCandidates(UPC_HEADERS)
const VARIATION_ID_CANDIDATES = toCandidates(VARIATION_ID_HEADERS)
const QTY_CANDIDATES = toCandidates(QTY_HEADERS)

const usage = `
Update Square POS inventory from CSV/XLSX.

Usage:
  tsx scripts/update-square-inventory.ts <file> [options]

Options:
  --apply                Actually update Square (default: dry-run)
  --dry-run              Do not update Square (default)
  --location-id <id>     Square location ID (or set SQUARE_LOCATION_ID)
  --sheet <name>         Excel sheet name (XLSX only)
  --id-col <name>        Column name for ISBN/SKU/UPC
  --qty-col <name>       Column name for quantity
  --variation-id-col <name>  Column name for Square variation ID
  --match <auto|isbn|sku|upc> Identifier type to prefer (default: auto)
  --batch-size <n>       Changes per batch (default: 100)
  --environment <sandbox|production> Override Square environment
  --skip-zero            Skip rows with quantity 0
  --allow-duplicates     If multiple Square variations share same identifier, pick the first
  --state <IN_STOCK|SOLD|WASTE|RETURNED|TRANSFERRED> Inventory state (default: IN_STOCK)

Examples:
  tsx scripts/update-square-inventory.ts data/inventory.csv --apply --location-id YOUR_LOCATION_ID
  tsx scripts/update-square-inventory.ts data/inventory.xlsx --sheet "Sheet1" --apply
`

const parseArgs = (): Options => {
  const args = process.argv.slice(2)
  const options: Options = {
    file: '',
    match: 'auto',
    apply: false,
    batchSize: 100,
    skipZero: false,
    allowDuplicates: false,
    state: 'IN_STOCK',
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg.startsWith('--') && !options.file) {
      options.file = arg
      continue
    }

    switch (arg) {
      case '--apply':
        options.apply = true
        break
      case '--dry-run':
        options.apply = false
        break
      case '--sheet':
        options.sheet = args[++i]
        break
      case '--location-id':
        options.locationId = args[++i]
        break
      case '--id-col':
        options.idCol = args[++i]
        break
      case '--qty-col':
        options.qtyCol = args[++i]
        break
      case '--variation-id-col':
        options.variationIdCol = args[++i]
        break
      case '--match':
        options.match = (args[++i] as MatchMode) || 'auto'
        break
      case '--batch-size':
        options.batchSize = Math.min(1000, Math.max(1, parseInt(args[++i], 10) || 100))
        break
      case '--environment':
        options.environment = args[++i] as 'production' | 'sandbox'
        break
      case '--skip-zero':
        options.skipZero = true
        break
      case '--allow-duplicates':
        options.allowDuplicates = true
        break
      case '--state':
        options.state = (args[++i] || 'IN_STOCK').toUpperCase()
        break
      case '--help':
        console.log(usage)
        process.exit(0)
      default:
        console.warn(`Unknown option: ${arg}`)
        break
    }
  }

  if (!options.file) {
    console.error(usage)
    process.exit(1)
  }

  return options
}

const resolveSquareConfig = (envValue?: string) => {
  if (!envValue) {
    return { environment: SquareEnvironment.Sandbox }
  }

  const normalized = envValue.toLowerCase()
  if (normalized === 'production') {
    return { environment: SquareEnvironment.Production }
  }
  if (normalized === 'sandbox') {
    return { environment: SquareEnvironment.Sandbox }
  }
  if (envValue.startsWith('http://') || envValue.startsWith('https://')) {
    return { baseUrl: envValue }
  }

  return { environment: SquareEnvironment.Sandbox }
}

const buildHeaderMap = (headers: string[]) => {
  const map = new Map<string, string>()
  for (const header of headers) {
    map.set(normalizeHeader(header), header)
  }
  return map
}

const resolveHeader = (
  headerMap: Map<string, string>,
  explicit: string | undefined,
  candidates: string[],
): string | undefined => {
  if (explicit) {
    const normalized = normalizeHeader(explicit)
    const match = headerMap.get(normalized)
    if (!match) {
      throw new Error(`Column not found: "${explicit}"`)
    }
    return match
  }

  for (const candidate of candidates) {
    const match = headerMap.get(candidate)
    if (match) return match
  }

  return undefined
}

const parseCsvFile = (filePath: string): Row[] => {
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Row[]
}

const parseExcelFile = async (filePath: string, sheetName?: string): Promise<Row[]> => {
  let xlsx: typeof import('xlsx')
  try {
    const module = await import('xlsx')
    xlsx = (module as any).default ?? module
  } catch (error) {
    throw new Error(
      'Missing dependency "xlsx". Install it with: pnpm add xlsx',
    )
  }

  const workbook = xlsx.readFile(filePath)
  const targetSheet = sheetName || workbook.SheetNames[0]

  if (!targetSheet || !workbook.Sheets[targetSheet]) {
    throw new Error(`Sheet not found: "${sheetName}"`)
  }

  const sheet = workbook.Sheets[targetSheet]
  return xlsx.utils.sheet_to_json(sheet, { defval: '' }) as Row[]
}

const loadRows = async (filePath: string, sheet?: string): Promise<Row[]> => {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.csv') return parseCsvFile(filePath)
  if (ext === '.xlsx' || ext === '.xls') return parseExcelFile(filePath, sheet)
  throw new Error(`Unsupported file type: ${ext}. Use .csv or .xlsx`)
}

const parseQuantity = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const raw = String(value).replace(/[^0-9.-]+/g, '')
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return null
  const normalized = Math.trunc(parsed)
  return normalized
}

const resolveLocationId = async (
  client: SquareClient,
  locationId: string | undefined,
): Promise<string> => {
  if (locationId) return locationId

  const response = await client.locations.list()
  const locations = response.locations ?? (response as any).result?.locations ?? []
  if (!locations.length) {
    throw new Error('No Square locations found. Provide --location-id.')
  }

  const active = locations.find((loc: any) => loc.status === 'ACTIVE') ?? locations[0]
  console.log(`Using location: ${active.name} (${active.id})`)
  return active.id
}

const buildVariationIndex = async (
  client: SquareClient,
  match: MatchMode,
): Promise<{ index: Map<string, string[]>; totalVariations: number }> => {
  const index = new Map<string, string[]>()
  const includeSku = match === 'auto' || match === 'sku' || match === 'isbn'
  const includeUpc = match === 'auto' || match === 'upc' || match === 'isbn'

  const addIdentifier = (identifier: string | undefined, variationId: string) => {
    if (!identifier) return
    const key = normalizeIdentifier(String(identifier))
    if (!key) return
    const existing = index.get(key)
    if (existing) {
      if (!existing.includes(variationId)) existing.push(variationId)
    } else {
      index.set(key, [variationId])
    }
  }

  let page = await client.catalog.list({ types: 'ITEM_VARIATION' })
  let totalVariations = 0

  while (true) {
    for (const obj of page.data ?? []) {
      if (obj.type !== 'ITEM_VARIATION' || !obj.itemVariationData) continue
      totalVariations++
      if (includeSku) addIdentifier(obj.itemVariationData.sku, obj.id!)
      if (includeUpc) addIdentifier(obj.itemVariationData.upc, obj.id!)
    }

    if (!page.hasNextPage()) break
    await page.getNextPage()
  }

  return { index, totalVariations }
}

const pickIdentifier = (
  row: Row,
  headerMap: Map<string, string>,
  options: Options,
): string | undefined => {
  if (options.idCol) {
    const value = row[options.idCol]
    return value !== undefined && value !== null ? String(value) : undefined
  }

  const candidates =
    options.match === 'isbn'
      ? ISBN_CANDIDATES
      : options.match === 'sku'
        ? SKU_CANDIDATES
        : options.match === 'upc'
          ? UPC_CANDIDATES
          : [...ISBN_CANDIDATES, ...SKU_CANDIDATES, ...UPC_CANDIDATES]

  for (const candidate of candidates) {
    const header = headerMap.get(candidate)
    if (!header) continue
    const value = row[header]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value)
    }
  }

  return undefined
}

const pickVariationId = (
  row: Row,
  headerMap: Map<string, string>,
  options: Options,
): string | undefined => {
  if (options.variationIdCol) {
    const value = row[options.variationIdCol]
    return value !== undefined && value !== null ? String(value) : undefined
  }

  for (const candidate of VARIATION_ID_CANDIDATES) {
    const header = headerMap.get(candidate)
    if (!header) continue
    const value = row[header]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value)
    }
  }

  return undefined
}

const main = async () => {
  const options = parseArgs()

  if (!process.env.SQUARE_ACCESS_TOKEN) {
    throw new Error('Missing SQUARE_ACCESS_TOKEN in .env')
  }

  const squareConfig = resolveSquareConfig(
    options.environment ?? process.env.SQUARE_ENVIRONMENT,
  )

  const squareClient = new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN!,
    ...squareConfig,
  })

  const filePath = path.resolve(options.file)
  const rows = await loadRows(filePath, options.sheet)

  if (!rows.length) {
    console.log('No rows found in input file.')
    return
  }

  const headers = Object.keys(rows[0])
  const headerMap = buildHeaderMap(headers)

  const idCandidates =
    options.match === 'isbn'
      ? ISBN_CANDIDATES
      : options.match === 'sku'
        ? SKU_CANDIDATES
        : options.match === 'upc'
          ? UPC_CANDIDATES
          : [...ISBN_CANDIDATES, ...SKU_CANDIDATES, ...UPC_CANDIDATES]
  const idHeader = resolveHeader(headerMap, options.idCol, idCandidates)
  const qtyHeader = resolveHeader(headerMap, options.qtyCol, QTY_CANDIDATES)
  const variationIdHeader = resolveHeader(
    headerMap,
    options.variationIdCol,
    VARIATION_ID_CANDIDATES,
  )

  if (!idHeader && !variationIdHeader) {
    throw new Error('Could not detect identifier column. Use --id-col.')
  }
  if (!qtyHeader) {
    throw new Error('Could not detect quantity column. Use --qty-col.')
  }

  options.idCol = idHeader
  options.qtyCol = qtyHeader
  options.variationIdCol = variationIdHeader

  const locationId = await resolveLocationId(
    squareClient,
    options.locationId || process.env.SQUARE_LOCATION_ID,
  )

  console.log(`Loaded ${rows.length} rows from ${filePath}`)
  if (idHeader) console.log(`Identifier column: ${idHeader}`)
  console.log(`Quantity column: ${qtyHeader}`)

  console.log('Building Square variation index (SKU/UPC)...')
  const { index, totalVariations } = await buildVariationIndex(
    squareClient,
    options.match,
  )
  console.log(`Indexed ${index.size} identifiers from ${totalVariations} variations`)

  const changes: any[] = []
  const unresolved: Array<{ row: number; identifier?: string }> = []
  const invalid: number[] = []
  const ambiguous: Array<{ row: number; identifier: string; matches: string[] }> = []
  const duplicates = new Map<string, number>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNumber = i + 2 // account for header row

    const variationId = pickVariationId(row, headerMap, options)
    const identifier = variationId ? undefined : pickIdentifier(row, headerMap, options)

    const qtyValue = row[qtyHeader]
    const quantity = parseQuantity(qtyValue)
    if (quantity === null) {
      invalid.push(rowNumber)
      continue
    }

    if (options.skipZero && quantity === 0) continue
    if (quantity < 0) {
      invalid.push(rowNumber)
      continue
    }

    let resolvedVariationId = variationId
    if (!resolvedVariationId && identifier) {
      const key = normalizeIdentifier(identifier)
      const matches = index.get(key)
      if (!matches || matches.length === 0) {
        unresolved.push({ row: rowNumber, identifier })
        continue
      }
      if (matches.length > 1 && !options.allowDuplicates) {
        ambiguous.push({ row: rowNumber, identifier, matches })
        continue
      }
      resolvedVariationId = matches[0]
    }

    if (!resolvedVariationId) {
      unresolved.push({ row: rowNumber, identifier })
      continue
    }

    const previous = duplicates.get(resolvedVariationId) ?? 0
    duplicates.set(resolvedVariationId, previous + 1)

    changes.push({
      type: 'PHYSICAL_COUNT',
      physicalCount: {
        referenceId: `row-${rowNumber}`,
        catalogObjectId: resolvedVariationId,
        state: options.state,
        locationId,
        quantity: quantity.toString(),
        occurredAt: new Date().toISOString(),
      },
    })
  }

  console.log(`Prepared ${changes.length} inventory changes`)
  console.log(`Unresolved identifiers: ${unresolved.length}`)
  console.log(`Ambiguous identifiers: ${ambiguous.length}`)
  console.log(`Invalid quantities: ${invalid.length}`)

  const duplicateVariations = Array.from(duplicates.entries()).filter(([, count]) => count > 1)
  const dedupedRows = rows.length - invalid.length
  const summaryLines = [
    `Total rows: ${rows.length}`,
    `Rows with valid qty: ${dedupedRows}`,
    `Changes prepared: ${changes.length}`,
    `Unresolved identifiers: ${unresolved.length}`,
    `Ambiguous identifiers: ${ambiguous.length}`,
    `Invalid quantities: ${invalid.length}`,
    `Duplicate variation IDs: ${duplicateVariations.length}`,
  ]

  if (!options.apply) {
    console.log('\nSummary (dry run):')
    summaryLines.forEach((line) => console.log(`- ${line}`))
    if (unresolved.length) {
      console.log(`Unresolved examples: ${unresolved.slice(0, 5).map(item => `row ${item.row}`).join(', ')}`)
    }
    if (ambiguous.length) {
      console.log(`Ambiguous examples: ${ambiguous.slice(0, 5).map(item => `row ${item.row}`).join(', ')}`)
    }
    if (invalid.length) {
      console.log(`Invalid qty rows: ${invalid.slice(0, 5).map(row => `row ${row}`).join(', ')}`)
    }
    console.log('\nDry run only. Use --apply to update Square.')
    return
  }

  const batchSize = options.batchSize
  for (let i = 0; i < changes.length; i += batchSize) {
    const batch = changes.slice(i, i + batchSize)
    await squareClient.inventory.batchCreateChanges({
      idempotencyKey: randomUUID(),
      changes: batch,
      ignoreUnchangedCounts: true,
    })
    console.log(`Applied batch ${Math.floor(i / batchSize) + 1} (${batch.length} changes)`)
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log('\nSummary (applied):')
  summaryLines.forEach((line) => console.log(`- ${line}`))
  if (unresolved.length) {
    console.log(`Unresolved examples: ${unresolved.slice(0, 5).map(item => `row ${item.row}`).join(', ')}`)
  }
  if (ambiguous.length) {
    console.log(`Ambiguous examples: ${ambiguous.slice(0, 5).map(item => `row ${item.row}`).join(', ')}`)
  }
  if (invalid.length) {
    console.log(`Invalid qty rows: ${invalid.slice(0, 5).map(row => `row ${row}`).join(', ')}`)
  }

  console.log('Inventory update completed.')
}

main().catch((error) => {
  console.error('Inventory update failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
