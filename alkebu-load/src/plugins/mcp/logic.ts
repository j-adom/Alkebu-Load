import type { Where } from 'payload';
import {
  suggestedRefund,
  type RefundOrder,
  type RefundReason,
  type RefundSelection,
} from '../../app/utils/refundCalculations';

/**
 * Pure query/shape helpers for the MCP custom tools. Kept free of Payload runtime
 * so they can be unit-tested directly (see tests/mcp-logic.test.ts). The tool
 * handlers in tools.ts wrap these around `req.payload`.
 */

/** Order statuses that are paid-but-not-yet-fulfilled — the "Needs Attention" set. */
export const NEEDS_ATTENTION_STATUSES = ['paid', 'processing'] as const;

/** `where` clause for orders that need staff action, mirroring the dashboard tab. */
export function needsAttentionWhere(): Where {
  return { status: { in: [...NEEDS_ATTENTION_STATUSES] } };
}

/** `where` clause for tracked products at or below a stock threshold. */
export function lowStockWhere(threshold: number): Where {
  return { 'inventory.stockLevel': { less_than_equal: threshold } };
}

export interface DraftRefundProposal {
  /** Not executed — a human/admin must POST this to actually refund. */
  draft: true;
  endpoint: 'POST /api/refund';
  body: {
    orderId: string;
    items?: RefundSelection[];
    reason: RefundReason;
    note?: string;
  };
  /** Computed breakdown (cents) so the reviewer sees the amounts before sending. */
  computed: ReturnType<typeof suggestedRefund>;
  note: string;
}

/**
 * Build a *proposed* refund request for human review. Reuses the same
 * `suggestedRefund` math the dashboard and refund route use, so the drafted
 * amounts match what the endpoint would compute. Never calls the refund route.
 *
 * An empty/absent selection means a whole-order refund (every line, full qty).
 */
export function buildDraftRefund(
  orderId: string,
  order: RefundOrder,
  selection: RefundSelection[] | undefined,
  reason: RefundReason,
  note?: string,
): DraftRefundProposal {
  const effectiveSelection =
    selection && selection.length > 0
      ? selection
      : order.items.map((item) => ({ itemId: item.id, quantity: item.quantity }));

  return {
    draft: true,
    endpoint: 'POST /api/refund',
    body: {
      orderId,
      ...(selection && selection.length > 0 ? { items: selection } : {}),
      reason,
      ...(note ? { note } : {}),
    },
    computed: suggestedRefund(order, effectiveSelection),
    note: 'DRAFT ONLY — not executed. An admin must POST this body to /api/refund to issue the refund.',
  };
}
