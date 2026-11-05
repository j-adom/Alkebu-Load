import type { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { handleCartRecoveryClaim } from '@/app/utils/cartRouteHandlers'

/**
 * Restore a cart from an abandoned-cart reminder link. The signed token in the
 * body is the only credential; see handleCartRecoveryClaim.
 */
export async function POST(request: NextRequest) {
  return handleCartRecoveryClaim(await getPayload({ config }), request)
}
