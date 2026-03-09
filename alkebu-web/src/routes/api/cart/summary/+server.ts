import { json, type RequestHandler } from '@sveltejs/kit'
import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv'

const CART_SESSION_COOKIE = 'cart_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export const GET: RequestHandler = async ({ url, cookies, fetch, locals }) => {
  const payloadApiUrl = getPayloadApiUrl()
  const params = new URLSearchParams(url.searchParams)

  if (!params.get('cartId') && !params.get('sessionId')) {
    const sessionCookie = cookies.get(CART_SESSION_COOKIE)
    if (sessionCookie) {
      params.set('sessionId', sessionCookie)
    }
  }

  if (locals.user?.id && !params.get('userId')) {
    params.set('userId', locals.user.id)
  }

  const response = await fetch(
    `${payloadApiUrl}/api/cart/summary?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        ...getPayloadAuthHeader(),
      },
    },
  )

  const data = await response.json()

  if (response.ok && data?.sessionId) {
    cookies.set(CART_SESSION_COOKIE, data.sessionId, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: 'lax',
    })
  }

  if (!response.ok) {
    return json(
      {
        id: '',
        items: [],
        itemCount: 0,
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        status: 'active',
      },
      { status: 200 },
    )
  }

  return json(data.cart, { status: 200 })
}
