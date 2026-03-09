import { json } from "@sveltejs/kit";
import { P as PAYLOAD_API_URL } from "../../../../../chunks/private.js";
const CART_SESSION_COOKIE = "cart_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const POST = async ({ request, cookies, fetch }) => {
  const payload = await request.json();
  const existingSession = cookies.get(CART_SESSION_COOKIE);
  if (!payload.sessionId && existingSession) {
    payload.sessionId = existingSession;
  }
  const response = await fetch(`${PAYLOAD_API_URL}/api/cart/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...{}
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (response.ok && data?.sessionId) {
    cookies.set(CART_SESSION_COOKIE, data.sessionId, {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: "lax"
    });
  }
  return json(data, { status: response.status });
};
export {
  POST
};
