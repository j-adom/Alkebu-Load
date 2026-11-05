import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv';
import { takeCartSession } from '$lib/server/cartSession';

/**
 * Landing page for the abandoned-cart reminder link (/cart/recover?t=<signed token>).
 * Payload verifies the token and returns the cart's session token, which goes
 * into the httpOnly cart cookie; the shopper then lands on their cart.
 */
export const load: PageServerLoad = async ({ url, cookies, fetch, setHeaders }) => {
  setHeaders({ 'Cache-Control': 'private, no-store' });

  const token = url.searchParams.get('t');
  if (!token) {
    return { error: 'This link is missing its cart code.' };
  }

  let response: Response;
  try {
    response = await fetch(`${getPayloadApiUrl()}/api/cart-recovery/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getPayloadAuthHeader() },
      body: JSON.stringify({ token }),
    });
  } catch {
    return { error: "We couldn't reach the store just now. Please try the link again in a minute." };
  }

  const data = await response.json().catch(() => ({}));
  if (response.ok && data?.success) {
    takeCartSession(cookies, data, true);
    redirect(303, '/cart');
  }

  return { error: typeof data?.error === 'string' ? data.error : 'This link has expired or is not valid.' };
};
