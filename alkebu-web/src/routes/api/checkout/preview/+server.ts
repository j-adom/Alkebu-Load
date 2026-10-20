import { json, type RequestHandler } from '@sveltejs/kit'
import { getPayloadApiUrl } from '$lib/server/payloadEnv'
import {
    cartRequestHeaders,
    takeCartSession,
    withoutClientIdentity,
} from '$lib/server/cartSession'

/**
 * POST /api/checkout/preview
 *
 * Proxies to Payload's checkout preview endpoint.
 * Returns tax, shipping, and total estimates for a given cart + address.
 * Payload checks the cart token / login forwarded by cartRequestHeaders.
 */
export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
    const payloadApiUrl = getPayloadApiUrl()
    const payload = withoutClientIdentity(await request.json())
    const normalizedCountry = payload?.shippingAddress?.country?.trim?.().toUpperCase?.()

    if (normalizedCountry) {
        payload.shippingAddress.country = normalizedCountry
    }

    const response = await fetch(`${payloadApiUrl}/api/checkout/preview`, {
        method: 'POST',
        headers: cartRequestHeaders(cookies, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
    })

    const data = await response.json()

    return json(takeCartSession(cookies, data, response.ok), { status: response.status })
}
