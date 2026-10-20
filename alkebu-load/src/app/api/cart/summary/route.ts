import type { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { handleCartSummary } from '@/app/utils/cartRouteHandlers'

// Ownership (cart token or signed-in owner) is enforced in handleCartSummary.
export async function GET(request: NextRequest) {
  return handleCartSummary(await getPayload({ config }), request)
}
