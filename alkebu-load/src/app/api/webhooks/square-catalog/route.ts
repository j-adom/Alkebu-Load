import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { SquareClient } from 'square'
import { enrichProductFromIdentifiers } from '../../../utils/productEnrichment'
import { downloadAndUploadImages as downloadAndUploadImagesUtil } from '../../../utils/imageManager'
import { createOrFindAuthors, updateAuthorMetadata, extractAuthorNames } from '../../../utils/authorManager'
import { createOrFindPublisher, updatePublisherMetadata } from '../../../utils/publisherManager'
import { createOrFindVendor, updateVendorMetadata } from '../../../utils/vendorManager'
import { extractAndCreateVendor } from '../../../utils/squareVendorExtractor'

// Wrapper function to match expected interface
async function enrichProduct(isbn: string) {
  const identifier = {
    type: isbn.length === 13 ? 'isbn13' : 'isbn10' as 'isbn13' | 'isbn10',
    value: isbn
  }

  const enrichedData = await enrichProductFromIdentifiers(identifier)

  if (!enrichedData) {
    return null
  }

  // Transform to match expected format
  return {
    title: enrichedData.title,
    titleLong: enrichedData.titleLong,
    authors: enrichedData.authors,
    publisher: enrichedData.publisher,
    description: enrichedData.description,
    synopsis: enrichedData.synopsis,
    categories: enrichedData.categories,
    subjects: enrichedData.subjects,
    editions: enrichedData.editions,
    coverUrls: enrichedData.images?.map(img => img.url) || [],
    importSource: enrichedData.importSource
  }
}

// Wrapper function for image downloads
async function downloadAndUploadImages(urls: string[], payload: any) {
  const imageSources = urls.map(url => ({ url, alt: 'Book cover' }))
  const req = { user: null } as any
  return await downloadAndUploadImagesUtil(payload, req, imageSources, 'Product')
}

// Initialize Square client
const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!
})

// Test client initialization
console.log('🔧 Square client initialized:', !!squareClient.catalog)

interface SquareWebhookEvent {
  type: string
  merchant_id: string
  data?: {
    type?: string
    id?: string
    object?: {
      catalog_version?: {
        updated_at: string
      }
    }
  }
  created_at?: string
}

export async function POST(request: NextRequest) {
  console.log('📦 Square webhook endpoint hit')

  try {
    const payload = await getPayload({ config })

    // Handle empty body
    let webhookEvent: SquareWebhookEvent
    try {
      const text = await request.text()
      if (!text) {
        console.log('⚠️ Empty webhook body received')
        return NextResponse.json({ received: true })
      }
      webhookEvent = JSON.parse(text)
    } catch (parseError) {
      console.error('❌ Failed to parse webhook body:', parseError)
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Log the received event
    console.log('📦 Square catalog webhook received:', {
      type: webhookEvent.type,
      merchant_id: webhookEvent.merchant_id,
      version: webhookEvent.data?.object?.catalog_version?.updated_at,
      updated_at: webhookEvent.created_at || new Date().toISOString()
    })

    // Only process catalog update events
    if (webhookEvent.type !== 'catalog.version.updated') {
      return NextResponse.json({ received: true })
    }

    // Fetch recent catalog changes
    const now = new Date()
    const beginTime = new Date(now.getTime() - 5 * 60 * 1000).toISOString() // Last 5 minutes

    console.log('🔍 Fetching catalog changes since:', beginTime)

    // Use catalog.list to get items (matching your working script)
    console.log('🔍 Making Square catalog API call...')
    console.log('🔧 Environment check:', {
      hasToken: !!process.env.SQUARE_ACCESS_TOKEN,
      tokenPrefix: process.env.SQUARE_ACCESS_TOKEN?.substring(0, 10) + '...',
      squareEnv: process.env.SQUARE_ENVIRONMENT
    })

    const allItems: any[] = []
    const imageObjectsMap = new Map<string, any>()

    try {
      console.log('🔍 Fetching catalog items with pagination...')

      // Use pagination to get all items and related objects (including images)
      const catalogResponse = await squareClient.catalog.list({
        types: 'ITEM,IMAGE',
      })

      console.log('✅ Square API call successful')
      console.log('📊 First page - Objects found:', catalogResponse.data?.length || 0)
      console.log('🔄 Has more pages:', catalogResponse.hasNextPage())

      // Collect all items and images from all pages
      for await (const obj of catalogResponse) {
        if (obj.type === 'ITEM') {
          allItems.push(obj)
        } else if (obj.type === 'IMAGE') {
          imageObjectsMap.set(obj.id, obj)
        }
      }

      console.log(`📦 Total items collected across all pages: ${allItems.length}`)

      // If still no items, try fetching all catalog types
      if (allItems.length === 0) {
        console.log('🔍 No ITEM types found, trying all catalog types...')
        const allTypesPager = await squareClient.catalog.list()

        const allObjects: any[] = []
        for await (const obj of allTypesPager) {
          allObjects.push(obj)
        }

        console.log('📦 All catalog objects found:', allObjects.length)
        if (allObjects.length > 0) {
          console.log('📋 Found catalog objects of types:',
            [...new Set(allObjects.map(obj => obj.type))]
          )

          // Show first few objects for debugging
          allObjects.slice(0, 3).forEach((obj, index) => {
            console.log(`${index + 1}. Type: ${obj.type}, ID: ${obj.id}`)
            if (obj.itemData) {
              console.log(`   Item: ${obj.itemData.name}`)
            }
          })
        }
      }

    } catch (squareError) {
      console.error('❌ Square API call failed:', squareError)
      console.error('❌ Error details:', {
        message: squareError instanceof Error ? squareError.message : 'Unknown error',
        stack: squareError instanceof Error ? squareError.stack : undefined
      })
      return NextResponse.json(
        { error: 'Square API error', details: squareError instanceof Error ? squareError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    if (allItems.length === 0) {
      console.log('📭 No catalog items found')
      return NextResponse.json({ received: true, processed: 0 })
    }

    console.log(`📚 Found ${allItems.length} catalog items`)

    // Process each item
    let processed = 0
    for (const item of allItems) {
      try {
        console.log(`\n🔄 Processing item: ${item.itemData?.name || 'Unknown'}`)

        // Check if item was recently updated
        if (item.updatedAt) {
          const itemUpdatedAt = new Date(item.updatedAt)
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

          if (itemUpdatedAt < fiveMinutesAgo) {
            console.log('⏭️ Skipping - not recently updated')
            continue
          }
        }

        // Determine which collection to use - default to books for now
        const collection = determineCollection(item)

        // Find existing product by Square ID
        const existingProduct = await payload.find({
          collection: collection as any,
          where: {
            squareItemId: {
              equals: item.id
            }
          },
          limit: 1
        })

        // Create base product data based on collection type
        let productData: any = {
          squareItemId: item.id,
          importSource: 'square-webhook',
          isActive: true,
          lastSyncedAt: new Date().toISOString(),
        }

        // Set name/title based on collection
        if (collection === 'books') {
          productData.title = item.itemData?.name || 'Unknown Product'

          // Create editions from variations for books
          if (item.itemData?.variations) {
            productData.editions = item.itemData.variations.map((variation: any) => ({
              squareVariationId: variation.id,
              isbn: variation.itemVariationData?.sku || variation.itemVariationData?.upc || '',
              publisher: productData.publisher || 'Unknown Publisher', // Required field
              binding: 'paperback', // Default
              isAvailable: true,
              price: variation.itemVariationData?.priceMoney?.amount
                ? Number(variation.itemVariationData.priceMoney.amount) / 100
                : undefined
            }))
          }
        } else {
          // For other collections (wellness-lifestyle, fashion-jewelry)
          productData.name = item.itemData?.name || 'Unknown Product'

          // Create variations from variations for other collections
          if (item.itemData?.variations) {
            productData.variations = item.itemData.variations.map((variation: any) => ({
              squareVariationId: variation.id,
              sku: variation.itemVariationData?.sku || variation.itemVariationData?.upc || '',
              isAvailable: true,
              price: variation.itemVariationData?.priceMoney?.amount
                ? Number(variation.itemVariationData.priceMoney.amount) / 100
                : undefined
            }))
          }
        }

        // Look for ISBN/UPC in variations for enrichment
        let isbn: string | undefined
        for (const variation of item.itemData?.variations || []) {
          const potentialIsbn = variation.itemVariationData?.upc || variation.itemVariationData?.sku
          if (potentialIsbn && isValidIsbn(potentialIsbn)) {
            isbn = potentialIsbn
            break
          }
        }

        // If we have an ISBN and this is a book, enrich the product
        if (isbn && collection === 'books') {
          console.log(`📖 Found ISBN/UPC: ${isbn}`)
          try {
            const enrichedData = await enrichProduct(isbn)

            if (enrichedData) {
              productData = { ...productData, ...enrichedData }
              console.log('✅ Product enriched successfully')

              // Store raw author names for reference
              if (enrichedData.authors) {
                productData.authorsText = enrichedData.authors
              }

              // Create or find authors and get their IDs
              const authorNames = extractAuthorNames(enrichedData)
              if (authorNames.length > 0) {
                console.log(`👥 Processing ${authorNames.length} authors:`, authorNames)
                const req = { user: null } as any // Create minimal req object
                const authorIds = await createOrFindAuthors(payload, req, authorNames)

                if (authorIds.length > 0) {
                  productData.authors = authorIds
                  console.log(`✅ Linked ${authorIds.length} authors to book`)
                }
              }

              // Create or find publisher and get ID
              if (enrichedData.publisher) {
                console.log(`📚 Processing publisher: "${enrichedData.publisher}"`)
                const req = { user: null } as any
                const publisherId = await createOrFindPublisher(payload, req, enrichedData.publisher)

                if (publisherId) {
                  productData.publisher = publisherId
                  productData.publisherText = enrichedData.publisher // Keep text for reference
                  console.log(`✅ Linked publisher to book`)
                } else {
                  productData.publisherText = enrichedData.publisher // Store as text if relationship creation fails
                }
              }

              // Update editions with enriched publisher info
              if (productData.editions && productData.publisher) {
                productData.editions = productData.editions.map((edition: any) => ({
                  ...edition,
                  publisher: productData.publisher,
                  publisherText: enrichedData.publisher
                }))
              }

              // Store image URLs for manual processing later
              if (enrichedData.coverUrls && enrichedData.coverUrls.length > 0) {
                console.log(`📷 Found ${enrichedData.coverUrls.length} cover URLs:`, enrichedData.coverUrls)
                productData.scrapedImageUrls = enrichedData.coverUrls.map((url: string) => ({ url }))
                console.log('📝 Stored image URLs for later processing')

                // Download and upload images from enriched book data
                try {
                  const uploadedImages = await downloadAndUploadImages(
                    enrichedData.coverUrls,
                    payload
                  )

                  if (uploadedImages.length > 0) {
                    productData.images = uploadedImages.map((img: any, index: number) => ({
                      image: img.id,
                      alt: `${productData.title || productData.name} - Image ${index + 1}`,
                      isPrimary: index === 0
                    }))
                    console.log(`🖼️ Uploaded ${uploadedImages.length} images from book APIs`)
                  }
                } catch (imageError) {
                  console.error('❌ Error processing book cover images:', imageError)
                }
              }
            }
          } catch (enrichError) {
            console.error('❌ Error enriching product:', enrichError)
          }
        }

        // Download images from Square if available
        try {
          if (item.itemData?.imageIds && item.itemData.imageIds.length > 0) {
            console.log(`📷 Found ${item.itemData.imageIds.length} Square image IDs`)

            const squareImages = await downloadSquareImages(
              payload,
              imageObjectsMap,
              item.itemData.imageIds,
              productData.title || productData.name || 'Unknown Product'
            )

            if (squareImages.length > 0) {
              // Merge with existing images or replace if none from book enrichment
              if (!productData.images || productData.images.length === 0) {
                productData.images = squareImages
                console.log(`🖼️ Uploaded ${squareImages.length} images from Square`)
              } else {
                // Append Square images to enriched images
                productData.images.push(...squareImages)
                console.log(`🖼️ Added ${squareImages.length} Square images to existing ${productData.images.length - squareImages.length} images`)
              }
            }
          }
        } catch (squareImageError) {
          console.error('❌ Error downloading Square images:', squareImageError)
        }

        // Extract vendor information from Square item data
        console.log('🏪 Extracting vendor information from Square data...')
        const req = { user: null } as any
        const vendorId = await extractAndCreateVendor(payload, req, item)

        if (vendorId) {
          productData.vendor = vendorId
          console.log('✅ Vendor assigned to product')
        } else {
          console.log('⚠️ No vendor could be determined from Square data')
        }

        // Create or update product in Payload
        let savedProduct
        if (existingProduct.docs.length > 0) {
          savedProduct = await payload.update({
            collection: collection as any,
            id: existingProduct.docs[0].id,
            data: productData
          })
          console.log('✅ Product updated in Payload')
        } else {
          savedProduct = await payload.create({
            collection: collection as any,
            data: productData
          })
          console.log('✅ Product created in Payload')
        }

        // Update author metadata if this is a book with authors
        if (collection === 'books' && productData.authors && productData.authors.length > 0) {
          console.log('📊 Updating author metadata...')
          const req = { user: null } as any

          for (const authorId of productData.authors) {
            await updateAuthorMetadata(payload, req, authorId)
          }

          console.log('✅ Author metadata updated')
        }

        // Update publisher metadata if this is a book with a publisher
        if (collection === 'books' && productData.publisher) {
          console.log('📊 Updating publisher metadata...')
          const req = { user: null } as any
          await updatePublisherMetadata(payload, req, productData.publisher)
          console.log('✅ Publisher metadata updated')
        }

        // Update vendor metadata if product has a vendor
        if (productData.vendor) {
          console.log('📊 Updating vendor metadata...')
          const req = { user: null } as any
          await updateVendorMetadata(payload, req, productData.vendor)
          console.log('✅ Vendor metadata updated')
        }

        processed++
      } catch (itemError) {
        console.error(`❌ Error processing item ${item.id}:`, itemError)
      }
    }

    console.log(`\n✅ Webhook processing complete. Processed ${processed} items.`)

    return NextResponse.json({
      received: true,
      processed,
      total: allItems.length
    })

  } catch (error) {
    console.error('❌ Square webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Download and upload Square images to Payload Media collection
async function downloadSquareImages(
  payload: any,
  imageObjectsMap: Map<string, any>,
  imageIds: string[],
  productTitle: string
): Promise<Array<{ image: string; alt: string; isPrimary: boolean }>> {
  const uploadedImages: Array<{ image: string; alt: string; isPrimary: boolean }> = []

  for (let i = 0; i < imageIds.length; i++) {
    const imageId = imageIds[i]

    try {
      console.log(`📷 Processing Square image ${i + 1}/${imageIds.length}: ${imageId}`)

      // Get image object from the map
      const imageObject = imageObjectsMap.get(imageId)

      if (!imageObject?.imageData?.url) {
        console.log(`⚠️ No URL found for image ${imageId}`)
        continue
      }

      const imageUrl = imageObject.imageData.url
      const imageName = imageObject.imageData.name || `${productTitle} - Image ${i + 1}`

      console.log(`📥 Downloading image from: ${imageUrl}`)

      // Download the image
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'AlkebuBot/1.0 (Square Image Sync)'
        }
      })

      if (!response.ok) {
        console.log(`⚠️ Failed to download image: HTTP ${response.status}`)
        continue
      }

      const contentType = response.headers.get('content-type')
      if (!contentType?.startsWith('image/')) {
        console.log(`⚠️ Invalid content type: ${contentType}`)
        continue
      }

      // Get the image buffer
      const imageBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(imageBuffer)

      // Generate filename
      const extension = getImageExtension(contentType) || 'jpg'
      const sanitizedTitle = sanitizeFilename(productTitle)
      const filename = `${sanitizedTitle}-square-${i + 1}.${extension}`

      // Create file object in the format Payload expects
      const fileObject = {
        data: buffer,
        name: filename,
        mimetype: contentType,
        size: buffer.length
      }

      // Upload to Payload Media collection
      const req = { user: null } as any
      const uploadResult = await payload.create({
        collection: 'media',
        data: {
          alt: imageName
        },
        file: fileObject,
        req
      })

      uploadedImages.push({
        image: uploadResult.id,
        alt: imageName,
        isPrimary: i === 0
      })

      console.log(`✅ Successfully uploaded Square image: ${filename}`)

    } catch (error) {
      console.error(`❌ Failed to process Square image ${imageId}:`, error)
      // Continue with other images even if one fails
    }
  }

  return uploadedImages
}

function getImageExtension(contentType: string): string | null {
  const extensionMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg'
  }

  return extensionMap[contentType.toLowerCase()] || null
}

function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 50) // Limit length
}

// Determine which collection to use based on item data
function determineCollection(item: any): string {
  // Match the actual collection slugs from your collections
  const itemName = item.itemData?.name?.toLowerCase() || ''

  if (itemName.includes('oil') || itemName.includes('incense')) {
    return 'oils-incense'
  }
  if (itemName.includes('jewelry') || itemName.includes('fashion')) {
    return 'fashion-jewelry'
  }
  if (itemName.includes('wellness') || itemName.includes('lifestyle')) {
    return 'wellness-lifestyle'
  }

  return 'books' // Default
}

// Validate if a string is a valid ISBN
function isValidIsbn(isbn: string): boolean {
  const cleanIsbn = isbn.replace(/[-\s]/g, '')

  // ISBN-13 (13 digits)
  if (/^\d{13}$/.test(cleanIsbn)) return true

  // ISBN-10 (9 digits + check digit which can be X)
  if (/^\d{9}[\dX]$/i.test(cleanIsbn)) return true

  return false
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'square-catalog-webhook',
    timestamp: new Date().toISOString()
  })
}