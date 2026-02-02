import { SquareClient } from 'square'
import { config as dotenvConfig } from 'dotenv'

dotenvConfig()

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!
})

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
    console.log('\n✅ Merchant API works:')
    console.log(`  Merchant ID: ${merchant.merchant?.[0]?.id}`)
    console.log(`  Business Name: ${merchant.merchant?.[0]?.businessName}`)
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
      const inventory = await squareClient.inventory.batchRetrieveCounts({
        locationIds: ['LC2AKZX32H2ZA']
      })
      console.log(`✅ Inventory works - Found ${inventory.counts?.length || 0} counts`)
    } else {
      console.log('❌ No inventory API available')
    }
  } catch (error: any) {
    console.error('❌ Inventory failed:', error.message)
  }
  
  // Test 5: Try catalog with correct structure (fix the response handling)
  try {
    console.log('\n🔍 Trying catalog API with better debugging...')
    const catalog = await squareClient.catalog.list({
      types: ['ITEM'],
      includeRelatedObjects: true
    })
    
    console.log('Full response structure:', Object.keys(catalog))
    console.log(`Catalog response: ${catalog.objects?.length || 0} objects`)
    console.log('Cursor:', catalog.cursor)
    
    if (catalog.objects && catalog.objects.length > 0) {
      console.log('\n✅ Found products! First few items:')
      catalog.objects.slice(0, 3).forEach((obj, index) => {
        console.log(`\n${index + 1}. ${obj.type}: ${obj.itemData?.name || 'Unnamed'}`)
        console.log(`   ID: ${obj.id}`)
        console.log(`   Description: ${obj.itemData?.descriptionPlaintext || 'No description'}`)
        
        if (obj.itemData?.variations) {
          obj.itemData.variations.forEach((variation, vIndex) => {
            console.log(`   Variation ${vIndex + 1}:`)
            console.log(`     SKU: ${variation.itemVariationData?.sku || 'No SKU'}`)
            console.log(`     Price: ${(Number(variation.itemVariationData?.priceMoney?.amount) / 100) || 0}`)
            console.log(`     UPC: ${variation.itemVariationData?.upc || 'No UPC'}`)
          })
        }
      })
      
      // Count items with GTINs/UPCs
      let itemsWithGTIN = 0
      catalog.objects.forEach(obj => {
        if (obj.itemData?.variations) {
          obj.itemData.variations.forEach(variation => {
            if (variation.itemVariationData?.upc) {
              itemsWithGTIN++
            }
          })
        }
      })
      
      console.log(`\n📊 Summary from this batch:`)
      console.log(`   Total items: ${catalog.objects.length}`)
      console.log(`   Items with UPC/GTIN: ${itemsWithGTIN}`)
      console.log(`   Has more pages: ${!!catalog.cursor}`)
      
    } else {
      console.log('❌ No objects found in catalog response')
      console.log('Response details:', JSON.stringify(catalog, null, 2))
    }
  } catch (error: any) {
    console.error('❌ Catalog failed:', error.message)
    console.error('Full error:', error)
  }
  
  console.log('\n🎯 Recommendations:')
  console.log('1. Check Square Dashboard → Apps → Your App → Permissions')
  console.log('2. Ensure "Items and Orders" permissions are enabled')
  console.log('3. Check if items are published to catalog vs only in POS')
  console.log('4. Try using Inventory API if Catalog API is empty')
}

debugSquareAccess()