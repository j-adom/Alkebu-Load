import { json } from "@sveltejs/kit";
import { P as PAYLOAD_API_URL } from "../../../../../chunks/private.js";
const CART_SESSION_COOKIE = "cart_session";
const POST = async ({ request, cookies, fetch }) => {
  const payload = await request.json();
  if (!payload.cartId) {
    const existingSession = cookies.get(CART_SESSION_COOKIE);
    if (existingSession && !payload.sessionId) {
      payload.sessionId = existingSession;
    }
  }
  const response = await fetch(`${PAYLOAD_API_URL}/api/cart/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...{}
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  return json(data, { status: response.status });
};
export {
  POST
};
