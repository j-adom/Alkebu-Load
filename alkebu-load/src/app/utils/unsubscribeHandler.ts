import type { Payload } from 'payload';

import { suppressMarketingEmail, verifyUnsubscribeToken } from './marketingEmail';

export async function handleUnsubscribe(payload: Payload, request: Request): Promise<Response> {
  try {
    let token: unknown = new URL(request.url).searchParams.get('t');

    if (!token && (request.headers.get('content-type') || '').includes('application/json')) {
      try {
        const body = await request.json();
        token = body?.token;
      } catch {
        token = null;
      }
    }

    const email = verifyUnsubscribeToken(token);
    if (!email) {
      return Response.json({ error: 'This unsubscribe link is not valid.' }, { status: 400 });
    }

    await suppressMarketingEmail(payload, email);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return Response.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
