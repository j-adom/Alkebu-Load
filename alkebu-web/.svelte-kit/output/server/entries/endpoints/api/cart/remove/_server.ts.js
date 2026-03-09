import { json } from "@sveltejs/kit";
import { P as PAYLOAD_API_URL } from "../../../../../chunks/private.js";
const DELETE = async ({ request, fetch }) => {
  const payload = await request.json();
  const response = await fetch(`${PAYLOAD_API_URL}/api/cart/remove`, {
    method: "DELETE",
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
  DELETE
};
