import type { PayloadRequest } from 'payload'

// Create or find publisher and return ID
export async function createOrFindPublisher(
  payload: any,
  req: PayloadRequest,
  publisherName: string
): Promise<string | null> {
  if (!publisherName || !publisherName.trim()) {
    return null
  }

  const trimmedName = publisherName.trim()

  try {
    console.log(`📚 Processing publisher: "${trimmedName}"`)

    // First, try exact match on name
    const existingPublisher = await payload.find({
      collection: 'publishers',
      where: {
        name: {
          equals: trimmedName
        }
      },
      limit: 1,
      req
    })

    if (existingPublisher.docs.length > 0) {
      console.log(`✅ Found existing publisher: ${existingPublisher.docs[0].name}`)
      return existingPublisher.docs[0].id
    }

    // Create new publisher with basic information
    console.log(`➕ Creating new publisher: "${trimmedName}"`)
    
    const newPublisher = await payload.create({
      collection: 'publishers',
      data: {
        name: trimmedName,
        isActive: true,
        type: 'independent' // Default type, can be updated later
      },
      req
    })

    console.log(`✅ Created publisher: ${trimmedName} (ID: ${newPublisher.id})`)
    return newPublisher.id

  } catch (error) {
    console.error(`❌ Error processing publisher ${trimmedName}:`, error)
    return null
  }
}

// Update publisher's book count and genres (called after book is created/updated)
export async function updatePublisherMetadata(
  payload: any,
  req: PayloadRequest,
  publisherId: string
): Promise<void> {
  try {
    // Find all books from this publisher
    const publisherBooks = await payload.find({
      collection: 'books',
      where: {
        publisher: {
          equals: publisherId
        }
      },
      limit: 1000, // Assuming no publisher has more than 1000 books
      req
    })

    // Extract genres from books
    const allGenres = new Set<string>()
    publisherBooks.docs.forEach((book: any) => {
      if (book.categories) {
        book.categories.forEach((category: string) => allGenres.add(category))
      }
    })

    // Update publisher with book count and specialties
    await payload.update({
      collection: 'publishers',
      id: publisherId,
      data: {
        bookCount: publisherBooks.docs.length,
        specialties: Array.from(allGenres)
      },
      req
    })

    console.log(`📊 Updated publisher metadata: ${publisherBooks.docs.length} books, ${allGenres.size} specialties`)

  } catch (error) {
    console.error(`❌ Error updating publisher metadata:`, error)
  }
}

// Bulk update all publishers' metadata
export async function updateAllPublishersMetadata(
  payload: any,
  req: PayloadRequest
): Promise<void> {
  try {
    console.log('📊 Starting bulk publisher metadata update...')

    // Get all publishers
    const publishers = await payload.find({
      collection: 'publishers',
      limit: 1000,
      req
    })

    console.log(`📊 Updating metadata for ${publishers.docs.length} publishers...`)

    for (const publisher of publishers.docs) {
      await updatePublisherMetadata(payload, req, publisher.id)
    }

    console.log('✅ Bulk publisher metadata update completed')

  } catch (error) {
    console.error('❌ Error in bulk publisher metadata update:', error)
  }
}