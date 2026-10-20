import type { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { handleCartUpdate } from '@/app/utils/cartRouteHandlers'

// Ownership (cart token or signed-in owner) is enforced in handleCartUpdate.
export async function POST(request: NextRequest) {
  return handleCartUpdate(await getPayload({ config }), request)
}
