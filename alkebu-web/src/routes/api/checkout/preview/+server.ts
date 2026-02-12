import { json, type RequestHandler } from '@sveltejs/kit'
import { PAYLOAD_API_URL, PAYLOAD_API_KEY } from '$env/static/private'

const CART_SESSION_COOKIE = 'cart_session'

/**
 * POST /api/checkout/preview
 *
 * Proxies to Payload's checkout preview endpoint.
 * Returns tax, shipping, and total estimates for a given cart + address.
 */
export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
    const payload = await request.json()

    // Inject cart ID from cookie if not provided
    if (!payload.cartId) {
        const sessionCookie = cookies.get(CART_SESSION_COOKIE)
        if (sessionCookie) {
            payload.cartId = sessionCookie
        }
    }

    const response = await fetch(`${PAYLOAD_API_URL}/api/checkout/preview`, {
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
