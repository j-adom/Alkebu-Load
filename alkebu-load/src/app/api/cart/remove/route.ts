import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import {
  removeFromCart,
  getCartSummary,
} from '@/app/utils/cartOperations'

export async function DELETE(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()

    const { cartId, cartItemId } = body

    if (!cartId || !cartItemId) {
      return NextResponse.json(
        { success: false, error: 'cartId and cartItemId are required' },
        { status: 400 },
      )
    }

    const result = await removeFromCart(payload, cartId, cartItemId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to remove item' },
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
    console.error('Cart remove API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove cart item' },
      { status: 500 },
    )
  }
}
