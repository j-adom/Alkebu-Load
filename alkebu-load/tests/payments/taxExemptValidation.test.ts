import assert from 'node:assert';
import test from 'node:test';

import { validateTaxExemptStatus } from '../../src/app/utils/taxExemptValidation';

test('validateTaxExemptStatus rejects guest tax-exempt requests', async () => {
  const result = await validateTaxExemptStatus({} as any, null, true);

  assert.deepStrictEqual(result, {
    valid: false,
    reason: 'Guest users cannot claim tax-exempt status',
  });
});

test('validateTaxExemptStatus accepts verified tax-exempt users', async () => {
  const payload = {
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'users') {
        return {
          taxExempt: true,
        };
      }

      return null;
    },
  };

  const result = await validateTaxExemptStatus(payload as any, 'cust_123', true);

  assert.deepStrictEqual(result, { valid: true });
});

test('validateTaxExemptStatus falls back to legacy customers when needed', async () => {
  const payload = {
    find: async ({ collection }: { collection: string }) => {
      if (collection === 'customers') {
        return {
          docs: [
            {
              accountStatus: {
                taxExempt: true,
              },
            },
          ],
        };
      }

      return { docs: [] };
    },
  };

  const result = await validateTaxExemptStatus(payload as any, 'cust_123', true);

  assert.deepStrictEqual(result, { valid: true });
});

test('validateTaxExemptStatus rejects expired institutional exemptions', async () => {
  const payload = {
    findByID: async ({ collection }: { collection: string }) => {
      if (collection === 'users') {
        return {
          taxExempt: true,
          institution: 'inst_123',
        };
      }

      return {
        status: 'active',
        taxInfo: {
          taxExempt: true,
          exemptionValidUntil: '2020-01-01T00:00:00.000Z',
        },
      };
    },
  };

  const result = await validateTaxExemptStatus(payload as any, 'cust_123', true);

  assert.deepStrictEqual(result, {
    valid: false,
    reason: 'Tax exemption has expired',
  });
});
