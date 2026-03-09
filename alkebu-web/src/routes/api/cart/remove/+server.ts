import { json, type RequestHandler } from '@sveltejs/kit'
import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv'

export const DELETE: RequestHandler = async ({ request, fetch }) => {
  const payloadApiUrl = getPayloadApiUrl()
  const payload = await request.json()

  const response = await fetch(`${payloadApiUrl}/api/cart/remove`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getPayloadAuthHeader(),
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  return json(data, { status: response.status })
}
