import assert from 'node:assert'
import test from 'node:test'

import { computeCustomerRollups } from '../../src/app/utils/customerRollups'

function makePayloadMock(orders: any[]) {
  const finds: any[] = []
  const updates: any[] = []
  return {
    finds,
    updates,
    api: {
      find: async (args: any) => {
        finds.push(args)
        return { docs: orders, totalDocs: orders.length }
      },
      update: async (args: any) => {
        updates.push(args)
        return { id: args.id, ...args.data }
      },
    },
  }
}

test('computeCustomerRollups counts non-cancelled, non-returned orders', async () => {
  const m = makePayloadMock([
    { id: 1, status: 'paid', totalAmount: 1000, createdAt: '2026-01-01T00:00:00Z' },
    { id: 2, status: 'shipped', totalAmount: 2000, createdAt: '2026-02-01T00:00:00Z' },
    { id: 3, status: 'cancelled', totalAmount: 5000, createdAt: '2026-03-01T00:00:00Z' },
    { id: 4, status: 'returned', totalAmount: 7000, createdAt: '2026-04-01T00:00:00Z' },
    { id: 5, status: 'delivered', totalAmount: 3000, createdAt: '2026-05-01T00:00:00Z' },
  ])

  await computeCustomerRollups(m.api as any, 42)

  assert.strictEqual(m.updates.length, 1)
  const update = m.updates[0]
  assert.strictEqual(update.id, 42)
  assert.strictEqual(update.collection, 'customers')

  const oh = update.data.orderHistory
  assert.ok(oh, 'expected nested orderHistory object')
  assert.strictEqual(oh.totalOrders, 3)
  assert.strictEqual(oh.totalSpent, 6000)
  assert.strictEqual(oh.lastOrderDate, '2026-05-01T00:00:00Z')
  assert.strictEqual(oh.firstOrderDate, '2026-01-01T00:00:00Z')
  assert.strictEqual(oh.averageOrderValue, 2000)
})

test('computeCustomerRollups zero orders produces zero rollups and null dates', async () => {
  const m = makePayloadMock([])
  await computeCustomerRollups(m.api as any, 99)

  assert.strictEqual(m.updates.length, 1)
  const oh = m.updates[0].data.orderHistory
  assert.strictEqual(oh.totalOrders, 0)
  assert.strictEqual(oh.totalSpent, 0)
  assert.strictEqual(oh.firstOrderDate, null)
  assert.strictEqual(oh.lastOrderDate, null)
  assert.strictEqual(oh.averageOrderValue, 0)
})

test('computeCustomerRollups writes with context.disableHooks=true to avoid recursion', async () => {
  const m = makePayloadMock([
    { id: 1, status: 'paid', totalAmount: 100, createdAt: '2026-01-01T00:00:00Z' },
  ])
  await computeCustomerRollups(m.api as any, 1)
  assert.strictEqual(m.updates[0].context?.disableHooks, true)
})

test('computeCustomerRollups queries orders by customer id at depth 0', async () => {
  const m = makePayloadMock([])
  await computeCustomerRollups(m.api as any, 77)
  assert.strictEqual(m.finds.length, 1)
  assert.strictEqual(m.finds[0].collection, 'orders')
  assert.deepStrictEqual(m.finds[0].where, { customer: { equals: 77 } })
  assert.strictEqual(m.finds[0].depth, 0)
})

test('computeCustomerRollups handles missing totalAmount and createdAt gracefully', async () => {
  const m = makePayloadMock([
    { id: 1, status: 'paid' },
    { id: 2, status: 'paid', totalAmount: 500, createdAt: '2026-03-01T00:00:00Z' },
  ])
  await computeCustomerRollups(m.api as any, 5)
  const oh = m.updates[0].data.orderHistory
  assert.strictEqual(oh.totalOrders, 2)
  assert.strictEqual(oh.totalSpent, 500)
  assert.strictEqual(oh.lastOrderDate, '2026-03-01T00:00:00Z')
  assert.strictEqual(oh.firstOrderDate, '2026-03-01T00:00:00Z')
  assert.strictEqual(oh.averageOrderValue, 250)
})
