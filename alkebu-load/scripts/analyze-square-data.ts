import { SquareClient } from 'square'

// Initialize Square client
const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!
})

async function analyzeSquareData() {
  console.log('🔍 Analyzing Square catalog data structure for vendor information...\n')
  
  try {
    // Fetch a few items to analyze structure
    const catalogPager = await squareClient.catalog.list({
      types: ['ITEM'],
      includeRelatedObjects: true,
      limit: 3
    })
    
    const items: any[] = []
    for await (const item of catalogPager) {
      items.push(item)
    }
    
    if (items.length === 0) {
      console.log('❌ No items found in Square catalog')
      return
    }
    
    console.log(`📦 Analyzing ${items.length} items from Square catalog:\n`)
    
    items.forEach((item, index) => {
      console.log(`${index + 1}. Item: "${item.itemData?.name || 'Unknown'}"`)
      console.log(`   ID: ${item.id}`)
      console.log(`   Type: ${item.type}`)
      console.log(`   Updated: ${item.updatedAt}`)
      
      // Analyze itemData structure
      if (item.itemData) {
        console.log('   📋 itemData fields:')
        console.log(`      name: ${item.itemData.name}`)
        console.log(`      description: ${item.itemData.description || 'N/A'}`)
        console.log(`      categoryId: ${item.itemData.categoryId || 'N/A'}`)
        console.log(`      abbreviation: ${item.itemData.abbreviation || 'N/A'}`)
        console.log(`      labelColor: ${item.itemData.labelColor || 'N/A'}`)
        console.log(`      availableOnline: ${item.itemData.availableOnline || 'N/A'}`)
        console.log(`      availableForPickup: ${item.itemData.availableForPickup || 'N/A'}`)
        console.log(`      availableElectronically: ${item.itemData.availableElectronically || 'N/A'}`)
        console.log(`      productType: ${item.itemData.productType || 'N/A'}`)
        console.log(`      skipModifierScreen: ${item.itemData.skipModifierScreen || 'N/A'}`)
        console.log(`      itemOptions: ${item.itemData.itemOptions ? JSON.stringify(item.itemData.itemOptions) : 'N/A'}`)
        console.log(`      modifierListInfo: ${item.itemData.modifierListInfo ? JSON.stringify(item.itemData.modifierListInfo) : 'N/A'}`)
        
        // Check for any custom attributes or fields that might contain vendor info
        const allKeys = Object.keys(item.itemData)
        const unusualKeys = allKeys.filter(key => 
          !['name', 'description', 'categoryId', 'abbreviation', 'labelColor', 
            'availableOnline', 'availableForPickup', 'availableElectronically', 
            'productType', 'skipModifierScreen', 'itemOptions', 'modifierListInfo',
            'variations', 'imageIds'].includes(key)
        )
        
        if (unusualKeys.length > 0) {
          console.log(`   🔍 Other fields: ${unusualKeys.join(', ')}`)
          unusualKeys.forEach(key => {
            console.log(`      ${key}: ${JSON.stringify(item.itemData[key])}`)
          })
        }
        
        // Analyze variations for vendor info
        if (item.itemData.variations && item.itemData.variations.length > 0) {
          console.log(`   📦 ${item.itemData.variations.length} variation(s):`)
          item.itemData.variations.forEach((variation: any, vIndex: number) => {
            console.log(`      Variation ${vIndex + 1}:`)
            console.log(`         ID: ${variation.id}`)
            console.log(`         SKU: ${variation.itemVariationData?.sku || 'N/A'}`)
            console.log(`         UPC: ${variation.itemVariationData?.upc || 'N/A'}`)
            console.log(`         name: ${variation.itemVariationData?.name || 'N/A'}`)
            console.log(`         ordinal: ${variation.itemVariationData?.ordinal || 'N/A'}`)
            console.log(`         pricingType: ${variation.itemVariationData?.pricingType || 'N/A'}`)
            console.log(`         trackInventory: ${variation.itemVariationData?.trackInventory || 'N/A'}`)
            console.log(`         inventoryAlertType: ${variation.itemVariationData?.inventoryAlertType || 'N/A'}`)
            console.log(`         userData: ${variation.itemVariationData?.userData || 'N/A'}`)
            console.log(`         serviceDuration: ${variation.itemVariationData?.serviceDuration || 'N/A'}`)
            console.log(`         availableForBooking: ${variation.itemVariationData?.availableForBooking || 'N/A'}`)
            console.log(`         itemOptionValues: ${variation.itemVariationData?.itemOptionValues ? JSON.stringify(variation.itemVariationData.itemOptionValues) : 'N/A'}`)
            console.log(`         measurementUnitId: ${variation.itemVariationData?.measurementUnitId || 'N/A'}`)
            console.log(`         sellable: ${variation.itemVariationData?.sellable || 'N/A'}`)
            console.log(`         stockable: ${variation.itemVariationData?.stockable || 'N/A'}`)
            
            // Check for unusual keys in variation data
            if (variation.itemVariationData) {
              const varKeys = Object.keys(variation.itemVariationData)
              const unusualVarKeys = varKeys.filter(key => 
                !['name', 'sku', 'upc', 'ordinal', 'pricingType', 'priceMoney', 
                  'locationOverrides', 'trackInventory', 'inventoryAlertType', 
                  'inventoryAlertThreshold', 'userData', 'serviceDuration', 
                  'availableForBooking', 'itemOptionValues', 'measurementUnitId',
                  'sellable', 'stockable'].includes(key)
              )
              
              if (unusualVarKeys.length > 0) {
                console.log(`         🔍 Other variation fields: ${unusualVarKeys.join(', ')}`)
                unusualVarKeys.forEach(key => {
                  console.log(`            ${key}: ${JSON.stringify(variation.itemVariationData[key])}`)
                })
              }
            }
          })
        }
      }
      
      console.log('') // Empty line between items
    })
    
    // Check if categories can be used as vendor indicators
    console.log('🏷️ Checking for categories that might indicate vendors...')
    try {
      const categoriesPager = await squareClient.catalog.list({
        types: ['CATEGORY']
      })
      
      const categories: any[] = []
      for await (const category of categoriesPager) {
        categories.push(category)
      }
      
      if (categories.length > 0) {
        console.log(`📂 Found ${categories.length} categories:`)
        categories.forEach((category, index) => {
          console.log(`   ${index + 1}. ${category.categoryData?.name || 'Unnamed'} (ID: ${category.id})`)
        })
      } else {
        console.log('📂 No categories found')
      }
    } catch (categoryError) {
      console.error('❌ Error fetching categories:', categoryError)
    }
    
  } catch (error) {
    console.error('❌ Error analyzing Square data:', error)
  }
}

// Run the analysis
analyzeSquareData().catch(console.error)