import type { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { handleUnsubscribe } from '@/app/utils/unsubscribeHandler'

/**
 * POST /api/email/unsubscribe
 *
 * Two callers: the storefront /unsubscribe page (JSON body `{ token }`), and
 * mail clients' one-click button from the List-Unsubscribe header (RFC 8058:
 * POST to the header URL, token in `?t=`, form body `List-Unsubscribe=One-Click`).
 * There is deliberately no GET handler: link scanners prefetch GETs.
 */
export async function POST(request: NextRequest) {
  return handleUnsubscribe(await getPayload({ config }), request)
}
