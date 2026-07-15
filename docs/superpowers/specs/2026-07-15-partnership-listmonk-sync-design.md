# Partnership → listmonk Staff-Gated Sync — Design

**Date:** 2026-07-15
**Status:** Approved (consent model and trigger statuses confirmed by Jordan)

## Goal

When staff mark a partnership inquiry `qualified` or `won`, subscribe that lead to a
dedicated "B2B Partners" list on the self-hosted listmonk instance
(`mail.alkebulanimages.com`), and record the outcome on the inquiry. Rationale and send
cadence: [docs/b2b-email-strategy.md](../../b2b-email-strategy.md).

**Explicitly out of scope:** auto-subscribing raw form submissions (rejected on consent +
deliverability grounds), storefront/form changes, campaign content, Twenty CRM (PRD Phase 3).

## Context (what already exists)

- `PartnershipInquiries` collection: `status` select (`new/contacted/qualified/won/lost`),
  plus **unwired** `crmSyncStatus` (`not_configured/pending/synced/failed`, already an admin
  column) and `crmExternalId` fields. These get repurposed for listmonk — **zero schema
  change, zero prod DDL** (deliberate: see the July 8 schema-drift incident).
- Acknowledgement + staff emails already ship from the submission route; this feature is
  admin-side only.
- listmonk API pattern exists in `alkebu-web/src/routes/api/newsletter/+server.ts`
  (token auth `token <user>:<token>`, POST `/api/subscribers`, 409 = already exists).

## Design

### 1. listmonk client — `src/app/utils/listmonkClient.ts`

Pure fetch-based module (no SDK), configured from backend env:

```
LISTMONK_API_URL      e.g. https://mail.alkebulanimages.com
LISTMONK_API_USER     API user
LISTMONK_API_TOKEN    API token
LISTMONK_B2B_LIST_ID  numeric id of the "B2B Partners" list
```

One exported function:

```ts
subscribeToB2BList(input: { email, name, organizationName, inquiryType }):
  Promise<{ ok: true; subscriberId?: number } | { ok: false; error: string; unconfigured?: boolean }>
```

Behavior:
- Missing env → `{ ok: false, unconfigured: true }` (caller leaves `crmSyncStatus`
  as `not_configured`; nothing logged as an error).
- `POST /api/subscribers` with `status: 'enabled'`, `preconfirm_subscriptions: true`
  (staff-gated = consent verified by the relationship), `lists: [B2B_LIST_ID]`, and
  `attribs: { organizationName, inquiryType }`.
- **409 (subscriber exists)**: look up the subscriber id by email
  (`GET /api/subscribers?query=subscribers.email='<escaped>'`), then
  `PUT /api/subscribers/lists` with `{ ids: [id], action: 'add', target_list_ids: [B2B_LIST_ID] }`
  so an existing consumer-newsletter subscriber is *added* to the B2B list, not duplicated.
  If the lookup fails, still return `ok: true` without an id (the subscription POST's 409
  proves the email is in listmonk).
- Never throws; all failures return `{ ok: false, error }`.

### 2. Trigger — `afterChange` hook on `PartnershipInquiries`

Pure decision function (unit-testable, DI style like `partnershipInquirySubmission.ts`):

```
shouldSyncToListmonk({ doc, previousDoc, context }) — true iff:
  doc.status ∈ { qualified, won }
  AND doc.crmSyncStatus !== 'synced'
  AND !context.listmonkSyncDone        // recursion guard
```

Hook flow (`operation: 'update'` and `'create'` both eligible — a staff member could create
a doc directly in `qualified`):
1. If `shouldSyncToListmonk` is false → return.
2. Call `subscribeToB2BList(...)`.
3. Write back via `req.payload.update` with `context: { listmonkSyncDone: true }`
   (the verified `req.context` bypass pattern) so the write-back does not re-trigger:
   - success → `crmSyncStatus: 'synced'`, `crmExternalId: String(subscriberId ?? '')`
   - failure → `crmSyncStatus: 'failed'` (error logged to console; `internalNotes` untouched)
   - unconfigured → no write-back (stays `not_configured`)
4. **Best-effort:** the hook never throws — a listmonk outage must not block a staff
   member's save. Fire-and-forget is NOT acceptable though; the outcome must land in
   `crmSyncStatus` so the admin column tells the truth.

Retry story: staff can flip `crmSyncStatus` from `failed` back to `pending` (or just
re-save with status still qualified/won after fixing the outage) — the guard only skips
`synced` docs, so re-saves naturally retry.

### 3. Testing (TDD)

- `tests/listmonkClient.test.ts` — mock `fetch`: success, 409 → lookup → list-add, 409 →
  lookup fails → ok-without-id, non-2xx error, missing env → unconfigured, header/body shape.
- `tests/partnershipListmonkSync.test.ts` — decision function truth table (each status ×
  crmSyncStatus × context flag) and hook flow with injected client: success/failure/
  unconfigured write-backs, recursion guard, never-throws.
- Existing suites must stay green (`pnpm test` — Stripe dummy key handled by the script).

### 4. Deployment / ops checklist

1. Create the "B2B Partners" list in the listmonk UI (`mail.alkebulanimages.com`); note id.
2. Set the four `LISTMONK_*` vars in `alkebu-load/.env` (dev) and the Coolify app env (prod).
3. No DDL, no `generate:types` needed (no field changes). Push to main = deploy.
4. Verify: mark a test inquiry `qualified` in prod admin → `crmSyncStatus` flips to
   `synced` → subscriber appears on the B2B list in listmonk.
