#!/usr/bin/env tsx

/**
 * Analyze Book Data Completeness
 * 
 * This script analyzes your book collection to identify missing fields
 * and provides a report on data completeness.
 */

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

import { getPayload } from 'payload'

interface FieldAnalysis {
  fieldName: string
  totalBooks: number
  missing: number
  present: number
  completeness: number
  examples: string[]
}

interface BookAnalysis {
  total: number
  withISBN: number
  withoutISBN: number
  averageCompleteness: number
  fieldAnalysis: FieldAnalysis[]
  mostIncomplete: Array<{
    id: string
    title: string
    missingFields: string[]
    completeness: number
  }>
}

function checkFieldPresence(book: any, fieldPath: string): boolean {
  const parts = fieldPath.split('.')
  let value = book

  for (const part of parts) {
    if (part.includes('[0]')) {
      // Handle array access like 'editions[0].pages'
      const arrayField = part.replace('[0]', '')
      value = value[arrayField]
      if (!value || !Array.isArray(value) || value.length === 0) {
        return false
      }
      value = value[0]
    } else {
      value = value[part]
      if (value === null || value === undefined) {
        return false
      }
    }
  }

  // Additional checks for empty strings and empty arrays
  if (typeof value === 'string' && value.trim() === '') {
    return false
  }
  if (Array.isArray(value) && value.length === 0) {
    return false
  }

  return true
}

function analyzeBook(book: any): { missingFields: string[], completeness: number } {
  const fieldsToCheck = [
    'title',
    'titleLong', 
    'description',
    'synopsis',
    'excerpt',
    'authorsText',
    'publisherText',
    'subjects',
    'deweyDecimal',
    'categories',
    'tags',
    'collections',
    'images',
    'editions[0].isbn',
    'editions[0].pages',
    'editions[0].binding',
    'editions[0].datePublished',
    'editions[0].dimensions',
    'pricing.retailPrice',
    'inventory.stockLevel',
  ]

  const missingFields = []
  let presentCount = 0

  for (const field of fieldsToCheck) {
    if (checkFieldPresence(book, field)) {
      presentCount++
    } else {
      missingFields.push(field)
    }
  }

  const completeness = (presentCount / fieldsToCheck.length) * 100

  return { missingFields, completeness }
}

function analyzeField(books: any[], fieldPath: string, fieldName: string): FieldAnalysis {
  let missing = 0
  let present = 0
  const examples: string[] = []

  for (const book of books) {
    if (checkFieldPresence(book, fieldPath)) {
      present++
      if (examples.length < 3) {
        examples.push(`"${book.title}" (ID: ${book.id})`)
      }
    } else {
      missing++
    }
  }

  return {
    fieldName,
    totalBooks: books.length,
    missing,
    present,
    completeness: (present / books.length) * 100,
    examples,
  }
}

async function main() {
  console.log('📊 Book Data Completeness Analysis\n')

  // Initialize Payload
  console.log('⚡ Initializing Payload...')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })
  console.log('✅ Payload initialized\n')

  // Get all books
  console.log('📚 Fetching all books...')
  const allBooks = []
  let page = 1
  const pageSize = 100

  while (true) {
    const books = await payload.find({
      collection: 'books',
      limit: pageSize,
      page: page,
    })

    allBooks.push(...books.docs)

    if (books.hasNextPage) {
      page++
      console.log(`   Fetched ${allBooks.length} books so far...`)
    } else {
      break
    }
  }

  console.log(`✅ Found ${allBooks.length} total books\n`)

  // Analyze books
  console.log('🔍 Analyzing book completeness...')
  const analysis: BookAnalysis = {
    total: allBooks.length,
    withISBN: 0,
    withoutISBN: 0,
    averageCompleteness: 0,
    fieldAnalysis: [],
    mostIncomplete: [],
  }

  let totalCompleteness = 0
  const incompleteBooks = []

  for (const book of allBooks) {
    const { missingFields, completeness } = analyzeBook(book)
    
    // Check for ISBN
    if (checkFieldPresence(book, 'editions[0].isbn') || checkFieldPresence(book, 'editions[0].isbn10')) {
      analysis.withISBN++
    } else {
      analysis.withoutISBN++
    }

    totalCompleteness += completeness

    if (completeness < 70) { // Consider books under 70% complete as "incomplete"
      incompleteBooks.push({
        id: book.id,
        title: book.title,
        missingFields,
        completeness,
      })
    }
  }

  analysis.averageCompleteness = totalCompleteness / allBooks.length

  // Sort and get most incomplete books
  incompleteBooks.sort((a, b) => a.completeness - b.completeness)
  analysis.mostIncomplete = incompleteBooks.slice(0, 10)

  // Analyze individual fields
  const fieldMappings = [
    { path: 'titleLong', name: 'Long Title' },
    { path: 'description', name: 'Description' },
    { path: 'synopsis', name: 'Synopsis' },
    { path: 'excerpt', name: 'Excerpt' },
    { path: 'authorsText', name: 'Authors' },
    { path: 'publisherText', name: 'Publisher' },
    { path: 'subjects', name: 'Subjects' },
    { path: 'deweyDecimal', name: 'Dewey Decimal' },
    { path: 'categories', name: 'Categories' },
    { path: 'images', name: 'Cover Images' },
    { path: 'editions[0].pages', name: 'Page Count' },
    { path: 'editions[0].binding', name: 'Binding Type' },
    { path: 'editions[0].datePublished', name: 'Publication Date' },
    { path: 'editions[0].dimensions', name: 'Dimensions' },
    { path: 'pricing.retailPrice', name: 'Retail Price' },
  ]

  for (const { path, name } of fieldMappings) {
    analysis.fieldAnalysis.push(analyzeField(allBooks, path, name))
  }

  // Sort by completeness (least complete first)
  analysis.fieldAnalysis.sort((a, b) => a.completeness - b.completeness)

  // Print results
  console.log('\n' + '='.repeat(80))
  console.log('📊 BOOK DATA COMPLETENESS REPORT')
  console.log('='.repeat(80))

  console.log(`\n📚 Collection Overview:`)
  console.log(`├── Total books: ${analysis.total}`)
  console.log(`├── Books with ISBN: ${analysis.withISBN} (${((analysis.withISBN / analysis.total) * 100).toFixed(1)}%)`)
  console.log(`├── Books without ISBN: ${analysis.withoutISBN} (${((analysis.withoutISBN / analysis.total) * 100).toFixed(1)}%)`)
  console.log(`└── Average completeness: ${analysis.averageCompleteness.toFixed(1)}%`)

  console.log(`\n📋 Field Completeness (sorted by missing data):`)
  console.log('┌─' + '─'.repeat(25) + '┬─' + '─'.repeat(10) + '┬─' + '─'.repeat(10) + '┬─' + '─'.repeat(12) + '┐')
  console.log('│ Field Name              │ Present    │ Missing    │ Completeness │')
  console.log('├─' + '─'.repeat(25) + '┼─' + '─'.repeat(10) + '┼─' + '─'.repeat(10) + '┼─' + '─'.repeat(12) + '┤')

  for (const field of analysis.fieldAnalysis) {
    const name = field.fieldName.padEnd(23)
    const present = field.present.toString().padEnd(8)
    const missing = field.missing.toString().padEnd(8)
    const completeness = `${field.completeness.toFixed(1)}%`.padEnd(10)
    
    console.log(`│ ${name} │ ${present} │ ${missing} │ ${completeness} │`)
  }
  console.log('└─' + '─'.repeat(25) + '┴─' + '─'.repeat(10) + '┴─' + '─'.repeat(10) + '┴─' + '─'.repeat(12) + '┘')

  console.log(`\n🔍 Fields with Highest Missing Data:`)
  const worstFields = analysis.fieldAnalysis.filter(f => f.completeness < 50).slice(0, 5)
  if (worstFields.length > 0) {
    for (const field of worstFields) {
      console.log(`├── ${field.fieldName}: ${field.missing}/${field.totalBooks} missing (${field.completeness.toFixed(1)}%)`)
    }
  } else {
    console.log(`└── No fields are missing more than 50% of data! 🎉`)
  }

  if (analysis.mostIncomplete.length > 0) {
    console.log(`\n📋 Most Incomplete Books (< 70% complete):`)
    for (const book of analysis.mostIncomplete.slice(0, 5)) {
      console.log(`├── "${book.title}" (${book.completeness.toFixed(1)}% complete)`)
      console.log(`│   Missing: ${book.missingFields.slice(0, 5).join(', ')}${book.missingFields.length > 5 ? '...' : ''}`)
    }
    
    if (analysis.mostIncomplete.length > 5) {
      console.log(`└── ... and ${analysis.mostIncomplete.length - 5} more incomplete books`)
    }
  }

  console.log(`\n💡 Recommendations:`)
  
  const booksWithISBNButIncomplete = incompleteBooks.filter(book => {
    const fullBook = allBooks.find(b => b.id === book.id)
    return checkFieldPresence(fullBook, 'editions[0].isbn') || checkFieldPresence(fullBook, 'editions[0].isbn10')
  })

  if (booksWithISBNButIncomplete.length > 0) {
    console.log(`├── 🎯 ${booksWithISBNButIncomplete.length} books have ISBNs but incomplete data`)
    console.log(`│   These are prime candidates for ISBNdb enrichment!`)
    console.log(`│   Run: tsx scripts/enrich-books-with-isbndb.ts --limit 50`)
  }

  const worstField = analysis.fieldAnalysis[0]
  if (worstField.completeness < 30) {
    console.log(`├── 📝 Focus on "${worstField.fieldName}" field - only ${worstField.completeness.toFixed(1)}% complete`)
  }

  if (analysis.withoutISBN > 0) {
    console.log(`└── 📚 ${analysis.withoutISBN} books lack ISBNs - manual data entry needed`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n✅ Analysis complete!')

  process.exit(0)
}

main().catch(error => {
  console.error('❌ Analysis failed:', error)
  process.exit(1)
})