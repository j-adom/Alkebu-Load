import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchOnlineSales } from '../../src/app/utils/ingram/onlineSales';

test('collects book sales from paid-or-later website orders', async () => {
  const calls: any[] = [];
  const payload = {
    find: async (args: any) => {
      calls.push(args);
      return {
        hasNextPage: false,
        docs: [
          {
            createdAt: '2024-01-01T00:00:00Z',
            items: [
              { productType: 'books', product: { relationTo: 'books', value: 5 }, identifiers: { isbn: '9780000000002' } },
              { productType: 'wellness-lifestyle', product: { relationTo: 'wellness-lifestyle', value: 9 } },
            ],
          },
          { createdAt: '2025-03-01T00:00:00Z', items: [{ productType: 'books', product: 5, identifiers: {} }] },
        ],
      };
    },
  } as any;
  const { sales, orders } = await fetchOnlineSales(payload, '2022-10-03T00:00:00Z');
  assert.equal(orders, 2);
  assert.deepEqual([...sales.keys()], ['5']);
  assert.equal(sales.get('5')!.lastSoldAt, '2025-03-01T00:00:00Z');
  assert.deepEqual([...sales.get('5')!.isbns], ['9780000000002']);
  assert.deepEqual(calls[0].where.and[1], { status: { in: ['paid', 'processing', 'shipped', 'delivered', 'completed'] } });
});
