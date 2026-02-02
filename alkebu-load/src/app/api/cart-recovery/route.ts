import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

/**
 * Cart Recovery API
 * Handle abandoned cart recovery requests
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cartId = searchParams.get('cart_id');
    
    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID required' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // Find the cart
    const cart = await payload.findByID({
      collection: 'carts',
      id: cartId,
      depth: 2,
    });

    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    // Only allow recovery of abandoned carts
    if (cart.status !== 'abandoned') {
      return NextResponse.json(
        { error: 'Cart is not available for recovery' },
        { status: 400 }
      );
    }

    // Get cart items
    const items = await payload.find({
      collection: 'cart-items',
      where: {
        cart: { equals: cartId },
      },
      depth: 2,
    });

    // Reactivate the cart
    const reactivatedCart = await payload.update({
      collection: 'carts',
      id: cartId,
      data: {
        status: 'active',
        lastActivity: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      cart: {
        id: reactivatedCart.id,
        itemCount: items.docs.length,
        totalAmount: reactivatedCart.totalAmount,
        items: items.docs,
      },
    });

  } catch (error) {
    console.error('Cart recovery API error:', error);
    return NextResponse.json(
      { error: 'Failed to recover cart' },
      { status: 500 }
    );
  }
}

/**
 * Update guest email for cart recovery
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const body = await request.json();
    
    const { cartId, email } = body;

    if (!cartId || !email) {
      return NextResponse.json(
        { error: 'Cart ID and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find the cart
    const cart = await payload.findByID({
      collection: 'carts',
      id: cartId,
    });

    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    // Update cart with guest email
    const updatedCart = await payload.update({
      collection: 'carts',
      id: cartId,
      data: {
        guestEmail: email,
        lastActivity: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email updated for cart recovery',
    });

  } catch (error) {
    console.error('Cart recovery email update error:', error);
    return NextResponse.json(
      { error: 'Failed to update cart email' },
      { status: 500 }
    );
  }
}