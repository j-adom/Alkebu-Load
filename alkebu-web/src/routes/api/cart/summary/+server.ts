import { json, type RequestHandler } from '@sveltejs/kit'
import { getPayloadApiUrl } from '$lib/server/payloadEnv'
import {
  cartRequestHeaders,
  getCartSessionToken,
  takeCartSession,
} from '$lib/server/cartSession'

const emptyCart = {
  id: '',
  items: [],
  itemCount: 0,
  subtotal: 0,
  tax: 0,
  shipping: 0,
  total: 0,
  status: 'active',
}

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
  const payloadApiUrl = getPayloadApiUrl()
  const token = getCartSessionToken(cookies)
  // Optional selector only (e.g. a pre-migration cart id kept in localStorage);
  // ownership is proven by the cookie token or the shopper's login.
  const cartIdHint = url.searchParams.get('cartId')

  const load = async (cartId: string | null) => {
    const params = new URLSearchParams()
    if (cartId) {
      params.set('cartId', cartId)
    } else if (token) {
      // Lookup key for a Payload that predates the x-cart-session header.
      params.set('sessionId', token)
    }
    const response = await fetch(`${payloadApiUrl}/api/cart/summary?${params.toString()}`, {
      method: 'GET',
      headers: cartRequestHeaders(cookies),
    })
    return { response, data: await response.json().catch(() => null) }
  }

  let result = await load(cartIdHint)
  if (!result.response.ok && cartIdHint) {
    // A stale hint must not hide the cart the cookie actually owns.
    result = await load(null)
  }

  const { response, data } = result
  const body = takeCartSession(cookies, data, response.ok)

  if (!response.ok || !body?.cart) {
    return json(emptyCart, { status: 200 })
  }

  return json(body.cart, { status: 200 })
}
