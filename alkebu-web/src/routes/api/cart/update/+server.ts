import { json, type RequestHandler } from '@sveltejs/kit'
import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv'

const CART_SESSION_COOKIE = 'cart_session'

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
  const payloadApiUrl = getPayloadApiUrl()
  const payload = await request.json()

  if (!payload.cartId) {
    const existingSession = cookies.get(CART_SESSION_COOKIE)
    if (existingSession && !payload.sessionId) {
      payload.sessionId = existingSession
    }
  }

  const response = await fetch(`${payloadApiUrl}/api/cart/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getPayloadAuthHeader(),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  return json(data, { status: response.status })
}
