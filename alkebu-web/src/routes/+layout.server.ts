import { payloadGet } from '$lib/server/payload';
import type { LayoutServerLoad } from './$types';

// Runs on every SSR request, so keep it to what the shell needs. Book shelves
// belong to the homepage's own load; fetching them here serialized ~160KB of
// unused JSON into every page.
export const load: LayoutServerLoad = async ({ locals }) => {
  try {
    const settings = await payloadGet<any>('/api/globals/siteSettings?depth=1');

    // Note: Cache headers are set at page level to avoid conflicts
    return {
      settings: settings || {},
      user: locals.user ?? null
    };
  } catch (error) {
    console.error('Error loading layout data:', error);

    return {
      settings: {},
      user: locals.user ?? null
    };
  }
};
