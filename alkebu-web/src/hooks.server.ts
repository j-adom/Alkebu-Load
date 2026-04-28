// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { getPayloadApiUrl } from '$lib/server/payloadEnv';

const securityHeaders: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
};

export const handle: Handle = async ({ event, resolve }) => {
  // Get Payload JWT from cookie
  const token = event.cookies.get('payload-token');
  
  if (token) {
    try {
      const payloadApiUrl = getPayloadApiUrl();
      const response = await fetch(`${payloadApiUrl}/api/users/me`, {
        headers: { 
          'Authorization': `JWT ${token}` 
        }
      });
      
      if (response.ok) {
        event.locals.user = await response.json();
      } else {
        event.cookies.delete('payload-token', { path: '/' });
      }
    } catch (error) {
      // Token invalid, clear it
      event.cookies.delete('payload-token', { path: '/' });
    }
  }
  
  const response = await resolve(event);

  for (const [header, value] of Object.entries(securityHeaders)) {
    response.headers.set(header, value);
  }

  return response;
};
