import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { buildBookMetadataPatch, type GoogleBooksVolumeInfo, type IsbndbBook } from '@/app/utils/bookImport'

const ISBNDB_API_KEY = process.env.ISBNDB_API_KEY || ''
const ISBNDB_BASE_URL = 'https://api2.isbndb.com'
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || ''

interface ISBNdbResponse {
    book?: IsbndbBook
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

async function fetchFromGoogleBooks(isbn: string): Promise<GoogleBooksVolumeInfo | null> {
    try {
        if (!GOOGLE_BOOKS_API_KEY) return null

        const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${GOOGLE_BOOKS_API_KEY}`
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) })

        if (!response.ok) throw new Error(`API error: ${response.status}`)
        const data = await response.json() as any

        if (!data.items || data.items.length === 0) return null
        return data.items[0].volumeInfo as GoogleBooksVolumeInfo
    } catch (error) {
        console.error(`Google Books fetch error for ${isbn}:`, error)
        return null
    }
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
        let googleData: GoogleBooksVolumeInfo | null = null

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
        const { updateData, fieldsUpdated } = buildBookMetadataPatch(book, {
            isbndbBook: isbndbData?.book,
            googleVolumeInfo: googleData,
            markChecked: true,
        })
        ;(updateData as any).enrichmentErrors = null

        const updated = await payload.update({
            collection: 'books',
            id: id,
            data: updateData as any,
        })

        console.log(`   ✅ Enriched ${fieldsUpdated} fields`)

        return NextResponse.json({
            success: true,
            message: `Successfully enriched ${fieldsUpdated} fields`,
            fieldsUpdated,
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
