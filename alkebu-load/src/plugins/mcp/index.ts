import { mcpPlugin } from '@payloadcms/plugin-mcp';
import { mcpTools } from './tools';

export { blockMcpFieldUpdate } from './access';

/**
 * Payload MCP server for the staff operations agent (see
 * docs/superpowers/specs/2026-06-30-staff-agent-mcp-foundation-design.md).
 *
 * Boundary model (defense in depth):
 *  1. Per-collection capability scoping below — the agent can find broadly but
 *     only update Books/products/Orders and create BlogPost drafts. No deletes.
 *  2. Field-level access on Orders (blockMcpFieldUpdate) keeps money + line items
 *     unwritable through MCP even where `update` is enabled.
 *  3. No refund/financial tool exists; draft_refund only proposes a body.
 *  4. Per-API-key toggles + the key owner's user access rules apply on top,
 *     enforced by the plugin at /api/mcp (Bearer auth; no key ⇒ rejected).
 *
 * Opt-in per environment: dormant (adds no collections, no schema change) unless
 * MCP_ENABLED=true. Endpoint once enabled: `<serverURL>/api/mcp`.
 */
export function buildMcpPlugin() {
  return mcpPlugin({
    disabled: process.env.MCP_ENABLED !== 'true',
    userCollection: 'users',
    collections: {
      // Orders: view + operational updates (status/fulfillment). Money & line
      // items are locked by blockMcpFieldUpdate at the field level.
      orders: {
        enabled: { find: true, update: true },
        description: 'Customer orders. View and update fulfillment status/tracking; financial fields are read-only via MCP.',
      },
      // Catalog: view + enrichment updates.
      books: { enabled: { find: true, update: true }, description: 'Book catalog + inventory.' },
      'wellness-lifestyle': { enabled: { find: true, update: true } },
      'fashion-jewelry': { enabled: { find: true, update: true } },
      'oils-incense': { enabled: { find: true, update: true } },
      // Content: view + draft authoring.
      blogPosts: {
        enabled: { find: true, create: true, update: true },
        description: 'Blog posts. Create drafts and edit content.',
      },
      // Read-only context.
      customers: { enabled: { find: true } },
      carts: { enabled: { find: true } },
      reviews: { enabled: { find: true } },
      searchAnalytics: { enabled: { find: true } },
      authors: { enabled: { find: true } },
      publishers: { enabled: { find: true } },
      vendors: { enabled: { find: true } },
    },
    mcp: {
      tools: mcpTools,
    },
  });
}
