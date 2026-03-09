import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

const ISBNDB_API_KEY = process.env.ISBNDB_API_KEY || ''
const ISBNDB_BASE_URL = 'https://api2.isbndb.com'
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || ''

interface ISBNdbResponse {
    book?: {
        title?: string
        title_long?: string
        authors?: string[]
        publisher?: string
        date_published?: string
        pages?: number
        overview?: string
        synopsis?: string
        excerpt?: string
        subjects?: string[]
        image?: string
        binding?: string
        dimensions?: string
        language?: string
        isbn?: string
        isbn13?: string
        dewey_decimal?: string
    }
}

async function fetchFromISBNdb(isbn: string): Promise<ISBNdbResponse | null> {
    try {
        const url = `${ISBNDB_BASE_URL}/book/${isbn}`
        const response = await fetch(url, {
            headers: {
                'Authorization': ISBNDB_API_KEY,
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000),
        })

        if (!response.ok) {
            if (response.status === 404) return null
            throw new Error(`API error: ${response.status}`)
        }

        return await response.json() as ISBNdbResponse
    } catch (error) {
        console.error(`ISBNdb fetch error for ${isbn}:`, error)
        return null
    }
}

async function fetchFromGoogleBooks(isbn: string): Promise<any> {
    try {
        if (!GOOGLE_BOOKS_API_KEY) return null

        const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${GOOGLE_BOOKS_API_KEY}`
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) })

        if (!response.ok) throw new Error(`API error: ${response.status}`)
        const data = await response.json() as any

        if (!data.items || data.items.length === 0) return null
        return data.items[0].volumeInfo
    } catch (error) {
        console.error(`Google Books fetch error for ${isbn}:`, error)
        return null
    }
}

function buildEnrichmentUpdate(book: any, isbndbData: ISBNdbResponse | null, googleData: any): { updateData: any, fieldCount: number } {
    const updateData: any = {}
    let fieldCount = 0

    // Prefer ISBNdb, fall back to Google Books
    const source = isbndbData?.book || googleData

    if (!source) {
        return { updateData, fieldCount }
    }

    // Update authors
    if (isbndbData?.book?.authors && !book.authorsText?.length) {
        updateData.authorsText = isbndbData.book.authors.map((name: string) => ({ name }))
        fieldCount++
    }

    // Update publisher
    if (isbndbData?.book?.publisher && !book.publisherText) {
        updateData.publisherText = isbndbData.book.publisher
        fieldCount++
    }

    // Update description/overview
    if (isbndbData?.book?.overview && !book.description) {
        updateData.description = isbndbData.book.overview
        fieldCount++
    } else if (googleData?.description && !book.description) {
        updateData.description = googleData.description
        fieldCount++
    }

    // Update synopsis
    if (isbndbData?.book?.synopsis && !book.synopsis) {
        updateData.synopsis = isbndbData.book.synopsis
        fieldCount++
    }

    // Update excerpt
    if (isbndbData?.book?.excerpt && !book.excerpt) {
        updateData.excerpt = isbndbData.book.excerpt
        fieldCount++
    }

    // Update title_long
    if (isbndbData?.book?.title_long && !book.titleLong) {
        updateData.titleLong = isbndbData.book.title_long
        fieldCount++
    }

    // Update subjects
    if (isbndbData?.book?.subjects && isbndbData.book.subjects.length > 0) {
        updateData.subjects = isbndbData.book.subjects.map((s: string) => ({ subject: s }))
        fieldCount++
    } else if (googleData?.categories && googleData.categories.length > 0) {
        updateData.subjects = googleData.categories.map((c: string) => ({ subject: c }))
        fieldCount++
    }

    // Update binding
    if (isbndbData?.book?.binding && !book.editions?.[0]?.binding) {
        if (!updateData.editions) updateData.editions = book.editions
        if (updateData.editions?.[0]) {
            updateData.editions[0].binding = isbndbData.book.binding
            fieldCount++
        }
    }

    // Update pages
    if (isbndbData?.book?.pages && !book.editions?.[0]?.pages) {
        if (!updateData.editions) updateData.editions = book.editions
        if (updateData.editions?.[0]) {
            updateData.editions[0].pages = isbndbData.book.pages
            fieldCount++
        }
    } else if (googleData?.pageCount && !book.editions?.[0]?.pages) {
        if (!updateData.editions) updateData.editions = book.editions
        if (updateData.editions?.[0]) {
            updateData.editions[0].pages = googleData.pageCount
            fieldCount++
        }
    }

    // Update publication date
    if (isbndbData?.book?.date_published && !book.editions?.[0]?.datePublished) {
        if (!updateData.editions) updateData.editions = book.editions
        if (updateData.editions?.[0]) {
            updateData.editions[0].datePublished = isbndbData.book.date_published
            fieldCount++
        }
    } else if (googleData?.publishedDate && !book.editions?.[0]?.datePublished) {
        if (!updateData.editions) updateData.editions = book.editions
        if (updateData.editions?.[0]) {
            updateData.editions[0].datePublished = googleData.publishedDate
            fieldCount++
        }
    }

    // Always update tracking fields
    updateData.isbndbChecked = true
    updateData.lastEnrichedAt = new Date().toISOString()
    updateData.enrichmentErrors = null

    return { updateData, fieldCount: fieldCount + 2 }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params

        // Get payload instance
        const payload = await getPayload({ config })

        // Verify auth
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get book from database
        const book = await payload.findByID({
            collection: 'books',
            id: id,
        })

        if (!book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 })
        }

        // Get ISBN from first edition
        const isbn = book.editions?.[0]?.isbn
        if (!isbn) {
            return NextResponse.json({
                error: 'No ISBN found for this book',
                success: false
            }, { status: 400 })
        }

        console.log(`🔄 Manual enrichment triggered for book "${book.title}" (ISBN: ${isbn})`)

        // Try ISBNdb first, fall back to Google Books
        const isbndbData = await fetchFromISBNdb(isbn)
        let googleData = null

        if (!isbndbData?.book) {
            console.log(`   ISBNdb miss, trying Google Books...`)
            googleData = await fetchFromGoogleBooks(isbn)
        }

        if (!isbndbData?.book && !googleData) {
            // Mark as checked even if no data found
            const updateData = {
                isbndbChecked: true,
                lastEnrichedAt: new Date().toISOString(),
                enrichmentErrors: 'No data found in ISBNdb or Google Books'
            }

            const updated = await payload.update({
                collection: 'books',
                id: id,
                data: updateData as any,
            })

            return NextResponse.json({
                success: false,
                message: 'No enrichment data found',
                fieldsUpdated: 0,
                book: updated
            })
        }

        // Build update and apply
        const { updateData, fieldCount } = buildEnrichmentUpdate(book, isbndbData, googleData)

        const updated = await payload.update({
            collection: 'books',
            id: id,
            data: updateData as any,
        })

        console.log(`   ✅ Enriched ${fieldCount} fields`)

        return NextResponse.json({
            success: true,
            message: `Successfully enriched ${fieldCount} fields`,
            fieldsUpdated: fieldCount,
            source: isbndbData?.book ? 'ISBNdb' : 'Google Books',
            book: updated
        })
    } catch (error: any) {
        console.error('❌ Enrichment endpoint error:', error)

        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
