import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { getCartSummary } from '@/app/utils/cartOperations'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    const providedCartId = searchParams.get('cartId')
    const sessionIdParam = searchParams.get('sessionId')
    const userId = searchParams.get('userId')

    let targetCartId: string | null = providedCartId
    let sessionId = sessionIdParam || undefined
    let cartDoc: any = null

    if (!targetCartId && sessionId) {
      const carts = await payload.find({
        collection: 'carts',
        where: {
          sessionId: { equals: sessionId },
        },
        limit: 1,
        sort: '-updatedAt',
      })

      if (carts.docs.length > 0) {
        cartDoc = carts.docs[0]
        targetCartId = cartDoc.id
      }
    }

    if (!targetCartId && userId) {
      const carts = await payload.find({
        collection: 'carts',
        where: {
          and: [
            { user: { equals: userId } },
            { status: { in: ['active', 'checkout'] } },
          ],
        },
        limit: 1,
        sort: '-updatedAt',
      })

      if (carts.docs.length > 0) {
        cartDoc = carts.docs[0]
        targetCartId = cartDoc.id
        sessionId = cartDoc.sessionId || sessionId
      }
    }

    if (!targetCartId) {
      return NextResponse.json(
        { success: false, error: 'Cart not found' },
        { status: 404 },
      )
    }

    const summary = await getCartSummary(payload, targetCartId)

    if (!summary) {
      return NextResponse.json(
        { success: false, error: 'Cart not found' },
        { status: 404 },
      )
    }

    if (!cartDoc) {
      cartDoc = await payload.findByID({
        collection: 'carts',
        id: targetCartId,
      })
      sessionId = cartDoc?.sessionId || sessionId
    }

    return NextResponse.json({
      success: true,
      cart: summary,
      cartId: targetCartId,
      sessionId: sessionId || cartDoc?.sessionId || null,
    })
  } catch (error) {
    console.error('Cart summary API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load cart summary' },
      { status: 500 },
    )
  }
}
