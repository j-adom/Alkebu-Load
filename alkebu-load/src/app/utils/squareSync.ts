import type { PayloadRequest } from 'payload'
import { createReadStream } from 'fs'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import os from 'os'

let _squareClient: any = null
async function getSquareClient() {
  if (!_squareClient) {
    const { SquareClient } = await import('square')
    _squareClient = new SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN!,
      environment: process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
    })
  }
  return _squareClient
}

interface PayloadProduct {
  id: string
  title: string
  description?: string
  squareItemId?: string
  editions: Array<{
    isbn?: string
    squareVariationId?: string
    binding?: string
    price?: number
  }>
  images?: Array<{
    image: string | { id: string; url: string; filename: string }
    alt?: string
    isPrimary?: boolean
  }>
  isActive: boolean
}

// Sync product from Payload to Square
export async function syncProductToSquare(product: PayloadProduct): Promise<boolean> {
  try {
    console.log(`🔄 Syncing product to Square: ${product.title}`)

    if (product.squareItemId) {
      // Update existing Square item
      return await updateSquareItem(product)
    } else {
      // Create new Square item
      return await createSquareItem(product)
    }
  } catch (error) {
    console.error('❌ Error syncing to Square:', error)
    return false
  }
}

async function createSquareItem(product: PayloadProduct): Promise<boolean> {
  try {
    console.log(`➕ Creating new Square item: ${product.title}`)

    // Prepare variations from editions
    const variations = product.editions.map((edition, index) => ({
      type: 'ITEM_VARIATION',
      id: `#variation_${index}`,
      itemVariationData: {
        itemId: '#item',
        name: edition.binding ? `${product.title} (${edition.binding})` : product.title,
        sku: edition.isbn || undefined,
        upc: edition.isbn || undefined,  // Use ISBN as UPC for books
        pricingType: 'FIXED_PRICING',
        priceMoney: edition.price ? {
          amount: BigInt(Math.round(edition.price * 100)), // Convert to cents
          currency: 'USD'
        } : undefined,
        trackInventory: true,
        inventoryAlertType: 'LOW_QUANTITY',
        inventoryAlertThreshold: BigInt(5)
      }
    }))

    // Upload images to Square if available
    const imageIds = await uploadImagesToSquare(product)

    const catalogObject = {
      type: 'ITEM',
      id: '#item',
      itemData: {
        name: product.title,
        descriptionPlaintext: product.description || '',
        variations,
        productType: 'REGULAR',
        skipModifierScreen: false,
        categoryId: undefined, // You could map categories to Square categories
        taxIds: [], // Add tax configuration as needed
        modifierListInfo: [],
        imageIds: imageIds
      }
    }

    const response = await ((await getSquareClient()).catalog as any).upsertObject({
      idempotencyKey: `create_${product.id}_${Date.now()}`,
      object: catalogObject
    })

    if (response.catalogObject) {
      const squareItemId = response.catalogObject.id
      console.log(`✅ Created Square item: ${squareItemId}`)

      // You would typically update the Payload product with the new Square ID here
      // This would require passing the payload instance and req object

      return true
    }

    return false
  } catch (error) {
    console.error('❌ Error creating Square item:', error)
    return false
  }
}

async function updateSquareItem(product: PayloadProduct): Promise<boolean> {
  try {
    console.log(`📝 Updating Square item: ${product.squareItemId}`)

    // First, get the current Square item to preserve data we don't manage
    const currentItemResponse = await ((await getSquareClient()).catalog as any).retrieveObject(
      product.squareItemId!,
      true // Include related objects
    )

    if (!currentItemResponse.object) {
      console.error('❌ Square item not found, cannot update')
      return false
    }

    const currentItem = currentItemResponse.object
    const currentVariations = currentItemResponse.relatedObjects?.filter(
      (obj: any) => obj.type === 'ITEM_VARIATION'
    ) || []

    // Update basic item information
    const updatedItem = {
      ...currentItem,
      itemData: {
        ...currentItem.itemData,
        name: product.title,
        descriptionPlaintext: product.description || currentItem.itemData?.descriptionPlaintext || ''
      }
    }

    // Handle variations - this is complex as it involves matching editions to existing variations
    const updatedVariations = await updateSquareVariations(
      product.editions,
      currentVariations,
      product.squareItemId!
    )

    // Prepare batch upsert for item + variations
    const objects = [updatedItem, ...updatedVariations]

    const response = await ((await getSquareClient()).catalog as any).batchUpsertObjects({
      idempotencyKey: `update_${product.id}_${Date.now()}`,
      batches: [{
        objects
      }]
    })

    if (response.objects) {
      console.log(`✅ Updated Square item with ${response.objects.length} objects`)
      return true
    }

    return false
  } catch (error) {
    console.error('❌ Error updating Square item:', error)
    return false
  }
}

async function updateSquareVariations(
  payloadEditions: PayloadProduct['editions'],
  currentVariations: any[],
  itemId: string
): Promise<any[]> {
  const updatedVariations: any[] = []

  for (const edition of payloadEditions) {
    // Try to find matching existing variation by SKU/UPC or variation ID
    const existingVariation = currentVariations.find(v =>
      (edition.squareVariationId && v.id === edition.squareVariationId) ||
      (edition.isbn && (v.itemVariationData?.sku === edition.isbn || v.itemVariationData?.upc === edition.isbn))
    )

    if (existingVariation) {
      // Update existing variation
      updatedVariations.push({
        ...existingVariation,
        itemVariationData: {
          ...existingVariation.itemVariationData,
          name: edition.binding ? `${edition.binding}` : existingVariation.itemVariationData?.name,
          sku: edition.isbn || existingVariation.itemVariationData?.sku,
          upc: edition.isbn || existingVariation.itemVariationData?.upc,
          priceMoney: edition.price ? {
            amount: BigInt(Math.round(edition.price * 100)),
            currency: 'USD'
          } : existingVariation.itemVariationData?.priceMoney
        }
      })
    } else {
      // Create new variation
      updatedVariations.push({
        type: 'ITEM_VARIATION',
        id: `#new_variation_${edition.isbn || Date.now()}`,
        itemVariationData: {
          itemId: itemId,
          name: edition.binding || 'Standard',
          sku: edition.isbn,
          upc: edition.isbn,
          pricingType: 'FIXED_PRICING',
          priceMoney: edition.price ? {
            amount: BigInt(Math.round(edition.price * 100)),
            currency: 'USD'
          } : undefined,
          trackInventory: true
        }
      })
    }
  }

  return updatedVariations
}

// Delete product from Square
export async function deleteProductFromSquare(squareItemId: string): Promise<boolean> {
  try {
    console.log(`🗑️  Deleting Square item: ${squareItemId}`)

    const response = await ((await getSquareClient()).catalog as any).deleteObject(squareItemId)

    if (response) {
      console.log(`✅ Deleted Square item: ${squareItemId}`)
      return true
    }

    return false
  } catch (error) {
    console.error('❌ Error deleting Square item:', error)
    return false
  }
}

// Batch sync multiple products
export async function batchSyncToSquare(products: PayloadProduct[]): Promise<{
  success: number
  errors: number
  details: string[]
}> {
  console.log(`🔄 Starting batch sync of ${products.length} products to Square`)

  const results = {
    success: 0,
    errors: 0,
    details: [] as string[]
  }

  for (const product of products) {
    try {
      const success = await syncProductToSquare(product)
      if (success) {
        results.success++
        results.details.push(`✅ ${product.title}: Synced successfully`)
      } else {
        results.errors++
        results.details.push(`❌ ${product.title}: Sync failed`)
      }
    } catch (error) {
      results.errors++
      results.details.push(`❌ ${product.title}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Rate limiting - Square has limits on API calls
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`🔄 Batch sync completed: ${results.success} success, ${results.errors} errors`)
  return results
}

// Sync inventory levels from Payload to Square
export async function syncInventoryToSquare(
  squareVariationId: string,
  quantity: number,
  locationId: string
): Promise<boolean> {
  try {
    console.log(`📦 Syncing inventory: ${squareVariationId} = ${quantity}`)

    const response = await ((await getSquareClient()).inventory as any).batchChangeInventory({
      idempotencyKey: `inventory_${squareVariationId}_${Date.now()}`,
      changes: [{
        type: 'PHYSICAL_COUNT',
        physicalCount: {
          catalogObjectId: squareVariationId,
          state: 'IN_STOCK',
          locationId,
          quantity: quantity.toString(),
          occurredAt: new Date().toISOString()
        }
      }]
    })

    if (response.changes) {
      console.log(`✅ Inventory synced for ${squareVariationId}`)
      return true
    }

    return false
  } catch (error) {
    console.error('❌ Error syncing inventory:', error)
    return false
  }
}

// Get Square locations for inventory sync
export async function getSquareLocations(): Promise<Array<{ id: string, name: string }>> {
  try {
    const response = await ((await getSquareClient()).locations as any).list()

    if (response.locations) {
      return response.locations.map((location: any) => ({
        id: location.id!,
        name: location.name || 'Unknown Location'
      }))
    }

    return []
  } catch (error) {
    console.error('❌ Error fetching Square locations:', error)
    return []
  }
}

// Upload images from Payload to Square
async function uploadImagesToSquare(product: PayloadProduct): Promise<string[]> {
  if (!product.images || product.images.length === 0) {
    console.log('📷 No images to upload to Square')
    return []
  }

  const uploadedImageIds: string[] = []

  for (let i = 0; i < product.images.length; i++) {
    const imageData = product.images[i]

    try {
      // Get the image URL - handle both string IDs and populated image objects
      let imageUrl: string
      let imageFilename: string

      if (typeof imageData.image === 'string') {
        console.log(`⚠️ Image ${i + 1} is not populated, skipping`)
        continue
      } else {
        imageUrl = imageData.image.url
        imageFilename = imageData.image.filename || `image-${i + 1}.jpg`
      }

      console.log(`📷 Uploading image ${i + 1}/${product.images.length} to Square: ${imageFilename}`)

      // Download the image from Payload
      const response = await fetch(imageUrl)

      if (!response.ok) {
        console.log(`⚠️ Failed to fetch image: HTTP ${response.status}`)
        continue
      }

      const imageBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(imageBuffer)

      // Create a temporary file for Square upload
      const tempFilePath = path.join(os.tmpdir(), `square-upload-${Date.now()}-${imageFilename}`)
      await writeFile(tempFilePath, buffer)

      try {
        // Upload to Square Catalog Images
        const uploadResponse = await ((await getSquareClient()).catalog as any).createImage({
          idempotencyKey: `image_${product.id}_${i}_${Date.now()}`,
          image: {
            type: 'IMAGE',
            id: `#image_${i}`,
            imageData: {
              name: imageData.alt || `${product.title} - Image ${i + 1}`,
              caption: imageData.alt
            }
          },
          imageFile: createReadStream(tempFilePath)
        })

        if (uploadResponse.image?.id) {
          uploadedImageIds.push(uploadResponse.image.id)
          console.log(`✅ Uploaded image to Square: ${uploadResponse.image.id}`)
        }

      } finally {
        // Clean up temp file
        try {
          await unlink(tempFilePath)
        } catch (_unlinkError) {
          console.log(`⚠️ Failed to delete temp file: ${tempFilePath}`)
        }
      }

    } catch (error) {
      console.error(`❌ Failed to upload image ${i + 1}:`, error)
      // Continue with other images
    }
  }

  console.log(`📷 Uploaded ${uploadedImageIds.length}/${product.images.length} images to Square`)
  return uploadedImageIds
}

// Webhook handlers for Payload collection changes
export const createPayloadWebhookHandlers = (payload: any) => {
  return {
    // Handle product creation in Payload
    afterCreate: async ({ doc, req }: { doc: any, req: PayloadRequest }) => {
      if (process.env.SQUARE_SYNC_ENABLED === 'true') {
        console.log(`🔄 Product created in Payload, syncing to Square: ${doc.title}`)

        try {
          await syncProductToSquare(doc)
        } catch (error) {
          console.error('❌ Failed to sync new product to Square:', error)
        }
      }
    },

    // Handle product updates in Payload
    afterChange: async ({ doc, previousDoc, req }: { doc: any, previousDoc: any, req: PayloadRequest }) => {
      if (process.env.SQUARE_SYNC_ENABLED === 'true' && doc.squareItemId) {
        console.log(`🔄 Product updated in Payload, syncing to Square: ${doc.title}`)

        try {
          await syncProductToSquare(doc)
        } catch (error) {
          console.error('❌ Failed to sync updated product to Square:', error)
        }
      }
    },

    // Handle product deletion in Payload
    afterDelete: async ({ doc, req }: { doc: any, req: PayloadRequest }) => {
      if (process.env.SQUARE_SYNC_ENABLED === 'true' && doc.squareItemId) {
        console.log(`🔄 Product deleted in Payload, removing from Square: ${doc.title}`)

        try {
          await deleteProductFromSquare(doc.squareItemId)
        } catch (error) {
          console.error('❌ Failed to delete product from Square:', error)
        }
      }
    }
  }
}