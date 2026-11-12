// POST /api/ingram-enrichment-review/:id/accept | /:id/reject | /bulk-accept
// Thin HTTP wrappers for the review screen; the workflow enforces staff-only and state.
import { addDataAndFileToRequest, type PayloadRequest } from 'payload';

import { acceptReview, bulkAcceptByPath, isReviewStaff, rejectReview, type AcceptExtras } from './reviewWorkflow';

type Req = Pick<PayloadRequest, 'user' | 'payload' | 'routeParams'> & Partial<PayloadRequest>;

/**
 * Accepted price/title proposals must reach Square first (Task 20b), or the next Square
 * catalog sync would revert them. Resolved lazily so this module never loads the SDK.
 */
async function acceptExtras(): Promise<AcceptExtras> {
  const { squareWriteOptionFromEnv } = await import('./squareWriteBack');
  return { square: await squareWriteOptionFromEnv() };
}

const forbidden = () => Response.json({ error: 'Only admin or staff can review Ingram proposals.' }, { status: 403 });

function idOf(req: Req): string | number | null {
  const id = req.routeParams?.id as string | number | undefined;
  return id === undefined || id === '' ? null : id;
}

export async function handleAcceptReview(req: Req, accept: typeof acceptReview = acceptReview): Promise<Response> {
  if (!isReviewStaff(req.user)) return forbidden();
  const id = idOf(req);
  if (id === null) return Response.json({ error: 'Review id is required.' }, { status: 400 });
  try {
    const result = await accept(req.payload as any, id, req.user, await acceptExtras());
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Accept failed.' }, { status: 409 });
  }
}

export async function handleRejectReview(req: Req, reject: typeof rejectReview = rejectReview): Promise<Response> {
  if (!isReviewStaff(req.user)) return forbidden();
  const id = idOf(req);
  if (id === null) return Response.json({ error: 'Review id is required.' }, { status: 400 });
  try {
    await reject(req.payload as any, id, req.user);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Reject failed.' }, { status: 409 });
  }
}

export async function handleBulkAccept(req: Req, bulk: typeof bulkAcceptByPath = bulkAcceptByPath): Promise<Response> {
  if (!isReviewStaff(req.user)) return forbidden();
  if (req.data === undefined) await addDataAndFileToRequest(req as PayloadRequest);
  const path = (req.data as { path?: unknown } | undefined)?.path;
  if (typeof path !== 'string' || !/^[a-zA-Z.]+$/.test(path)) {
    return Response.json({ error: 'Body must be { "path": "<field>" }.' }, { status: 400 });
  }
  const result = await bulk(req.payload as any, path, req.user, await acceptExtras());
  return Response.json({ ok: true, ...result });
}
