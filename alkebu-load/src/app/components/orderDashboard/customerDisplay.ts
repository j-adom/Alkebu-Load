export type OrderCustomerInput = {
  customer?: { displayName?: string; email?: string; firstName?: string; lastName?: string } | string | null
  guestEmail?: string | null
  shippingAddress?: { firstName?: string; lastName?: string } | null
}

export function getCustomerName(order: OrderCustomerInput): string {
  if (typeof order.customer === 'object' && order.customer) {
    const linked =
      order.customer.displayName ||
      `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
    if (linked) return linked
  }

  const shipName = `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim()
  if (shipName) return shipName

  return order.guestEmail || 'Guest'
}

export function getCustomerEmail(order: OrderCustomerInput): string {
  if (typeof order.customer === 'object' && order.customer?.email) {
    return order.customer.email
  }
  return order.guestEmail || ''
}
