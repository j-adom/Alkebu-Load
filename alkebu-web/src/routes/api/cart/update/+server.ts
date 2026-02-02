import { json, type RequestHandler } from '@sveltejs/kit'
import { PAYLOAD_API_URL, PAYLOAD_API_KEY } from '$env/static/private'

const CART_SESSION_COOKIE = 'cart_session'

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
  const payload = await request.json()

  if (!payload.cartId) {
    const existingSession = cookies.get(CART_SESSION_COOKIE)
    if (existingSession && !payload.sessionId) {
      payload.sessionId = existingSession
    }
  }

  const response = await fetch(`${PAYLOAD_API_URL}/api/cart/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(PAYLOAD_API_KEY ? { Authorization: `Bearer ${PAYLOAD_API_KEY}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  return json(data, { status: response.status })
}
