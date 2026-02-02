import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // Cart page is now accessible as a full page view
  // Users can also use the cart drawer from the header
  return {};
};
