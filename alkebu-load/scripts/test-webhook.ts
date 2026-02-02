// Test script to verify webhook endpoint is working
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/square-catalog'

async function testWebhook() {
  console.log('🧪 Testing Square webhook endpoint...')
  
  // Test 1: Health check (GET request)
  try {
    console.log('\n1️⃣ Testing health check...')
    const healthResponse = await fetch(WEBHOOK_URL, { method: 'GET' })
    const healthData = await healthResponse.json()
    console.log('✅ Health check response:', healthData)
  } catch (error) {
    console.error('❌ Health check failed:', error)
  }
  
  // Test 2: Empty webhook body
  try {
    console.log('\n2️⃣ Testing empty webhook body...')
    const emptyResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: ''
    })
    const emptyData = await emptyResponse.json()
    console.log('✅ Empty body response:', emptyData)
  } catch (error) {
    console.error('❌ Empty body test failed:', error)
  }
  
  // Test 3: Valid webhook event
  try {
    console.log('\n3️⃣ Testing valid webhook event...')
    const validEvent = {
      type: 'catalog.version.updated',
      merchant_id: 'TEST_MERCHANT',
      data: {
        type: 'catalog',
        id: 'test-id',
        object: {
          catalog_version: {
            updated_at: new Date().toISOString()
          }
        }
      },
      created_at: new Date().toISOString()
    }
    
    const validResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validEvent)
    })
    const validData = await validResponse.json()
    console.log('✅ Valid event response:', validData)
  } catch (error) {
    console.error('❌ Valid event test failed:', error)
  }
  
  // Test 4: Invalid event type
  try {
    console.log('\n4️⃣ Testing invalid event type...')
    const invalidEvent = {
      type: 'payment.updated',
      merchant_id: 'TEST_MERCHANT',
      created_at: new Date().toISOString()
    }
    
    const invalidResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidEvent)
    })
    const invalidData = await invalidResponse.json()
    console.log('✅ Invalid event response:', invalidData)
  } catch (error) {
    console.error('❌ Invalid event test failed:', error)
  }
  
  console.log('\n🎯 Webhook tests completed!')
}

testWebhook().catch(console.error)