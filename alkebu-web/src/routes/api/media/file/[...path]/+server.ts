import { getPayloadApiUrl } from '$lib/server/payloadEnv';
import type { RequestHandler } from './$types';

/**
 * Proxy media requests to Payload backend
 * This avoids CORS issues and allows caching
 */
export const GET: RequestHandler = async ({ params, fetch }) => {
  const path = params.path;
  
  try {
    const payloadApiUrl = getPayloadApiUrl();
    const response = await fetch(`${payloadApiUrl}/api/media/file/${path}`);
    
    if (!response.ok) {
      return new Response('Media not found', { status: 404 });
    }
    
    const buffer = await response.arrayBuffer();
    
    return new Response(buffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': response.headers.get('Content-Length') || '',
      },
    });
  } catch (error) {
    console.error('Media proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
