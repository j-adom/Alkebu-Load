type OrderRow = {
  id: number | string
  status?: string
  totalAmount?: number
  createdAt?: string
}

type PayloadLike = {
  find: (args: {
    collection: string
    where: unknown
    limit?: number
    depth?: number
    req?: unknown
  }) => Promise<{ docs: OrderRow[]; totalDocs: number }>
  update: (args: {
    collection: string
    id: number | string
    data: Record<string, unknown>
    context?: Record<string, unknown>
    req?: unknown
  }) => Promise<unknown>
}

const EXCLUDED_STATUSES = new Set(['cancelled', 'returned'])

// Practical cap. Bookstore customers won't exceed this in normal operation;
// institutional accounts that might are tracked through InstitutionalAccounts,
// not the Customers rollup path.
const ORDER_FETCH_LIMIT = 1000

export async function computeCustomerRollups(
  payload: PayloadLike,
  customerId: number | string,
  req?: unknown,
): Promise<void> {
  const result = await payload.find({
    collection: 'orders',
    where: { customer: { equals: customerId } },
    limit: ORDER_FETCH_LIMIT,
    depth: 0,
    req,
  })

  const eligible = result.docs.filter((o) => !EXCLUDED_STATUSES.has(o.status ?? ''))

  const totalOrders = eligible.length
  const totalSpent = eligible.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0)
  const averageOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0

  const dates = eligible
    .map((o) => o.createdAt)
    .filter((d): d is string => typeof d === 'string' && d.length > 0)
    .sort()

  const firstOrderDate = dates.length > 0 ? dates[0] : null
  const lastOrderDate = dates.length > 0 ? dates[dates.length - 1] : null

  await payload.update({
    collection: 'customers',
    id: customerId,
    data: {
      orderHistory: {
        totalOrders,
        totalSpent,
        averageOrderValue,
        firstOrderDate,
        lastOrderDate,
      },
    },
    // Break recursion: this update would otherwise re-trigger the Customers
    // hooks chain. context.disableHooks is the per-request bypass flag.
    context: { disableHooks: true },
    req,
  })
}
