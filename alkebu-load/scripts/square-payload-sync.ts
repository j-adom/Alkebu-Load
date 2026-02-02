import { SquareClient } from 'square'
import { config as dotenvConfig } from 'dotenv'
import fs from 'fs'

dotenvConfig()

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!
})

// Safe JSON stringify for BigInt
const safeStringify = (obj: any) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    return value
  }, 2)
}

interface PayloadProduct {
  title: string
  description?: string
  price: number
  currency: string
  sku?: string
  upc?: string
  squareVariationId: string
  squareItemId: string
  variationName?: string
  categoryId?: string
  inventory?: {
    quantity: number
    state: string
    locationId: string
  }
  images?: string[]
  isActive: boolean
  squareVersion: string
  lastSyncAt: string
}

const syncSquareToPayload = async () => {
  console.log('🔄 Starting Square → Payload CMS Sync...\n')
  
  try {
    // Step 1: Get recent orders to find active products
    console.log('📊 Fetching recent orders...')
    const orders = await squareClient.orders.search({
      locationIds: ['LC2AKZX32H2ZA'],
      query: {
        sort: {
          sortField: 'CREATED_AT',
          sortOrder: 'DESC'
        }
      },
      limit: 50 // Get more orders for better coverage
    })
    
    const catalogIds = new Set<string>()
    orders.orders?.forEach(order => {
      order.lineItems?.forEach(item => {
        if (item.catalogObjectId) {
          catalogIds.add(item.catalogObjectId)
        }
      })
    })
    
    console.log(`✅ Found ${catalogIds.size} unique products from ${orders.orders?.length || 0} orders`)
    
    // Step 2: Get catalog data for all products
    console.log('\n📦 Fetching catalog data...')
    const catalogResponse = await squareClient.catalog.batchGet({
      objectIds: Array.from(catalogIds),
      includeRelatedObjects: true
    })
    
    console.log(`✅ Retrieved ${catalogResponse.objects?.length || 0} variations and ${catalogResponse.relatedObjects?.length || 0} items`)
    
    // Step 3: Get inventory data
    console.log('\n📊 Fetching inventory data...')
    const inventoryResponse = await squareClient.inventory.batchGetCounts({
      catalogObjectIds: Array.from(catalogIds),
      locationIds: ['LC2AKZX32H2ZA']
    })
    
    // Parse inventory data properly
    let inventoryCounts: any[] = []
    if (inventoryResponse.data && Array.isArray(inventoryResponse.data)) {
      inventoryCounts = inventoryResponse.data
    } else if (inventoryResponse.counts) {
      inventoryCounts = inventoryResponse.counts
    }
    
    console.log(`✅ Retrieved inventory for ${inventoryCounts.length} items`)
    
    // Step 4: Create mapping between variations and parent items
    const itemsMap = new Map()
    catalogResponse.relatedObjects?.forEach(item => {
      if (item.itemData) {
        itemsMap.set(item.id, item)
      }
    })
    
    // Step 5: Create Payload CMS products
    const payloadProducts: PayloadProduct[] = []
    
    catalogResponse.objects?.forEach(variation => {
      if (variation.type === 'ITEM_VARIATION' && variation.itemVariationData) {
        const parentItem = itemsMap.get(variation.itemVariationData.itemId)
        const inventory = inventoryCounts.find(inv => 
          inv.catalogObjectId === variation.id || inv.catalog_object_id === variation.id
        )
        
        // Calculate price in dollars
        const priceAmount = variation.itemVariationData.priceMoney?.amount
        const price = priceAmount ? Number(priceAmount) / 100 : 0
        
        const product: PayloadProduct = {
          title: variation.itemVariationData.name || parentItem?.itemData?.name || 'Unnamed Product',
          description: parentItem?.itemData?.descriptionPlaintext || parentItem?.itemData?.description,
          price: price,
          currency: variation.itemVariationData.priceMoney?.currency || 'USD',
          sku: variation.itemVariationData.sku,
          upc: variation.itemVariationData.upc,
          squareVariationId: variation.id,
          squareItemId: variation.itemVariationData.itemId,
          variationName: variation.itemVariationData.name,
          categoryId: parentItem?.itemData?.categoryId,
          isActive: !parentItem?.itemData?.isDeleted && variation.presentAtAllLocations !== false,
          squareVersion: variation.version?.toString(),
          lastSyncAt: new Date().toISOString()
        }
        
        // Add inventory if available
        if (inventory) {
          product.inventory = {
            quantity: parseInt(inventory.quantity || inventory.count || '0'),
            state: inventory.state || 'UNKNOWN',
            locationId: inventory.locationId || inventory.location_id || 'LC2AKZX32H2ZA'
          }
        }
        
        // Add images if available
        if (parentItem?.itemData?.imageIds && parentItem.itemData.imageIds.length > 0) {
          product.images = parentItem.itemData.imageIds
        }
        
        payloadProducts.push(product)
      }
    })
    
    console.log(`\n✅ Created ${payloadProducts.length} Payload CMS products`)
    
    // Step 6: Generate different output formats
    
    // 1. Full product data for Payload CMS
    fs.writeFileSync('./payload-products.json', safeStringify(payloadProducts))
    
    // 2. Summary report
    const summary = {
      syncedAt: new Date().toISOString(),
      totalProducts: payloadProducts.length,
      productsWithInventory: payloadProducts.filter(p => p.inventory).length,
      productsWithImages: payloadProducts.filter(p => p.images?.length).length,
      categoriesFound: [...new Set(payloadProducts.map(p => p.categoryId).filter(Boolean))],
      priceRange: {
        min: Math.min(...payloadProducts.map(p => p.price)),
        max: Math.max(...payloadProducts.map(p => p.price)),
        average: payloadProducts.reduce((sum, p) => sum + p.price, 0) / payloadProducts.length
      },
      currencies: [...new Set(payloadProducts.map(p => p.currency))],
      sourceOrders: orders.orders?.length || 0,
      squareLocation: 'LC2AKZX32H2ZA'
    }
    
    fs.writeFileSync('./sync-summary.json', safeStringify(summary))
    
    // 3. Sample Payload CMS collection structure
    const payloadCollection = {
      slug: 'products',
      labels: {
        singular: 'Product',
        plural: 'Products'
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Product Title'
        },
        {
          name: 'description',
          type: 'richText',
          label: 'Description'
        },
        {
          name: 'price',
          type: 'number',
          required: true,
          label: 'Price'
        },
        {
          name: 'currency',
          type: 'select',
          options: ['USD', 'CAD', 'EUR'],
          defaultValue: 'USD',
          label: 'Currency'
        },
        {
          name: 'sku',
          type: 'text',
          label: 'SKU',
          unique: true
        },
        {
          name: 'inventory',
          type: 'group',
          fields: [
            { name: 'quantity', type: 'number', label: 'Quantity' },
            { name: 'state', type: 'text', label: 'State' },
            { name: 'locationId', type: 'text', label: 'Location ID' }
          ]
        },
        {
          name: 'squareData',
          type: 'group',
          label: 'Square Integration',
          fields: [
            { name: 'variationId', type: 'text', label: 'Variation ID' },
            { name: 'itemId', type: 'text', label: 'Item ID' },
            { name: 'version', type: 'text', label: 'Version' },
            { name: 'lastSyncAt', type: 'date', label: 'Last Sync' }
          ]
        },
        {
          name: 'images',
          type: 'array',
          label: 'Product Images',
          fields: [
            { name: 'image', type: 'upload', relationTo: 'media' }
          ]
        },
        {
          name: 'isActive',
          type: 'checkbox',
          defaultValue: true,
          label: 'Active'
        }
      ]
    }
    
    fs.writeFileSync('./payload-collection.json', safeStringify(payloadCollection))
    
    // 4. Sample products for testing
    const sampleProducts = payloadProducts.slice(0, 5).map(product => ({
      ...product,
      // Add some mock additional fields for Payload CMS
      slug: product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      featured: Math.random() > 0.7,
      tags: ['square-import', 'active']
    }))
    
    fs.writeFileSync('./sample-products.json', safeStringify(sampleProducts))
    
    console.log('\n📄 Generated Files:')
    console.log('├── payload-products.json     (Complete product data)')
    console.log('├── sync-summary.json         (Sync statistics)')
    console.log('├── payload-collection.json   (Payload CMS collection schema)')
    console.log('└── sample-products.json      (Sample products for testing)')
    
    console.log('\n📊 Sync Summary:')
    console.log(`├── Products synced: ${summary.totalProducts}`)
    console.log(`├── With inventory: ${summary.productsWithInventory}`)
    console.log(`├── With images: ${summary.productsWithImages}`)
    console.log(`├── Price range: $${summary.priceRange.min.toFixed(2)} - $${summary.priceRange.max.toFixed(2)}`)
    console.log(`└── Average price: $${summary.priceRange.average.toFixed(2)}`)
    
    console.log('\n🎯 Next Steps:')
    console.log('1. Review payload-products.json for your product data')
    console.log('2. Use payload-collection.json to set up your Payload CMS collection')
    console.log('3. Import the products using Payload CMS API or admin panel')
    console.log('4. Set up webhooks for real-time sync (optional)')
    
    return payloadProducts
    
  } catch (error) {
    console.error('❌ Sync failed:', error)
    fs.writeFileSync('./sync-error.json', safeStringify({
      error: error,
      timestamp: new Date().toISOString()
    }))
    throw error
  }
}

// Export for use in other scripts
export { syncSquareToPayload, PayloadProduct }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncSquareToPayload().catch(console.error)
}