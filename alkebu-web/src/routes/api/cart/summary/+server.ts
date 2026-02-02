import { json, type RequestHandler } from '@sveltejs/kit'
import { PAYLOAD_API_URL, PAYLOAD_API_KEY } from '$env/static/private'

const CART_SESSION_COOKIE = 'cart_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export const GET: RequestHandler = async ({ url, cookies, fetch, locals }) => {
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
    `${PAYLOAD_API_URL}/api/cart/summary?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        ...(PAYLOAD_API_KEY ? { Authorization: `Bearer ${PAYLOAD_API_KEY}` } : {}),
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
