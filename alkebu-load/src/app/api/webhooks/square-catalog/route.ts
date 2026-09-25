import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSquareWebhookUrl, isValidSquareWebhookSignature } from '../../../utils/squareWebhookSignature'
import type { SquareInventoryCount } from '../../../utils/squareInventory'

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
      inventory_counts?: SquareInventoryCount[]
    }
  }
  created_at?: string
}

export async function POST(request: NextRequest) {
  console.log('📦 Square webhook endpoint hit')

  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-square-hmacsha256-signature')
    const notificationUrl = getSquareWebhookUrl()

    if (!isValidSquareWebhookSignature({
      notificationUrl,
      rawBody,
      signature,
      signatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    })) {
      console.warn('⚠️ Rejected Square catalog webhook with invalid signature')
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
    }

    // Handle empty or invalid body after verifying the signed payload
    let webhookEvent: SquareWebhookEvent
    try {
      if (!rawBody) {
        console.log('⚠️ Empty webhook body received')
        return NextResponse.json({ error: 'Empty body' }, { status: 400 })
      }
      webhookEvent = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('❌ Failed to parse webhook body:', parseError)
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Log the received event
    console.log('📦 Square webhook received:', {
      type: webhookEvent.type,
      merchant_id: webhookEvent.merchant_id,
      version: webhookEvent.data?.object?.catalog_version?.updated_at,
      updated_at: webhookEvent.created_at || new Date().toISOString()
    })

    // Enqueue durable jobs rather than doing the work inline (or in a
    // post-response after() callback): both events now share the exclusive
    // 'books-write' concurrency key with each other via their task config,
    // and an unresolved catalog item makes its job throw so Payload retries
    // it. Ack only once the enqueue itself commits -- if that throws, this
    // whole handler falls through to the catch block below and 500s, so
    // Square retries the webhook within its 24h delivery window instead of
    // us silently losing the event.
    switch (webhookEvent.type) {
      case 'catalog.version.updated': {
        const payload = await getPayload({ config })
        await payload.jobs.queue({ task: 'square-catalog-sync', input: {} })
        return NextResponse.json({ received: true, queued: 'square-catalog-sync' })
      }

      case 'inventory.count.updated': {
        const payload = await getPayload({ config })
        const counts = webhookEvent.data?.object?.inventory_counts || []
        await payload.jobs.queue({ task: 'square-inventory-sync', input: { counts } })
        return NextResponse.json({ received: true, queued: 'square-inventory-sync' })
      }

      default:
        return NextResponse.json({ received: true })
    }

  } catch (error) {
    console.error('❌ Square webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'square-catalog-webhook',
    timestamp: new Date().toISOString()
  })
}
