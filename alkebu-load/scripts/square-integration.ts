import { SquareClient, type CatalogObject } from 'square'
import { config as dotenvConfig } from 'dotenv'

dotenvConfig()

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!
})

type CatalogItemObject = Extract<CatalogObject, { type: 'ITEM' }>
type CatalogItemVariationObject = Extract<CatalogObject, { type: 'ITEM_VARIATION' }>

const isCatalogItemObject = (object: CatalogObject): object is CatalogItemObject =>
  object.type === 'ITEM' && !!object.itemData

const isCatalogItemVariationObject = (object: CatalogObject): object is CatalogItemVariationObject =>
  object.type === 'ITEM_VARIATION' && !!object.itemVariationData

const debugSquareAccess = async () => {
  console.log('🔍 Debug: Testing Square API access...')
  
  // Test 1: Basic locations (this works)
  try {
    const locations = await squareClient.locations.list()
    console.log('\n✅ Locations API works:')
    locations.locations?.forEach(loc => {
      console.log(`  - ${loc.name} (${loc.id}) - Status: ${loc.status}`)
    })
  } catch (error) {
    console.error('❌ Locations API failed:', error)
  }
  
  // Test 2: Merchant info  
  try {
    const merchant = await squareClient.merchants.list()
    const merchants = merchant.data
    console.log('\n✅ Merchant API works:')
    console.log(`  Merchant ID: ${merchants[0]?.id}`)
    console.log(`  Business Name: ${merchants[0]?.businessName}`)
  } catch (error) {
    console.error('❌ Merchant API failed:', error)
  }
  
  // Test 3: Check what APIs are actually available
  console.log('\n🔍 Available APIs on squareClient:')
  console.log(Object.keys(squareClient).filter(key => !key.startsWith('_')))
  
  // Test 4: Try inventory with correct structure
  try {
    console.log('\n🔍 Trying inventory API...')
    if (squareClient.inventory) {
      const inventory = await squareClient.inventory.batchGetCounts({
        locationIds: ['LC2AKZX32H2ZA']
      })
      console.log(`✅ Inventory works - Found ${inventory.data.length} counts`)
    } else {
      console.log('❌ No inventory API available')
    }
  } catch (error) {
    console.error('❌ Inventory failed:', error instanceof Error ? error.message : error)
  }
  
  // Test 5: Try catalog with correct structure (fix the response handling)
  try {
    console.log('\n🔍 Trying catalog API with better debugging...')
    const catalog = await squareClient.catalog.list({
      types: 'ITEM'
    })
    const catalogItems = catalog.data
      .filter(isCatalogItemObject)
    
    console.log('Full response structure:', Object.keys(catalog))
    console.log(`Catalog response: ${catalogItems.length} items`)
    console.log('Cursor:', catalog.response.cursor)
    
    if (catalogItems.length > 0) {
      console.log('\n✅ Found products! First few items:')
      catalogItems.slice(0, 3).forEach((obj, index) => {
        console.log(`\n${index + 1}. ${obj.type}: ${obj.itemData?.name || 'Unnamed'}`)
        console.log(`   ID: ${obj.id}`)
        console.log(`   Description: ${obj.itemData?.descriptionPlaintext || 'No description'}`)
        
        if (obj.itemData?.variations) {
          obj.itemData.variations
            .filter(isCatalogItemVariationObject)
            .forEach((variation, vIndex) => {
            console.log(`   Variation ${vIndex + 1}:`)
            console.log(`     SKU: ${variation.itemVariationData?.sku || 'No SKU'}`)
            console.log(`     Price: ${(Number(variation.itemVariationData?.priceMoney?.amount) / 100) || 0}`)
            console.log(`     UPC: ${variation.itemVariationData?.upc || 'No UPC'}`)
          })
        }
      })
      
      // Count items with GTINs/UPCs
      let itemsWithGTIN = 0
      catalogItems.forEach(obj => {
        if (obj.itemData?.variations) {
          obj.itemData.variations
            .filter(isCatalogItemVariationObject)
            .forEach(variation => {
            if (variation.itemVariationData?.upc) {
              itemsWithGTIN++
            }
          })
        }
      })
      
      console.log(`\n📊 Summary from this batch:`)
      console.log(`   Total items: ${catalogItems.length}`)
      console.log(`   Items with UPC/GTIN: ${itemsWithGTIN}`)
      console.log(`   Has more pages: ${catalog.hasNextPage()}`)
      
    } else {
      console.log('❌ No objects found in catalog response')
      console.log('Response details:', JSON.stringify(catalog.response, null, 2))
    }
  } catch (error) {
    console.error('❌ Catalog failed:', error instanceof Error ? error.message : error)
    console.error('Full error:', error)
  }
  
  console.log('\n🎯 Recommendations:')
  console.log('1. Check Square Dashboard → Apps → Your App → Permissions')
  console.log('2. Ensure "Items and Orders" permissions are enabled')
  console.log('3. Check if items are published to catalog vs only in POS')
  console.log('4. Try using Inventory API if Catalog API is empty')
}

debugSquareAccess()
