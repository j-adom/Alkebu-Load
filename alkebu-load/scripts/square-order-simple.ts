import { SquareClient } from 'square'
import { config as dotenvConfig } from 'dotenv'
import fs from 'fs'

dotenvConfig()

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!
})

const safeStringify = (obj: any) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return `BigInt_${value.toString()}`
    }
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
      }
    }
    return value
  }, 2)
}

const analyzeOrderProducts = async () => {
  console.log('🔍 Analyzing order data to find products...\n')
  
  try {
    // Get recent orders
    const orders = await squareClient.orders.search({
      locationIds: ['LC2AKZX32H2ZA'],
      query: {
        sort: {
          sortField: 'CREATED_AT',
          sortOrder: 'DESC'
        }
      },
      limit: 20
    })
    
    console.log(`📊 Found ${orders.orders?.length || 0} orders`)
    
    if (!orders.orders) {
      console.log('❌ No orders found')
      return
    }
    
    // Extract all catalog object IDs from orders
    const catalogIds = new Set<string>()
    
    orders.orders.forEach((order) => {
      if (order.lineItems) {
        order.lineItems.forEach(item => {
          if (item.catalogObjectId) {
            catalogIds.add(item.catalogObjectId)
          }
        })
      }
    })
    
    console.log(`\n📦 Found ${catalogIds.size} unique catalog object IDs:`)
    Array.from(catalogIds).forEach((id, index) => {
      console.log(`${index + 1}. ${id}`)
    })
    
    if (catalogIds.size === 0) {
      console.log('❌ No catalog object IDs found in orders')
      return
    }
    
    // Test catalog batchGet
    console.log('\n🔍 Fetching catalog details...')
    try {
      const catalogBody = {
        objectIds: Array.from(catalogIds),
        includeRelatedObjects: true
      }
      
      console.log('Catalog request body:', safeStringify(catalogBody))
      
      const catalogResponse = await squareClient.catalog.batchGet(catalogBody)
      console.log('✅ Catalog API call successful!')
      console.log('Response structure:', Object.keys(catalogResponse))
      
      // Extract the actual data
      let catalogData;
      if (catalogResponse.result) {
        catalogData = catalogResponse.result
        console.log('Using response.result')
      } else if (catalogResponse.data) {
        catalogData = catalogResponse.data
        console.log('Using response.data')
      } else {
        catalogData = catalogResponse
        console.log('Using response directly')
      }
      
      console.log('Catalog data keys:', catalogData ? Object.keys(catalogData) : 'null')
      console.log('Objects found:', catalogData?.objects?.length || 0)
      console.log('Related objects:', catalogData?.relatedObjects?.length || 0)
      
      // Save catalog response
      fs.writeFileSync('./catalog-response.json', safeStringify(catalogResponse))
      console.log('💾 Saved full catalog response to ./catalog-response.json')
      
      if (catalogData?.objects && catalogData.objects.length > 0) {
        console.log('\n✅ Found catalog objects! Sample data:')
        
        catalogData.objects.slice(0, 3).forEach((obj: any, index: number) => {
          console.log(`\n📦 Object ${index + 1}:`)
          console.log(`   Type: ${obj.type}`)
          console.log(`   ID: ${obj.id}`)
          console.log(`   Version: ${obj.version}`)
          
          if (obj.itemVariationData) {
            console.log(`   VARIATION:`)
            console.log(`     Name: ${obj.itemVariationData.name}`)
            console.log(`     SKU: ${obj.itemVariationData.sku || 'No SKU'}`)
            console.log(`     UPC: ${obj.itemVariationData.upc || 'No UPC'}`)
            console.log(`     Item ID: ${obj.itemVariationData.itemId}`)
            
            if (obj.itemVariationData.priceMoney) {
              const price = Number(obj.itemVariationData.priceMoney.amount) / 100
              console.log(`     Price: $${price.toFixed(2)} ${obj.itemVariationData.priceMoney.currency}`)
            }
          }
          
          if (obj.itemData) {
            console.log(`   ITEM:`)
            console.log(`     Name: ${obj.itemData.name}`)
            console.log(`     Description: ${obj.itemData.descriptionPlaintext || 'No description'}`)
            console.log(`     Category: ${obj.itemData.categoryId || 'No category'}`)
          }
        })
        
        // Create Payload CMS mapping
        const payloadMapping = catalogData.objects.map((obj: any) => ({
          squareId: obj.id,
          type: obj.type,
          version: obj.version?.toString(),
          updatedAt: obj.updatedAt,
          
          // Variation data
          ...(obj.itemVariationData && {
            variation: {
              name: obj.itemVariationData.name,
              sku: obj.itemVariationData.sku,
              upc: obj.itemVariationData.upc,
              itemId: obj.itemVariationData.itemId,
              price: obj.itemVariationData.priceMoney ? {
                amount: obj.itemVariationData.priceMoney.amount?.toString(),
                currency: obj.itemVariationData.priceMoney.currency
              } : null
            }
          }),
          
          // Item data
          ...(obj.itemData && {
            item: {
              name: obj.itemData.name,
              description: obj.itemData.descriptionPlaintext,
              categoryId: obj.itemData.categoryId
            }
          })
        }))
        
        fs.writeFileSync('./payload-mapping.json', safeStringify(payloadMapping))
        console.log('\n💾 Saved Payload CMS mapping to ./payload-mapping.json')
        
      } else {
        console.log('❌ No catalog objects found in response')
      }
      
    } catch (catalogError) {
      console.error('❌ Catalog API failed:', catalogError)
      fs.writeFileSync('./catalog-error.json', safeStringify({
        error: catalogError,
        timestamp: new Date().toISOString()
      }))
    }
    
    // Test inventory batchGetCounts
    console.log('\n🔍 Checking inventory...')
    try {
      const inventoryBody = {
        catalogObjectIds: Array.from(catalogIds),
        locationIds: ['LC2AKZX32H2ZA']
      }
      
      console.log('Inventory request body:', safeStringify(inventoryBody))
      
      const inventoryResponse = await squareClient.inventory.batchGetCounts(inventoryBody)
      console.log('✅ Inventory API call successful!')
      console.log('Response structure:', Object.keys(inventoryResponse))
      
      // Extract the actual data
      let inventoryData;
      if (inventoryResponse.result) {
        inventoryData = inventoryResponse.result
        console.log('Using response.result')
      } else if (inventoryResponse.data) {
        inventoryData = inventoryResponse.data
        console.log('Using response.data')
      } else {
        inventoryData = inventoryResponse
        console.log('Using response directly')
      }
      
      console.log('Inventory data keys:', inventoryData ? Object.keys(inventoryData) : 'null')
      console.log('Counts found:', inventoryData?.counts?.length || 0)
      
      // Save inventory response
      fs.writeFileSync('./inventory-response.json', safeStringify(inventoryResponse))
      console.log('💾 Saved full inventory response to ./inventory-response.json')
      
      if (inventoryData?.counts && inventoryData.counts.length > 0) {
        console.log('\n✅ Found inventory counts! Sample data:')
        
        inventoryData.counts.slice(0, 5).forEach((count: any, index: number) => {
          console.log(`\n📊 Count ${index + 1}:`)
          console.log(`   Catalog Object: ${count.catalogObjectId}`)
          console.log(`   Location: ${count.locationId}`)
          console.log(`   Quantity: ${count.quantity}`)
          console.log(`   State: ${count.state}`)
          console.log(`   Calculated At: ${count.calculatedAt}`)
        })
      } else {
        console.log('❌ No inventory counts found')
      }
      
    } catch (inventoryError) {
      console.error('❌ Inventory API failed:', inventoryError)
      fs.writeFileSync('./inventory-error.json', safeStringify({
        error: inventoryError,
        timestamp: new Date().toISOString()
      }))
    }
    
    console.log('\n🎯 ANALYSIS COMPLETE!')
    console.log(`- Found ${orders.orders.length} recent orders`)
    console.log(`- Extracted ${catalogIds.size} unique catalog object IDs`)
    console.log('- Check ./catalog-response.json for full catalog data')
    console.log('- Check ./inventory-response.json for full inventory data')
    console.log('- Check ./payload-mapping.json for Payload CMS structure')
    
  } catch (error) {
    console.error('❌ Analysis failed:', error)
    fs.writeFileSync('./analysis-error.json', safeStringify({
      error: error,
      timestamp: new Date().toISOString()
    }))
  }
}

analyzeOrderProducts().catch(console.error)