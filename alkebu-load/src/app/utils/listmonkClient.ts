/**
 * Minimal listmonk API client for the staff-gated B2B lead sync.
 *
 * Spec: docs/superpowers/specs/2026-07-15-partnership-listmonk-sync-design.md
 * Auth matches the storefront newsletter proxy (alkebu-web /api/newsletter):
 * listmonk v3+ token auth, "token <api_user>:<api_token>".
 *
 * All failures return { ok: false } — this module never throws, because its
 * only caller runs inside a Payload afterChange hook that must not block a
 * staff member's save.
 */

export interface ListmonkSubscribeInput {
  email: string
  name: string
  organizationName?: string
  inquiryType?: string
}

export type ListmonkSubscribeResult =
  | { ok: true; subscriberId?: number }
  | { ok: false; error: string; unconfigured?: boolean }

export interface ListmonkClientOptions {
  fetchImpl?: typeof fetch
  env?: Record<string, string | undefined>
}

export async function subscribeToB2BList(
  input: ListmonkSubscribeInput,
  opts: ListmonkClientOptions = {},
): Promise<ListmonkSubscribeResult> {
  const env = opts.env ?? process.env
  const fetchImpl = opts.fetchImpl ?? fetch

  const apiUrl = env.LISTMONK_API_URL
  const apiUser = env.LISTMONK_API_USER
  const apiToken = env.LISTMONK_API_TOKEN
  const listId = Number(env.LISTMONK_B2B_LIST_ID)

  if (!apiUrl || !apiUser || !apiToken || !Number.isFinite(listId) || listId <= 0) {
    return { ok: false, error: 'listmonk env vars are not configured', unconfigured: true }
  }

  const base = apiUrl.replace(/\/$/, '')
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `token ${apiUser}:${apiToken}`,
  }

  try {
    const res = await fetchImpl(`${base}/api/subscribers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: input.email,
        name: input.name,
        status: 'enabled',
        lists: [listId],
        preconfirm_subscriptions: true,
        attribs: {
          organizationName: input.organizationName ?? '',
          inquiryType: input.inquiryType ?? '',
        },
      }),
    })

    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as { data?: { id?: unknown } }
      const id = body?.data?.id
      return { ok: true, ...(typeof id === 'number' ? { subscriberId: id } : {}) }
    }

    // 409: the email is already a listmonk subscriber (e.g. on the consumer
    // newsletter). Add the existing subscriber to the B2B list instead.
    if (res.status === 409) {
      return addExistingSubscriberToList(input.email, listId, base, headers, fetchImpl)
    }

    const errText = await res.text().catch(() => '')
    return {
      ok: false,
      error: `listmonk subscribe failed with status ${res.status}${errText ? `: ${errText.slice(0, 300)}` : ''}`,
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function addExistingSubscriberToList(
  email: string,
  listId: number,
  base: string,
  headers: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<ListmonkSubscribeResult> {
  try {
    const escaped = email.replace(/'/g, "''")
    const query = encodeURIComponent(`subscribers.email='${escaped}'`)
    const lookupRes = await fetchImpl(`${base}/api/subscribers?query=${query}`, { headers })

    if (!lookupRes.ok) {
      // The 409 already proved the email exists in listmonk; without an id we
      // can't add the B2B list, but a read-endpoint hiccup shouldn't fail the
      // pipeline (spec decision).
      return { ok: true }
    }

    const body = (await lookupRes.json().catch(() => ({}))) as {
      data?: { results?: Array<{ id?: unknown }> }
    }
    const id = body?.data?.results?.[0]?.id
    if (typeof id !== 'number') {
      return { ok: true }
    }

    const addRes = await fetchImpl(`${base}/api/subscribers/lists`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ids: [id],
        action: 'add',
        target_list_ids: [listId],
        status: 'confirmed',
      }),
    })

    if (!addRes.ok) {
      // Here we KNOW the add failed — surfacing it keeps crmSyncStatus honest.
      return { ok: false, error: `listmonk list-add failed with status ${addRes.status}` }
    }

    return { ok: true, subscriberId: id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
