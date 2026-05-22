import { getPayloadApiUrl } from '$lib/server/payloadEnv';
import type { RequestHandler } from './$types';

/**
 * Proxy media requests to Payload backend.
 * Streams the response (no buffering) so Cloudflare's edge cache can
 * store it and serve future requests without invoking the Worker.
 */
export const GET: RequestHandler = async ({ params, fetch, request }) => {
  const path = params.path;

  try {
    const payloadApiUrl = getPayloadApiUrl();
    const upstream = await fetch(`${payloadApiUrl}/api/media/file/${path}`, {
      headers: {
        // Forward conditional-request headers so upstream can return 304
        ...(request.headers.get('if-none-match') && {
          'if-none-match': request.headers.get('if-none-match')!,
        }),
        ...(request.headers.get('if-modified-since') && {
          'if-modified-since': request.headers.get('if-modified-since')!,
        }),
      },
    });

    if (!upstream.ok && upstream.status !== 304) {
      return new Response('Media not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    const passthrough = ['content-type', 'content-length', 'etag', 'last-modified'];
    for (const name of passthrough) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (!headers.has('content-type')) headers.set('content-type', 'image/webp');

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error('Media proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
