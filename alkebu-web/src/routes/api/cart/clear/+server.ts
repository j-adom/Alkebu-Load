import { json, type RequestHandler } from '@sveltejs/kit'
import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv'

export const POST: RequestHandler = async ({ request, fetch }) => {
  const payloadApiUrl = getPayloadApiUrl()
  const payload = await request.json()

  const response = await fetch(`${payloadApiUrl}/api/cart/clear`, {
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
