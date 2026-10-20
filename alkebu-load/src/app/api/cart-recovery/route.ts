import type { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import {
  handleCartRecoveryGet,
  handleCartRecoveryPost,
} from '@/app/utils/cartRouteHandlers'

/**
 * Cart Recovery API. Both methods act only on a cart the caller owns
 * (cart token or signed-in owner); see cartAccess.ts.
 */
export async function GET(request: NextRequest) {
  return handleCartRecoveryGet(await getPayload({ config }), request)
}

/**
 * Update guest email for cart recovery
 */
export async function POST(request: NextRequest) {
  return handleCartRecoveryPost(await getPayload({ config }), request)
}
