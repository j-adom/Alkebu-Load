interface ProductIdentifier {
  type: 'isbn13' | 'isbn10' | 'upc' | 'sku'
  value: string
}

interface EnrichedProductData {
  title: string
  titleLong?: string
  authors?: Array<{ name: string }>
  publisher?: string
  description?: string
  synopsis?: string
  excerpt?: string
  categories?: string[]
  subjects?: Array<{ subject: string }>
  images?: Array<{ url: string }>
  editions: Array<{
    isbn?: string
    isbn10?: string
    binding?: string
    pages?: number
    datePublished?: string
    language?: string
    dimensions?: string
  }>
  importSource: string
}

// ISBNDB API integration
async function enrichWithIsbndb(identifier: ProductIdentifier): Promise<EnrichedProductData | null> {
  if (!process.env.ISBNDB_API_KEY) {
    console.log('⚠️  ISBNDB_API_KEY not configured')
    return null
  }

  let endpoint = ''
  switch (identifier.type) {
    case 'isbn13':
    case 'isbn10':
      endpoint = `https://api2.isbndb.com/book/${identifier.value}`
      break
    default:
      console.log(`⚠️  ISBNDB doesn't support identifier type: ${identifier.type}`)
      return null
  }

  try {
    console.log(`🔍 Querying ISBNDB: ${endpoint}`)
    
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': process.env.ISBNDB_API_KEY
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`📚 Book not found in ISBNDB: ${identifier.value}`)
        return null
      }
      throw new Error(`ISBNDB API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.book) {
      console.log(`📚 No book data returned from ISBNDB: ${identifier.value}`)
      return null
    }

    console.log(`✅ ISBNDB data found for: ${data.book.title}`)
    
    // Transform ISBNDB response to our format (reusing existing logic)
    const { transformIsbndbToPayload } = await import('./bookImport')
    const payloadData = transformIsbndbToPayload({ book: data.book })

    return {
      title: payloadData.title,
      titleLong: payloadData.titleLong,
      authors: payloadData.authorsText,
      publisher: payloadData.publisherText,
      description: payloadData.description,
      synopsis: payloadData.synopsis,
      excerpt: payloadData.excerpt,
      categories: payloadData.categories,
      subjects: payloadData.subjects,
      images: payloadData.scrapedImageUrls,
      editions: payloadData.editions,
      importSource: payloadData.importSource,
    }

  } catch (error) {
    console.error('❌ ISBNDB enrichment failed:', error)
    return null
  }
}

// Google Books API integration
async function enrichWithGoogleBooks(identifier: ProductIdentifier): Promise<EnrichedProductData | null> {
  let query = ''
  switch (identifier.type) {
    case 'isbn13':
    case 'isbn10':
      query = `isbn:${identifier.value}`
      break
    case 'upc':
      // Google Books doesn't typically use UPC, but we can try
      query = identifier.value
      break
    default:
      return null
  }

  try {
    console.log(`🔍 Querying Google Books: ${query}`)
    
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`
    )

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      console.log(`📚 No book found in Google Books: ${identifier.value}`)
      return null
    }

    const bookInfo = data.items[0].volumeInfo
    console.log(`✅ Google Books data found for: ${bookInfo.title}`)

    // Transform Google Books response to our format
    const { transformGoogleBooksToPayload } = await import('./bookImport')
    const payloadData = transformGoogleBooksToPayload(bookInfo, {
      isbn13: identifier.type === 'isbn13' ? identifier.value : undefined,
      isbn10: identifier.type === 'isbn10' ? identifier.value : undefined,
    })

    return {
      title: payloadData.title,
      titleLong: payloadData.titleLong,
      authors: payloadData.authorsText,
      publisher: payloadData.publisherText,
      description: payloadData.description,
      synopsis: payloadData.synopsis,
      categories: payloadData.categories,
      subjects: payloadData.subjects,
      images: payloadData.scrapedImageUrls,
      editions: payloadData.editions,
      importSource: payloadData.importSource,
    }

  } catch (error) {
    console.error('❌ Google Books enrichment failed:', error)
    return null
  }
}

// Open Library API integration (free alternative)
async function enrichWithOpenLibrary(identifier: ProductIdentifier): Promise<EnrichedProductData | null> {
  if (identifier.type !== 'isbn13' && identifier.type !== 'isbn10') {
    return null
  }

  try {
    console.log(`🔍 Querying Open Library: ${identifier.value}`)
    
    const response = await fetch(`https://openlibrary.org/isbn/${identifier.value}.json`)

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`📚 Book not found in Open Library: ${identifier.value}`)
        return null
      }
      throw new Error(`Open Library API error: ${response.status} ${response.statusText}`)
    }

    const bookData = await response.json()
    
    // Get additional work details if available
    let workData = null
    if (bookData.works && bookData.works[0]) {
      const workKey = bookData.works[0].key
      const workResponse = await fetch(`https://openlibrary.org${workKey}.json`)
      if (workResponse.ok) {
        workData = await workResponse.json()
      }
    }

    console.log(`✅ Open Library data found for: ${bookData.title}`)
    
    return transformOpenLibraryToPayload(bookData, workData, identifier)

  } catch (error) {
    console.error('❌ Open Library enrichment failed:', error)
    return null
  }
}

function transformOpenLibraryToPayload(bookData: any, workData: any, identifier: ProductIdentifier): EnrichedProductData {
  // Extract authors
  const authors: Array<{ name: string }> = []
  if (bookData.authors) {
    for (const author of bookData.authors) {
      if (author.name) {
        authors.push({ name: author.name })
      }
    }
  }

  // Extract subjects from work data
  const subjects = (workData?.subjects || []).map((subject: string) => ({ subject }))
  
  return {
    title: bookData.title || '',
    authors,
    publisher: bookData.publishers?.[0],
    description: workData?.description?.value || workData?.description,
    subjects,
    categories: mapOpenLibrarySubjects(workData?.subjects || []),
    images: bookData.covers ? bookData.covers.map((coverId: number) => ({
      url: `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
    })) : [],
    editions: [{
      isbn: identifier.type === 'isbn13' ? identifier.value : undefined,
      isbn10: identifier.type === 'isbn10' ? identifier.value : undefined,
      pages: bookData.number_of_pages,
      datePublished: bookData.publish_date,
      language: 'en' // Open Library doesn't always provide language
    }],
    importSource: 'open-library'
  }
}

function mapOpenLibrarySubjects(subjects: string[]): string[] {
  // Similar mapping logic as Google Books but for Open Library subjects
  const categories: string[] = []
  const subjectText = subjects.join(' ').toLowerCase()
  
  if (subjectText.includes('biography') || subjectText.includes('memoir')) {
    categories.push('biography-autobiography')
  }
  if (subjectText.includes('history') || subjectText.includes('historical')) {
    categories.push('history')
  }
  if (subjectText.includes('fiction') || subjectText.includes('novel')) {
    categories.push('literature-fiction')
  }
  if (subjectText.includes('religion') || subjectText.includes('spiritual')) {
    categories.push('religion-spirituality')
  }
  // Add more mappings as needed...

  return [...new Set(categories)]
}

// Main enrichment function that tries multiple sources
export async function enrichProductFromIdentifiers(identifier: ProductIdentifier): Promise<EnrichedProductData | null> {
  console.log(`🔍 Starting enrichment for ${identifier.type}: ${identifier.value}`)

  // Try enrichment sources in order of preference
  const enrichmentSources = [
    { name: 'ISBNDB', func: enrichWithIsbndb },
    { name: 'Google Books', func: enrichWithGoogleBooks },
    { name: 'Open Library', func: enrichWithOpenLibrary }
  ]

  for (const source of enrichmentSources) {
    try {
      console.log(`🔍 Trying ${source.name}...`)
      const result = await source.func(identifier)
      if (result) {
        console.log(`✅ Successfully enriched with ${source.name}`)
        return result
      }
    } catch (error) {
      console.log(`⚠️  ${source.name} failed:`, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  console.log(`❌ No enrichment data found for ${identifier.type}: ${identifier.value}`)
  return null
}

// Batch enrichment function
export async function batchEnrichProducts(identifiers: ProductIdentifier[]): Promise<Array<EnrichedProductData | null>> {
  console.log(`🔍 Starting batch enrichment for ${identifiers.length} products`)
  
  const results: Array<EnrichedProductData | null> = []
  
  // Process in smaller batches to avoid rate limiting
  const BATCH_SIZE = 5
  const DELAY_MS = 1000 // 1 second delay between batches
  
  for (let i = 0; i < identifiers.length; i += BATCH_SIZE) {
    const batch = identifiers.slice(i, i + BATCH_SIZE)
    console.log(`🔍 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(identifiers.length / BATCH_SIZE)}`)
    
    const batchPromises = batch.map(identifier => enrichProductFromIdentifiers(identifier))
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
    
    // Delay between batches to respect rate limits
    if (i + BATCH_SIZE < identifiers.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  }
  
  const successCount = results.filter(r => r !== null).length
  console.log(`✅ Batch enrichment completed: ${successCount}/${identifiers.length} successful`)
  
  return results
}
