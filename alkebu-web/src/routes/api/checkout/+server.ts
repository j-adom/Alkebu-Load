import { json, type RequestHandler } from '@sveltejs/kit'
import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv'
import {
  cartRequestHeaders,
  clearCartSession,
  takeCartSession,
  withoutClientIdentity,
} from '$lib/server/cartSession'

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
  const payloadApiUrl = getPayloadApiUrl()
  const payload = withoutClientIdentity(await request.json())
  const normalizedCountry = payload?.shippingAddress?.country?.trim?.().toUpperCase?.()

  if (normalizedCountry) {
    payload.shippingAddress.country = normalizedCountry
  }

  // Basic guard: only US addresses are allowed
  if (payload?.shippingAddress?.country && payload.shippingAddress.country !== 'US') {
    return json({ error: 'Only US shipping addresses are supported.' }, { status: 400 })
  }

  const response = await fetch(`${payloadApiUrl}/api/checkout`, {
    method: 'POST',
    headers: cartRequestHeaders(cookies, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  return json(takeCartSession(cookies, data, response.ok), { status: response.status })
}

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
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

  if (response.ok && data?.orderCreated) {
    clearCartSession(cookies)
  }

  return json(data, { status: response.status })
}
