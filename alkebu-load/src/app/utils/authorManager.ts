import type { PayloadRequest } from 'payload'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const parseFullName = require('parse-full-name').parseFullName

interface ParsedName {
  first?: string
  middle?: string
  last?: string
  suffix?: string
  title?: string
  nick?: string
}

interface AuthorCandidate {
  id: string
  name: string
  parsedName: ParsedName
  slug: string
}

// Parse author name and create formatted version
function parseAndFormatAuthorName(authorName: string): {
  formattedName: string
  parsedName: ParsedName
  slug: string
} {
  // Parse the full name using parse-full-name
  const parsed = parseFullName(authorName, 'all', 1) as ParsedName
  
  // Create formatted name similar to your previous code
  const formattedName = [
    parsed.title,
    parsed.first,
    parsed.middle,
    parsed.last,
    parsed.suffix
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
  
  // Create slug (similar to your previous slugify approach)
  const slug = formattedName
    .toLowerCase()
    .replace(/[*+~.(),'"!:@]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
  
  return {
    formattedName,
    parsedName: parsed,
    slug
  }
}

// Find potential author matches based on parsed name components
function findAuthorMatches(targetParsed: ParsedName, candidates: AuthorCandidate[]): AuthorCandidate[] {
  const matches: Array<{ candidate: AuthorCandidate, score: number }> = []
  
  for (const candidate of candidates) {
    const score = calculateNameMatchScore(targetParsed, candidate.parsedName)
    if (score > 0.7) { // 70% match threshold
      matches.push({ candidate, score })
    }
  }
  
  // Sort by score (highest first)
  matches.sort((a, b) => b.score - a.score)
  
  return matches.map(m => m.candidate)
}

// Calculate similarity score between two parsed names
function calculateNameMatchScore(name1: ParsedName, name2: ParsedName): number {
  let score = 0
  let maxScore = 0
  
  // Last name is most important (weight: 0.5)
  if (name1.last && name2.last) {
    maxScore += 0.5
    if (name1.last.toLowerCase() === name2.last.toLowerCase()) {
      score += 0.5
    } else if (name1.last.toLowerCase().includes(name2.last.toLowerCase()) || 
               name2.last.toLowerCase().includes(name1.last.toLowerCase())) {
      score += 0.3
    }
  }
  
  // First name is second most important (weight: 0.3)
  if (name1.first && name2.first) {
    maxScore += 0.3
    const first1 = name1.first.toLowerCase()
    const first2 = name2.first.toLowerCase()
    
    if (first1 === first2) {
      score += 0.3
    } else if (first1[0] === first2[0]) { // Same initial
      score += 0.15
    } else if (first1.includes(first2) || first2.includes(first1)) {
      score += 0.2
    }
  }
  
  // Middle name/initial (weight: 0.1)
  if (name1.middle && name2.middle) {
    maxScore += 0.1
    const middle1 = name1.middle.toLowerCase()
    const middle2 = name2.middle.toLowerCase()
    
    if (middle1 === middle2) {
      score += 0.1
    } else if (middle1[0] === middle2[0]) { // Same initial
      score += 0.05
    }
  }
  
  // Suffix (weight: 0.1)
  if (name1.suffix && name2.suffix) {
    maxScore += 0.1
    if (name1.suffix.toLowerCase() === name2.suffix.toLowerCase()) {
      score += 0.1
    }
  }
  
  // Title (weight: 0.05)
  if (name1.title && name2.title) {
    maxScore += 0.05
    if (name1.title.toLowerCase() === name2.title.toLowerCase()) {
      score += 0.05
    }
  }
  
  // Normalize score by maximum possible score
  return maxScore > 0 ? score / maxScore : 0
}

// Create or find authors and return their IDs
export async function createOrFindAuthors(
  payload: any,
  req: PayloadRequest,
  authorNames: string[]
): Promise<string[]> {
  if (!authorNames || authorNames.length === 0) {
    return []
  }

  const authorIds: string[] = []

  // Get all existing authors for intelligent matching
  const allAuthors = await payload.find({
    collection: 'authors',
    limit: 1000, // Assuming you won't have more than 1000 authors
    req
  })

  // Parse existing authors for matching
  const authorCandidates: AuthorCandidate[] = allAuthors.docs.map(author => ({
    id: author.id,
    name: author.name,
    parsedName: parseFullName(author.name, 'all', 1) as ParsedName,
    slug: author.slug
  }))

  for (const authorName of authorNames) {
    const trimmedName = authorName.trim()
    if (!trimmedName) continue

    try {
      console.log(`👤 Processing author: "${trimmedName}"`)
      
      // Parse the incoming author name
      const { formattedName, parsedName, slug } = parseAndFormatAuthorName(trimmedName)
      console.log(`   Formatted as: "${formattedName}"`)
      
      // First, try exact match on formatted name
      const exactMatch = authorCandidates.find(candidate => 
        candidate.name.toLowerCase() === formattedName.toLowerCase()
      )

      let authorId: string

      if (exactMatch) {
        authorId = exactMatch.id
        console.log(`✅ Exact match found: ${exactMatch.name}`)
      } else {
        // Try intelligent name matching
        const matches = findAuthorMatches(parsedName, authorCandidates)
        
        if (matches.length > 0) {
          authorId = matches[0].id
          console.log(`🎯 Smart match found: "${trimmedName}" → "${matches[0].name}" (${matches.length} candidates)`)
        } else {
          // Create new author with properly formatted name
          console.log(`➕ Creating new author: "${formattedName}"`)
          
          const newAuthor = await payload.create({
            collection: 'authors',
            data: {
              name: formattedName,
              slug: slug,
              isActive: true
            },
            req
          })
          
          authorId = newAuthor.id
          console.log(`✅ Created author: ${formattedName} (ID: ${authorId})`)
          
          // Add to candidates for subsequent matches in this batch
          authorCandidates.push({
            id: authorId,
            name: formattedName,
            parsedName: parsedName,
            slug: slug
          })
        }
      }

      authorIds.push(authorId)

    } catch (error) {
      console.error(`❌ Error processing author ${trimmedName}:`, error)
      // Continue with other authors even if one fails
    }
  }

  return authorIds
}

// Update author's book count and genres (called after book is created/updated)
export async function updateAuthorMetadata(
  payload: any,
  req: PayloadRequest,
  authorId: string
): Promise<void> {
  try {
    // Find all books by this author
    const authorBooks = await payload.find({
      collection: 'books',
      where: {
        authors: {
          contains: authorId
        }
      },
      limit: 1000, // Assuming no author has more than 1000 books
      req
    })

    // Extract genres from books
    const allGenres = new Set<string>()
    authorBooks.docs.forEach((book: any) => {
      if (book.categories) {
        book.categories.forEach((category: string) => allGenres.add(category))
      }
    })

    // Update author with book count and genres
    await payload.update({
      collection: 'authors',
      id: authorId,
      data: {
        bookCount: authorBooks.docs.length,
        genres: Array.from(allGenres)
      },
      req
    })

    console.log(`📊 Updated author metadata: ${authorBooks.docs.length} books, ${allGenres.size} genres`)

  } catch (error) {
    console.error(`❌ Error updating author metadata:`, error)
  }
}

// Bulk update all authors' metadata
export async function updateAllAuthorsMetadata(
  payload: any,
  req: PayloadRequest
): Promise<void> {
  try {
    console.log('📊 Starting bulk author metadata update...')

    // Get all authors
    const authors = await payload.find({
      collection: 'authors',
      limit: 1000,
      req
    })

    console.log(`📊 Updating metadata for ${authors.docs.length} authors...`)

    for (const author of authors.docs) {
      await updateAuthorMetadata(payload, req, author.id)
    }

    console.log('✅ Bulk author metadata update completed')

  } catch (error) {
    console.error('❌ Error in bulk author metadata update:', error)
  }
}

// Extract author names from various data sources
export function extractAuthorNames(data: any): string[] {
  const authorNames: string[] = []

  // From enriched data (Google Books, ISBNDB, etc.)
  if (data.authors && Array.isArray(data.authors)) {
    data.authors.forEach((author: any) => {
      if (typeof author === 'string') {
        authorNames.push(author.trim())
      } else if (author.name) {
        authorNames.push(author.name.trim())
      }
    })
  }

  // From authorsText field (raw import data)
  if (data.authorsText && Array.isArray(data.authorsText)) {
    data.authorsText.forEach((author: any) => {
      if (author.name) {
        authorNames.push(author.name.trim())
      }
    })
  }

  // Remove duplicates and empty strings
  return [...new Set(authorNames.filter(name => name.length > 0))]
}