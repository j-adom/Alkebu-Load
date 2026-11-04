import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv';

// Unsubscribing happens on an explicit button press (form action), never on
// page load: email link scanners prefetch GETs and would unsubscribe people.
export const load: PageServerLoad = async ({ url, setHeaders }) => {
  setHeaders({ 'Cache-Control': 'private, no-store' });
  return { token: url.searchParams.get('t') ?? '' };
};

export const actions: Actions = {
  default: async ({ request, fetch }) => {
    const form = await request.formData();
    const token = String(form.get('token') ?? '');
    if (!token) return fail(400, { error: 'This unsubscribe link is missing its code.' });

    try {
      const response = await fetch(`${getPayloadApiUrl()}/api/email/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPayloadAuthHeader() },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        return fail(response.status || 400, {
          error: typeof data?.error === 'string' ? data.error : 'This unsubscribe link is not valid.',
        });
      }
    } catch {
      return fail(503, { error: "We couldn't reach the store just now. Please try again in a minute." });
    }

    return { done: true };
  },
};
