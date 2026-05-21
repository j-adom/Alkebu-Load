import assert from 'node:assert'
import test from 'node:test'

import { getCustomerEmail, getCustomerName } from '../../src/app/components/orderDashboard/customerDisplay'

test('linked customer displayName wins', () => {
  const r = getCustomerName({
    customer: { displayName: 'Jane Doe', email: 'j@x.com' },
    shippingAddress: { firstName: 'Janet', lastName: 'Doe' },
    guestEmail: 'guest@x.com',
  })
  assert.strictEqual(r, 'Jane Doe')
})

test('linked customer first+last wins when no displayName', () => {
  const r = getCustomerName({
    customer: { firstName: 'Jane', lastName: 'Doe', email: 'j@x.com' },
    guestEmail: 'guest@x.com',
  })
  assert.strictEqual(r, 'Jane Doe')
})

test('shipping address name used for guest orders', () => {
  const r = getCustomerName({
    customer: null,
    shippingAddress: { firstName: 'John', lastName: 'Sims' },
    guestEmail: 'simsjohnl@hotmail.com',
  })
  assert.strictEqual(r, 'John Sims')
})

test('guest email used only when no shipping name', () => {
  const r = getCustomerName({
    customer: null,
    shippingAddress: { firstName: '', lastName: '' },
    guestEmail: 'simsjohnl@hotmail.com',
  })
  assert.strictEqual(r, 'simsjohnl@hotmail.com')
})

test("falls back to 'Guest' when nothing available", () => {
  const r = getCustomerName({})
  assert.strictEqual(r, 'Guest')
})

test('getCustomerEmail prefers linked customer email', () => {
  const r = getCustomerEmail({
    customer: { email: 'linked@x.com' },
    guestEmail: 'guest@x.com',
  })
  assert.strictEqual(r, 'linked@x.com')
})

test('getCustomerEmail falls back to guestEmail', () => {
  const r = getCustomerEmail({ guestEmail: 'guest@x.com' })
  assert.strictEqual(r, 'guest@x.com')
})
