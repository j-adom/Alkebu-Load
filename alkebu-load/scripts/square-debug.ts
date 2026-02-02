import { SquareClient } from 'square'
import { config as dotenvConfig } from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenvConfig()

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!
})

// Safe JSON stringify that handles BigInt and circular references
const safeStringify = (obj: any, indent = 2) => {
  const seen = new WeakSet()
  
  return JSON.stringify(obj, (key, value) => {
    // Handle BigInt
    if (typeof value === 'bigint') {
      return `BigInt(${value.toString()})`
    }
    
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]'
      }
      seen.add(value)
    }
    
    return value
  }, indent)
}

// Save data to file with timestamp
const saveToFile = (filename: string, data: any) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fullFilename = `${filename}_${timestamp}.json`
  const filepath = path.join(process.cwd(), 'square-dumps', fullFilename)
  
  // Create directory if it doesn't exist
  const dir = path.dirname(filepath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  try {
    fs.writeFileSync(filepath, safeStringify(data))
    console.log(`💾 Saved to: ${filepath}`)
  } catch (error) {
    console.error(`❌ Failed to save ${filepath}:`, error)
  }
}

const dumpSquareData = async () => {
  console.log('🔍 Dumping ALL Square API data...\n')
  
  // 1. Dump Locations
  try {
    console.log('📍 LOCATIONS API:')
    const locations = await squareClient.locations.list()
    console.log('Raw response keys:', Object.keys(locations))
    console.log('Locations found:', locations.locations?.length || 0)
    
    if (locations.locations) {
      locations.locations.forEach((loc, index) => {
        console.log(`\n${index + 1}. Location: ${loc.name}`)
        console.log(`   ID: ${loc.id}`)
        console.log(`   Status: ${loc.status}`)
        console.log(`   Type: ${loc.type}`)
        console.log(`   Address: ${loc.address?.addressLine1 || 'N/A'}`)
        console.log(`   Timezone: ${loc.timezone || 'N/A'}`)
      })
    }
    
    saveToFile('locations', locations)
    console.log('\n' + '='.repeat(60))
  } catch (error) {
    console.error('❌ Locations failed:', error)
  }
  
  // 2. Dump Merchant
  try {
    console.log('\n👔 MERCHANT API:')
    const merchant = await squareClient.merchants.list()
    console.log('Raw response keys:', Object.keys(merchant))
    console.log('Merchants found:', merchant.merchant?.length || 0)
    
    if (merchant.merchant) {
      merchant.merchant.forEach((m, index) => {
        console.log(`\n${index + 1}. Merchant:`)
        console.log(`   ID: ${m.id}`)
        console.log(`   Business Name: ${m.businessName}`)
        console.log(`   Country: ${m.country}`)
        console.log(`   Language: ${m.languageCode}`)
        console.log(`   Currency: ${m.currency}`)
        console.log(`   Status: ${m.status}`)
      })
    }
    
    saveToFile('merchant', merchant)
    console.log('\n' + '='.repeat(60))
  } catch (error) {
    console.error('❌ Merchant failed:', error)
  }
  
  // 3. Dump Available APIs
  console.log('\n🔧 AVAILABLE APIS:')
  const apis = Object.keys(squareClient).filter(key => !key.startsWith('_'))
  console.log('Available APIs:', apis)
  console.log('\n' + '='.repeat(60))
  
  // 4. Dump Catalog - COMPREHENSIVE
  try {
    console.log('\n📦 CATALOG API (COMPREHENSIVE):')
    
    // Try different approaches to get catalog data
    const catalogAttempts = [
      { name: 'All Items', params: { types: ['ITEM'] } },
      { name: 'All Types', params: {} },
      { name: 'Items + Variations', params: { types: ['ITEM', 'ITEM_VARIATION'] } },
      { name: 'Categories', params: { types: ['CATEGORY'] } },
      { name: 'With Related', params: { types: ['ITEM'], includeRelatedObjects: true } }
    ]
    
    for (const attempt of catalogAttempts) {
      try {
        console.log(`\n🔍 Trying: ${attempt.name}`)
        const catalog = await squareClient.catalog.list(attempt.params)
        
        console.log(`   Response keys: [${Object.keys(catalog).join(', ')}]`)
        console.log(`   Objects: ${catalog.objects?.length || 0}`)
        console.log(`   Cursor: ${catalog.cursor || 'none'}`)
        
        if (catalog.objects && catalog.objects.length > 0) {
          console.log(`   ✅ SUCCESS! Found ${catalog.objects.length} objects`)
          
          // Analyze object types
          const typeCount: Record<string, number> = {}
          catalog.objects.forEach(obj => {
            typeCount[obj.type || 'unknown'] = (typeCount[obj.type || 'unknown'] || 0) + 1
          })
          
          console.log(`   Object types: ${JSON.stringify(typeCount)}`)
          
          // Show detailed info for first few objects
          catalog.objects.slice(0, 2).forEach((obj, index) => {
            console.log(`\n   📄 Object ${index + 1}:`)
            console.log(`      Type: ${obj.type}`)
            console.log(`      ID: ${obj.id}`)
            console.log(`      Version: ${obj.version}`)
            console.log(`      Updated: ${obj.updatedAt}`)
            
            // Item-specific data
            if (obj.itemData) {
              console.log(`      Item Name: ${obj.itemData.name}`)
              console.log(`      Description: ${obj.itemData.descriptionPlaintext || 'No description'}`)
              console.log(`      Category ID: ${obj.itemData.categoryId || 'No category'}`)
              console.log(`      Variations: ${obj.itemData.variations?.length || 0}`)
              console.log(`      Is Deleted: ${obj.itemData.isDeleted || false}`)
              
              // Variation details
              if (obj.itemData.variations) {
                obj.itemData.variations.slice(0, 2).forEach((variation, vIndex) => {
                  console.log(`\n      🔧 Variation ${vIndex + 1}:`)
                  console.log(`         ID: ${variation.id}`)
                  console.log(`         Version: ${variation.version}`)
                  
                  if (variation.itemVariationData) {
                    const vData = variation.itemVariationData
                    console.log(`         Name: ${vData.name || 'No name'}`)
                    console.log(`         SKU: ${vData.sku || 'No SKU'}`)
                    console.log(`         UPC: ${vData.upc || 'No UPC'}`)
                    
                    if (vData.priceMoney) {
                      console.log(`         Price: ${vData.priceMoney.amount} ${vData.priceMoney.currency}`)
                      console.log(`         Price (dollars): $${(Number(vData.priceMoney.amount) / 100).toFixed(2)}`)
                    }
                    
                    console.log(`         Pricing Type: ${vData.pricingType || 'unknown'}`)
                    console.log(`         Track Inventory: ${vData.trackInventory || false}`)
                  }
                })
              }
            }
            
            // Category-specific data
            if (obj.categoryData) {
              console.log(`      Category Name: ${obj.categoryData.name}`)
            }
            
            // Show all top-level keys for debugging
            console.log(`      All Keys: [${Object.keys(obj).join(', ')}]`)
          })
          
          // Save this successful response
          saveToFile(`catalog_${attempt.name.toLowerCase().replace(/\s+/g, '_')}`, catalog)
          
          // If we found items, also try to get inventory for them
          if (catalog.objects.some(obj => obj.type === 'ITEM_VARIATION')) {
            console.log(`\n🔍 Trying inventory for these variations...`)
            const variationIds = catalog.objects
              .filter(obj => obj.type === 'ITEM_VARIATION')
              .map(obj => obj.id)
              .slice(0, 10) // Limit to 10 for testing
            
            try {
              const inventory = await squareClient.inventory.batchRetrieveCounts({
                catalogObjectIds: variationIds,
                locationIds: ['LC2AKZX32H2ZA'] // Use your active location
              })
              
              console.log(`   Inventory counts: ${inventory.counts?.length || 0}`)
              
              if (inventory.counts) {
                inventory.counts.slice(0, 3).forEach((count, cIndex) => {
                  console.log(`\n   📊 Inventory ${cIndex + 1}:`)
                  console.log(`      Catalog Object ID: ${count.catalogObjectId}`)
                  console.log(`      Location ID: ${count.locationId}`)
                  console.log(`      Quantity: ${count.quantity}`)
                  console.log(`      State: ${count.state}`)
                })
              }
              
              saveToFile('inventory', inventory)
            } catch (invError) {
              console.log(`   ❌ Inventory failed: ${invError}`)
            }
          }
          
          break // Stop trying other methods if we found data
        } else {
          console.log(`   ❌ No objects found`)
        }
      } catch (attemptError: any) {
        console.log(`   ❌ Failed: ${attemptError.message}`)
      }
    }
    
    console.log('\n' + '='.repeat(60))
  } catch (error) {
    console.error('❌ Catalog completely failed:', error)
  }
  
  // 5. Dump Recent Orders (if any)
  try {
    console.log('\n🧾 ORDERS API:')
    const orders = await squareClient.orders.search({
      locationIds: ['LC2AKZX32H2ZA'], // Use your active location
      query: {
        sort: {
          sortField: 'CREATED_AT',
          sortOrder: 'DESC'
        }
      },
      limit: 5
    })
    
    console.log('Raw response keys:', Object.keys(orders))
    console.log('Orders found:', orders.orders?.length || 0)
    
    if (orders.orders) {
      orders.orders.forEach((order, index) => {
        console.log(`\n${index + 1}. Order: ${order.id}`)
        console.log(`   State: ${order.state}`)
        console.log(`   Source: ${order.source?.name || 'unknown'}`)
        console.log(`   Total: ${order.totalMoney?.amount} ${order.totalMoney?.currency}`)
        console.log(`   Line Items: ${order.lineItems?.length || 0}`)
        console.log(`   Created: ${order.createdAt}`)
      })
    }
    
    saveToFile('orders', orders)
    console.log('\n' + '='.repeat(60))
  } catch (error) {
    console.error('❌ Orders failed:', error)
  }
  
  // 6. Summary and Recommendations
  console.log('\n📋 SUMMARY:')
  console.log('1. Check the generated JSON files in ./square-dumps/ for full raw data')
  console.log('2. Look for any successful catalog responses')
  console.log('3. Note any BigInt values that need special handling')
  console.log('4. Check if items exist but are not published to catalog')
  console.log('5. Verify your Square app permissions in the dashboard')
  
  console.log('\n✅ Data dump complete! Check the square-dumps folder for detailed JSON files.')
}

// Run the dump
dumpSquareData().catch(console.error)