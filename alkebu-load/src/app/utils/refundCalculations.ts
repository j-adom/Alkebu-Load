/**
 * Pure money math for per-item order refunds.
 *
 * Server-authoritative: the Order Dashboard shows a suggestion, but the refund
 * endpoint recomputes the amount here. Everything is integer cents — no floats
 * for currency. Kept dependency-free (only the pure shipping primitives) so the
 * risky math is exhaustively unit-testable without the Payload/Stripe module graph.
 */

import {
  type CartItemForTax,
  type ShippingAddress,
  calculateItemsShippingCost,
} from './taxShippingCalculations';

export interface RefundOrderItem {
  id: string;
  productType: string;
  productTitle?: string;
  quantity: number;
  unitPrice: number; // cents
  totalPrice?: number; // cents (Σ unitPrice × quantity); derived if absent
  refundedQuantity?: number; // units already refunded on this line
  /** Populated product (depth ≥ 1) — used only for shipping-weight resolution. */
  product?: CartItemForTax['product'];
}

export interface RefundOrder {
  items: RefundOrderItem[];
  taxAmount: number; // cents
  shippingAmount: number; // cents
  totalAmount: number; // cents
  shippingAddress?: ShippingAddress | null;
}

export interface RefundSelection {
  itemId: string;
  quantity: number;
}

export interface RefundBreakdown {
  itemsSubtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Selected quantity for a given line, capped at what the line actually has. */
function selectedQtyFor(item: RefundOrderItem, selection: RefundSelection[]): number {
  const picked = selection
    .filter((s) => s.itemId === item.id)
    .reduce((sum, s) => sum + (s.quantity || 0), 0);
  return clamp(picked, 0, item.quantity);
}

/** Σ unitPrice × quantity across every line on the order. */
export function orderSubtotal(order: RefundOrder): number {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

/** Σ unitPrice × selected quantity for the selected lines. */
export function itemsSubtotal(order: RefundOrder, selection: RefundSelection[]): number {
  return order.items.reduce(
    (sum, item) => sum + item.unitPrice * selectedQtyFor(item, selection),
    0,
  );
}

/** Order tax allocated by the selected subtotal's share of the order subtotal. */
export function proratedTax(order: RefundOrder, selection: RefundSelection[]): number {
  const subtotal = orderSubtotal(order);
  if (subtotal <= 0) return 0;
  return Math.round((order.taxAmount * itemsSubtotal(order, selection)) / subtotal);
}

/**
 * The order's lines with the selected quantities removed, dropped when emptied,
 * shaped for the shipping primitives (carries the populated product for weight).
 */
export function remainingItemsAfter(
  order: RefundOrder,
  selection: RefundSelection[],
): CartItemForTax[] {
  return order.items
    .map((item) => ({ item, remaining: item.quantity - selectedQtyFor(item, selection) }))
    .filter(({ remaining }) => remaining > 0)
    .map(({ item, remaining }) => ({
      product: item.product as CartItemForTax['product'],
      productType: item.productType,
      quantity: remaining,
      unitPrice: item.unitPrice,
    }));
}

/**
 * Shipping to refund: what the order paid minus what the *remaining* items would
 * still cost to ship. A fully-refunded order returns all shipping; otherwise the
 * tier difference, clamped so we never refund more shipping than was paid (or a
 * negative amount when the remaining items cost more than the discounted rate paid).
 */
export function incrementalShipping(order: RefundOrder, selection: RefundSelection[]): number {
  const remaining = remainingItemsAfter(order, selection);
  if (remaining.length === 0) return order.shippingAmount;

  const remainingCost = calculateItemsShippingCost(
    remaining,
    order.shippingAddress?.state || 'TN',
  );
  return clamp(order.shippingAmount - remainingCost, 0, order.shippingAmount);
}

/** Full suggested-refund breakdown (display + server-side default). */
export function suggestedRefund(order: RefundOrder, selection: RefundSelection[]): RefundBreakdown {
  const subtotal = itemsSubtotal(order, selection);
  const tax = proratedTax(order, selection);
  const shipping = incrementalShipping(order, selection);
  return { itemsSubtotal: subtotal, tax, shipping, total: subtotal + tax + shipping };
}

/** Bound a (possibly staff-edited) refund amount to [0, remaining refundable]. */
export function clampRefundAmount(amount: number, remainingRefundable: number): number {
  return clamp(Math.round(amount), 0, remainingRefundable);
}

// ─── Refund plan (the route's decision logic, kept pure & testable) ─────────────

export type RefundReason =
  | 'out_of_print'
  | 'damaged'
  | 'customer_request'
  | 'pricing_error'
  | 'other';

export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  out_of_print: 'Out of print',
  damaged: 'Damaged',
  customer_request: 'Customer request',
  pricing_error: 'Pricing error',
  other: 'Other',
};

export interface RefundRequest {
  /** Selected lines + quantities. Empty/absent ⇒ whole-order refund. */
  items?: RefundSelection[];
  reason: RefundReason;
  note?: string;
  amountOverride?: number; // cents
  restock?: boolean;
  markOutOfPrint?: boolean;
}

export interface RefundItemUpdate {
  itemId: string;
  refundedQuantity: number; // new cumulative refunded qty for the line
  doNotShip: boolean; // true once the line is fully refunded
}

export interface RefundRecordItem {
  itemId: string;
  productTitle: string;
  quantity: number;
  amount: number; // cents attributed to this line (goods value)
}

export interface RefundPlan {
  ok: true;
  amount: number; // authoritative total to refund (cents)
  breakdown: RefundBreakdown;
  reason: RefundReason;
  reasonLabel: string;
  isPartial: boolean;
  paymentStatus: 'refunded' | 'partially_refunded';
  newOrderStatus?: 'returned'; // set only on a full refund
  itemUpdates: RefundItemUpdate[];
  refundedItems: RefundRecordItem[];
}

export interface RefundPlanError {
  ok: false;
  status: number;
  error: string;
}

/**
 * Decide everything about a refund from the order + request, without side effects.
 * The route validates Stripe-payment preconditions, then executes this plan
 * (Stripe charge → persist → email). Returns a discriminated union so the route
 * can map failures straight to HTTP responses.
 */
export function buildRefundPlan(
  order: RefundOrder & { refunds?: Array<{ amount?: number | null }> },
  request: RefundRequest,
): RefundPlan | RefundPlanError {
  const reasonLabel = REFUND_REASON_LABELS[request.reason];
  if (!reasonLabel) {
    return { ok: false, status: 400, error: 'Invalid refund reason' };
  }

  // Remaining refundable derives purely from the sum of prior refunds.
  const alreadyRefunded = (order.refunds || []).reduce((sum, r) => sum + (r.amount || 0), 0);
  const remaining = order.totalAmount - alreadyRefunded;
  if (remaining <= 0) {
    return { ok: false, status: 400, error: 'No refundable amount remaining' };
  }

  // Resolve the selection: explicit items, or every line's remaining unrefunded qty.
  const hasExplicit = Array.isArray(request.items) && request.items.length > 0;
  const selection: RefundSelection[] = hasExplicit
    ? request.items!
    : order.items
        .map((item) => ({ itemId: item.id, quantity: item.quantity - (item.refundedQuantity || 0) }))
        .filter((s) => s.quantity > 0);

  if (selection.length === 0) {
    return { ok: false, status: 400, error: 'No refundable items selected' };
  }

  // Validate each selected line against the order.
  const byId = new Map(order.items.map((item) => [item.id, item]));
  for (const sel of selection) {
    const item = byId.get(sel.itemId);
    if (!item) {
      return { ok: false, status: 400, error: `Item ${sel.itemId} is not on this order` };
    }
    const available = item.quantity - (item.refundedQuantity || 0);
    if (!Number.isInteger(sel.quantity) || sel.quantity < 1 || sel.quantity > available) {
      return {
        ok: false,
        status: 400,
        error: `Invalid quantity for ${item.id}: ${sel.quantity} (max ${available})`,
      };
    }
  }

  const breakdown = suggestedRefund(order, selection);
  const amount = clampRefundAmount(request.amountOverride ?? breakdown.total, remaining);
  if (amount <= 0) {
    return { ok: false, status: 400, error: 'Refund amount must be greater than zero' };
  }

  const isPartial = alreadyRefunded + amount < order.totalAmount;

  const itemUpdates: RefundItemUpdate[] = selection.map((sel) => {
    const item = byId.get(sel.itemId)!;
    const refundedQuantity = (item.refundedQuantity || 0) + sel.quantity;
    return { itemId: sel.itemId, refundedQuantity, doNotShip: refundedQuantity >= item.quantity };
  });

  const refundedItems: RefundRecordItem[] = selection.map((sel) => {
    const item = byId.get(sel.itemId)!;
    return {
      itemId: sel.itemId,
      productTitle: item.productTitle || '',
      quantity: sel.quantity,
      amount: item.unitPrice * sel.quantity,
    };
  });

  return {
    ok: true,
    amount,
    breakdown,
    reason: request.reason,
    reasonLabel,
    isPartial,
    paymentStatus: isPartial ? 'partially_refunded' : 'refunded',
    newOrderStatus: isPartial ? undefined : 'returned',
    itemUpdates,
    refundedItems,
  };
}
