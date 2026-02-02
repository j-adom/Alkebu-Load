import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { randomUUID } from 'crypto'

import {
  addToCart,
  getCartSummary,
  type CartItem,
} from '@/app/utils/cartOperations'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()

    const {
      productId,
      productType = 'books',
      quantity = 1,
      customization,
      cartId,
      sessionId,
    } = body

    if (!productId || !productType) {
      return NextResponse.json(
        { success: false, error: 'productId and productType are required' },
        { status: 400 },
      )
    }

    const effectiveCartId: string = cartId || sessionId || ''
    const effectiveSessionId: string =
      sessionId || cartId || randomUUID().replace(/-/g, '')

    const item: CartItem = {
      productId,
      productType,
      quantity,
      customization,
    }

    const result = await addToCart(
      payload,
      effectiveCartId,
      item,
      effectiveSessionId,
    )

    if (!result.success || !result.cartItem) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Unable to add item to cart',
        },
        { status: 400 },
      )
    }

    const createdCartId =
      typeof result.cartItem.cart === 'string'
        ? result.cartItem.cart
        : result.cartItem.cart?.id

    if (!createdCartId) {
      return NextResponse.json(
        { success: false, error: 'Cart identifier missing after add' },
        { status: 500 },
      )
    }

    const summary = await getCartSummary(payload, createdCartId)

    if (!summary) {
      return NextResponse.json(
        { success: false, error: 'Unable to load cart summary' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      cart: summary,
      cartId: createdCartId,
      sessionId: effectiveSessionId,
    })
  } catch (error) {
    console.error('Cart add API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add item to cart' },
      { status: 500 },
    )
  }
}
