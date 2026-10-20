import type { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { handleCartClear } from '@/app/utils/cartRouteHandlers'

// Ownership (cart token or signed-in owner) is enforced in handleCartClear.
export async function POST(request: NextRequest) {
  return handleCartClear(await getPayload({ config }), request)
}
