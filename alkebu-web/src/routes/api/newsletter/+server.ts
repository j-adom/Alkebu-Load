import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/**
 * Newsletter signup proxy → listmonk.
 *
 * Forwards an email to a listmonk instance via its admin API
 * (POST /api/subscribers), assigning the configured list. Secrets are read
 * from server-only env vars so nothing sensitive ships to the client:
 *   LISTMONK_API_URL    e.g. https://listmonk.alkebulanimages.com
 *   LISTMONK_API_USER   listmonk API user
 *   LISTMONK_API_TOKEN  that user's API token
 *   LISTMONK_LIST_ID    numeric id of the target list
 *
 * Set these in alkebu-web/.env.local (dev) and the Cloudflare Pages
 * environment (prod). Until they're set the endpoint returns 503 rather
 * than pretending the signup worked.
 */
export const POST: RequestHandler = async ({ request, fetch }) => {
  let email = '';
  try {
    const body = await request.json();
    email = (body?.email ?? '').toString().trim();
  } catch {
    return json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const apiUrl = env.LISTMONK_API_URL;
  const apiUser = env.LISTMONK_API_USER;
  const apiToken = env.LISTMONK_API_TOKEN;
  const listId = Number(env.LISTMONK_LIST_ID);

  if (!apiUrl || !apiUser || !apiToken || !listId) {
    console.error('Newsletter signup is not configured (missing LISTMONK_* env vars).');
    return json(
      { success: false, error: 'Newsletter signup is temporarily unavailable.' },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // listmonk v3+ (incl. v6) token auth: "token <api_user>:<api_token>"
        Authorization: `token ${apiUser}:${apiToken}`,
      },
      body: JSON.stringify({
        email,
        name: email.split('@')[0],
        status: 'enabled',
        lists: [listId],
        preconfirm_subscriptions: true,
      }),
    });

    if (response.ok) {
      return json({ success: true });
    }

    // listmonk returns 409 when the subscriber already exists — that's a
    // success from the visitor's point of view, not an error.
    if (response.status === 409) {
      return json({ success: true, alreadySubscribed: true });
    }

    const data = await response.json().catch(() => ({}));
    console.error('listmonk newsletter signup failed:', response.status, data);
    return json(
      { success: false, error: 'Could not complete signup. Please try again later.' },
      { status: 502 }
    );
  } catch (err) {
    console.error('listmonk newsletter signup error:', err);
    return json(
      { success: false, error: 'Could not complete signup. Please try again later.' },
      { status: 502 }
    );
  }
};

/**
 * Health check for the newsletter wiring. Reports whether the env is
 * configured and whether listmonk accepts the token for the target list —
 * WITHOUT exposing any secret values. Hit it at GET /api/newsletter.
 * Safe to remove once the integration is confirmed working.
 */
export const GET: RequestHandler = async ({ fetch }) => {
  const present = {
    LISTMONK_API_URL: Boolean(env.LISTMONK_API_URL),
    LISTMONK_API_USER: Boolean(env.LISTMONK_API_USER),
    LISTMONK_API_TOKEN: Boolean(env.LISTMONK_API_TOKEN),
    LISTMONK_LIST_ID: Boolean(env.LISTMONK_LIST_ID),
  };
  const missing = Object.entries(present)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  if (missing.length > 0) {
    return json({ configured: false, missing });
  }

  const apiUrl = (env.LISTMONK_API_URL as string).replace(/\/$/, '');
  const listId = Number(env.LISTMONK_LIST_ID);

  try {
    const res = await fetch(`${apiUrl}/api/lists/${listId}`, {
      headers: {
        Authorization: `token ${env.LISTMONK_API_USER}:${env.LISTMONK_API_TOKEN}`,
      },
    });

    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      return json({
        configured: true,
        reachable: true,
        listFound: true,
        listId,
        listName: body?.data?.name ?? null,
      });
    }

    if (res.status === 401 || res.status === 403) {
      return json(
        { configured: true, reachable: true, authError: true, status: res.status },
        { status: 200 }
      );
    }

    if (res.status === 404) {
      return json(
        { configured: true, reachable: true, listFound: false, status: 404 },
        { status: 200 }
      );
    }

    return json({ configured: true, reachable: true, status: res.status }, { status: 200 });
  } catch {
    return json({ configured: true, reachable: false }, { status: 200 });
  }
};
