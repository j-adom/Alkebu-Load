import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { clearCart, getCartSummary } from '@/app/utils/cartOperations'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()

    const { cartId } = body

    if (!cartId) {
      return NextResponse.json(
        { success: false, error: 'cartId is required' },
        { status: 400 },
      )
    }

    const result = await clearCart(payload, cartId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to clear cart' },
        { status: 400 },
      )
    }

    const summary = await getCartSummary(payload, cartId)

    if (!summary) {
      return NextResponse.json(
        { success: false, error: 'Unable to load cart summary' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      cart: summary,
      cartId,
    })
  } catch (error) {
    console.error('Cart clear API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clear cart' },
      { status: 500 },
    )
  }
}
