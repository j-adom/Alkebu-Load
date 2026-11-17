import assert from 'node:assert';
import test from 'node:test';
import { readFileSync } from 'node:fs';

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

// --- Public-read collections and globals: writes are back-office only -------

import Authors from '../../src/collections/Authors';
import BlogPosts from '../../src/collections/BlogPosts';
import Businesses from '../../src/collections/Businesses';
import Events from '../../src/collections/Events';
import FashionJewelry from '../../src/collections/FashionJewelry';
import Media from '../../src/collections/Media';
import OilsIncense from '../../src/collections/OilsIncense';
import Publishers from '../../src/collections/Publishers';
import WellnessLifestyle from '../../src/collections/WellnessLifestyle';
import { AboutPage } from '../../src/globals/AboutPage';
import { ContactPage } from '../../src/globals/ContactPage';
import { HomePage } from '../../src/globals/HomePage';
import { ShopPage } from '../../src/globals/ShopPage';
import { SiteSettings } from '../../src/globals/SiteSettings';
import { Carts } from '../../src/collections/Carts';
import { Customers } from '../../src/collections/Customers';
import { Orders } from '../../src/collections/Orders';
import Reviews from '../../src/collections/Reviews';

const OUTSIDERS = [USER_CUSTOMER, CUSTOMER_LOGIN, null];

test('catalog and content collections reject writes from customers and anonymous', () => {
  const cols = [
    Authors, BlogPosts, Businesses, Events, FashionJewelry, Media,
    OilsIncense, Publishers, WellnessLifestyle,
  ];
  for (const col of cols) {
    const access = col.access as Record<string, AccessFn>;
    for (const op of ['create', 'update', 'delete']) {
      assert.strictEqual(typeof access[op], 'function', `${col.slug}.${op} is defined`);
      for (const user of OUTSIDERS) {
        assert.strictEqual(access[op]({ req: { user } }), false, `${col.slug}.${op} ${JSON.stringify(user)}`);
      }
      for (const user of [ADMIN, STAFF, EDITOR]) {
        assert.strictEqual(access[op]({ req: { user } }), true, `${col.slug}.${op} ${user.role}`);
      }
    }
  }
});

test('Books carries the same write rules', () => {
  // Books.tsx imports an admin React component (and its CSS), so it cannot be loaded
  // by the node test runner; assert on the source instead.
  const source = readFileSync(new URL('../../src/collections/Books.tsx', import.meta.url), 'utf8');
  assert.match(source, /access: \{\s*read: \(\) => true,\s*\.\.\.backOfficeWriteAccess,\s*\}/);
});

test('page globals reject updates from customers and anonymous', () => {
  for (const global of [AboutPage, ContactPage, HomePage, ShopPage, SiteSettings]) {
    const update = global.access!.update as AccessFn;
    for (const user of OUTSIDERS) {
      assert.strictEqual(update({ req: { user } }), false, `${global.slug} ${JSON.stringify(user)}`);
    }
    assert.strictEqual(update({ req: { user: ADMIN } }), true, `${global.slug} admin`);
    assert.strictEqual(update({ req: { user: STAFF } }), true, `${global.slug} staff`);
  }
  // Site settings hold the payment provider switch.
  assert.strictEqual((SiteSettings.access!.update as AccessFn)({ req: { user: EDITOR } }), false);
});

test('own-row rules do not match a login from the other auth collection', () => {
  // ids are per-collection: customers row 7 and users row 7 are different people.
  const customer7 = { id: 7, collection: 'customers' };
  const user7 = { id: 7, role: 'customer', collection: 'users' };

  for (const op of ['read', 'update'] as const) {
    const fn = Users.access![op] as AccessFn;
    assert.strictEqual(fn({ req: { user: customer7 } }), false, `users.${op}`);
    assert.deepStrictEqual(fn({ req: { user: user7 } }), { id: { equals: 7 } }, `users.${op} self`);
  }

  const customers = Customers.access as Record<string, (a: any) => unknown>;
  assert.strictEqual(customers.read({ req: { user: user7 } }), false);
  assert.strictEqual(customers.update({ req: { user: user7 }, id: 7 }), false);
  assert.strictEqual(customers.update({ req: { user: customer7 }, id: 7 }), true);

  assert.strictEqual((Orders.access!.read as AccessFn)({ req: { user: user7 } }), false);

  for (const op of ['read', 'update', 'delete'] as const) {
    assert.strictEqual((Carts.access![op] as AccessFn)({ req: { user: customer7 } }), false, `carts.${op}`);
  }

  assert.strictEqual((Reviews.access!.create as AccessFn)({ req: { user: customer7 } }), false);
  assert.strictEqual((Reviews.access!.update as AccessFn)({ req: { user: customer7 } }), false);
});
