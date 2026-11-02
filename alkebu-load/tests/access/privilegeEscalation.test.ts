import assert from 'node:assert';
import test from 'node:test';

import Users from '../../src/collections/Users';
import BookQuotes from '../../src/collections/BookQuotes';
import Comments from '../../src/collections/Comments';
import ExternalBooks from '../../src/collections/ExternalBooks';
import SearchAnalytics from '../../src/collections/SearchAnalytics';
import Vendors from '../../src/collections/Vendors';

type AccessFn = (args: { req: { user: any } }) => unknown;

const ADMIN = { id: 'a1', role: 'admin', collection: 'users' };
const STAFF = { id: 's1', role: 'staff', collection: 'users' };
const EDITOR = { id: 'e1', role: 'editor', collection: 'users' };
const USER_CUSTOMER = { id: 'u1', role: 'customer', collection: 'users' };
// A customers-collection login, even one carrying a role-shaped property.
const CUSTOMER_LOGIN = { id: 'c1', role: 'admin', collection: 'customers' };

const roleField = (Users.fields as any[]).find((f) => f.name === 'role');

test('only admins can create users', () => {
  const create = Users.access!.create as AccessFn;
  assert.strictEqual(create({ req: { user: ADMIN } }), true);
  for (const user of [STAFF, EDITOR, USER_CUSTOMER, CUSTOMER_LOGIN, null]) {
    assert.strictEqual(create({ req: { user } }), false, JSON.stringify(user));
  }
});

test('only admins can set or change a user role', () => {
  for (const op of ['create', 'update'] as const) {
    const fn = roleField.access[op] as AccessFn;
    assert.strictEqual(fn({ req: { user: ADMIN } }), true, op);
    for (const user of [STAFF, EDITOR, USER_CUSTOMER, CUSTOMER_LOGIN, null]) {
      assert.strictEqual(fn({ req: { user } }), false, `${op} ${JSON.stringify(user)}`);
    }
  }
});

test('previously open collections are staff-only', () => {
  for (const col of [BookQuotes, Comments, ExternalBooks, SearchAnalytics, Vendors]) {
    const access = col.access as Record<string, AccessFn>;
    for (const op of ['read', 'create', 'update', 'delete']) {
      assert.strictEqual(access[op]({ req: { user: null } }), false, `${col.slug}.${op} anon`);
      assert.strictEqual(access[op]({ req: { user: CUSTOMER_LOGIN } }), false, `${col.slug}.${op} customer`);
      assert.strictEqual(access[op]({ req: { user: USER_CUSTOMER } }), false, `${col.slug}.${op} user-customer`);
      assert.strictEqual(access[op]({ req: { user: ADMIN } }), true, `${col.slug}.${op} admin`);
    }
    assert.strictEqual(access.read({ req: { user: STAFF } }), true, `${col.slug}.read staff`);
  }
});
