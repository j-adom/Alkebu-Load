// POST /api/square-catalog-staging/:id/promote -- the admin Promote button's endpoint.
// Thin wrapper: promoteStagedItem already enforces staff-only, 'ready' status, a clean
// re-map and single promotion inside a transaction; this maps its refusals to HTTP.
import type { PayloadRequest } from 'payload';

import { isCatalogStaff, promoteStagedItem } from './squareStagingWorkflow';

export async function handlePromoteRequest(
  req: Pick<PayloadRequest, 'user' | 'payload' | 'routeParams'>,
  promote: typeof promoteStagedItem = promoteStagedItem,
): Promise<Response> {
  if (!isCatalogStaff(req.user)) {
    return Response.json({ error: 'Only admin or staff can promote staged items.' }, { status: 403 });
  }
  const id = req.routeParams?.id as string | number | undefined;
  if (id === undefined || id === '') {
    return Response.json({ error: 'Staging item id is required.' }, { status: 400 });
  }
  try {
    const { bookId } = await promote(req.payload as any, id, req.user);
    return Response.json({ bookId });
  } catch (error) {
    // Refusals (not ready, already promoted, no longer maps cleanly) are expected states.
    return Response.json({ error: error instanceof Error ? error.message : 'Promotion failed.' }, { status: 409 });
  }
}
