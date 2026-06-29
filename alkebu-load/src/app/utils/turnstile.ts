const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Returns the client IP from a request's Headers.
 * Prefers `cf-connecting-ip`, falls back to the first entry in
 * `x-forwarded-for`, and returns `'unknown'` when neither is present.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Verifies a Cloudflare Turnstile token against the siteverify API.
 * Fail-closed: if `TURNSTILE_SECRET_KEY` is not set, every submission is
 * rejected — silently passing traffic through would remove protection without
 * anyone noticing.
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp: string,
): Promise<{ success: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set; rejecting submission.');
    return { success: false, error: 'Bot protection is not configured on the server.' };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== 'unknown') {
      body.set('remoteip', remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      console.warn('Turnstile siteverify returned non-2xx:', response.status);
      return { success: false, error: 'Bot check failed. Please try again.' };
    }

    const data = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (data.success !== true) {
      console.warn('Turnstile verification rejected token:', data['error-codes']);
      return { success: false, error: 'Bot check failed. Please refresh the page and try again.' };
    }

    return { success: true };
  } catch (err) {
    console.error('Turnstile verification request failed:', err);
    return { success: false, error: 'Bot check failed. Please try again in a moment.' };
  }
}
