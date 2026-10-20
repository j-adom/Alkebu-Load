import type { NextRequest } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { handleCheckoutPreview } from '@/app/utils/checkoutRouteHandlers';

/**
 * POST /api/checkout/preview
 *
 * Returns estimated tax, shipping, and total for a cart + shipping address
 * WITHOUT creating a Stripe session. Ownership (cart token or signed-in owner)
 * is enforced in handleCheckoutPreview.
 */
export async function POST(request: NextRequest) {
  return handleCheckoutPreview(await getPayload({ config }), request);
}
