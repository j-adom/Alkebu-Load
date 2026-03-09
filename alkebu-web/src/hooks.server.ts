// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { getPayloadApiUrl } from '$lib/server/payloadEnv';

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
      }
    } catch (error) {
      // Token invalid, clear it
      event.cookies.delete('payload-token', { path: '/' });
    }
  }
  
  return resolve(event);
};
