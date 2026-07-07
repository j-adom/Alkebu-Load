import type { FieldAccess } from 'payload';

/**
 * Field-level update guard for the MCP agent boundary.
 *
 * The MCP plugin stamps `req.payloadAPI = 'MCP'` on every request that arrives
 * through the `/api/mcp` endpoint (see @payloadcms/plugin-mcp
 * dist/endpoints/mcp.js). Attaching this to a field's `access.update` makes that
 * field writable through the admin UI / REST / Local API as before, but **never**
 * through MCP — Payload silently drops disallowed fields from the write rather
 * than erroring, so operational MCP updates still succeed for the fields they
 * are allowed to touch.
 *
 * Use on Orders' financial/structural fields so the staff agent can update
 * status + fulfillment but cannot alter money or line items.
 */
export const blockMcpFieldUpdate: FieldAccess = ({ req }) => req.payloadAPI !== 'MCP';
