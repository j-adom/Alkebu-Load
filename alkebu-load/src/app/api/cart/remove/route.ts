import type { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { handleCartRemove } from '@/app/utils/cartRouteHandlers'

// Ownership (cart token or signed-in owner) is enforced in handleCartRemove.
export async function DELETE(request: NextRequest) {
  return handleCartRemove(await getPayload({ config }), request)
}
