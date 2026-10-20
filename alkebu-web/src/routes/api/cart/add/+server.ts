import { json, type RequestHandler } from '@sveltejs/kit'
import { getPayloadApiUrl } from '$lib/server/payloadEnv'
import {
  cartRequestHeaders,
  getCartSessionToken,
  takeCartSession,
  withoutClientIdentity,
} from '$lib/server/cartSession'

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
  const payloadApiUrl = getPayloadApiUrl()
  const payload = withoutClientIdentity(await request.json())

  // Body copy of the cookie token, for a Payload that predates the
  // x-cart-session header (it adopts this as the new cart's sessionId).
  const token = getCartSessionToken(cookies)
  if (token) {
    payload.sessionId = token
  }

  const response = await fetch(`${payloadApiUrl}/api/cart/add`, {
    method: 'POST',
    headers: cartRequestHeaders(cookies, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  return json(takeCartSession(cookies, data, response.ok), { status: response.status })
}
