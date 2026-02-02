import { json, type RequestHandler } from '@sveltejs/kit'
import { PAYLOAD_API_URL, PAYLOAD_API_KEY } from '$env/static/private'

export const DELETE: RequestHandler = async ({ request, fetch }) => {
  const payload = await request.json()

  const response = await fetch(`${PAYLOAD_API_URL}/api/cart/remove`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(PAYLOAD_API_KEY ? { Authorization: `Bearer ${PAYLOAD_API_KEY}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  return json(data, { status: response.status })
}
