import { json, type RequestHandler } from '@sveltejs/kit'
import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv'

const CART_SESSION_COOKIE = 'cart_session'

/**
 * POST /api/checkout/preview
 *
 * Proxies to Payload's checkout preview endpoint.
 * Returns tax, shipping, and total estimates for a given cart + address.
 */
export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
    const payloadApiUrl = getPayloadApiUrl()
    const payload = await request.json()

    // Inject cart ID from cookie if not provided
    if (!payload.cartId) {
        const sessionCookie = cookies.get(CART_SESSION_COOKIE)
        if (sessionCookie) {
            payload.cartId = sessionCookie
        }
    }

    const response = await fetch(`${payloadApiUrl}/api/checkout/preview`, {
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
