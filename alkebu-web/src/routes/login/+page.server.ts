// src/routes/login/+page.server.ts
import { PAYLOAD_API_URL } from '$env/static/private';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies, fetch }) => {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');
    
    const response = await fetch(`${PAYLOAD_API_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const { token } = await response.json();
      
      cookies.set('payload-token', token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
      
      return { success: true };
    }
    
    return { success: false, error: 'Invalid credentials' };
  }
};
