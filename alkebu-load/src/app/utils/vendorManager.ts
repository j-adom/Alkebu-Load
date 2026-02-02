import type { PayloadRequest } from 'payload'

// Create or find vendor and return ID
export async function createOrFindVendor(
  payload: any,
  req: PayloadRequest,
  vendorName: string
): Promise<string | null> {
  if (!vendorName || !vendorName.trim()) {
    return null
  }

  const trimmedName = vendorName.trim()

  try {
    console.log(`🏪 Processing vendor: "${trimmedName}"`)

    // First, try exact match on name
    const existingVendor = await payload.find({
      collection: 'vendors',
      where: {
        name: {
          equals: trimmedName
        }
      },
      limit: 1,
      req
    })

    if (existingVendor.docs.length > 0) {
      console.log(`✅ Found existing vendor: ${existingVendor.docs[0].name}`)
      return existingVendor.docs[0].id
    }

    // Create new vendor with basic information
    console.log(`➕ Creating new vendor: "${trimmedName}"`)
    
    const newVendor = await payload.create({
      collection: 'vendors',
      data: {
        name: trimmedName,
        isActive: true,
        type: 'distributor' // Default type, can be updated later
      },
      req
    })

    console.log(`✅ Created vendor: ${trimmedName} (ID: ${newVendor.id})`)
    return newVendor.id

  } catch (error) {
    console.error(`❌ Error processing vendor ${trimmedName}:`, error)
    return null
  }
}

// Update vendor's product count (called after product is created/updated)
export async function updateVendorMetadata(
  payload: any,
  req: PayloadRequest,
  vendorId: string
): Promise<void> {
  try {
    // Find all products from this vendor across different collections
    const [books, wellness, fashion] = await Promise.all([
      payload.find({
        collection: 'books',
        where: { vendor: { equals: vendorId } },
        limit: 1000,
        req
      }),
      payload.find({
        collection: 'wellness-lifestyle',
        where: { vendor: { equals: vendorId } },
        limit: 1000,
        req
      }),
      payload.find({
        collection: 'fashion-jewelry',
        where: { vendor: { equals: vendorId } },
        limit: 1000,
        req
      })
    ])

    const totalProducts = books.docs.length + wellness.docs.length + fashion.docs.length

    // Extract categories from products
    const allCategories = new Set<string>()
    
    // Add categories from books
    books.docs.forEach((book: any) => {
      if (book.categories) {
        book.categories.forEach((category: string) => allCategories.add(category))
      }
    })
    
    // Add categories from wellness products
    wellness.docs.forEach((product: any) => {
      if (product.categories) {
        product.categories.forEach((category: string) => allCategories.add(category))
      }
    })
    
    // Add categories from fashion products (using availableProductTypes as categories)
    fashion.docs.forEach((product: any) => {
      if (product.availableProductTypes) {
        product.availableProductTypes.forEach((type: string) => allCategories.add(type))
      }
    })

    // Update vendor with product count and categories
    await payload.update({
      collection: 'vendors',
      id: vendorId,
      data: {
        productCount: totalProducts,
        categories: Array.from(allCategories)
      },
      req
    })

    console.log(`📊 Updated vendor metadata: ${totalProducts} products, ${allCategories.size} categories`)

  } catch (error) {
    console.error(`❌ Error updating vendor metadata:`, error)
  }
}

// Bulk update all vendors' metadata
export async function updateAllVendorsMetadata(
  payload: any,
  req: PayloadRequest
): Promise<void> {
  try {
    console.log('📊 Starting bulk vendor metadata update...')

    // Get all vendors
    const vendors = await payload.find({
      collection: 'vendors',
      limit: 1000,
      req
    })

    console.log(`📊 Updating metadata for ${vendors.docs.length} vendors...`)

    for (const vendor of vendors.docs) {
      await updateVendorMetadata(payload, req, vendor.id)
    }

    console.log('✅ Bulk vendor metadata update completed')

  } catch (error) {
    console.error('❌ Error in bulk vendor metadata update:', error)
  }
}