import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import {
  updateCartItemQuantity,
  getCartSummary,
} from '@/app/utils/cartOperations'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()

    const { cartId, cartItemId, quantity } = body

    if (!cartId || !cartItemId || typeof quantity !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'cartId, cartItemId, and quantity are required',
        },
        { status: 400 },
      )
    }

    const result = await updateCartItemQuantity(
      payload,
      cartId,
      cartItemId,
      quantity,
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update item' },
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
    console.error('Cart update API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update cart item' },
      { status: 500 },
    )
  }
}
