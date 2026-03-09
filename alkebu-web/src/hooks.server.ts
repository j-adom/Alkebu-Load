// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { PAYLOAD_API_URL } from '$env/static/private';

export const handle: Handle = async ({ event, resolve }) => {
  // Get Payload JWT from cookie
  const token = event.cookies.get('payload-token');
  
  if (token) {
    try {
      const response = await fetch(`${PAYLOAD_API_URL}/api/users/me`, {
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
