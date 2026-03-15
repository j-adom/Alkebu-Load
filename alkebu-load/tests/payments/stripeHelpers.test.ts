import assert from 'node:assert';
import test from 'node:test';

import { buildOrderShippingAddress } from '../../src/app/utils/stripeHelpers';

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
