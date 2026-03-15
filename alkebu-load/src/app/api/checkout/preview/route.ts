import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import {
    calculateTax,
    type CartItemForTax,
    type ShippingAddress,
} from '@/app/utils/taxShippingCalculations';
import {
    buildShippingQuoteFingerprint,
    formatShippingMethodLabel,
    getShippingMethodCode,
    getShippingQuotes,
} from '@/app/utils/shippingQuotes';
import { validateTaxExemptStatus } from '@/app/utils/taxExemptValidation';

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

        const {
            cartId,
            shippingAddress,
            taxExempt = false,
            selectedShippingRateId,
        } = body;

        if (!cartId) {
            return NextResponse.json(
                { error: 'cartId is required' },
                { status: 400 },
            );
        }

        if (shippingAddress?.country && shippingAddress.country.toUpperCase() !== 'US') {
            return NextResponse.json(
                { error: 'Only US shipping addresses are supported' },
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
                shipping: { method: 'standard', cost: 0, estimatedDays: 0 },
                shippingOptions: [],
                selectedShippingRateId: null,
                quoteExpiresAt: null,
                total: 0,
                taxExempt: false,
            });
        }

        const taxExemptValidation = await validateTaxExemptStatus(
            payload,
            typeof cart.user === 'object' && cart.user !== null ? cart.user.id : cart.user,
            !!taxExempt,
        );

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

        const subtotal = taxItems.reduce(
            (sum, item) => sum + (item.quantity * item.unitPrice),
            0,
        );

        const addressIsComplete = Boolean(
            address?.street &&
            address?.city &&
            address?.state &&
            address?.zip,
        );

        if (!addressIsComplete) {
            return NextResponse.json({
                subtotal,
                tax: { rate: 0, amount: 0, exempt: false },
                shipping: { method: 'standard', cost: 0, estimatedDays: 0 },
                shippingOptions: [],
                selectedShippingRateId: null,
                quoteExpiresAt: null,
                total: subtotal,
                taxExempt: taxExemptValidation.valid,
                taxExemptDenied: taxExempt && !taxExemptValidation.valid
                    ? taxExemptValidation.reason
                    : undefined,
            });
        }

        const quote = await getShippingQuotes({
            items: taxItems,
            shippingAddress: address,
            subtotal,
            selectedShippingRateId,
        });
        const tax = calculateTax(taxItems, address, taxExemptValidation.valid);
        const total = subtotal + tax.amount + quote.selectedOption.amount;
        const shippingMethod = getShippingMethodCode(quote.selectedOption);
        const shippingFingerprint = buildShippingQuoteFingerprint(
            taxItems,
            address,
            taxExemptValidation.valid,
        );

        await payload.update({
            collection: 'carts',
            id: cartId,
            data: {
                shippingAddress,
                taxExempt: taxExemptValidation.valid,
                totalAmount: total,
                totalTax: tax.amount,
                shippingAmount: quote.selectedOption.amount,
                selectedShippingRateId: quote.selectedShippingRateId,
                shippingCarrier: quote.selectedOption.carrier,
                shippingService: quote.selectedOption.service,
                shippingMethod,
                shippingQuoteSource: quote.quoteSource,
                shippingQuoteExpiresAt: quote.quoteExpiresAt,
                shippingQuoteFingerprint: shippingFingerprint,
                shippingEstimatedDays: quote.selectedOption.estimatedDays,
            },
        });

        return NextResponse.json({
            subtotal,
            tax,
            shipping: {
                method: shippingMethod,
                label: formatShippingMethodLabel(quote.selectedOption),
                cost: quote.selectedOption.amount,
                estimatedDays: quote.selectedOption.estimatedDays,
                carrier: quote.selectedOption.carrier,
                service: quote.selectedOption.service,
                isMediaMail: quote.selectedOption.isMediaMail,
            },
            shippingOptions: quote.shippingOptions,
            selectedShippingRateId: quote.selectedShippingRateId,
            quoteExpiresAt: quote.quoteExpiresAt,
            total,
            taxExempt: taxExemptValidation.valid,
            taxExemptDenied: taxExempt && !taxExemptValidation.valid
                ? taxExemptValidation.reason
                : undefined,
        });
    } catch (error) {
        console.error('Checkout preview error:', error);
        return NextResponse.json(
            { error: 'Failed to calculate checkout preview' },
            { status: 500 },
        );
    }
}
