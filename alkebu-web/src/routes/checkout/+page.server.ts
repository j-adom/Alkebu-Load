import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, setHeaders }) => {
  setHeaders({
    'Cache-Control': 'private, no-store',
  });

  const { user } = await parent();
  return { user };
};
