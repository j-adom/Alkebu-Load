import { json } from "@sveltejs/kit";
import { P as PAYLOAD_API_URL } from "../../../../chunks/private.js";
const CART_SESSION_COOKIE = "cart_session";
const POST = async ({ request, cookies, fetch }) => {
  const payload = await request.json();
  if (payload?.shippingAddress?.country && payload.shippingAddress.country !== "US") {
    return json({ error: "Only US shipping addresses are supported." }, { status: 400 });
  }
  if (!payload.cartId) {
    const sessionCookie = cookies.get(CART_SESSION_COOKIE);
    if (sessionCookie) {
      payload.cartId = sessionCookie;
    }
  }
  const response = await fetch(`${PAYLOAD_API_URL}/api/checkout`, {
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
const GET = async ({ url, fetch }) => {
  const response = await fetch(
    `${PAYLOAD_API_URL}/api/checkout?${url.searchParams.toString()}`,
    {
      method: "GET",
      headers: {
        ...{}
      }
    }
  );
  const data = await response.json();
  return json(data, { status: response.status });
};
export {
  GET,
  POST
};
