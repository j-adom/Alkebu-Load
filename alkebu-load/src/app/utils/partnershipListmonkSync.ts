import type { CollectionAfterChangeHook } from 'payload'

import {
  subscribeToB2BList,
  type ListmonkSubscribeInput,
  type ListmonkSubscribeResult,
} from './listmonkClient'

/**
 * Staff-gated PartnershipInquiries -> listmonk sync.
 *
 * When staff mark an inquiry `qualified` or `won`, the lead is subscribed to
 * the "B2B Partners" listmonk list and the outcome lands in the pre-existing
 * crmSyncStatus / crmExternalId fields (no schema change). Best-effort by
 * design: nothing in here may throw into the afterChange pipeline, because
 * that would block a staff member's save over a listmonk outage.
 *
 * Spec: docs/superpowers/specs/2026-07-15-partnership-listmonk-sync-design.md
 * Why these leads go on a list at all: docs/b2b-email-strategy.md
 */

const SYNC_STATUSES = new Set(['qualified', 'won'])

type InquiryDocLike = {
  id: string | number
  status?: string | null
  crmSyncStatus?: string | null
  email?: string | null
  name?: string | null
  organizationName?: string | null
  inquiryType?: string | null
}

export function shouldSyncToListmonk(args: {
  doc: InquiryDocLike
  context?: Record<string, unknown>
}): boolean {
  if (args.context?.listmonkSyncDone) return false
  if (!args.doc.status || !SYNC_STATUSES.has(args.doc.status)) return false
  if (args.doc.crmSyncStatus === 'synced') return false
  if (!args.doc.email) return false
  return true
}

export interface PartnershipListmonkSyncDeps {
  subscribe: (input: ListmonkSubscribeInput) => Promise<ListmonkSubscribeResult>
  updateInquiry: (
    id: string | number,
    data: { crmSyncStatus: 'synced' | 'failed'; crmExternalId?: string },
  ) => Promise<unknown>
}

export async function runPartnershipListmonkSync(
  args: { doc: InquiryDocLike; context?: Record<string, unknown> },
  deps: PartnershipListmonkSyncDeps,
): Promise<void> {
  if (!shouldSyncToListmonk(args)) return

  try {
    const result = await deps.subscribe({
      email: args.doc.email as string,
      name: args.doc.name || (args.doc.email as string),
      organizationName: args.doc.organizationName ?? undefined,
      inquiryType: args.doc.inquiryType ?? undefined,
    })

    if (!result.ok && result.unconfigured) {
      // No env, no error: crmSyncStatus stays not_configured on purpose.
      return
    }

    if (result.ok) {
      await deps.updateInquiry(args.doc.id, {
        crmSyncStatus: 'synced',
        crmExternalId: result.subscriberId != null ? String(result.subscriberId) : '',
      })
    } else {
      console.error(`Partnership listmonk sync failed for inquiry ${args.doc.id}: ${result.error}`)
      await deps.updateInquiry(args.doc.id, { crmSyncStatus: 'failed' })
    }
  } catch (err) {
    console.error(`Partnership listmonk sync error for inquiry ${args.doc.id}:`, err)
  }
}

export const partnershipListmonkSyncHook: CollectionAfterChangeHook = async ({
  doc,
  req,
  context,
}) => {
  await runPartnershipListmonkSync(
    { doc: doc as InquiryDocLike, context: context as Record<string, unknown> | undefined },
    {
      subscribe: subscribeToB2BList,
      // Threading `req` keeps the write-back inside the parent operation's
      // transaction (see customerUpsert.ts for the incident that taught us).
      // context.listmonkSyncDone stops the write-back re-triggering this hook.
      updateInquiry: (id, data) =>
        req.payload.update({
          collection: 'partnership-inquiries',
          id,
          data,
          req,
          context: { listmonkSyncDone: true },
          overrideAccess: true,
        }),
    },
  )
  return doc
}
