import type { PayloadRequest } from 'payload';
import { z } from 'zod';
import type { RefundOrder, RefundReason } from '../../app/utils/refundCalculations';
import { buildDraftRefund, lowStockWhere, needsAttentionWhere } from './logic';

/**
 * Custom MCP tools for staff operations. These are domain-shaped wrappers around
 * the Local API (`req.payload`) — the generic find/update capabilities are
 * configured per-collection in index.ts. Nothing here mutates money: draft_refund
 * only *proposes* a refund body for a human to execute.
 *
 * Tool shape follows @payloadcms/plugin-mcp 3.79's `mcp.tools[]`:
 *   { name, description, parameters: ZodRawShape, handler(args, req) }
 */

type ToolResult = { content: Array<{ text: string; type: 'text' }> };

const asText = (value: unknown): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
});

const LOW_STOCK_COLLECTIONS = [
  'books',
  'wellness-lifestyle',
  'fashion-jewelry',
  'oils-incense',
] as const;

const REFUND_REASONS: RefundReason[] = [
  'out_of_print',
  'damaged',
  'customer_request',
  'pricing_error',
  'other',
];

/** Map a fetched Order doc into the pure RefundOrder shape. */
function toRefundOrder(order: Record<string, any>): RefundOrder {
  return {
    items: (order.items || []).map((item: Record<string, any>) => ({
      id: String(item.id),
      productType: item.productType,
      productTitle: item.productTitle,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      refundedQuantity: item.refundedQuantity,
      product: item.product,
    })),
    taxAmount: order.taxAmount || 0,
    shippingAmount: order.shippingAmount || 0,
    totalAmount: order.totalAmount || 0,
    shippingAddress: order.shippingAddress ?? null,
  };
}

export const mcpTools = [
  {
    name: 'list_orders_needs_attention',
    description:
      'List orders that need staff action (paid or processing but not yet shipped), newest first — the "Needs Attention" dashboard view.',
    parameters: {
      limit: z.number().int().min(1).max(100).optional(),
    } as z.ZodRawShape,
    handler: async (args: Record<string, unknown>, req: PayloadRequest): Promise<ToolResult> => {
      const limit = typeof args.limit === 'number' ? args.limit : 25;
      const result = await req.payload.find({
        collection: 'orders',
        where: needsAttentionWhere(),
        limit,
        depth: 0,
        sort: '-createdAt',
        req,
      });
      const orders = result.docs.map((o: Record<string, any>) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount,
        customer: o.customer,
        guestEmail: o.guestEmail,
        createdAt: o.createdAt,
      }));
      return asText({ count: result.totalDocs, orders });
    },
  },
  {
    name: 'low_stock',
    description:
      'List products at or below a stock threshold (default 5). Optionally target a specific product collection.',
    parameters: {
      threshold: z.number().int().min(0).optional(),
      collection: z.enum(LOW_STOCK_COLLECTIONS).optional(),
    } as z.ZodRawShape,
    handler: async (args: Record<string, unknown>, req: PayloadRequest): Promise<ToolResult> => {
      const threshold = typeof args.threshold === 'number' ? args.threshold : 5;
      const collection =
        typeof args.collection === 'string' &&
        (LOW_STOCK_COLLECTIONS as readonly string[]).includes(args.collection)
          ? (args.collection as (typeof LOW_STOCK_COLLECTIONS)[number])
          : 'books';
      const result = await req.payload.find({
        collection,
        where: lowStockWhere(threshold),
        limit: 100,
        depth: 0,
        sort: 'inventory.stockLevel',
        req,
      });
      const items = result.docs.map((d: Record<string, any>) => ({
        id: d.id,
        title: d.title,
        stockLevel: d.inventory?.stockLevel,
      }));
      return asText({ collection, threshold, count: result.totalDocs, items });
    },
  },
  {
    name: 'draft_refund',
    description:
      'Compute a PROPOSED refund for an order and return a ready-to-review request body. Does NOT issue the refund — an admin must POST the returned body to /api/refund. Omit items for a whole-order refund.',
    parameters: {
      orderId: z.string(),
      reason: z.enum(REFUND_REASONS as [RefundReason, ...RefundReason[]]),
      items: z
        .array(z.object({ itemId: z.string(), quantity: z.number().int().min(1) }))
        .optional(),
      note: z.string().optional(),
    } as z.ZodRawShape,
    handler: async (args: Record<string, unknown>, req: PayloadRequest): Promise<ToolResult> => {
      const orderId = String(args.orderId);
      const order = await req.payload.findByID({
        collection: 'orders',
        id: orderId,
        depth: 1,
        req,
      });
      if (!order) {
        return asText({ error: `Order ${orderId} not found` });
      }
      const proposal = buildDraftRefund(
        orderId,
        toRefundOrder(order as Record<string, any>),
        args.items as { itemId: string; quantity: number }[] | undefined,
        args.reason as RefundReason,
        typeof args.note === 'string' ? args.note : undefined,
      );
      return asText(proposal);
    },
  },
];
