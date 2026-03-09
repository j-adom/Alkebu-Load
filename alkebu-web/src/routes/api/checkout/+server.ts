import { json, type RequestHandler } from '@sveltejs/kit'
import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv'

const CART_SESSION_COOKIE = 'cart_session'

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
  const payloadApiUrl = getPayloadApiUrl()
  const payload = await request.json()

  // Basic guard: only US addresses are allowed
  if (payload?.shippingAddress?.country && payload.shippingAddress.country !== 'US') {
    return json({ error: 'Only US shipping addresses are supported.' }, { status: 400 })
  }

  if (!payload.cartId) {
    const sessionCookie = cookies.get(CART_SESSION_COOKIE)
    if (sessionCookie) {
      payload.cartId = sessionCookie
    }
  }

  const response = await fetch(`${payloadApiUrl}/api/checkout`, {
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

export const GET: RequestHandler = async ({ url, fetch }) => {
  const payloadApiUrl = getPayloadApiUrl()
  const response = await fetch(
    `${payloadApiUrl}/api/checkout?${url.searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        ...getPayloadAuthHeader(),
      },
    },
  )

  const data = await response.json()
  return json(data, { status: response.status })
}
