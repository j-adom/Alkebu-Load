import { json, type RequestHandler } from '@sveltejs/kit'
import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv'

const CART_SESSION_COOKIE = 'cart_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
  const payloadApiUrl = getPayloadApiUrl()
  const payload = await request.json()

  const existingSession = cookies.get(CART_SESSION_COOKIE)
  if (!payload.sessionId && existingSession) {
    payload.sessionId = existingSession
  }

  const response = await fetch(`${payloadApiUrl}/api/cart/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getPayloadAuthHeader(),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (response.ok && data?.sessionId) {
    cookies.set(CART_SESSION_COOKIE, data.sessionId, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: 'lax',
    })
  }

  return json(data, { status: response.status })
}
