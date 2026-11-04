import assert from 'node:assert';
import test from 'node:test';

import { buildOrderShippingAddress, stripeShippingFromCart } from '../../src/app/utils/stripeHelpers';

test('buildOrderShippingAddress falls back to Stripe shipping details', () => {
  const result = buildOrderShippingAddress(undefined, {
    shipping_details: {
      name: 'Octavia Butler',
      address: {
        line1: '123 Jefferson St',
        line2: 'Suite 4',
        city: 'Nashville',
        state: 'TN',
        postal_code: '37208',
        country: 'US',
      },
    },
    customer_details: {
      phone: '615-555-0100',
    },
  });

  assert.deepStrictEqual(result, {
    firstName: 'Octavia',
    lastName: 'Butler',
    company: undefined,
    street: '123 Jefferson St',
    street2: 'Suite 4',
    city: 'Nashville',
    state: 'TN',
    zip: '37208',
    country: 'US',
    phone: '615-555-0100',
  });
});

test('buildOrderShippingAddress preserves cart values when present', () => {
  const result = buildOrderShippingAddress(
    {
      firstName: 'Toni',
      lastName: 'Morrison',
      street: '1 Existing St',
      city: 'Memphis',
      state: 'TN',
      zip: '38103',
      country: 'US',
      phone: '901-555-0110',
    },
    {
      shipping_details: {
        name: 'Ignored Name',
        address: {
          line1: '999 Replacement Ave',
          city: 'Nashville',
          state: 'TN',
          postal_code: '37208',
          country: 'US',
        },
      },
    },
  );

  assert.deepStrictEqual(result, {
    firstName: 'Toni',
    lastName: 'Morrison',
    company: undefined,
    street: '1 Existing St',
    street2: undefined,
    city: 'Memphis',
    state: 'TN',
    zip: '38103',
    country: 'US',
    phone: '901-555-0110',
  });
});

test('buildOrderShippingAddress never mixes a Stripe apartment line into the cart address', () => {
  const result = buildOrderShippingAddress(
    { firstName: 'Toni', lastName: 'Morrison', street: '1 Existing St', city: 'Memphis', state: 'TN', zip: '38103' },
    {
      shipping_details: { address: { line1: '999 Other Ave', line2: 'Apt 9', city: 'Nashville', state: 'TN', postal_code: '37208' } },
      customer_details: { phone: '615-555-0100' },
    },
  );
  assert.equal(result.street, '1 Existing St');
  assert.equal(result.street2, undefined);
  assert.equal(result.phone, '615-555-0100', 'phone still comes from Stripe when the cart has none');
});

test('buildOrderShippingAddress reads newer Stripe collected_information shipping details', () => {
  const result = buildOrderShippingAddress(null, {
    collected_information: {
      shipping_details: { name: 'Zora Hurston', address: { line1: '5 Eatonville Rd', city: 'Eatonville', state: 'FL', postal_code: '32751', country: 'US' } },
    },
  });
  assert.equal(result.street, '5 Eatonville Rd');
  assert.equal(result.firstName, 'Zora');
});

test('stripeShippingFromCart sends the cart address to Stripe', () => {
  assert.deepStrictEqual(
    stripeShippingFromCart({
      firstName: 'Jordan', lastName: 'Harris', street: '2600 Baywood Ct', city: 'Silver Spring', state: 'MD', zip: '20906-3101', country: 'US',
    }),
    {
      name: 'Jordan Harris',
      address: { line1: '2600 Baywood Ct', city: 'Silver Spring', state: 'MD', postal_code: '20906-3101', country: 'US' },
    },
  );
  assert.throws(() => stripeShippingFromCart({ street: '2600 Baywood Ct' }), /Shipping address is missing/);
});
