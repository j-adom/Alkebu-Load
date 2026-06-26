import assert from 'node:assert';
import test from 'node:test';

import { Carts } from '../../src/collections/Carts';
import { CartItems } from '../../src/collections/CartItems';
import { Customers } from '../../src/collections/Customers';
import { Orders } from '../../src/collections/Orders';
import { PartnershipInquiries } from '../../src/collections/PartnershipInquiries';

type AccessFn = (args: { req: { user: any }; id?: string }) => unknown;
const access = (col: any) => col.access as Record<string, AccessFn>;
const callRead = (col: any, user: any) => access(col).read({ req: { user } });

const STAFF = { id: 's1', role: 'staff' };
const ADMIN = { id: 'a1', role: 'admin' };
const CUSTOMER = { id: 'c1', role: 'customer' };

test('Orders.read: staff sees all orders', () => {
  assert.strictEqual(callRead(Orders, STAFF), true);
});

test('Orders.read: admin sees all orders', () => {
  assert.strictEqual(callRead(Orders, ADMIN), true);
});

test('Orders.read: customer is scoped to own orders via filter', () => {
  assert.deepStrictEqual(callRead(Orders, CUSTOMER), { customer: { equals: 'c1' } });
});

test('Orders.read: anonymous is denied', () => {
  assert.strictEqual(callRead(Orders, null), false);
});

test('Customers.read: staff sees all customers', () => {
  assert.strictEqual(callRead(Customers, STAFF), true);
});

test('Customers.read: customer is scoped to own record via filter', () => {
  assert.deepStrictEqual(callRead(Customers, CUSTOMER), { id: { equals: 'c1' } });
});

test('Customers.update: staff can update any customer', () => {
  const result = access(Customers).update({ req: { user: STAFF }, id: 'other' });
  assert.strictEqual(result, true);
});

test('Customers.update: customer can update only own record', () => {
  const own = access(Customers).update({ req: { user: CUSTOMER }, id: 'c1' });
  const other = access(Customers).update({ req: { user: CUSTOMER }, id: 'c2' });
  assert.strictEqual(own, true);
  assert.strictEqual(other, false);
});

test('Carts.read: staff sees all carts', () => {
  assert.strictEqual(callRead(Carts, STAFF), true);
});

test('Carts.read: customer scoped to own cart via filter', () => {
  assert.deepStrictEqual(callRead(Carts, CUSTOMER), { user: { equals: 'c1' } });
});

test('CartItems.read: staff can read cart items', () => {
  assert.strictEqual(callRead(CartItems, STAFF), true);
});

test('CartItems.read: non-admin/staff denied (read goes through cart operations)', () => {
  assert.strictEqual(callRead(CartItems, CUSTOMER), false);
});

test('Orders.delete and Customers.delete stay admin-only (this fix does not elevate staff)', () => {
  assert.strictEqual(access(Orders).delete({ req: { user: STAFF } }), false);
  assert.strictEqual(access(Orders).delete({ req: { user: ADMIN } }), true);
  assert.strictEqual(access(Customers).delete({ req: { user: STAFF } }), false);
  assert.strictEqual(access(Customers).delete({ req: { user: ADMIN } }), true);
});

test('public users cannot write lower-level commerce collections directly', () => {
  for (const collection of [Carts, CartItems, Orders, Customers]) {
    assert.strictEqual(access(collection).create({ req: { user: null } }), false);
    assert.strictEqual(access(collection).create({ req: { user: CUSTOMER } }), false);
  }

  for (const collection of [CartItems, Orders, Customers]) {
    assert.strictEqual(access(collection).update({ req: { user: null }, id: 'x' }), false);
    assert.strictEqual(access(collection).delete({ req: { user: null }, id: 'x' }), false);
  }
});

test('staff and admins can write commerce collections through Payload admin', () => {
  for (const collection of [Carts, CartItems, Orders, Customers]) {
    assert.strictEqual(access(collection).create({ req: { user: STAFF } }), true);
    assert.strictEqual(access(collection).create({ req: { user: ADMIN } }), true);
  }

  assert.strictEqual(access(CartItems).update({ req: { user: STAFF }, id: 'item' }), true);
  assert.strictEqual(access(CartItems).delete({ req: { user: ADMIN }, id: 'item' }), true);
});

test('PartnershipInquiries.read: staff and admins can read stored inquiries', () => {
  assert.strictEqual(callRead(PartnershipInquiries, STAFF), true);
  assert.strictEqual(callRead(PartnershipInquiries, ADMIN), true);
});

test('PartnershipInquiries.read: public and customers cannot read stored inquiries', () => {
  assert.strictEqual(callRead(PartnershipInquiries, null), false);
  assert.strictEqual(callRead(PartnershipInquiries, CUSTOMER), false);
});

test('PartnershipInquiries.create/update: staff and admins can manage inquiries through admin', () => {
  assert.strictEqual(access(PartnershipInquiries).create({ req: { user: STAFF } }), true);
  assert.strictEqual(access(PartnershipInquiries).create({ req: { user: ADMIN } }), true);
  assert.strictEqual(access(PartnershipInquiries).update({ req: { user: STAFF }, id: 'lead1' }), true);
  assert.strictEqual(access(PartnershipInquiries).update({ req: { user: ADMIN }, id: 'lead1' }), true);
});

test('PartnershipInquiries.delete stays admin-only', () => {
  assert.strictEqual(access(PartnershipInquiries).delete({ req: { user: STAFF }, id: 'lead1' }), false);
  assert.strictEqual(access(PartnershipInquiries).delete({ req: { user: ADMIN }, id: 'lead1' }), true);
});

test('PartnershipInquiries denies direct public and customer writes', () => {
  assert.strictEqual(access(PartnershipInquiries).create({ req: { user: null } }), false);
  assert.strictEqual(access(PartnershipInquiries).create({ req: { user: CUSTOMER } }), false);
  assert.strictEqual(access(PartnershipInquiries).update({ req: { user: null }, id: 'lead1' }), false);
  assert.strictEqual(access(PartnershipInquiries).update({ req: { user: CUSTOMER }, id: 'lead1' }), false);
  assert.strictEqual(access(PartnershipInquiries).delete({ req: { user: null }, id: 'lead1' }), false);
  assert.strictEqual(access(PartnershipInquiries).delete({ req: { user: CUSTOMER }, id: 'lead1' }), false);
});

