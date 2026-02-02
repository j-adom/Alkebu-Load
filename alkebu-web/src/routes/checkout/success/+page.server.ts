import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return {
      sessionId: null,
      status: null,
    };
  }

  try {
    const response = await fetch(`/api/checkout?session_id=${encodeURIComponent(sessionId)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        sessionId,
        status: null,
      };
    }

    const status = await response.json();
    return {
      sessionId,
      status,
    };
  } catch (error) {
    console.error('Failed to check checkout status', error);
    return {
      sessionId,
      status: null,
    };
  }
};
