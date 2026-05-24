import assert from 'node:assert'
import test from 'node:test'

import { upsertCustomerForOrder } from '../../src/app/utils/customerUpsert'

function makePayloadMock() {
  const finds: any[] = []
  const creates: any[] = []
  const customers = new Map<string, any>()
  let idCounter = 1000

  return {
    finds,
    creates,
    customers,
    api: {
      find: async (args: any) => {
        finds.push(args)
        const email = args.where?.email?.equals?.toLowerCase?.()
        if (email && customers.has(email)) {
          return { docs: [customers.get(email)], totalDocs: 1 }
        }
        return { docs: [], totalDocs: 0 }
      },
      create: async (args: any) => {
        creates.push(args)
        const id = idCounter++
        const doc = { id, ...args.data }
        customers.set(args.data.email.toLowerCase(), doc)
        return doc
      },
    },
  }
}

test('upsertCustomerForOrder returns existing customer id when email matches', async () => {
  const m = makePayloadMock()
  m.customers.set('alice@example.com', { id: 42, email: 'alice@example.com' })

  const customerId = await upsertCustomerForOrder(m.api as any, {
    guestEmail: 'alice@example.com',
    shippingAddress: { firstName: 'Alice', lastName: 'Doe' },
  })

  assert.strictEqual(customerId, 42)
  assert.strictEqual(m.creates.length, 0)
})

test('upsertCustomerForOrder email matching is case-insensitive', async () => {
  const m = makePayloadMock()
  m.customers.set('alice@example.com', { id: 42, email: 'alice@example.com' })

  const customerId = await upsertCustomerForOrder(m.api as any, {
    guestEmail: 'ALICE@Example.com',
    shippingAddress: { firstName: 'Alice', lastName: 'Doe' },
  })

  assert.strictEqual(customerId, 42)
  assert.strictEqual(m.creates.length, 0)
})

test('upsertCustomerForOrder creates a ghost customer with ecom source when email not found', async () => {
  const m = makePayloadMock()

  const customerId = await upsertCustomerForOrder(m.api as any, {
    guestEmail: 'newbie@example.com',
    shippingAddress: {
      firstName: 'Bob',
      lastName: 'Smith',
      street: '1 Main St',
      city: 'Nashville',
      state: 'TN',
      zip: '37208',
    },
  })

  assert.strictEqual(m.creates.length, 1)
  const created = m.creates[0].data
  assert.strictEqual(created.email, 'newbie@example.com')
  assert.strictEqual(created.firstName, 'Bob')
  assert.strictEqual(created.lastName, 'Smith')
  assert.strictEqual(created.source, 'ecom')
  assert.strictEqual(created.lifecycleStatus, 'ghost')
  assert.ok(Array.isArray(created.shippingAddresses) && created.shippingAddresses.length === 1)
  assert.strictEqual(created.shippingAddresses[0].street, '1 Main St')
  assert.strictEqual(created.shippingAddresses[0].isDefault, true)
  assert.strictEqual(created.shippingAddresses[0].label, 'Shipping')
  assert.ok(typeof created.password === 'string' && created.password.length >= 32)
  assert.strictEqual(m.creates[0].disableVerificationEmail, true)
  assert.strictEqual(typeof customerId, 'number')
})

test('upsertCustomerForOrder returns null when no email is available', async () => {
  const m = makePayloadMock()
  const customerId = await upsertCustomerForOrder(m.api as any, {})
  assert.strictEqual(customerId, null)
  assert.strictEqual(m.creates.length, 0)
})

test('upsertCustomerForOrder uses linked customer email when guestEmail absent', async () => {
  const m = makePayloadMock()
  const customerId = await upsertCustomerForOrder(m.api as any, {
    customer: { email: 'linked@example.com' },
    shippingAddress: {
      firstName: 'C',
      lastName: 'D',
      street: '5 Oak',
      city: 'Nashville',
      state: 'TN',
      zip: '37208',
    },
  })
  assert.strictEqual(m.creates.length, 1)
  assert.strictEqual(m.creates[0].data.email, 'linked@example.com')
  assert.strictEqual(typeof customerId, 'number')
})

test('upsertCustomerForOrder omits shippingAddresses when street is missing', async () => {
  const m = makePayloadMock()
  await upsertCustomerForOrder(m.api as any, {
    guestEmail: 'noaddr@example.com',
    shippingAddress: { firstName: 'No', lastName: 'Addr' },
  })
  assert.strictEqual(m.creates.length, 1)
  assert.strictEqual(m.creates[0].data.shippingAddresses, undefined)
})
