import type { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { handleCartAdd } from '@/app/utils/cartRouteHandlers'

// Ownership (cart token or signed-in owner) is enforced in handleCartAdd.
export async function POST(request: NextRequest) {
  return handleCartAdd(await getPayload({ config }), request)
}
