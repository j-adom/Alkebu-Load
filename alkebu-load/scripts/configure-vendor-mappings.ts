import { SquareClient } from 'square'
import { getCurrentConfiguration } from '../src/app/utils/squareVendorExtractor'

// Initialize Square client
const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!
})

async function analyzeSquareVendors() {
  console.log('🔧 Square Vendor Analysis Tool\n')
  
  const currentConfig = getCurrentConfiguration()
  console.log(`📦 Default Vendor: ${currentConfig.defaultVendor}`)
  
  try {
    console.log('\n🔍 Analyzing vendor fields in your Square items...')
    const itemsPager = await squareClient.catalog.list({
      types: ['ITEM'],
      limit: 50 // Sample items to check vendor fields
    })
    
    const items: any[] = []
    const vendorsFound = new Set<string>()
    let itemsWithVendor = 0
    let itemsWithoutVendor = 0
    
    for await (const item of itemsPager) {
      items.push(item)
    }
    
    console.log(`\n📊 Analyzing ${items.length} items from your Square catalog:`)
    
    items.forEach((item, index) => {
      const itemName = item.itemData?.name || 'Unnamed Item'
      const vendor = item.itemData?.vendor || item.vendor
      
      if (vendor && vendor.trim()) {
        vendorsFound.add(vendor.trim())
        itemsWithVendor++
        if (index < 5) { // Show first 5 examples
          console.log(`   ✅ "${itemName}" → Vendor: "${vendor}"`)
        }
      } else {
        itemsWithoutVendor++
        if (index < 3 && itemsWithVendor === 0) { // Show first 3 examples if no vendors found yet
          console.log(`   ❌ "${itemName}" → No vendor field`)
        }
      }
    })
    
    console.log(`\n📈 Summary:`)
    console.log(`   Items WITH vendor field: ${itemsWithVendor}`)
    console.log(`   Items WITHOUT vendor field: ${itemsWithoutVendor}`)
    console.log(`   Unique vendors found: ${vendorsFound.size}`)
    
    if (vendorsFound.size > 0) {
      console.log(`\n🏪 Vendors in your Square catalog:`)
      Array.from(vendorsFound).sort().forEach((vendor, index) => {
        console.log(`   ${index + 1}. "${vendor}"`)
      })
      
      console.log('\n✅ Great! The webhook will automatically:')
      console.log('   - Extract vendor names from Square items')
      console.log('   - Create Vendor records in Payload')
      console.log('   - Link products to their vendors')
      
    } else {
      console.log('\n⚠️ No vendor fields found in your Square items.')
      console.log('\n💡 To add vendors to Square items:')
      console.log('   1. Go to your Square Dashboard')
      console.log('   2. Navigate to Items & Orders > Items')
      console.log('   3. Edit each item')
      console.log('   4. Add vendor information in the vendor field')
      
      console.log(`\n📦 Items without vendors will use: "${currentConfig.defaultVendor}"`)
    }
    
  } catch (error) {
    console.error('\n❌ Error accessing Square API:', error)
    console.error('\n💡 Make sure your SQUARE_ACCESS_TOKEN environment variable is set correctly')
  }
  
  console.log('\n🚀 Next Steps:')
  console.log('1. Ensure vendor fields are populated in Square')
  console.log('2. Test the webhook with Square items')
  console.log('3. Check that vendors are created in Payload')
  console.log('4. Review vendor metadata updates')
}

// Run the analysis tool
analyzeSquareVendors().catch(console.error)