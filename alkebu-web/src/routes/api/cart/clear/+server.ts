import { json, type RequestHandler } from '@sveltejs/kit'
import { getPayloadApiUrl } from '$lib/server/payloadEnv'
import {
  cartRequestHeaders,
  takeCartSession,
  withoutClientIdentity,
} from '$lib/server/cartSession'

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
  const payloadApiUrl = getPayloadApiUrl()
  const payload = withoutClientIdentity(await request.json())

  const response = await fetch(`${payloadApiUrl}/api/cart/clear`, {
    method: 'POST',
    headers: cartRequestHeaders(cookies, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  return json(takeCartSession(cookies, data, response.ok), { status: response.status })
}
