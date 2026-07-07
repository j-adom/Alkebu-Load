# Staff Agent MCP Foundation — Design Spec

**Date:** 2026-06-30
**Branch:** `feat/staff-agent-mcp-foundation`
**Status:** Phase 1 design approved; implementation in progress.

## North Star

Staff converse with an AI agent in a group chat (Slack / Mattermost / Discord
class surface). The agent can:

- **View and update order information** in the Payload backend (status, tracking,
  fulfillment) — but **never** execute refunds or mutate financial fields.
- **Read and write tasks** in the self-hosted **Plane** instance
  (`https://plane.alkebu.link/`, workspace slug `alkebu-lan-images`).

The chat surface and agent runtime are deferred (Phase 3). The durable
investment is the **tool layer** — the MCP servers — which is reusable under any
surface.

## Guiding Principle: buy the generic, build the boundary

Existing/official MCP servers are the default. Custom work is justified **only**
to close a real gap — a scoped safety boundary or domain-shaped tools — never as
a preference. Verification (2026-06-30) overturned an earlier "build a custom
Payload MCP server" assumption: an official, in-process, access-control-aware
plugin already exists.

## Subsystem Decomposition

```
1. CHAT SURFACE      Slack / Mattermost / Discord            (Phase 3)
        │
2. AGENT RUNTIME     Claude Agent SDK; system prompt,        (Phase 3)
        │            per-staff identity → per-staff scope
   ┌────┴────┐
3. PAYLOAD MCP   4. PLANE MCP
   official         official makeplane/plane-mcp-server
   @payloadcms/     (Phase 2)
   plugin-mcp
   (Phase 1)
```

---

## Phase 1 — Payload MCP (this spec's implementation target)

### Approach

Use the **official `@payloadcms/plugin-mcp`**, not a hand-built server. It runs
in-process in the Payload app, serves an MCP endpoint at `/api/mcp`, requires
Bearer API-key auth, and enforces access control at two levels:

1. Per-API-key capability toggles (`find` / `create` / `update` / `delete`,
   independently per collection) managed in the admin panel.
2. The API-key owner's user access rules + collection hooks apply to every
   operation.

Custom domain tools are registered via the plugin's `mcp.tools` array — no
separate server process.

### Version pin (critical)

`@payloadcms/plugin-mcp` publishes in lockstep with `payload` and **hard-pins
its peer dependency to the exact patch** (e.g. `3.79.0` ↔ `payload@3.79.0`).
The project is on `payload@3.79.0`, so we install **`@payloadcms/plugin-mcp@3.79.0`**
(or `3.79.1` if `payload` resolves to `3.79.1`). **Do not** install `@latest`
(currently `3.85.1`) — it would force a full Payload-stack upgrade.

> The published plugin docs reflect `@latest` (3.85). The installed 3.79.x API
> must be validated against its own type definitions, since the `mcp.tools` /
> API-Keys surface may differ slightly from the docs.

### The scoped boundary

A dedicated MCP API key (created in admin → MCP → API Keys) owned by a non-admin
user. Capability matrix:

| Collection | find | create | update | delete |
|---|---|---|---|---|
| orders | ✅ | ❌ | ✅ *(operational fields only — see below)* | ❌ |
| books, wellness-lifestyle, fashion-jewelry, oils-incense | ✅ | ❌ | ✅ *(enrichment)* | ❌ |
| blogPosts | ✅ | ✅ *(draft)* | ✅ | ❌ |
| customers, carts, reviews, searchAnalytics, authors, publishers, vendors | ✅ | ❌ | ❌ | ❌ |
| users | ❌ | ❌ | ❌ | ❌ |

**Refunds / financial mutations are structurally absent:** no refund tool is
exposed, and the MCP key's user is not admin (the `/api/refund` route is
admin-only). The only refund affordance is a read-only `draft_refund` custom
tool that returns a *proposed* request body for a human to execute.

### Field-level Orders boundary

Order `update` must reach operational fields (`status`, tracking, carrier,
fulfillment notes) but **not** financial fields (`subtotalAmount`, `taxAmount`,
`shippingAmount`, `totalAmount`, `items[].unitPrice`/`totalPrice`,
`refundedQuantity`, `payment.*`). Enforced with Payload **field-level access
control** (`access.update` returning false for the MCP user on financial
fields). Field-level access is enforced server-side and respected by the plugin.

### Custom domain tools (`mcp.tools`)

- `list_orders_needs_attention` — orders in actionable states, shaped like the
  Order Dashboard's "Needs Attention" tab.
- `low_stock` — products below a threshold.
- `draft_refund` — given an order + line items, returns a proposed `/api/refund`
  body. **Read-only; never calls the refund route.**

Pure logic in these tools (filter building, refund-body construction) is unit
tested under `tests/` (node --test + tsx), mocking the Payload client.

### Connection / environments

The endpoint is served by the deployed app, so the same scoped key works for:
- **dev**: `http://localhost:3000/api/mcp`
- **live ops**: `https://payload.alkebulanimages.com/api/mcp`

Registered in `.claude/mcp.json` as an HTTP MCP server with the Bearer key.
Pointing at prod is deliberate (different key/URL). This same endpoint is what
the Phase 3 agent runtime mounts.

### Out of scope for Phase 1

- Per-staff identity (one shared MCP key now; Phase 3 swaps in per-staff keys).
- The agent runtime and chat surface.

---

## Phase 2 — Plane MCP (roadmap)

Mount the **official `makeplane/plane-mcp-server`** (stdio) — no custom build.
Verified config for the self-hosted instance:

```jsonc
"plane": {
  "command": "uvx",
  "args": ["plane-mcp-server", "stdio"],
  "env": {
    "PLANE_API_KEY": "<workspace-scoped token>",
    "PLANE_WORKSPACE_SLUG": "alkebu-lan-images",
    "PLANE_BASE_URL": "https://plane.alkebu.link"   // verify bare host vs /api
  }
}
```

**Verify at build:** (1) on self-hosted Community Edition, Workspace Access
Tokens may not be available yet — fall back to a Personal Access Token; (2)
confirm the API base path (`https://plane.alkebu.link` vs `.../api`).

---

## Phase 3 — Agent runtime + chat surface (roadmap)

Claude Agent SDK app mounting both MCP endpoints (Payload HTTP + Plane). Maps
each chat user to a per-staff scoped Payload key so "who can refund vs view"
follows real Payload roles. Mattermost fits the self-hosting ethos; Slack has
the most mature bot path. Connector auth does **not** auto-port from claude.ai —
the runtime is reconfigured with tokens.

---

## Parallel: Frontend (SvelteKit) workflow improvements

Independent of the MCP work; improves all AI-assisted Svelte sessions.

1. **`alkebu-web/CLAUDE.md`** — Svelte 5 runes idioms, the Lexical rich-text
   rendering gotcha, the `PAYLOAD_API_URL` load pattern, shadcn-svelte/bits-ui
   usage, and "run `svelte-autofixer` (Svelte MCP) before finalizing components."
2. **Typed Payload data** — `alkebu-shared` is empty, so storefront fetches are
   untyped. Add generated Payload types into the web app + a typed `payloadFetch`
   helper to close the biggest correctness gap.

---

## Build Order

1. Spec (this doc).
2. Frontend track (safe, independent).
3. Backend: install version-matched plugin → configure scoping → field-level
   Orders access → custom tools + tests → `generate:types` → typecheck/build.
4. Handoff: user creates the scoped MCP API key in admin and adds it to
   `.claude/mcp.json`.
5. Phase 2 (Plane), Phase 3 (runtime) as separate cycles.
