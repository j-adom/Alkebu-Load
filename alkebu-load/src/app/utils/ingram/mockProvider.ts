// Deterministic stand-in for Ingram: the ISBN's last digit seeds a stable on-hand, so
// tests and local demos behave the same every run. All values are invented.
import type { AvailabilityProvider, LongTailResult } from './AvailabilityProvider';
import type { IngramStock } from './parseStockResponse';

function seededStock(ean: string): IngramStock {
  const last = Number(ean.replace(/\D/g, '').slice(-1)) || 0;
  const onHand = last * 15; // 0 → out of stock; 1–9 → 15–135
  return {
    ean,
    backorder: false,
    mediaMail: true,
    ingramPrice: 11.39,
    pubListPrice: 18.99,
    productAvailability: onHand ? '21' : '40',
    onSaleDate: '00010101',
    dcs: { LaVergne: { onHand, onOrder: 0, stockStatus: onHand > 0 } },
  };
}

export const mockProvider: AvailabilityProvider = {
  async checkStock(isbns) {
    return new Map(isbns.map((ean) => [ean, seededStock(ean)]));
  },
  async searchLongTail(query): Promise<LongTailResult[]> {
    return [
      {
        ean: '9780000000019',
        title: `Sample result for “${query}”`,
        author: 'Sample Author',
        binding: 'Paperback',
        price: 18.99,
        onHand: 40,
        available: true,
      },
    ];
  },
};
