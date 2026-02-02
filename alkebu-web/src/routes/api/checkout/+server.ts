import { json, type RequestHandler } from '@sveltejs/kit'
import { PAYLOAD_API_URL, PAYLOAD_API_KEY } from '$env/static/private'

const CART_SESSION_COOKIE = 'cart_session'

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
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

  const response = await fetch(`${PAYLOAD_API_URL}/api/checkout`, {
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

export const GET: RequestHandler = async ({ url, fetch }) => {
  const response = await fetch(
    `${PAYLOAD_API_URL}/api/checkout?${url.searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        ...(PAYLOAD_API_KEY ? { Authorization: `Bearer ${PAYLOAD_API_KEY}` } : {}),
      },
    },
  )

  const data = await response.json()
  return json(data, { status: response.status })
}
