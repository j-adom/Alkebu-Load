import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import {
    calculateOrderTotals,
    type CartItemForTax,
    type ShippingAddress,
} from '@/app/utils/taxShippingCalculations';

/**
 * POST /api/checkout/preview
 *
 * Returns estimated tax, shipping, and total for a cart + shipping address
 * WITHOUT creating a Stripe session. Used by the frontend to show live
 * cost estimates as the customer fills in their address.
 */
export async function POST(request: NextRequest) {
    try {
        const payload = await getPayload({ config });
        const body = await request.json();

        const { cartId, shippingAddress, taxExempt = false, shippingMethod = 'standard' } = body;

        if (!cartId) {
            return NextResponse.json(
                { error: 'cartId is required' },
                { status: 400 },
            );
        }

        // Get cart with populated items
        const cart = await payload.findByID({
            collection: 'carts',
            id: cartId,
            depth: 2,
        });

        if (!cart) {
            return NextResponse.json(
                { error: 'Cart not found' },
                { status: 404 },
            );
        }

        if (!cart.items?.length) {
            return NextResponse.json({
                subtotal: 0,
                tax: { rate: 0, amount: 0, exempt: false },
                shipping: { method: shippingMethod, cost: 0, estimatedDays: 0 },
                total: 0,
            });
        }

        // Map cart items to the format expected by calculateOrderTotals
        const taxItems: CartItemForTax[] = cart.items.map((item: any) => ({
            product: typeof item.product === 'object' ? item.product : { pricing: {} },
            productType: item.productType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
        }));

        const address: ShippingAddress | null = shippingAddress
            ? {
                street: shippingAddress.street,
                city: shippingAddress.city,
                state: shippingAddress.state,
                zip: shippingAddress.zip,
                country: shippingAddress.country || 'US',
            }
            : null;

        const totals = calculateOrderTotals(taxItems, address, {
            taxExempt,
            shippingMethod,
        });

        return NextResponse.json({
            subtotal: totals.subtotal,
            tax: totals.tax,
            shipping: totals.shipping,
            total: totals.total,
        });
    } catch (error) {
        console.error('Checkout preview error:', error);
        return NextResponse.json(
            { error: 'Failed to calculate checkout preview' },
            { status: 500 },
        );
    }
}
